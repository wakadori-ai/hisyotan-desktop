"""
アプリケーション設定

環境変数や設定ファイルから設定を読み込み、アプリケーション全体で使用する設定を管理します
"""

import os
import sys
import logging
import json
from typing import Dict, Any, Optional
from pathlib import Path

# ロガーの設定
logger = logging.getLogger(__name__)

# ベースディレクトリの設定
BASE_DIR = Path(__file__).parent.parent.parent
APP_DIR = BASE_DIR / "app"
DATA_DIR = BASE_DIR / "data"


class Settings:
    """アプリケーション設定クラス"""
    
    _instance: Optional['Settings'] = None
    
    def __new__(cls):
        """シングルトンパターンの実装"""
        if cls._instance is None:
            cls._instance = super(Settings, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        """初期化（シングルトンなので1回だけ実行）"""
        if self._initialized:
            return
            
        # デバッグモード
        self.DEBUG_MODE = os.environ.get('DEBUG_MODE', 'false').lower() == 'true'
        
        # ディレクトリパス
        self.STATIC_DIR = os.environ.get('STATIC_DIR', str(DATA_DIR / "static"))
        self.LOGS_DIR = os.environ.get('LOGS_DIR', str(DATA_DIR / "logs"))
        self.TEMP_DIR = os.environ.get('TEMP_DIR', str(DATA_DIR / "temp"))
        self.SHARED_DIR = os.environ.get('SHARED_DIR', str(DATA_DIR / "shared"))
        self.DIALOGUES_DIR = os.environ.get('DIALOGUES_DIR', str(DATA_DIR / "dialogues"))
        self.IMAGES_DIR = os.environ.get('IMAGES_DIR', str(Path(os.path.dirname(BASE_DIR)) / "assets" / "images"))
        
        # ディレクトリの存在確認と作成
        self._ensure_directories()
        
        # VOICEVOXの設定
        self.VOICEVOX_HOST = os.environ.get('VOICEVOX_HOST', "http://127.0.0.1:50021")
        self.VOICEVOX_SPEAKER = int(os.environ.get('VOICEVOX_SPEAKER', "0"))  # デフォルトは四国めたん
        self.VOICEVOX_ENGINE_PATH = os.environ.get('VOICEVOX_ENGINE_PATH', 
                                                r"C:\Users\wakad\AppData\Local\Programs\VOICEVOX\vv-engine\run.exe")  # VOICEVOXの実行ファイルパス
        
        # 音声プリセットの読み込み
        self.VOICE_PRESETS = {
            "にこにこ": {"pitch": 0.06, "intonation": 1.3, "speed": 1.05},   # 明るく元気な声
            "警戒・心配": {"pitch": -0.03, "intonation": 0.9, "speed": 0.95}, # 少し不安げな声
            "びっくり": {"pitch": 0.12, "intonation": 1.5, "speed": 1.2},     # テンパっている声
            "やさしい": {"pitch": -0.06, "intonation": 1.1, "speed": 0.9},    # 落ち着いた声
            "眠そう": {"pitch": -0.09, "intonation": 0.8, "speed": 0.8}       # ふにゃふにゃ声
        }
        
        # 音声再生のクールダウン設定（秒）
        self.VOICE_COOLDOWN = float(os.environ.get('VOICE_COOLDOWN', "1.5"))
        
        # 各アラートタイプのクールダウン時間（秒）
        self.CALLBACK_COOLDOWN = {
            "zombie_alert": float(os.environ.get('ZOMBIE_ALERT_COOLDOWN', "8.0")),
            "zombie_few_alert": float(os.environ.get('ZOMBIE_FEW_ALERT_COOLDOWN', "5.0")),
            "zombie_warning": float(os.environ.get('ZOMBIE_WARNING_COOLDOWN', "6.0"))
        }
        
        # ゾンビ検出設定
        self.ZOMBIE_DETECTION = {
            "confidence": float(os.environ.get('ZOMBIE_CONFIDENCE', "0.45")),
            "frame_interval": float(os.environ.get('FRAME_INTERVAL', "0.5")),
            "resize_factor": float(os.environ.get('RESIZE_FACTOR', "0.6")),
            "skip_ratio": int(os.environ.get('SKIP_RATIO', "2")),
            "cpu_threshold": float(os.environ.get('CPU_THRESHOLD', "80.0"))
        }
        
        self._initialized = True
        logger.info("アプリケーション設定を初期化しました")
    
    def _ensure_directories(self):
        """必要なディレクトリが存在することを確認し、なければ作成"""
        directories = [
            self.STATIC_DIR,
            self.LOGS_DIR,
            self.TEMP_DIR,
            self.SHARED_DIR,
            self.DIALOGUES_DIR
        ]
        
        for directory in directories:
            path = Path(directory)
            if not path.exists():
                try:
                    path.mkdir(parents=True, exist_ok=True)
                    logger.info(f"ディレクトリを作成しました: {directory}")
                except Exception as e:
                    logger.error(f"ディレクトリの作成に失敗しました: {directory} - {e}")
    
    def load_dialogues(self, dialogue_file: str = "zombie_detection.json") -> Dict[str, Any]:
        """
        対話データをJSONファイルから読み込み
        
        Args:
            dialogue_file: 読み込む対話ファイル名
            
        Returns:
            Dict: 対話データの辞書
        """
        dialogue_path = Path(self.DIALOGUES_DIR) / dialogue_file
        
        try:
            if dialogue_path.exists():
                with open(dialogue_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            else:
                logger.warning(f"対話ファイルが見つかりません: {dialogue_path}")
                return {}
        except Exception as e:
            logger.error(f"対話ファイルの読み込みに失敗しました: {e}")
            return {}


# シングルトンインスタンスを取得するヘルパー関数
def get_settings() -> Settings:
    """設定のシングルトンインスタンスを取得"""
    return Settings() 