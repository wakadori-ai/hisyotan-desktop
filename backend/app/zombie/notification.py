import time
import logging
import threading
from typing import Dict, Tuple, Optional, Set

# ロガーの設定
logger = logging.getLogger(__name__)

# グローバルロック - 通知処理全体を制御するためのロック
notification_lock = threading.Lock()
last_global_notification_time = 0
GLOBAL_NOTIFICATION_INTERVAL = 5  # 5秒間は異なるルートからの通知も抑制

# 通知抑制フラグを管理するクラス
class NotificationManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(NotificationManager, cls).__new__(cls)
            cls._instance.__init__()
        return cls._instance
    
    def __init__(self):
        # 初期化済みなら何もしない（シングルトンパターン）
        if hasattr(self, 'notification_active'):
            return
        
        self.notification_active: bool = False
        self.last_notification_time: float = 0.0
        self.lock = threading.Lock()
        self.notification_id: int = 0
        
        # 通知タイプごとの最終通知時間を追跡
        self.last_notification_by_type: Dict[str, float] = {
            "many": 0.0,  # 多数ゾンビ
            "warning": 0.0,  # 警戒レベル
            "few": 0.0,  # 少数ゾンビ
        }
        
        # 通知ソース追跡用
        self.active_sources: Set[str] = set()
        
        # 通知再生中フラグ
        self.audio_playing: bool = False
        self.audio_play_start_time: float = 0.0
        self.estimated_audio_duration: float = 0.0
        
        # タイプごとのクールダウン（秒）
        self.type_cooldown: Dict[str, float] = {
            "many": 30.0,    # 多数ゾンビは30秒間隔
            "warning": 40.0, # 警戒レベルは40秒間隔
            "few": 30.0,     # 少数ゾンビは30秒間隔
        }
        
        # 音声再生の最小間隔（秒）
        self.min_audio_interval: float = 5.0
        
        # 同一ソースからの最小通知間隔（秒）
        self.min_source_interval: float = 1.0
        self.last_source_time: Dict[str, float] = {}
    
    def try_acquire_notification(self, zombie_count: int, source: str = "detector", detection_type: Optional[str] = None) -> Tuple[bool, int]:
        """通知の送信権限を取得"""
        global last_global_notification_time
        
        with self.lock:
            current_time = time.time()
            
            # 最小通知間隔をチェック
            if current_time - self.last_notification_time < GLOBAL_NOTIFICATION_INTERVAL:
                logger.debug(f"通知マネージャ: グローバル通知間隔が短すぎる ({current_time - self.last_notification_time:.1f}秒 < {GLOBAL_NOTIFICATION_INTERVAL}秒)")
                return False, 0
            
            # 通知が既にアクティブなら拒否
            if self.notification_active:
                logger.debug(f"通知マネージャ: 通知処理中のため新規通知を拒否")
                return False, 0
            
            # 同一ソースからの通知間隔をチェック
            if source in self.last_source_time:
                since_last: float = current_time - self.last_source_time[source]
                if since_last < self.min_source_interval:
                    logger.debug(f"通知マネージャ: 同一ソース'{source}'からの通知間隔が短すぎる ({since_last:.1f}秒 < {self.min_source_interval}秒)")
                    return False, 0
            
            # 音声再生中なら拒否
            if self.audio_playing:
                # 推定再生時間をチェック
                elapsed = current_time - self.audio_play_start_time
                if elapsed < self.estimated_audio_duration:
                    remaining = self.estimated_audio_duration - elapsed
                    logger.debug(f"通知マネージャ: 音声再生中のため拒否 (残り約{remaining:.1f}秒)")
                    return False, 0
                else:
                    # 推定時間を過ぎていれば再生完了とみなす
                    self.audio_playing = False
            
            # 通知タイプが指定されている場合、そのタイプ専用のクールダウンをチェック
            if detection_type and detection_type in self.last_notification_by_type:
                last_type_time = self.last_notification_by_type[detection_type]
                type_cooldown = self.type_cooldown.get(detection_type, 20.0)
                
                time_since_last = current_time - last_type_time
                if time_since_last < type_cooldown:
                    remaining = type_cooldown - time_since_last
                    logger.debug(f"通知マネージャ: 同一タイプ '{detection_type}' の通知クールダウン中 (残り{remaining:.1f}秒)")
                    return False, 0
            
            # 通知権限を取得
            self.notification_active = True
            self.last_notification_time = current_time
            self.last_source_time[source] = current_time
            
            # 通知タイプが指定されている場合は記録
            if detection_type:
                self.last_notification_by_type[detection_type] = current_time
                
            # アクティブなソースに追加
            self.active_sources.add(source)
            
            last_global_notification_time = current_time
            self.notification_id += 1
            current_id = self.notification_id
            
            logger.info(f"通知マネージャ: 通知ID={current_id}の権限を取得 (ゾンビ数={zombie_count}, 発信元={source}, タイプ={detection_type or '未指定'})")
            return True, current_id
    
    def release_notification(self, notification_id: int, source: str = "detector") -> bool:
        """通知の送信権限を解放"""
        with self.lock:
            if self.notification_active:
                self.notification_active = False
                
                # アクティブソースから削除
                if source in self.active_sources:
                    self.active_sources.remove(source)
                
                logger.info(f"通知マネージャ: 通知ID={notification_id}の権限を解放 (発信元={source})")
                return True
            return False
    
    def register_audio_playback(self, duration: float = 3.0) -> None:
        """音声再生の開始を登録"""
        with self.lock:
            self.audio_playing = True
            self.audio_play_start_time = time.time()
            # 推定再生時間（少し余裕を持たせる）
            self.estimated_audio_duration = duration + 0.5
            logger.debug(f"通知マネージャ: 音声再生を登録 (推定時間={duration:.1f}秒)")
    
    def is_source_active(self, source: str) -> bool:
        """指定したソースが現在アクティブかどうかを返す"""
        with self.lock:
            return source in self.active_sources

# シングルトンインスタンスの作成
notification_manager = NotificationManager()
