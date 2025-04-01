"""
イベントパッケージ

イベント処理に関連するクラスとユーティリティを提供します
"""

from .dispatcher import EventDispatcher, get_event_dispatcher

__all__ = [
    'EventDispatcher',
    'get_event_dispatcher'
] 