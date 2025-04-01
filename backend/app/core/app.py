"""
アプリケーション生成モジュール

FastAPIアプリケーションの生成と初期化を行います
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# 設定のインポート
from ..config import get_settings

# ロガーの設定
logger = logging.getLogger(__name__)


def create_application() -> FastAPI:
    """
    FastAPIアプリケーションを作成して初期化
    
    Returns:
        FastAPI: 初期化されたFastAPIインスタンス
    """
    settings = get_settings()
    
    # FastAPI アプリケーションの作成
    app = FastAPI(
        title="7DTD秘書たんAPI",
        description="7 Days to Die と連携する秘書たんシステムのAPI",
        version="1.0.0",
    )
    
    # CORSミドルウェアの追加
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 開発環境では"*"を使用。本番環境では適切に制限する
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # 静的ファイルを提供するディレクトリを設定
    try:
        for mount_path, directory in [
            ("/static", settings.STATIC_DIR),
            ("/temp", settings.TEMP_DIR),
            ("/shared", settings.SHARED_DIR),
        ]:
            # ディレクトリの存在確認
            dir_path = Path(directory)
            if not dir_path.exists():
                dir_path.mkdir(parents=True, exist_ok=True)
                logger.info(f"静的ファイルディレクトリを作成: {directory}")
                
            # マウント
            app.mount(mount_path, StaticFiles(directory=directory), name=mount_path.strip('/'))
            logger.info(f"静的ファイルをマウント: {mount_path} -> {directory}")
            
    except Exception as e:
        logger.error(f"静的ファイルのマウント中にエラーが発生: {e}")
    
    # ルーターの読み込みと登録
    register_routers(app)
    
    # イベントハンドラの登録
    register_event_handlers(app)
    
    return app


def register_routers(app: FastAPI) -> None:
    """
    ルーターを登録
    
    Args:
        app: FastAPIアプリケーションインスタンス
    """
    try:
        # 各種ルーターのインポート
        from ..routers import health_router, voice_router, websocket_router
        
        # ルーターの登録
        app.include_router(health_router)
        app.include_router(voice_router)
        app.include_router(websocket_router)
        
        logger.info("ルーターを登録しました")
        
    except Exception as e:
        logger.error(f"ルーターの登録中にエラーが発生: {e}")


def register_event_handlers(app: FastAPI) -> None:
    """
    イベントハンドラを登録
    
    Args:
        app: FastAPIアプリケーションインスタンス
    """
    from ..events import startup_handler, shutdown_handler
    
    # スタートアップイベント
    @app.on_event("startup")
    async def startup_event():
        """アプリケーション起動時の処理"""
        logger.info("アプリケーションを起動しています...")
        await startup_handler.on_startup()
        logger.info("アプリケーションの起動が完了しました")
    
    # シャットダウンイベント
    @app.on_event("shutdown")
    async def shutdown_event():
        """アプリケーション終了時の処理"""
        logger.info("アプリケーションをシャットダウンしています...")
        await shutdown_handler.on_shutdown()
        logger.info("アプリケーションのシャットダウンが完了しました") 