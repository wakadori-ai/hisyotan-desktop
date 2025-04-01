"""
WebSocket接続管理モジュール

WebSocket接続の管理と通知メッセージの送信を担当
"""

import logging
import time
from typing import Dict, Any, List
from fastapi import WebSocket

# ロガーの設定
logger = logging.getLogger(__name__)

# WebSocket接続マネージャー
class ConnectionManager:
    """
    WebSocket接続を管理するマネージャークラス
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """
        新しいWebSocket接続を受け入れる
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket接続が確立されました。現在の接続数: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """
        WebSocket接続を切断する
        """
        self.active_connections.remove(websocket)
        logger.info(f"WebSocket接続が切断されました。現在の接続数: {len(self.active_connections)}")

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """
        特定のクライアントにメッセージを送信する
        """
        await websocket.send_json(message)
        logger.debug(f"個別メッセージを送信しました: {message}")

    async def broadcast(self, message: Dict[str, Any]):
        """
        接続中の全クライアントにメッセージをブロードキャストする
        """
        for connection in self.active_connections:
            await connection.send_json(message)
        logger.debug(f"ブロードキャストメッセージを送信しました: {message}")

# シングルトンインスタンス
manager = ConnectionManager()

async def send_notification(
    message: str, 
    message_type: str = "info", 
    title: str = "通知", 
    importance: str = "normal", 
    skipAudio: bool = False
):
    """
    WebSocket経由でクライアントに通知を送信
    
    Args:
        message: 通知メッセージ
        message_type: 通知タイプ（info, warning, error, success, zombieAlert, fewZombiesAlert, zombieWarning）
        title: 通知タイトル
        importance: 重要度（normal, high, low）
        skipAudio: 音声読み上げをスキップするかどうか
    """
    # notification_manager がない場合に備えて現在時刻を使用
    current_timestamp = time.time()
    
    notification_data: Dict[str, Any] = {
        "type": "notification",
        "data": {
            "message": message,
            "messageType": message_type,
            "title": title,
            "importance": importance,
            "timestamp": current_timestamp,
            "skipAudio": skipAudio
        }
    }
    
    await manager.broadcast(notification_data)
    logger.info(f"通知を送信: {message_type} - {message}") 