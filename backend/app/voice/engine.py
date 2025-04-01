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
from typing import Optional, Dict, Any, Tuple, Union, List, cast

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

# テキストを音声に変換して再生
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
    VOICEVOXを使用してテキストを音声に変換し再生
    
    Args:
        text: 発話するテキスト
        speaker_id: 話者ID
        speed: 話速（1.0が標準）
        pitch: ピッチ（0.0が標準）
        intonation: イントネーション（1.0が標準）
        volume: 音量（1.0が標準）
        force: クールダウンを無視して強制的に再生
    
    Returns:
        str: WAVファイルのパス（成功時）
    """
    from ..config import get_settings
    
    # 設定の取得
    settings = get_settings()
    
    # クールダウンチェック
    current_time = time.time()
    with voice_lock:
        global last_voice_time, audio_playing
        
        # 強制フラグがなく、クールダウン中なら何もしない
        if not force and current_time - last_voice_time < settings.VOICE_COOLDOWN:
            logger.debug("音声再生クールダウン中")
            return None
            
        # 音声再生中なら何もしない
        if audio_playing:
            logger.debug("前の音声再生中のため、新しい音声をスキップ")
            return None
        
        last_voice_time = current_time
        audio_playing = True
        
    try:
        # 音声合成リクエストを2段階で行う
        # 1. 音声合成用のクエリを作成
        params = {
            "text": text,
            "speaker": speaker_id
        }
        
        # 音声パラメータを追加
        if speed != 1.0 or pitch != 0.0 or intonation != 1.0:
            params["speedScale"] = speed
            params["pitchScale"] = pitch
            params["intonationScale"] = intonation
            params["volumeScale"] = volume
            
        # 音声合成クエリの作成リクエスト
        query_response = requests.post(
            f"{settings.VOICEVOX_HOST}/audio_query",
            params=params
        )
        
        if query_response.status_code != 200:
            logger.error(f"音声合成クエリの作成に失敗: {query_response.text}")
            reset_audio_playback()
            return None
            
        voice_params = query_response.json()
        
        # 2. 音声合成の実行
        synthesis_response = requests.post(
            f"{settings.VOICEVOX_HOST}/synthesis",
            headers={"Content-Type": "application/json"},
            params={"speaker": speaker_id},
            data=json.dumps(voice_params)
        )
        
        if synthesis_response.status_code != 200:
            logger.error(f"音声合成に失敗: {synthesis_response.text}")
            reset_audio_playback()
            return None
            
        # 一時的なWAVファイルに保存
        temp_dir = settings.TEMP_DIR
        os.makedirs(temp_dir, exist_ok=True)
        
        # タイムスタンプを含むファイル名を生成
        timestamp = int(time.time())
        wav_filename = f"voice_{timestamp}.wav"
        wav_path = os.path.join(temp_dir, wav_filename)
        
        with open(wav_path, "wb") as f:
            f.write(synthesis_response.content)
            
        logger.debug(f"WAVファイルを保存: {wav_path}")
        
        # 音声再生
        play_voice(wav_path)
        
        return wav_path
    except Exception as e:
        reset_audio_playback()
        logger.error(f"VOICEVOXエンジンエラー: {str(e)}")
        return None
        
# 音声ファイルを再生
def play_voice(wav_path: str):
    """
    WAVファイルを再生
    
    Args:
        wav_path: 再生するWAVファイルのパス
    """
    try:
        # Windows環境での再生
        command = f'powershell -c "(New-Object Media.SoundPlayer \'{wav_path}\').PlaySync();"'
        
        # 別プロセスで非同期実行
        def play_process():
            try:
                os.system(command)
                # 音声再生が終了したらフラグをリセット
                reset_audio_playback()
            except Exception as e:
                logger.error(f"音声再生エラー: {str(e)}")
                reset_audio_playback()
        
        # 別スレッドで音声再生
        play_thread = threading.Thread(target=play_process)
        play_thread.daemon = True
        play_thread.start()
        
    except Exception as e:
        logger.error(f"音声再生エラー: {str(e)}")
        reset_audio_playback() 