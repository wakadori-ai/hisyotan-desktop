"""
シャットダウンハンドラー

アプリケーション終了時の処理を管理します
"""

import logging
import asyncio
from typing import Optional

# ロガーの設定
logger = logging.getLogger(__name__)

# グローバル変数
_shutdown_complete = False


async def on_shutdown() -> None:
    """
    アプリケーション終了時のハンドラー
    
    終了時に必要なクリーンアップ処理を実行します
    """
    global _shutdown_complete
    
    if _shutdown_complete:
        logger.info("シャットダウン処理は既に完了しています")
        return
    
    try:
        # ゾンビ監視の停止
        await stop_zombie_monitoring()
        
        # その他のクリーンアップ処理
        await cleanup_resources()
        
        _shutdown_complete = True
        logger.info("シャットダウン処理が完了しました")
        
    except Exception as e:
        logger.error(f"シャットダウン処理中にエラーが発生: {e}")


async def stop_zombie_monitoring() -> None:
    """
    ゾンビ検出の監視を停止
    """
    try:
        from ..zombie.service import get_zombie_service
        
        # ゾンビサービスが利用可能なら監視を停止
        try:
            zombie_service = get_zombie_service()
            await zombie_service.stop_monitoring()
            logger.info("ゾンビ監視を停止しました")
        except ImportError:
            logger.warning("ゾンビサービスが利用できません")
            
    except Exception as e:
        logger.error(f"ゾンビ監視の停止中にエラーが発生: {e}")


async def cleanup_resources() -> None:
    """
    リソースのクリーンアップ処理
    """
    try:
        # 一時ファイルの削除など、必要に応じてクリーンアップ処理を実装
        
        # WebSocketの接続クローズ
        from ..routers.ws_router import close_all_connections
        await close_all_connections()
        logger.info("WebSocket接続をクローズしました")
        
        # 非同期タスクの完了を待機
        tasks = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
        if tasks:
            logger.info(f"{len(tasks)}個の非同期タスクの完了を待機しています...")
            await asyncio.gather(*tasks, return_exceptions=True)
            
    except Exception as e:
        logger.error(f"リソースのクリーンアップ中にエラーが発生: {e}")
        # クリーンアップ処理は致命的でないので例外は再スローしない 