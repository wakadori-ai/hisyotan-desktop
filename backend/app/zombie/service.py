"""
ゾンビ検出サービス

ゾンビ検出機能のサービスインターフェース
"""

import logging
import asyncio
from typing import Optional, Any
import os

# ロガーの設定
logger = logging.getLogger(__name__)

# シングルトンインスタンス
_zombie_service = None


class ZombieService:
    """
    ゾンビ検出サービスクラス
    """
    
    def __init__(self):
        """
        ZombieServiceのコンストラクタ
        """
        self.is_initialized = False
        self.detector = None
        self.monitoring_task = None
    
    async def initialize(self) -> bool:
        """
        サービスの初期化
        
        Returns:
            bool: 初期化成功かどうか
        """
        if self.is_initialized:
            return True
            
        try:
            from .detector_core import ZombieDetector
            from ..config import Settings
            
            # 設定の取得
            settings = Settings()
            
            # ゾンビ検出器の初期化
            # モデルのパスを取得
            model_name = "yolov8n.pt"  # デフォルトモデル
            data_models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models")
            model_path = os.path.join(data_models_dir, model_name)
            
            # モデルファイルの存在確認
            if not os.path.exists(model_path):
                logger.warning(f"モデルファイルが見つかりません: {model_path}")
                # バックアップパスを試す
                backup_paths = [
                    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), model_name),
                    os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", model_name)
                ]
                
                for alt_path in backup_paths:
                    if os.path.exists(alt_path):
                        logger.info(f"代替モデルを使用します: {alt_path}")
                        model_path = alt_path
                        break
                else:
                    logger.error("ゾンビ検出モデルが見つかりません。検出機能は無効化されます。")
                    return False
            
            logger.info(f"ゾンビ検出モデルを読み込みます: {model_path}")
            
            # 対象クラスIDs
            # COCO データセットでは: 0=人物, 他に可能性があるクラス: 1=自転車, 2=自動車, 3=バイクなど
            # 複数クラスを検出するようにする（人物と類似クラス）
            target_classes = [0]  # デフォルトは人物クラスのみ
            
            # 環境変数や設定から対象クラスを読み込む
            try:
                target_classes_str = os.environ.get('ZOMBIE_TARGET_CLASSES', None)
                if target_classes_str:
                    # カンマ区切りの文字列からリストへ変換
                    target_classes = [int(cls_id.strip()) for cls_id in target_classes_str.split(',') if cls_id.strip()]
                    logger.info(f"環境変数から対象クラスを設定: {target_classes}")
            except Exception as e:
                logger.warning(f"対象クラスの設定中にエラー: {e}、デフォルト値を使用します")
            
            # 検出器の初期化
            self.detector = ZombieDetector(
                model_path=model_path,
                confidence=0.45,
                debug_mode=settings.DEBUG_MODE,
                target_classes=target_classes
            )
            
            self.is_initialized = True
            logger.info(f"ゾンビ検出サービスを初期化しました（対象クラス: {target_classes}）")
            return True
            
        except Exception as e:
            logger.error(f"ゾンビ検出サービスの初期化に失敗: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    async def start_monitoring(self) -> Optional[asyncio.Task]:
        """
        ゾンビ検出監視を開始する
        
        Returns:
            Optional[asyncio.Task]: 監視タスク、失敗時はNone
        """
        # サービスが初期化されていなければ初期化
        if not self.is_initialized:
            success = await self.initialize()
            if not success:
                logger.error("ゾンビ検出サービスの初期化に失敗したため、監視を開始できません")
                return None
        
        try:
            from .callbacks import _zombie_alert_callback, zombie_few_alert, zombie_warning
            
            # 監視タスクを開始
            self.monitoring_task = await self.detector.start_monitoring(
                callback=_zombie_alert_callback,
                few_zombies_callback=zombie_few_alert,
                warning_zombies_callback=zombie_warning
            )
            
            logger.info("ゾンビ検出監視を開始しました")
            return self.monitoring_task
            
        except Exception as e:
            logger.error(f"ゾンビ検出監視の開始に失敗: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return None
    
    async def stop_monitoring(self) -> bool:
        """
        ゾンビ検出監視を停止する
        
        Returns:
            bool: 停止成功かどうか
        """
        if self.detector is None:
            logger.warning("ゾンビ検出器が初期化されていないため、停止する必要はありません")
            return True
        
        try:
            # 検出器の監視を停止
            await self.detector.stop_monitoring()
            self.monitoring_task = None
            logger.info("ゾンビ検出監視を停止しました")
            return True
            
        except Exception as e:
            logger.error(f"ゾンビ検出監視の停止に失敗: {e}")
            return False


def get_zombie_service() -> ZombieService:
    """
    ゾンビ検出サービスのシングルトンインスタンスを取得
    
    Returns:
        ZombieService: サービスインスタンス
    """
    global _zombie_service
    
    if _zombie_service is None:
        _zombie_service = ZombieService()
        
    return _zombie_service 