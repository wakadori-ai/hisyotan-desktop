"""
ヘルスチェックルーター

サーバーのヘルスチェックエンドポイントとテスト機能を提供
"""

from fastapi import APIRouter, Query
import asyncio
from ..ws.manager import send_notification

# ルーターの作成
router = APIRouter()

@router.get("/health")
async def health_check():
    """
    ヘルスチェックエンドポイント
    サーバーの稼働状態と現在の時刻を返します
    """
    return {"status": "ok", "server_time": asyncio.get_event_loop().time()}

@router.post("/api/health/test")
async def health_test_endpoint(value: int = Query(..., description="体力値（0-100）")):
    """
    体力値テストエンドポイント
    
    Args:
        value: テスト用の体力値（0-100）
    """
    # 値を範囲内に制限
    health_value = max(0, min(100, value))
    
    # 体力値に応じてメッセージを変更
    if health_value <= 10:
        message = f"危険！体力が非常に低いです: {health_value}%"
        message_type = "error"
        title = "❗ 体力危機"
        importance = "high"
    elif health_value <= 30:
        message = f"注意：体力が低下しています: {health_value}%"
        message_type = "warning"
        title = "⚠️ 体力警告"
        importance = "high"
    elif health_value <= 60:
        message = f"体力が中程度です: {health_value}%"
        message_type = "info"
        title = "ℹ️ 体力情報"
        importance = "normal"
    else:
        message = f"体力は良好です: {health_value}%"
        message_type = "success"
        title = "✅ 体力良好"
        importance = "normal"
    
    # 通知を送信
    await send_notification(
        message=message,
        message_type=message_type,
        title=title,
        importance=importance
    )
    
    # レスポンスを返す
    return {
        "status": "success", 
        "message": "体力テスト通知を送信しました",
        "health_value": health_value
    } 