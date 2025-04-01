"""
設定ファイル
アプリケーション全体で使用する設定とパラメータを定義
"""

import os
import sys
import logging

# ディレクトリ構成を設定
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.append(BASE_DIR)

# 環境変数からディレクトリパスを取得（デフォルト値も設定）
STATIC_DIR = os.environ.get('STATIC_DIR', os.path.join(os.path.dirname(BASE_DIR), 'data', 'static'))
LOGS_DIR = os.environ.get('LOGS_DIR', os.path.join(os.path.dirname(BASE_DIR), 'data', 'logs'))
TEMP_DIR = os.environ.get('TEMP_DIR', os.path.join(os.path.dirname(BASE_DIR), 'data', 'temp'))
SHARED_DIR = os.environ.get('SHARED_DIR', os.path.join(os.path.dirname(BASE_DIR), 'data', 'shared'))
IMAGES_DIR = os.environ.get('IMAGES_DIR', '/home/wakadori/hisyotan-desktop/assets/images')

# デバッグモードの設定
DEBUG_MODE = os.environ.get('DEBUG_MODE', 'false').lower() == 'true'

# ロガー設定
logging.basicConfig(
    level=logging.DEBUG if DEBUG_MODE else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)

# 設定クラス
class Config:
    """
    アプリケーション設定クラス
    各種パラメータと設定値を保持
    """
    # VOICEVOXの設定
    VOICEVOX_HOST = "http://127.0.0.1:50021"  # ローカルホストに変更
    VOICEVOX_SPEAKER = 8  # 四国めたん（あまあま）
    TEMP_DIR = TEMP_DIR
    
    # 音声パラメータのプリセット
    VOICE_PRESETS = {
        "にこにこ": {"pitch": 0.06, "intonation": 1.3, "speed": 1.05},   # 明るく元気な声
        "警戒・心配": {"pitch": -0.03, "intonation": 0.9, "speed": 0.95}, # 少し不安げな声
        "びっくり": {"pitch": 0.12, "intonation": 1.5, "speed": 1.2},     # テンパっている声
        "やさしい": {"pitch": -0.06, "intonation": 1.1, "speed": 0.9},    # 落ち着いた声
        "眠そう": {"pitch": -0.09, "intonation": 0.8, "speed": 0.8}       # ふにゃふにゃ声
    }
    
    # 音声再生のクールダウン設定（秒）
    VOICE_COOLDOWN = 1.5  # 1.5秒のクールダウン
    
    # 各アラートタイプのクールダウン時間（秒）
    CALLBACK_COOLDOWN = {
        "zombie_alert": 8.0,     # 多数ゾンビ: 長めのクールダウン
        "zombie_few_alert": 5.0, # 少数ゾンビ: 短めのクールダウン
        "zombie_warning": 6.0    # 警戒ゾンビ: 中程度のクールダウン
    }

# 設定インスタンスを取得する関数
def get_settings():
    """設定を取得する関数"""
    return Config()

# 設定をエクスポート
__all__ = ['Config', 'get_settings'] 