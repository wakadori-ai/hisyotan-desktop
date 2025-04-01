"""
ルートエンドポイントルーター

アプリケーションのルートパスとヘルスチェックエンドポイントを提供
"""

from fastapi import APIRouter

# ルーターの作成
router = APIRouter()

@router.get("/")
async def root():
    """
    アプリケーションのルートエンドポイント
    サーバーの稼働状態を確認できます
    """
    return {"status": "ok", "message": "7DTD秘書たんAPI サーバーが稼働中です。"} 