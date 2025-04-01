"""
イベントルーター

ゲームやシステムイベントを処理するエンドポイント
"""

from fastapi import APIRouter, Query
import logging
from ..models import EventModel
from ..zombie.callbacks import zombie_few_alert, zombie_warning
from ..zombie.monitor import log_zombie_detection
from ..ws.manager import send_notification

# ロガー設定
logger = logging.getLogger(__name__)

# ルーター作成
router = APIRouter()

@router.post("/event")
async def receive_event(event: EventModel):
    """
    ゲームイベントを受信するエンドポイント
    
    Args:
        event: イベントモデル（タイプとデータを含む）
    """
    event_type = event.type
    event_data = event.data or {}
    
    # イベントタイプに応じた処理
    if event_type == "game_start":
        await send_notification(
            "ゲームが開始されました",
            message_type="info",
            title="ゲーム開始",
            importance="normal"
        )
        return {"status": "success", "message": "ゲーム開始イベントを処理しました"}
        
    elif event_type == "game_end":
        await send_notification(
            "ゲームが終了しました",
            message_type="info", 
            title="ゲーム終了",
            importance="normal"
        )
        return {"status": "success", "message": "ゲーム終了イベントを処理しました"}
        
    elif event_type == "zombie_detected":
        count = event_data.get("count", 0)
        log_zombie_detection(count)
        
        # ゾンビ数に応じて処理を分岐
        if count >= 5:
            # 多数のゾンビ（この処理はゾンビ検出から直接呼ばれるべき）
            return {"status": "warning", "message": f"多数のゾンビを検出: {count}体"}
        elif count >= 2:
            # 少数のゾンビ
            result = await zombie_few_alert(count)
            return result
        else:
            # 警戒レベルのゾンビ
            result = await zombie_warning(count)
            return result
    
    # 未知のイベントタイプ
    logger.warning(f"未知のイベントタイプを受信: {event_type}")
    return {"status": "warning", "message": f"未知のイベントタイプ: {event_type}"}

@router.post("/api/zombie_alert")
async def zombie_alert(
    count: int = Query(..., description="検出されたゾンビの数"), 
    play_audio: bool = Query(True, description="音声を再生するかどうか"),
    force: bool = Query(False, description="クールダウンを無視して強制的に再生するか")
):
    """
    ゾンビアラートを手動でトリガーするエンドポイント
    
    Args:
        count: 検出されたゾンビの数
        play_audio: 音声を再生するかどうか
        force: クールダウンを無視して強制的に再生するか
    """
    log_zombie_detection(count)
    
    # ゾンビ数に応じて処理を分岐
    if count >= 5:
        # これは通常はゾンビ検出プロセスから直接呼ばれるべき
        # 代わりに少数ゾンビアラートを使用
        result = await zombie_few_alert(count, play_audio, force)
        result["message"] = "多数ゾンビアラートをシミュレートしました"
        return result
    elif count >= 2:
        # 少数のゾンビ
        result = await zombie_few_alert(count, play_audio, force)
        return result
    else:
        # 警戒レベルのゾンビ
        result = await zombie_warning(count, play_audio, force)
        return result 