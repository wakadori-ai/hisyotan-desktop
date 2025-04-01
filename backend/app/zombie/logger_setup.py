import os
import logging
import glob
from datetime import datetime
from pathlib import Path

# データ保存用のディレクトリ設定
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(WORKSPACE_ROOT, "data")
LOG_DIR = os.path.join(DATA_DIR, "logs")  # ログ保存用ディレクトリ追加

# ログ保持設定
LOG_RETENTION_DAYS = 7  # ログの保持日数

def setup_file_logging():
    """ファイルログの設定をセットアップ"""
    # ログディレクトリの作成
    os.makedirs(LOG_DIR, exist_ok=True)
    
    # 現在の日付でログファイル名を生成
    current_date = datetime.now().strftime("%Y-%m-%d")
    log_file_path = os.path.join(LOG_DIR, f"zombie_detector_{current_date}.log")
    
    # ファイルハンドラーの設定
    file_handler = logging.FileHandler(log_file_path)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    
    # ロガーの設定
    logger = logging.getLogger()
    logger.addHandler(file_handler)
    
    # 古いログファイルの削除
    cleanup_old_logs()
    
    return log_file_path

def cleanup_old_logs():
    """古いログファイルを削除"""
    # 現在の日付
    current_date = datetime.now()
    
    # ログファイルのリストを取得
    log_files = glob.glob(os.path.join(LOG_DIR, "zombie_detector_*.log"))
    
    for log_file in log_files:
        try:
            # ファイル名から日付を抽出
            file_name = Path(log_file).name
            date_part = file_name.replace("zombie_detector_", "").replace(".log", "")
            file_date = datetime.strptime(date_part, "%Y-%m-%d")
            
            # LOG_RETENTION_DAYS日より古いファイルを削除
            days_diff = (current_date - file_date).days
            if days_diff > LOG_RETENTION_DAYS:
                os.remove(log_file)
                print(f"古いログファイルを削除しました: {log_file}")
        except Exception as e:
            print(f"ログファイルのクリーンアップエラー: {e}")
