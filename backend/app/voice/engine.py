"""
音声合成と再生を管理するモジュール

VOICEVOXを使用した音声合成と、生成された音声の再生を制御
"""

import os
import time
import logging
import threading
import requests
import subprocess
import json
import hashlib
from typing import Optional, Dict, Any, Tuple, Union, List, cast
import concurrent.futures
import random

# ロガーの設定
logger = logging.getLogger(__name__)

# 感情分析モジュールをインポート
from .emotion_analyzer import analyze_text

# 音声再生の最終時刻を記録する変数
last_voice_time = 0
# 音声再生用の排他ロック
voice_lock = threading.Lock()
# 最後に再生したメッセージのキャッシュ
last_message_cache: Dict[str, Tuple[str, float]] = {}
# 音声再生中フラグ
audio_playing = False
# 合成音声キャッシュのパス
CACHED_VOICE_DIR = os.path.join("assets", "sounds", "generated")
# プリセット音声のパス
PRESET_VOICE_DIR = os.path.join("assets", "sounds", "presets")
# ThreadPoolExecutor for background tasks
executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

def reset_audio_playback():
    """
    音声再生の終了フラグをリセットする
    """
    global audio_playing
    with voice_lock:
        if audio_playing:
            # audioフラグをリセット
            audio_playing = False
            logger.info("音声再生の終了をリセットしました")

# メッセージキャッシュをチェックして短時間での重複メッセージを防ぐ
def is_message_duplicate(message_type: str, message: str, cooldown: float = 3.0) -> bool:
    """
    短時間内に同じメッセージが再生されたかどうかをチェック
    
    Args:
        message_type: メッセージのタイプ
        message: メッセージ内容
        cooldown: クールダウン時間（秒）
        
    Returns:
        bool: 重複メッセージの場合True
    """
    current_time = time.time()
    
    if message_type in last_message_cache:
        cache_entry = last_message_cache[message_type]
        last_message = cache_entry[0]
        last_time = cache_entry[1]
        
        # 同じメッセージかつ、指定されたクールダウン時間内の場合
        if last_message == message and current_time - last_time < cooldown:
            logger.debug(f"重複メッセージを検出: '{message_type}' - '{message}'")
            return True
    
    # 新しいメッセージをキャッシュに記録
    last_message_cache[message_type] = (message, current_time)
    return False

# テキストの感情を分析して最適なパラメータで音声合成する関数
def speak_with_emotion(
    text: str,
    speaker_id: int = 0,
    force: bool = False,
    message_type: str = "default"
) -> Tuple[Optional[str], Dict[str, Any]]:
    """
    テキストの感情を自動分析して最適なパラメータで音声合成する
    
    Args:
        text: 発話するテキスト
        speaker_id: 話者ID
        force: クールダウンを無視して強制的に再生
        message_type: メッセージタイプ（重複チェック用）
    
    Returns:
        Tuple[str, Dict]: WAVファイルのパス（成功時）と分析結果の辞書
    """
    # テキストから感情を分析
    analysis_result = analyze_text(text)
    
    # 分析結果からパラメータを取得
    params = analysis_result["parameters"]
    emotion = analysis_result["emotion"]
    
    logger.info(f"感情分析結果: {emotion} - {analysis_result['explanation']}")
    logger.debug(f"音声パラメータ: {params}")
    
    # パラメータを適用して音声合成
    wav_path = safe_play_voice(
        text,
        speaker_id,
        speed=params["speed_scale"],
        pitch=params["pitch_scale"],
        intonation=params["intonation_scale"],
        volume=params["volume_scale"],
        force=force,
        message_type=message_type
    )
    
    return wav_path, analysis_result

# 安全に音声を再生する（VOICEVOXが利用可能なら）
def safe_play_voice(
    text: str, 
    speaker_id: int = 0, 
    speed: float = 1.0, 
    pitch: float = 0.0, 
    intonation: float = 1.0, 
    volume: float = 1.0, 
    force: bool = False, 
    message_type: str = "default"
) -> Optional[str]:
    """
    安全に音声を再生する（VOICEVOXが利用可能なら）
    
    Args:
        text: 再生するテキスト
        speaker_id: 話者ID
        speed: 話速（1.0が標準）
        pitch: ピッチ（0.0が標準）
        intonation: イントネーション（1.0が標準）
        volume: 音量（1.0が標準）
        force: 強制再生フラグ
        message_type: メッセージタイプ（重複チェック用）
        
    Returns:
        wav_path: 生成されたWAVファイルのパス、エラー時はNone
    """
    # 重複チェック
    if not force and is_message_duplicate(message_type, text, 3.0):
        logger.info(f"重複メッセージ抑制: {message_type} - {text}")
        return None
        
    # VOICEVOXとの通信
    try:
        return speak(text, speaker_id, speed, pitch, intonation, volume, force)
    except Exception as e:
        logger.error(f"音声再生エラー: {e}")
        return None

# 新しい関数: 音声データを直接返す（再生なし）
async def synthesize_direct(
    text: str,
    speaker_id: int = 0,
    emotion: str = "normal",
    speed: Optional[float] = None,
    pitch: Optional[float] = None,
    intonation: Optional[float] = None,
    volume: Optional[float] = None
) -> Optional[bytes]:
    """
    VOICEVOXを使用してテキストを音声に変換し、音声データを直接返す（再生なし）
    
    Args:
        text: 合成するテキスト
        speaker_id: 話者ID
        emotion: 感情タイプ（normal, happy, surprised, serious等）
        speed: 話速（1.0が標準）- オプション
        pitch: ピッチ（0.0が標準）- オプション
        intonation: イントネーション（1.0が標準）- オプション
        volume: 音量（1.0が標準）- オプション
    
    Returns:
        bytes: WAV音声データ（成功時）、失敗時はNone
    """
    from ..config import get_settings
    
    try:
        # 設定の取得
        settings = get_settings()
        
        # 感情に応じた音声プリセット
        voice_preset = None
        if emotion in settings.VOICE_PRESETS:
            voice_preset = settings.VOICE_PRESETS[emotion]
            
        # 実際のスピードとピッチの設定値（プリセットまたはパラメータから）
        speed_scale = speed if speed is not None else (voice_preset.get("speed", 1.0) if voice_preset else 1.0)
        pitch_scale = pitch if pitch is not None else (voice_preset.get("pitch", 0.0) if voice_preset else 0.0)
        intonation_scale = intonation if intonation is not None else (voice_preset.get("intonation", 1.0) if voice_preset else 1.0)
        volume_scale = volume if volume is not None else 0.5  # デフォルト音量50%
        
        logger.info(f"音声合成開始 (direct): text={text[:20]}..., speaker={speaker_id}, emotion={emotion}")
        logger.debug(f"音声パラメータ: speed={speed_scale}, pitch={pitch_scale}, intonation={intonation_scale}")
        
        # 音声合成クエリの作成リクエスト
        logger.debug(f"VOICEVOX APIリクエスト: {settings.VOICEVOX_HOST}/audio_query")
        query_response = requests.post(
            f"{settings.VOICEVOX_HOST}/audio_query",
            params={"text": text, "speaker": speaker_id}
        )
        
        if query_response.status_code != 200:
            logger.error(f"音声合成クエリの作成に失敗: ステータスコード={query_response.status_code}")
            logger.error(f"レスポンス内容: {query_response.text}")
            return None
            
        voice_params = query_response.json()
        
        # パラメータを設定
        voice_params["speedScale"] = speed_scale
        voice_params["pitchScale"] = pitch_scale
        voice_params["intonationScale"] = intonation_scale
        voice_params["volumeScale"] = volume_scale
        
        # 音声合成の実行
        logger.debug(f"VOICEVOX 音声合成実行: {settings.VOICEVOX_HOST}/synthesis")
        synthesis_response = requests.post(
            f"{settings.VOICEVOX_HOST}/synthesis",
            headers={"Content-Type": "application/json"},
            params={"speaker": speaker_id},
            data=json.dumps(voice_params)
        )
        
        if synthesis_response.status_code != 200:
            logger.error(f"音声合成に失敗: ステータスコード={synthesis_response.status_code}")
            logger.error(f"レスポンス内容: {synthesis_response.text}")
            return None
        
        # 音声データを直接返す
        audio_data = synthesis_response.content
        logger.debug(f"音声合成完了: 音声データサイズ {len(audio_data)} バイト")
        
        return audio_data
        
    except Exception as e:
        import traceback
        logger.error(f"音声合成エラー (direct): {e}")
        logger.error(f"詳細なエラー情報: {traceback.format_exc()}")
        return None

def play_voice(wav_path: str):
    """
    WAVファイルを再生（今は何もしない！）
    """
    logger.info(f"[再生スキップ] {wav_path}")
    reset_audio_playback()


def play_voice_async(wav_path: str) -> Optional[concurrent.futures.Future[int]]:
    """
    WAVファイルを非同期で再生し、Futureオブジェクトを返す
    
    Args:
        wav_path: 再生するWAVファイルのパス
        
    Returns:
        Future: 再生処理の完了を待機できるFutureオブジェクト
    """
    try:
        # Windows環境での再生
        command = f'powershell -c "(New-Object Media.SoundPlayer \'{wav_path}\').PlaySync();"'
        return executor.submit(os.system, command)
    except Exception as e:
        logger.error(f"非同期音声再生エラー: {str(e)}")
        return None

def get_voice_cache_path(text: str, speaker_id: int = 0) -> str:
    """
    テキストと話者IDからキャッシュパスを生成
    
    Args:
        text: テキスト
        speaker_id: 話者ID
        
    Returns:
        str: キャッシュファイルのパス
    """
    # テキストからハッシュ値を生成
    text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
    filename = f"voice_{speaker_id}_{text_hash}.wav"
    return os.path.join(CACHED_VOICE_DIR, filename)

def is_voice_cached(text: str, speaker_id: int = 0) -> bool:
    """
    テキストの音声がキャッシュされているかチェック
    
    Args:
        text: チェックするテキスト
        speaker_id: 話者ID
        
    Returns:
        bool: キャッシュが存在すればTrue
    """
    cache_path = get_voice_cache_path(text, speaker_id)
    return os.path.exists(cache_path)


def play_preset_voice(filename: str):
    logger.info(f"[スキップ] プリセット音声の再生: {filename}")
    reset_audio_playback()


def speak(
    text: str, 
    speaker_id: int = 0, 
    speed: float = 1.0, 
    pitch: float = 0.0, 
    intonation: float = 1.0, 
    volume: float = 1.0, 
    force: bool = False
) -> Optional[str]:
    """
    テキストを音声に変換して再生する
    
    Args:
        text: 発話するテキスト
        speaker_id: 話者ID
        speed: 話速（1.0が標準）
        pitch: ピッチ（0.0が標準）
        intonation: イントネーション（1.0が標準）
        volume: 音量（1.0が標準）
        force: キャッシュをスキップして強制的に生成
        
    Returns:
        str: 生成されたWAVファイルのパス、エラー時はNone
    """
    # テキストが空の場合は何もしない
    if not text or len(text.strip()) == 0:
        logger.warning("空のテキストが渡されました")
        return None
        
    try:
        from ..config import get_settings
        
        # 設定を取得
        settings = get_settings()
        
        logger.info(f"音声合成: text={text[:30]}..., speaker={speaker_id}")
        logger.debug(f"音声パラメータ: speed={speed}, pitch={pitch}, intonation={intonation}")
        
        # キャッシュパスをチェック
        cache_path = get_voice_cache_path(text, speaker_id)
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        
        # キャッシュが存在し、強制フラグがない場合はキャッシュを使用
        if is_voice_cached(text, speaker_id) and not force:
            logger.info(f"キャッシュされた音声ファイルを使用: {cache_path}")
            # play_voice(cache_path)
            return cache_path
            
        # 音声合成リクエストを2段階で行う
        # 1. 音声合成用のクエリを作成
        params = {
            "text": text,
            "speaker": speaker_id
        }
        
        logger.debug(f"音声合成クエリを作成: {settings.VOICEVOX_HOST}/audio_query")
        
        # クエリ作成
        query_response = requests.post(
            f"{settings.VOICEVOX_HOST}/audio_query",
            params=params
        )
        
        if query_response.status_code != 200:
            logger.error(f"音声合成クエリの作成に失敗: {query_response.text}")
            return None
            
        voice_params = query_response.json()
        
        # パラメータ調整
        voice_params["speedScale"] = speed
        voice_params["pitchScale"] = pitch
        voice_params["intonationScale"] = intonation
        voice_params["volumeScale"] = volume
        
        # 2. 音声合成の実行
        logger.debug(f"音声合成を実行: {settings.VOICEVOX_HOST}/synthesis")
        
        synthesis_response = requests.post(
            f"{settings.VOICEVOX_HOST}/synthesis",
            headers={"Content-Type": "application/json"},
            params={"speaker": speaker_id},
            data=json.dumps(voice_params)
        )
        
        if synthesis_response.status_code != 200:
            logger.error(f"音声合成に失敗: {synthesis_response.text}")
            return None
        
        # キャッシュに保存
        with open(cache_path, "wb") as f:
            f.write(synthesis_response.content)
            
        logger.debug(f"WAVファイルを保存: {cache_path}")
        
        return cache_path
    except Exception as e:
        reset_audio_playback()
        logger.error(f"VOICEVOXエンジンエラー: {str(e)}")
        return None

def speak_with_preset(
    text: str,
    preset_name: str,
    speaker_id: int = 0,
    speed: float = 1.0,
    pitch: float = 0.0,
    intonation: float = 1.0,
    volume: float = 1.0,
    delay: float = 0.5
) -> None:
    """
    プリセット音声を即時に再生した後、合成音声を再生
    
    Args:
        text: 発話するテキスト
        preset_name: 使用するプリセット音声名
        speaker_id: 話者ID
        speed: 話速（1.0が標準）
        pitch: ピッチ（0.0が標準）
        intonation: イントネーション（1.0が標準）
        volume: 音量（1.0が標準）
        delay: プリセット再生後、合成音声を再生するまでの遅延（秒）
    """
    # キャッシュパスをチェック
    cache_path = get_voice_cache_path(text, speaker_id)
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    
    # キャッシュを確認
    if is_voice_cached(text, speaker_id):
        logger.debug(f"キャッシュされた音声を使用します: {cache_path}")
        return
    
    # キャッシュがない場合は合成して保存
    try:
        from ..config import get_settings
        settings = get_settings()
        
        # 音声合成リクエストを2段階で行う
        # 1. 音声合成用のクエリを作成
        params = {
            "text": text,
            "speaker": speaker_id
        }
        
        # クエリ作成
        query_response = requests.post(
            f"{settings.VOICEVOX_HOST}/audio_query",
            params=params
        )
        
        if query_response.status_code != 200:
            logger.error(f"音声合成クエリの作成に失敗: {query_response.text}")
            return
            
        voice_params = query_response.json()
        
        # パラメータ調整
        voice_params["speedScale"] = speed
        voice_params["pitchScale"] = pitch
        voice_params["intonationScale"] = intonation
        voice_params["volumeScale"] = volume
        
        # 2. 音声合成の実行
        synthesis_response = requests.post(
            f"{settings.VOICEVOX_HOST}/synthesis",
            headers={"Content-Type": "application/json"},
            params={"speaker": speaker_id},
            data=json.dumps(voice_params)
        )
        
        if synthesis_response.status_code != 200:
            logger.error(f"音声合成に失敗: {synthesis_response.text}")
            return
        
        # キャッシュに保存
        with open(cache_path, "wb") as f:
            f.write(synthesis_response.content)
            
        logger.debug(f"合成音声をキャッシュに保存: {cache_path}")
    except Exception as e:
        logger.error(f"音声合成・再生エラー: {e}")

def safe_speak_with_preset(
    text: str,
    preset_name: str,
    speaker_id: Optional[int] = None,
    emotion: str = "normal",
    force: bool = False
) -> None:
    """
    プリセット音声と合成音声を安全に組み合わせて再生
    
    Args:
        text: 発話するテキスト
        preset_name: 使用するプリセット名
        speaker_id: 話者ID（Noneの場合は設定から取得）
        emotion: 感情ラベル
        force: 強制再生フラグ
    """
    from ..config import get_settings
    settings = get_settings()
    
    # speaker_idが指定されていなければ設定から取得
    if speaker_id is None:
        speaker_id = settings.VOICEVOX_SPEAKER
    
    # メッセージの重複チェック（プリセットは常に再生）
    duplicate = False
    with voice_lock:
        current_time = time.time()
        message_type = f"preset_{preset_name}"
        
        if not force and message_type in last_message_cache:
            last_text, last_time = last_message_cache[message_type]
            if last_text == text and current_time - last_time < 3.0:
                duplicate = True
        
        # キャッシュを更新
        last_message_cache[message_type] = (text, current_time)
    
    # 感情に応じた音声パラメータを取得
    params = settings.VOICE_PRESETS.get(emotion, {})
    speed = params.get("speed", 1.0)
    pitch = params.get("pitch", 0.0)
    intonation = params.get("intonation", 1.0)
    volume = params.get("volume", 1.0)
    
    # 重複の場合はプリセットのみ再生
    if duplicate:
        # play_preset_voice(preset_name)
        return
    
    # プリセットと合成音声を再生
    speak_with_preset(
        text=text,
        preset_name=preset_name,
        speaker_id=speaker_id,
        speed=speed,
        pitch=pitch,
        intonation=intonation,
        volume=volume
    )

# ゾンビ検出用の便利関数
def react_to_zombie(count: int, distance: float = 0.0, reaction_type: str = "confirm", resnet_result: bool = False, resnet_prob: float = 0.0) -> None:
    """
    ゾンビ検出に対して適切な音声で反応（3段階リアクション対応）
    
    Args:
        count: ゾンビの数
        distance: 最も近いゾンビとの距離（m）
        reaction_type: リアクション種別（"immediate"=即時/YOLO, "followup"=補足/ResNet, "confirm"=確定）
        resnet_result: ResNetの結果（Trueならゾンビシーン）
        resnet_prob: ResNetの確率
    """
    # 即時プリセット（YOLO検出時）
    if reaction_type == "immediate":
        if count >= 10:
            # 多数のゾンビ（即時反応）
            play_preset_voice("gasp")
        elif count >= 5:
            # 警戒レベル（即時反応）
            play_preset_voice("altu")
        elif count > 0:
            # 少数ゾンビ（即時反応）
            play_preset_voice("sigh")
    
    # 補足リアクション（ResNet補正後）
    elif reaction_type == "followup":
        if count >= 10:
            # 多数のゾンビ（補足）
            texts = [
                "あっ、ごめん。もっといるかも…！",
                "ち、違った…こんなにいるっ…！",
                "うそっ…こんなに多いの…！？",
            ]
            text = random.choice(texts)
            safe_speak_with_preset(
                text=text,
                preset_name="gasp",
                emotion="焦り",
                force=True
            )
        elif count >= 5:
            # 警戒レベル（補足）
            texts = [
                f"注意して…{count}体いるよ…！",
                f"危ない、{count}体に増えてる…",
                f"やっぱり…{count}体もいるの…"
            ]
            text = random.choice(texts)
            safe_speak_with_preset(
                text=text,
                preset_name="altu",
                emotion="警戒・心配",
                force=True
            )
        elif count > 0:
            # 少数ゾンビ（補足）
            texts = [
                f"うん、{count}体だね…気をつけて",
                f"やっぱり{count}体見えるよ…",
                f"間違いない、{count}体いるね…"
            ]
            text = random.choice(texts)
            safe_speak_with_preset(
                text=text,
                preset_name="sigh",
                emotion="normal",
                force=True
            )
        elif resnet_result and resnet_prob > 0.7:
            # ResNetのみが検出（雰囲気）
            texts = [
                "なんか…気配を感じる…",
                "何かいるような…気がする…",
                "変な感じがする…気のせい…？"
            ]
            text = random.choice(texts)
            safe_speak_with_preset(
                text=text,
                preset_name="sigh",
                emotion="囁き",
                force=True
            )
    
    # 確定アラート（最終確定時）
    else:  # reaction_type == "confirm"
        if count >= 10:
            # 多数のゾンビ（確定）
            texts = [
                "危険！大量のゾンビが接近中！すぐに逃げて！",
                f"{count}体以上いる！このままじゃ危険だよ！",
                "もう囲まれてる…！早く安全な場所へ！"
            ]
            text = random.choice(texts)
            safe_speak_with_preset(
                text=text,
                preset_name="scream",
                emotion="びっくり",
                force=True
            )
        elif count >= 5:
            # 警戒レベル（確定）
            texts = [
                f"警告！{count}体のゾンビを確認！注意して！",
                f"{count}体のゾンビが接近中…慎重に行動して！",
                f"危険…{count}体も接近してる…気をつけて！"
            ]
            text = random.choice(texts)
            safe_speak_with_preset(
                text=text,
                preset_name="gasp",
                emotion="警戒・心配",
                force=True
            )
        elif count > 0:
            # 少数ゾンビ（確定）
            if distance < 5.0:
                # 近距離
                texts = [
                    f"{count}体のゾンビが近くにいるよ！気をつけて！",
                    f"近くに{count}体…静かに行動して…",
                    f"注意！目の前に{count}体いるよ！"
                ]
            else:
                # 遠距離
                texts = [
                    f"{count}体のゾンビを発見…大丈夫、落ち着いて",
                    f"大丈夫、{count}体だけだよ…冷静に",
                    f"{count}体のゾンビがいるけど、まだ気づかれてないよ"
                ]
            text = random.choice(texts)
            safe_speak_with_preset(
                text=text,
                preset_name="altu",
                emotion="normal",
                force=True
            )
        elif resnet_result and resnet_prob > 0.7:
            # ResNetのみが検出（雰囲気）
            texts = [
                "なんだか変な気配がする…注意して",
                "何かいる気がする…気のせいかな？",
                "ゾンビの気配を感じる…でも見えないね"
            ]
            text = random.choice(texts)
            safe_speak_with_preset(
                text=text,
                preset_name="sigh",
                emotion="囁き",
                force=True
            )

# 旧バージョンとの互換性のために残す
def legacy_react_to_zombie(count: int, distance: float = 0.0) -> None:
    """
    ゾンビ検出に対して適切な音声で反応（旧バージョン、互換性のために残す）
    
    Args:
        count: ゾンビの数
        distance: 最も近いゾンビとの距離（m）
    """
    if count >= 5:
        # 大量のゾンビを検出
        safe_speak_with_preset(
            text="危険です！大量のゾンビが接近中です！すぐに避難してください！",
            preset_name="scream",
            emotion="びっくり",
            force=True
        )
    elif count >= 2:
        # 複数のゾンビを検出
        safe_speak_with_preset(
            text=f"警告！{count}体のゾンビを検出しました。注意してください。",
            preset_name="gasp",
            emotion="警戒・心配"
        )
    elif count == 1:
        # 1体のゾンビを検出
        if distance < 5.0:
            # 近距離
            safe_speak_with_preset(
                text="ゾンビが近くにいます！気をつけてください！",
                preset_name="altu",
                emotion="びっくり"
            )
        else:
            # 遠距離
            safe_speak_with_preset(
                text="ゾンビを発見しました。",
                preset_name="altu",
                emotion="normal"
            ) 