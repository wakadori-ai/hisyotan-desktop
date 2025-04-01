"""
WebSocketルーター

WebSocket接続とリアルタイム通信を管理するエンドポイント
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging
from ..ws.manager import manager

# ロガー設定
logger = logging.getLogger(__name__)

# モック関数を実際のゾンビ監視状態を返す関数に変更
def is_monitoring_started():
    """ゾンビ監視が開始されているかどうかを返す"""
    try:
        from ..zombie.service import get_zombie_service
        # ゾンビサービスからモニタリング状態を取得
        service = get_zombie_service()
        # 監視タスクが存在するかどうかで判定
        return service.monitoring_task is not None
    except ImportError:
        logger.warning("ゾンビサービスモジュールがインポートできません。モニタリングは無効です。")
        return False
    except Exception as e:
        logger.error(f"ゾンビ監視状態の確認中にエラー: {str(e)}")
        return False

# ルーター作成
router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocketエンドポイント
    クライアントとのリアルタイム通信を確立する
    """
    await manager.connect(websocket)
    try:
        # 接続成功メッセージを送信
        await manager.send_personal_message(
            {"type": "system", "data": {"message": "WebSocket接続が確立されました。"}},
            websocket
        )
        
        # 現在の監視状態を送信
        status_data = {
            "type": "status",
            "data": {
                "monitoring_active": is_monitoring_started(),
                "server_status": "running"
            }
        }
        await manager.send_personal_message(status_data, websocket)
        
        # メッセージ受信ループ
        while True:
            data = await websocket.receive_json()
            
            # メッセージのタイプに応じた処理
            message_type = data.get("type", "unknown")
            
            if message_type == "ping":
                # ping-pongメッセージ
                await manager.send_personal_message(
                    {"type": "pong", "data": {"timestamp": data.get("timestamp", 0)}},
                    websocket
                )
            elif message_type == "command":
                # コマンド処理
                command = data.get("command", "")
                if command == "status":
                    # ステータス取得要求
                    await manager.send_personal_message(
                        {
                            "type": "status",
                            "data": {
                                "server_status": "running",
                                "monitoring_active": is_monitoring_started()
                            }
                        }, 
                        websocket
                    )
                elif command == "start_monitoring":
                    # 🆕 監視開始要求
                    try:
                        from ..zombie.service import get_zombie_service
                        
                        # ゾンビ監視の開始
                        service = get_zombie_service()
                        monitoring_task = await service.start_monitoring()
                        
                        success = monitoring_task is not None
                        message = "ゾンビ監視を開始しました" if success else "ゾンビ監視の開始に失敗しました"
                        
                        # 結果を通知
                        await manager.send_personal_message(
                            {
                                "type": "command_result",
                                "command": "start_monitoring",
                                "success": success,
                                "message": message
                            },
                            websocket
                        )
                        
                        # ステータス更新
                        await manager.send_personal_message(
                            {
                                "type": "status",
                                "data": {
                                    "server_status": "running",
                                    "monitoring_active": is_monitoring_started()
                                }
                            }, 
                            websocket
                        )
                        
                        # 全クライアントに通知
                        if success:
                            await manager.broadcast(
                                {
                                    "type": "notification",
                                    "data": {
                                        "messageType": "system",
                                        "message": "ゾンビ監視が開始されました。"
                                    }
                                }
                            )
                            
                            # 監視開始成功のメッセージも送信
                            await manager.broadcast(
                                {
                                    "type": "speak",
                                    "text": "ゾンビ監視を開始しました。何か見つけたらお知らせします。",
                                    "emotion": "happy",
                                    "display_time": 5000
                                }
                            )
                        
                    except Exception as e:
                        logger.error(f"ゾンビ監視開始中にエラー: {str(e)}")
                        await manager.send_personal_message(
                            {
                                "type": "command_result",
                                "command": "start_monitoring",
                                "success": False,
                                "message": f"エラー: {str(e)}"
                            },
                            websocket
                        )
                elif command == "stop_monitoring":
                    # 🆕 監視停止要求
                    try:
                        from ..zombie.service import get_zombie_service
                        
                        # ゾンビ監視の停止
                        service = get_zombie_service()
                        success = await service.stop_monitoring()
                        message = "ゾンビ監視を停止しました" if success else "ゾンビ監視の停止に失敗しました"
                        
                        # 結果を通知
                        await manager.send_personal_message(
                            {
                                "type": "command_result",
                                "command": "stop_monitoring",
                                "success": success,
                                "message": message
                            },
                            websocket
                        )
                        
                        # ステータス更新
                        await manager.send_personal_message(
                            {
                                "type": "status",
                                "data": {
                                    "server_status": "running",
                                    "monitoring_active": is_monitoring_started()
                                }
                            }, 
                            websocket
                        )
                        
                        # 全クライアントに通知
                        if success:
                            await manager.broadcast(
                                {
                                    "type": "notification",
                                    "data": {
                                        "messageType": "system",
                                        "message": "ゾンビ監視が停止されました。"
                                    }
                                }
                            )
                    except Exception as e:
                        logger.error(f"ゾンビ監視停止中にエラー: {str(e)}")
                        await manager.send_personal_message(
                            {
                                "type": "command_result",
                                "command": "stop_monitoring",
                                "success": False,
                                "message": f"エラー: {str(e)}"
                            },
                            websocket
                        )
    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("WebSocket接続が切断されました")
    except Exception as e:
        logger.error(f"WebSocket処理中のエラー: {str(e)}")
        manager.disconnect(websocket) 