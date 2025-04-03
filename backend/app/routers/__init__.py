"""
ルーターモジュールパッケージ
"""

from .health import router as health_router
from .voice import router as voice_router
from .websocket import router as websocket_router
from .settings import router as settings_router

__all__ = ['health_router', 'voice_router', 'websocket_router', 'settings_router'] 