"""
スタートアップハンドラー

アプリケーション起動時の処理を管理します
"""

import logging
import asyncio
from typing import Optional

# ロガーの設定
logger = logging.getLogger(__name__)

# グローバル変数
_startup_complete = False


async def on_startup() -> None:
    """
    アプリケーション起動時のハンドラー
    
    起動時に必要な初期化処理を実行します
    """
    global _startup_complete
    
    if _startup_complete:
        logger.info("スタートアップ処理は既に完了しています")
        return
    
    try:
        # 各種サービスの初期化
        await init_services()
        
        # ゾンビ監視の開始
        await start_zombie_monitoring()
        
        _startup_complete = True
        logger.info("スタートアップ処理が完了しました")
        
    except Exception as e:
        logger.error(f"スタートアップ処理中にエラーが発生: {e}")
        raise


async def init_services() -> None:
    """
    各種サービスの初期化
    """
    from ..services.voice import get_voice_service
    from ..config import get_settings
    from ..voice.voicevox_starter import start_voicevox_in_thread
    
    try:
        # 設定の読み込み
        settings = get_settings()
        logger.info("設定を読み込みました")
        
        # VOICEVOXエンジンの起動（非同期）
        start_voicevox_in_thread()
        logger.info("VOICEVOXエンジンの起動処理を開始しました")
        
        # 音声サービスの初期化
        voice_service = get_voice_service()
        logger.info("音声サービスを初期化しました")
        
        # WebSocketマネージャーの初期化は自動的に行われます
        logger.info("各種サービスの初期化が完了しました")
        
    except Exception as e:
        logger.error(f"サービスの初期化中にエラーが発生: {e}")
        raise


async def start_zombie_monitoring() -> None:
    """
    ゾンビ検出の監視を開始
    """
    try:
        # 開発中の機能のため、モジュールが存在しない場合はスキップ
        try:
            from ..zombie.service import get_zombie_service
            
            # ゾンビサービスの取得
            zombie_service = get_zombie_service()
            
            # 監視の開始
            await zombie_service.start_monitoring()
            logger.info("ゾンビ監視を開始しました")
        except ImportError as e:
            logger.warning(f"ゾンビ監視モジュールが見つかりません。この機能はスキップされます。エラー: {e}")
        
    except Exception as e:
        logger.error(f"ゾンビ監視の開始中にエラーが発生: {e}")
        # 致命的でないエラーなので例外は再スローしない 