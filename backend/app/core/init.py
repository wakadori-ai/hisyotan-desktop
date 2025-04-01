"""
アプリケーションコア初期化モジュール

FastAPIアプリケーションの初期化とミドルウェア、静的ファイル設定を管理
"""

import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

# 設定のインポート
from ..config import STATIC_DIR, TEMP_DIR, DEBUG_MODE, IMAGES_DIR

# ロガー設定
logger = logging.getLogger(__name__)

def create_application() -> FastAPI:
    """
    FastAPIアプリケーションを作成して設定する
    
    Returns:
        FastAPI: 初期化されたアプリケーションインスタンス
    """
    # FastAPI アプリケーションの作成
    app = FastAPI(
        title="7DTD秘書たん画面認識API",
        description="7DTD（7 Days to Die）の画面を認識して情報を提供するAPI",
        version="1.0.0",
    )

    # CORSミドルウェアの追加
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # 開発環境では"*"を使用。本番環境では適切に制限すること。
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # エラーハンドラーの設定
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request, exc):
        return JSONResponse(
            status_code=exc.status_code,
            content={"status": "error", "message": str(exc.detail)}
        )

    # 静的ファイルの提供
    try:
        # 静的ファイルディレクトリの作成確認
        os.makedirs(STATIC_DIR, exist_ok=True)
        os.makedirs(TEMP_DIR, exist_ok=True)
        
        # 静的ファイルのマウント
        app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
        app.mount("/temp", StaticFiles(directory=TEMP_DIR), name="temp")
        app.mount("/assets", StaticFiles(directory=IMAGES_DIR), name="assets")
        
        logger.info(f"静的ファイルディレクトリを設定: {STATIC_DIR}, {TEMP_DIR}, {IMAGES_DIR}")
    except Exception as e:
        logger.error(f"静的ファイルディレクトリの設定に失敗: {str(e)}")

    # ルーターの登録
    from ..routers import root, health, message, websocket, events, voice
    
    app.include_router(root.router)
    app.include_router(health.router)
    app.include_router(message.router)
    app.include_router(events.router)
    app.include_router(voice.router)
    
    # WebSocketエンドポイント
    app.include_router(websocket.router)
    
    return app 