"""
モデル定義モジュール

主にFastAPIで使用するためのPydanticモデル定義を提供
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel

class MessageModel(BaseModel):
    """
    ユーザーメッセージモデル
    """
    text: str
    emotion: Optional[str] = "normal"

class HealthTestModel(BaseModel):
    """
    健康テスト用モデル
    """
    value: int

class EventModel(BaseModel):
    """
    ゲームイベントモデル
    """
    type: str
    data: Optional[Dict[str, Any]] = None 