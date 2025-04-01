"""
音声合成ルーター

VOICEVOX連携の音声合成および再生に関するエンドポイント
"""

import os
import json
import logging
import requests
from fastapi import APIRouter, Query, Request, HTTPException, Response
from starlette.responses import JSONResponse
from pydantic import BaseModel
from ..config import Settings, get_settings
from ..voice.engine import safe_play_voice, speak_with_emotion, synthesize_direct

# ロガー設定
logger = logging.getLogger(__name__)

# ルーター作成
router = APIRouter()

# 設定の取得
settings = get_settings()

# リクエストモデル
class VoiceSynthesisRequest(BaseModel):
    text: str
    emotion: str = "normal"
    speaker_id: int = 8

@router.post("/api/voice/speaker")
async def change_voice_speaker(speaker_id: int = Query(3, description="話者ID")):
    """
    VOICEVOX話者を変更するエンドポイント
    
    Args:
        speaker_id: VOICEVOX話者ID
    """
    try:
        logger.info(f"VOICEVOXの話者を変更します: ID={speaker_id}")
        
        # Config を更新
        settings.VOICEVOX_SPEAKER = speaker_id
        
        # 成功レスポンス
        return {
            "status": "success",
            "message": f"話者を変更しました (ID: {speaker_id})",
            "speaker_id": speaker_id
        }
    except Exception as e:
        logger.error(f"話者変更エラー: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error", 
                "message": f"話者変更に失敗しました: {str(e)}"
            }
        )

@router.post("/api/voice/synthesize")
async def synthesize_voice(request: VoiceSynthesisRequest):
    """
    テキストを音声に変換して返すエンドポイント（ファイル保存・再生なし）
    VOICEVOXを使用して音声合成を行い、WAVデータを直接返す
    
    Request Body:
        text: 音声に変換するテキスト
        emotion: 感情 (オプション)
        speaker_id: 話者ID (オプション)
    """
    try:
        text = request.text
        speaker = request.speaker_id
        emotion = request.emotion
        
        if not text:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "テキストが空です"}
            )
        
        logger.info(f"音声合成リクエスト: text={text[:20]}..., speaker={speaker}, emotion={emotion}")
        
        # 直接音声合成を実行して音声データ（bytes）を取得
        audio_data = await synthesize_direct(text, speaker, emotion)
        
        if not audio_data:
            logger.error("音声合成に失敗: synthesize_direct関数がNoneを返しました")
            return JSONResponse(
                status_code=500,
                content={"status": "error", "message": "音声合成に失敗しました"}
            )
        
        # 音声データをレスポンスとして返す
        logger.info(f"音声合成成功: {len(audio_data)} バイトの音声を返します")
        return Response(
            content=audio_data,
            media_type="audio/wav"
        )
        
    except Exception as e:
        import traceback
        logger.error(f"音声合成エラー: {str(e)}")
        logger.error(f"詳細なエラー情報: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error", 
                "message": f"音声合成に失敗しました: {str(e)}"
            }
        )

@router.get("/api/voice/check-connection")
async def check_voicevox_connection():
    """VOICEVOXとの接続状態を確認するエンドポイント"""
    try:
        host = settings.VOICEVOX_HOST
        response = requests.get(f"{host}/version", timeout=2)
        
        if response.status_code == 200:
            version = response.text
            logger.info(f"VOICEVOX接続確認: バージョン {version}")
            return {"connected": True, "version": version}
        else:
            logger.warning(f"VOICEVOX接続失敗: ステータス {response.status_code}")
            return {"connected": False, "error": f"ステータス {response.status_code}"}
            
    except Exception as e:
        logger.error(f"VOICEVOX接続確認エラー: {str(e)}")
        return {"connected": False, "error": str(e)}

# 既存の再生込みのエンドポイント（互換性のために残す）
@router.post("/api/voice/synthesize-play")
async def synthesize_and_play_voice(request: Request):
    """
    テキストを音声に変換して再生するエンドポイント
    VOICEVOXを使用して音声合成を行う
    
    Request Body:
        text: 音声に変換するテキスト
        speaker: 話者ID (オプション)
        emotion: 感情 (オプション)
        speedScale: 話速 (オプション)
        pitchScale: ピッチ (オプション)
        intonationScale: イントネーション (オプション)
        volumeScale: 音量 (オプション)
    """
    try:
        data = await request.json()
        text = data.get('text', '')
        speaker = data.get('speaker', settings.VOICEVOX_SPEAKER)
        emotion = data.get('emotion', 'normal')
        speed_scale = data.get('speedScale', 1.0)
        pitch_scale = data.get('pitchScale', 0.0)
        intonation_scale = data.get('intonationScale', 1.0)
        volume_scale = data.get('volumeScale', 1.0)
        
        if not text:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "テキストが空です"}
            )
        
        logger.info(f"音声合成＆再生リクエスト: text={text[:20]}..., speaker={speaker}, emotion={emotion}")
        
        # 感情に応じた音声プリセットを適用
        voice_preset = None
        if emotion in settings.VOICE_PRESETS:
            voice_preset = settings.VOICE_PRESETS[emotion]
            if voice_preset:
                speed_scale = voice_preset.get("speed", speed_scale)
                pitch_scale = voice_preset.get("pitch", pitch_scale)
                intonation_scale = voice_preset.get("intonation", intonation_scale)
        
        # 音声合成クエリの作成リクエスト
        query_response = requests.post(
            f"{settings.VOICEVOX_HOST}/audio_query",
            params={"text": text, "speaker": speaker}
        )
        
        if query_response.status_code != 200:
            return JSONResponse(
                status_code=500,
                content={
                    "status": "error", 
                    "message": f"音声クエリ生成エラー: {query_response.status_code}"
                }
            )
        
        query_data = query_response.json()
        
        # 音声パラメータを設定
        query_data["speedScale"] = speed_scale
        query_data["pitchScale"] = pitch_scale
        query_data["intonationScale"] = intonation_scale
        query_data["volumeScale"] = volume_scale
        
        # 音声合成の実行
        synthesis_response = requests.post(
            f"{settings.VOICEVOX_HOST}/synthesis",
            headers={"Content-Type": "application/json"},
            params={"speaker": speaker},
            data=json.dumps(query_data)
        )
        
        if synthesis_response.status_code != 200:
            return JSONResponse(
                status_code=500,
                content={
                    "status": "error", 
                    "message": f"音声合成エラー: {synthesis_response.status_code}"
                }
            )
        
        # 一時ファイルに保存
        audio_data = synthesis_response.content
        timestamp = int(os.path.getmtime(__file__))
        temp_file = os.path.join(settings.TEMP_DIR, f"voice_{timestamp}.wav")
        
        os.makedirs(settings.TEMP_DIR, exist_ok=True)
        with open(temp_file, "wb") as f:
            f.write(audio_data)
        
        # Windows環境での再生コマンド
        play_command = f'powershell -c "(New-Object Media.SoundPlayer \'{temp_file}\').PlaySync();"'
        os.system(play_command)
        
        return {
            "status": "success",
            "message": "音声合成が完了しました",
            "file": temp_file
        }
    except Exception as e:
        logger.error(f"音声合成エラー: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error", 
                "message": f"音声合成に失敗しました: {str(e)}"
            }
        )

@router.post("/api/voice/analyze")
async def analyze_voice(request: Request):
    """
    テキストの感情を分析して最適なパラメータで音声合成するエンドポイント
    
    Request Body:
        text: 音声に変換するテキスト
        speaker: 話者ID (オプション)
        force: 強制再生フラグ (オプション)
    """
    try:
        data = await request.json()
        text = data.get('text', '')
        speaker = data.get('speaker', settings.VOICEVOX_SPEAKER)
        force = data.get('force', False)
        
        if not text:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "テキストが空です"}
            )
        
        logger.info(f"感情分析＆音声合成リクエスト: text={text[:20]}..., speaker={speaker}")
        
        # テキストを分析して最適な音声パラメータで合成
        wav_path, analysis_result = speak_with_emotion(
            text,
            speaker_id=speaker,
            force=force,
            message_type="analyzed_voice"
        )
        
        if not wav_path:
            return JSONResponse(
                status_code=500,
                content={
                    "status": "error", 
                    "message": "音声合成に失敗しました"
                }
            )
        
        return {
            "status": "success",
            "message": "感情分析による音声合成が完了しました",
            "file": wav_path,
            "analysis": {
                "emotion": analysis_result["emotion"],
                "parameters": analysis_result["parameters"],
                "explanation": analysis_result["explanation"]
            }
        }
    except Exception as e:
        logger.error(f"感情分析・音声合成エラー: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error", 
                "message": f"感情分析・音声合成に失敗しました: {str(e)}"
            }
        )

# 新しいエンドポイント: フロントエンドから音声合成と再生をリクエスト
@router.post("/api/voice/speak")
async def speak_text(request: VoiceSynthesisRequest):
    """
    テキストを音声に変換し、バックエンド側で直接再生するエンドポイント
    VOICEVOXを使用して音声合成を行い、バックエンドで音声を再生する
    
    Request Body:
        text: 音声に変換するテキスト
        emotion: 感情 (オプション)
        speaker_id: 話者ID (オプション)
    
    Returns:
        JSONResponse: 処理結果
    """
    try:
        text = request.text
        speaker_id = request.speaker_id
        emotion = request.emotion
        
        if not text:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "テキストが空です"}
            )
        
        logger.info(f"音声合成＆再生リクエスト: text={text[:20]}..., speaker={speaker_id}, emotion={emotion}")
        
        # 感情と話者IDを基に音声合成＆再生
        from ..voice.engine import safe_play_voice
        
        # 感情に応じた音声パラメータを設定
        voice_preset = settings.VOICE_PRESETS.get(emotion, {})
        speed_scale = voice_preset.get("speed", 1.0)
        pitch_scale = voice_preset.get("pitch", 0.0)
        intonation_scale = voice_preset.get("intonation", 1.0)
        volume_scale = voice_preset.get("volume", 1.0)
        
        # 非同期で音声合成＆再生（別スレッドで実行して即座に応答）
        def play_in_thread():
            try:
                wav_path = safe_play_voice(
                    text, 
                    speaker_id,
                    speed=speed_scale,
                    pitch=pitch_scale,
                    intonation=intonation_scale,
                    volume=volume_scale,
                    message_type=f"speak_{emotion}"
                )
                logger.info(f"音声再生完了: {wav_path if wav_path else 'なし'}")
            except Exception as e:
                logger.error(f"音声再生スレッドエラー: {str(e)}")
                
        # 別スレッドで実行して即座に応答
        import threading
        thread = threading.Thread(target=play_in_thread)
        thread.daemon = True
        thread.start()
        
        return {
            "status": "success",
            "message": "音声再生リクエストを受け付けました",
            "details": {
                "text": text[:30] + "..." if len(text) > 30 else text,
                "emotion": emotion,
                "speaker_id": speaker_id
            }
        }
        
    except Exception as e:
        import traceback
        logger.error(f"音声再生リクエストエラー: {str(e)}")
        logger.error(f"詳細なエラー情報: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error", 
                "message": f"音声再生リクエストに失敗しました: {str(e)}"
            }
        ) 