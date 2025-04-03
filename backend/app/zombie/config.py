"""
ゾンビ機能の設定管理モジュール

ゾンビ検出や関連機能の設定値を管理します
"""

import logging
from typing import Dict, Any

# ロガー設定
logger = logging.getLogger(__name__)

class ZombieConfig:
    """
    ゾンビ機能の設定クラス
    
    機能のON/OFF状態や設定値を保持します
    """
    _instance = None
    
    def __new__(cls):
        """シングルトンパターンの実装"""
        if cls._instance is None:
            cls._instance = super(ZombieConfig, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """初期設定値の設定"""
        # 設定値の初期化
        self._settings = {
            # 機能の有効/無効設定
            "zombieDetection": True,       # ゾンビ検出機能
            "voiceNotification": True,     # 音声通知機能
            "multipleDetection": True,     # 複数ゾンビの検出
            "screenCapture": True,         # 画面キャプチャ機能
            "performanceMonitoring": True, # パフォーマンスモニタリング
            
            # 設定パラメータ（将来拡張用）
            "detectionSensitivity": 0.5,   # 検出感度（0.0〜1.0）
            "cooldownPeriod": 5.0,         # クールダウン期間（秒）
        }
        
        logger.info("✅ ゾンビ機能の設定を初期化しました")
    
    def get_setting(self, key: str, default: Any = None) -> Any:
        """
        設定値を取得
        
        Args:
            key: 設定キー
            default: キーが存在しない場合のデフォルト値
            
        Returns:
            設定値またはデフォルト値
        """
        return self._settings.get(key, default)
    
    def update_setting(self, key: str, value: Any) -> bool:
        """
        設定値を更新
        
        Args:
            key: 設定キー
            value: 新しい設定値
            
        Returns:
            bool: 更新成功の場合True、失敗の場合False
        """
        if key in self._settings:
            # 型チェック（単純な検証）
            current_value = self._settings[key]
            if not isinstance(value, type(current_value)):
                try:
                    # 型変換を試みる
                    if isinstance(current_value, bool):
                        if isinstance(value, str):
                            value = value.lower() in ['true', 'yes', '1', 'on']
                        else:
                            value = bool(value)
                    elif isinstance(current_value, int):
                        value = int(value)
                    elif isinstance(current_value, float):
                        value = float(value)
                except (ValueError, TypeError):
                    logger.error(f"❌ 設定更新エラー: '{key}'の値'{value}'を{type(current_value).__name__}型に変換できません")
                    return False
            
            # 値の更新
            old_value = self._settings[key]
            self._settings[key] = value
            logger.info(f"🔄 設定を更新しました: {key} = {value} (旧値: {old_value})")
            return True
        else:
            logger.warning(f"⚠️ 未知の設定キー: '{key}'")
            return False
    
    def get_all_settings(self) -> Dict[str, Any]:
        """
        すべての設定値を取得
        
        Returns:
            Dict[str, Any]: すべての設定値
        """
        return self._settings.copy()

# グローバルなアクセス用の関数
def get_zombie_config() -> ZombieConfig:
    """
    ゾンビ設定のインスタンスを取得
    
    Returns:
        ZombieConfig: 設定インスタンス
    """
    return ZombieConfig() 