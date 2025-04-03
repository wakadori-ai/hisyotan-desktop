"""
設定管理ルーター

アプリケーション設定の取得・更新APIを提供
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Union, Optional

# ゾンビ設定のインポート
from ..zombie.config import get_zombie_config

# カスタムロガーの設定
logger = logging.getLogger(__name__)

# ルーターの作成
router = APIRouter(
    prefix="/api/settings",
    tags=["settings"],
    responses={404: {"description": "Not found"}},
)

# リクエストモデル
class SettingUpdateRequest(BaseModel):
    """設定更新リクエスト"""
    key: str
    value: Union[bool, str, int, float]
    
# レスポンスモデル
class SettingResponse(BaseModel):
    """設定レスポンス"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

@router.post("/update", response_model=SettingResponse)
async def update_setting(request: SettingUpdateRequest):
    """
    設定を更新するエンドポイント
    
    Args:
        request: 設定更新リクエスト
        
    Returns:
        SettingResponse: 更新結果
        
    Raises:
        HTTPException: 更新が失敗した場合
    """
    try:
        # リクエストのログ
        logger.info(f"🔄 設定更新リクエスト: key={request.key}, value={request.value}")
        
        # ゾンビ設定インスタンスを取得
        zombie_config = get_zombie_config()
        
        # 設定を更新
        success = zombie_config.update_setting(request.key, request.value)
        
        if success:
            # 更新成功
            return SettingResponse(
                success=True,
                message=f"設定を更新しました: {request.key}={request.value}",
                data={
                    "key": request.key,
                    "value": zombie_config.get_setting(request.key),
                    "all_settings": zombie_config.get_all_settings()
                }
            )
        else:
            # 更新失敗
            raise HTTPException(
                status_code=400,
                detail=f"設定の更新に失敗しました: {request.key}"
            )
    except Exception as e:
        logger.error(f"❌ 設定更新エラー: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"設定更新中にエラーが発生しました: {str(e)}"
        )

@router.get("/all", response_model=SettingResponse)
async def get_all_settings():
    """
    すべての設定を取得するエンドポイント
    
    Returns:
        SettingResponse: すべての設定
    """
    try:
        # ゾンビ設定インスタンスを取得
        zombie_config = get_zombie_config()
        
        # すべての設定を取得
        all_settings = zombie_config.get_all_settings()
        
        return SettingResponse(
            success=True,
            message="設定を取得しました",
            data={"settings": all_settings}
        )
    except Exception as e:
        logger.error(f"❌ 設定取得エラー: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"設定取得中にエラーが発生しました: {str(e)}"
        ) 