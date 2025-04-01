"""
イベントディスパッチャ

イベントの発行と購読を管理するクラスを定義します
"""

import logging
import asyncio
from typing import Dict, List, Type, Callable, Any, Coroutine, Optional, Union
from ..models import BaseEvent  # models/__init__.pyからインポート

# ロガーの設定
logger = logging.getLogger(__name__)

# コールバックの型定義
SyncCallback = Callable[[BaseEvent], None]
AsyncCallback = Callable[[BaseEvent], Coroutine[Any, Any, None]]
CallbackType = Union[SyncCallback, AsyncCallback]


class EventDispatcher:
    """イベントの発行と購読を管理するクラス"""
    
    _instance: Optional['EventDispatcher'] = None
    
    def __new__(cls):
        """シングルトンパターンの実装"""
        if cls._instance is None:
            cls._instance = super(EventDispatcher, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """初期化（シングルトンなので1回だけ実行）"""
        if self._initialized:
            return
        
        self._subscribers: Dict[Type[BaseEvent], List[CallbackType]] = {}
        self._initialized = True
        logger.info("イベントディスパッチャを初期化しました")
    
    def subscribe(self, event_type: Type[BaseEvent], callback: CallbackType) -> None:
        """
        イベントの購読を登録
        
        Args:
            event_type: 購読するイベントの型
            callback: イベント発生時に呼び出すコールバック関数
        """
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        
        self._subscribers[event_type].append(callback)
        logger.debug(f"イベント {event_type.__name__} の購読を登録しました")
    
    def unsubscribe(self, event_type: Type[BaseEvent], callback: CallbackType) -> None:
        """
        イベントの購読を解除
        
        Args:
            event_type: 購読解除するイベントの型
            callback: 解除するコールバック関数
        """
        if event_type in self._subscribers and callback in self._subscribers[event_type]:
            self._subscribers[event_type].remove(callback)
            logger.debug(f"イベント {event_type.__name__} の購読を解除しました")
    
    async def dispatch(self, event: BaseEvent) -> None:
        """
        イベントを発行し、登録されたコールバックを非同期で実行
        
        Args:
            event: 発行するイベントオブジェクト
        """
        event_type = type(event)
        logger.debug(f"イベント {event_type.__name__} を発行します")
        
        if event_type not in self._subscribers:
            logger.debug(f"イベント {event_type.__name__} の購読者はいません")
            return
        
        for callback in self._subscribers[event_type]:
            try:
                # コールバックが非同期関数かどうかを判定
                if asyncio.iscoroutinefunction(callback):
                    # 非同期関数の場合は await で実行
                    await callback(event)
                else:
                    # 同期関数の場合は run_in_executor で実行
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(None, callback, event)
                    
            except Exception as e:
                logger.error(f"イベント {event_type.__name__} のコールバック実行中にエラーが発生: {e}")
    
    def dispatch_sync(self, event: BaseEvent) -> None:
        """
        イベントを同期的に発行（非同期環境外から呼び出す用）
        
        Args:
            event: 発行するイベントオブジェクト
        """
        event_type = type(event)
        logger.debug(f"イベント {event_type.__name__} を同期的に発行します")
        
        if event_type not in self._subscribers:
            logger.debug(f"イベント {event_type.__name__} の購読者はいません")
            return
        
        for callback in self._subscribers[event_type]:
            try:
                # 非同期コールバックの場合は新しいイベントループで実行
                if asyncio.iscoroutinefunction(callback):
                    loop = asyncio.new_event_loop()
                    try:
                        loop.run_until_complete(callback(event))
                    finally:
                        loop.close()
                else:
                    # 同期コールバックはそのまま実行
                    callback(event)
                    
            except Exception as e:
                logger.error(f"イベント {event_type.__name__} の同期コールバック実行中にエラーが発生: {e}")


# シングルトンインスタンスを取得するヘルパー関数
def get_event_dispatcher() -> EventDispatcher:
    """イベントディスパッチャのシングルトンインスタンスを取得"""
    return EventDispatcher() 