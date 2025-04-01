"""
モデルパッケージ

アプリケーションのデータモデルを定義するパッケージ
"""

from .events import (
    ZombieDetectedEvent,
    PlayerStatusEvent,
    ErrorEvent,
    SystemEvent,
    EventType,
    ThreatLevel
)

# 型ヒントのために必要な共通の基底インターフェースクラスを定義
from typing import Protocol, runtime_checkable

@runtime_checkable
class BaseEvent(Protocol):
    """イベントの基底インターフェース"""
    event_type: EventType
    
__all__ = [
    'BaseEvent',
    'ZombieDetectedEvent',
    'PlayerStatusEvent',
    'ErrorEvent',
    'SystemEvent',
    'EventType',
    'ThreatLevel'
] 