"""
ゾンビモニタリングモジュール

ゾンビ検出の開始、停止、状態チェックを管理
"""

import logging
import asyncio
from typing import Optional, Dict, Any, Callable
from datetime import datetime
import os

# ロガーの設定
logger = logging.getLogger(__name__)

# グローバル変数
is_monitoring = False
zombie_detector = None
zombie_monitor_task = None

# モニタリングの状態を取得
def is_monitoring_started() -> bool:
    """
    ゾンビ検出の監視が開始されているかを確認
    
    Returns:
        bool: 監視中ならTrue
    """
    global is_monitoring, zombie_monitor_task
    # タスクが存在し、完了していなければ監視中と判断
    return is_monitoring and zombie_monitor_task is not None and not zombie_monitor_task.done()

# ゾンビ監視を開始
async def start_zombie_monitoring() -> None:
    """
    ゾンビ検出の監視を開始
    
    ゾンビ検出器を初期化し、監視タスクを開始する
    """
    from ..config import Settings
    from ..zombie.callbacks import _zombie_alert_callback, zombie_few_alert, zombie_warning
    
    global is_monitoring, zombie_detector, zombie_monitor_task
    
    if is_monitoring_started():
        logger.info("ゾンビ監視は既に実行中です")
        return None
    
    # 設定を取得
    config = Settings()
    LOGS_DIR = config.LOGS_DIR
    DEBUG_MODE = config.DEBUG_MODE
    
    # ゾンビ検出器のインポート
    try:
        from .detector_core import ZombieDetector
        
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
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), model_name),
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", model_name)
            ]
            
            for alt_path in backup_paths:
                if os.path.exists(alt_path):
                    logger.info(f"代替モデルを使用します: {alt_path}")
                    model_path = alt_path
                    break
            else:
                logger.error("ゾンビ検出モデルが見つかりません。検出機能は無効化されます。")
                return None
        
        logger.info(f"ゾンビ検出モデルを読み込みます: {model_path}")
        
        # 検出器の初期化
        if zombie_detector is None:
            zombie_detector = ZombieDetector(
                model_path=model_path,
                confidence=0.45,
                debug_mode=DEBUG_MODE
            )
            logger.info("ゾンビ検出器を初期化しました")
        
        # 監視タスクを作成して開始
        try:
            # callback指定を更新
            zombie_monitor_task = await zombie_detector.start_monitoring(
                callback=_zombie_alert_callback,
                few_zombies_callback=zombie_few_alert,
                warning_zombies_callback=zombie_warning
            )
            is_monitoring = True
            logger.info("ゾンビ監視タスクを開始しました")
            
            # ログディレクトリの作成
            os.makedirs(LOGS_DIR, exist_ok=True)
            logger.info(f"ログディレクトリを確認: {LOGS_DIR}")
            
            return zombie_monitor_task
            
        except Exception as e:
            logger.error(f"ゾンビ監視の開始に失敗しました: {str(e)}")
            is_monitoring = False
            return None
            
    except ImportError as e:
        logger.error(f"ZombieDetectorのインポートに失敗しました: {str(e)}")
        is_monitoring = False
        return None

# ゾンビ検出のログを記録
def log_zombie_detection(count: int):
    """
    ゾンビ検出数をログファイルに記録
    
    Args:
        count: 検出されたゾンビの数
    """
    from ..config import Settings
    
    try:
        # 設定を取得
        config = Settings()
        LOGS_DIR = config.LOGS_DIR
        
        # ログディレクトリの確認
        os.makedirs(LOGS_DIR, exist_ok=True)
        
        # 日付ごとのログファイル名を生成
        today = datetime.now().strftime('%Y-%m-%d')
        log_file = os.path.join(LOGS_DIR, f'zombie_detection_{today}.log')
        
        # タイムスタンプと検出数を記録
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"{timestamp} - ゾンビ検出数: {count}体\n"
        
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(log_entry)
            
        logger.info(f"ゾンビ検出ログを記録しました: {count}体")
    except Exception as e:
        logger.error(f"ゾンビ検出ログの記録に失敗しました: {e}") 