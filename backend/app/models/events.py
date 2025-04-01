"""
イベントモデル定義

アプリケーション内で使用するイベントクラスを定義します
"""

from typing import Optional, Dict, List, Any
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime


class EventType(Enum):
    """イベントタイプの列挙型"""
    ZOMBIE_DETECTED = "zombie_detected"
    PLAYER_STATUS_CHANGED = "player_status_changed"
    ERROR_OCCURRED = "error_occurred"
    SYSTEM_EVENT = "system_event"


class ThreatLevel(Enum):
    """脅威レベルの列挙型"""
    NONE = "none"
    LOW = "low"        # 警戒 (1-2体)
    MEDIUM = "medium"  # 危険 (3-7体)
    HIGH = "high"      # 重大 (8体以上)


@dataclass
class ZombieDetectedEvent:
    """ゾンビ検出イベント"""
    count: int
    threat_level: ThreatLevel
    screenshot_path: Optional[str] = None
    event_type: EventType = field(default=EventType.ZOMBIE_DETECTED, init=False)
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class PlayerStatusEvent:
    """プレイヤーステータス変化イベント"""
    status: Dict[str, Any]
    changed_fields: List[str]
    event_type: EventType = field(default=EventType.PLAYER_STATUS_CHANGED, init=False)
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class ErrorEvent:
    """エラーイベント"""
    error_message: str
    error_type: str
    stacktrace: Optional[str] = None
    event_type: EventType = field(default=EventType.ERROR_OCCURRED, init=False)
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class SystemEvent:
    """システムイベント"""
    message: str
    severity: str  # "info", "warning", "error"
    event_type: EventType = field(default=EventType.SYSTEM_EVENT, init=False)
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = None 