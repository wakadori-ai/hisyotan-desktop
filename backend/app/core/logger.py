"""
カスタムロガーモジュール

アプリケーション全体で使用される拡張ロギング機能を提供します
"""

import logging
import sys
from typing import Optional

# カラー定義
class ColorCodes:
    GREY = "\033[37m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"
    MAGENTA = "\033[35m"
    CYAN = "\033[36m"
    BLUE = "\033[34m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    RESET = "\033[0m"

# カスタムフォーマッタ
class ColoredFormatter(logging.Formatter):
    """
    カラー付きのログフォーマッタ
    """
    
    COLORS = {
        'DEBUG': ColorCodes.CYAN,
        'INFO': ColorCodes.GREEN,
        'WARNING': ColorCodes.YELLOW,
        'ERROR': ColorCodes.RED,
        'CRITICAL': ColorCodes.BOLD + ColorCodes.RED,
    }
    
    def __init__(self, fmt: str, datefmt: Optional[str] = None):
        super().__init__(fmt, datefmt)
    
    def format(self, record: logging.LogRecord) -> str:
        # レベル名に色をつける
        levelname = record.levelname
        if levelname in self.COLORS:
            colored_levelname = f"{self.COLORS[levelname]}{levelname}{ColorCodes.RESET}"
            record.levelname = colored_levelname
        
        # モジュール名を強調
        record.name = f"{ColorCodes.BLUE}{record.name}{ColorCodes.RESET}"
        
        return super().format(record)

def setup_logger(name: Optional[str] = None, level: int = logging.INFO) -> logging.Logger:
    """
    アプリケーション用のロガーをセットアップ
    
    Args:
        name: ロガー名（デフォルトはルートロガー）
        level: ログレベル（デフォルトはINFO）
    
    Returns:
        logging.Logger: 設定されたロガーインスタンス
    """
    # ロガーの取得
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # 既存のハンドラをクリア
    if logger.handlers:
        logger.handlers.clear()
    
    # 標準出力へのハンドラを作成
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    
    # フォーマッタの設定
    formatter = ColoredFormatter(
        fmt="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    console_handler.setFormatter(formatter)
    
    # ハンドラの追加
    logger.addHandler(console_handler)
    
    return logger

# エラーフォーマッタ（スタックトレース出力用）
def format_exception(exc: Exception) -> str:
    """
    例外情報を読みやすくフォーマット
    
    Args:
        exc: 例外オブジェクト
    
    Returns:
        str: フォーマットされた例外情報
    """
    return f"{ColorCodes.RED}エラー ({type(exc).__name__}): {str(exc)}{ColorCodes.RESET}"

# 使用例:
# logger = setup_logger(__name__)
# logger.info("情報メッセージ")
# logger.warning("警告メッセージ")
# logger.error("エラーメッセージ")
# 
# try:
#     1/0
# except Exception as e:
#     logger.error(format_exception(e)) 