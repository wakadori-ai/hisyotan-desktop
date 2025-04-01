"""
メッセージルーター

テキストメッセージの処理と通知エンドポイントを提供
"""

from fastapi import APIRouter
from ..models import MessageModel
from ..ws.manager import send_notification
from ..voice.engine import safe_play_voice
from ..config import Config

# ルーターの作成
router = APIRouter()

@router.post("/api/message")
async def send_message(message: MessageModel):
    """
    メッセージを送信するエンドポイント
    
    Args:
        message: 送信するメッセージモデル（テキストと感情）
    """
    # メッセージテキスト
    text = message.text
    # 感情（デフォルトは "normal"）
    emotion = message.emotion or "normal"
    
    # 感情に応じたタイトルとスタイルを設定
    if emotion == "warning":
        title = "⚠️ 警告"
        message_type = "warning"
        importance = "high"
    elif emotion == "error":
        title = "🚫 エラー"
        message_type = "error"
        importance = "high"
    elif emotion == "success":
        title = "✅ 成功"
        message_type = "success"
        importance = "normal"
    else:  # normal
        title = "ℹ️ 情報"
        message_type = "info"
        importance = "normal"
    
    # 通知を送信
    await send_notification(
        message=text,
        message_type=message_type,
        title=title,
        importance=importance,
        skipAudio=False
    )
    
    # 感情に合った音声プリセットを選択
    voice_preset = None
    if emotion == "warning":
        voice_preset = Config.VOICE_PRESETS.get("警戒・心配")
    elif emotion == "error":
        voice_preset = Config.VOICE_PRESETS.get("びっくり")
    elif emotion == "success":
        voice_preset = Config.VOICE_PRESETS.get("にこにこ")
    else:  # normal
        voice_preset = Config.VOICE_PRESETS.get("やさしい")
    
    # 音声合成・再生
    if voice_preset:
        safe_play_voice(
            text,
            speaker_id=Config.VOICEVOX_SPEAKER,
            speed=voice_preset["speed"],
            pitch=voice_preset["pitch"],
            intonation=voice_preset["intonation"],
            message_type="message"
        )
    
    # レスポンスを返す
    return {"status": "success", "message": "メッセージを送信しました"} 