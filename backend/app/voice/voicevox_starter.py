"""
VOICEVOX起動管理モジュール

VOICEVOXエンジンの自動起動と終了を管理します
"""

import os
import time
import logging
import threading
import subprocess
import requests
from typing import Optional
from pathlib import Path

# ロガーの設定
logger = logging.getLogger(__name__)

# VOICEVOXプロセス
voicevox_process: Optional[subprocess.Popen] = None
# VOICEVOXが起動しているかどうか
voicevox_running = False

# VOICEVOXの準備状態を確認する変数
_voicevox_ready = False

def is_voicevox_running() -> bool:
    """VOICEVOXエンジンが起動しているかどうかを確認"""
    global voicevox_running
    
    # グローバル変数のチェック
    if voicevox_process is not None and voicevox_running:
        # プロセスの状態を確認
        if voicevox_process.poll() is None:
            return True
        else:
            # プロセスが終了している場合はフラグをリセット
            voicevox_running = False
    
    # API接続の確認
    try:
        from ..config import get_settings
        settings = get_settings()
        
        response = requests.get(f"{settings.VOICEVOX_HOST}/version", timeout=2)
        return response.status_code == 200
    except Exception:
        return False

def start_voicevox_engine() -> bool:
    """
    VOICEVOXエンジンを起動
    
    Returns:
        bool: 起動成功時はTrue
    """
    global voicevox_process, voicevox_running
    
    # 既に起動している場合は何もしない
    if is_voicevox_running():
        logger.info("VOICEVOXエンジンは既に起動しています")
        return True
    
    # 設定の取得
    from ..config import get_settings
    settings = get_settings()
    
    try:
        voicevox_engine_path = settings.VOICEVOX_ENGINE_PATH
        
        # パスが設定されていなければデフォルトを使用
        if not voicevox_engine_path:
            # 実行可能ファイルを探す
            default_paths = [
                # Windows環境のパス例
                Path(r"C:\Program Files\VOICEVOX\VOICEVOX.exe"),
                Path(r"C:\Program Files (x86)\VOICEVOX\VOICEVOX.exe"),
                Path(r"C:\VOICEVOX\run.exe"),
                # VOICEVOXエンジンのみのパス例
                Path(r"C:\Program Files\VOICEVOX Engine\run.exe"),
                Path(r"C:\VOICEVOX Engine\run.exe")
            ]
            
            # 存在するパスを探す
            for path in default_paths:
                if path.exists():
                    voicevox_engine_path = str(path)
                    logger.info(f"VOICEVOXエンジンが見つかりました: {voicevox_engine_path}")
                    break
                    
        # パスが見つからない場合
        if not voicevox_engine_path:
            logger.error("VOICEVOXエンジンのパスが設定されていないか、見つかりません")
            return False
        
        # エンジンのディレクトリを取得
        engine_dir = Path(voicevox_engine_path).parent
        
        # VOICEVOXの起動
        logger.info(f"VOICEVOXエンジンを起動しています: {voicevox_engine_path}")
        
        # Windowsで非表示で起動する方法
        voicevox_process = subprocess.Popen(
            [voicevox_engine_path, "--no_gui"], 
            cwd=str(engine_dir),
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        
        # 起動フラグを設定
        voicevox_running = True
        
        # 起動の完了を待機
        max_retries = 10
        retry_wait = 2
        
        for i in range(max_retries):
            logger.info(f"VOICEVOXエンジンの起動を確認中... ({i+1}/{max_retries})")
            if is_voicevox_running():
                logger.info("VOICEVOXエンジンの起動に成功しました")
                return True
            time.sleep(retry_wait)
                
        logger.warning("VOICEVOXエンジンが応答しません。起動に失敗した可能性があります。")
        return False
        
    except Exception as e:
        logger.error(f"VOICEVOXエンジンの起動中にエラーが発生: {e}")
        return False

def stop_voicevox_engine() -> bool:
    """
    VOICEVOXエンジンを停止
    
    Returns:
        bool: 停止成功時はTrue
    """
    global voicevox_process, voicevox_running
    
    if voicevox_process is None:
        logger.info("VOICEVOXエンジンは起動していません")
        return True
    
    try:
        logger.info("VOICEVOXエンジンを停止しています...")
        
        # プロセスを終了
        if voicevox_process.poll() is None:
            voicevox_process.terminate()
            # 少し待ってから強制終了
            time.sleep(2)
            if voicevox_process.poll() is None:
                voicevox_process.kill()
        
        voicevox_running = False
        voicevox_process = None
        
        logger.info("VOICEVOXエンジンの停止に成功しました")
        return True
        
    except Exception as e:
        logger.error(f"VOICEVOXエンジンの停止中にエラーが発生: {e}")
        return False

# VOICEVOXが準備完了したかを確認する関数
async def is_voicevox_ready() -> bool:
    """
    VOICEVOXエンジンが起動して準備完了しているかを確認する
    
    Returns:
        bool: 準備完了ならTrue
    """
    global _voicevox_ready
    
    # すでに準備完了フラグが立っている場合はそのまま返す
    if _voicevox_ready:
        return True
    
    # 準備完了していない場合はAPIに接続確認
    try:
        from ..config import get_settings
        import aiohttp
        import asyncio
        
        settings = get_settings()
        
        # 非同期HTTPリクエストでVOICEVOXのバージョンエンドポイントに接続確認
        async with aiohttp.ClientSession() as session:
            try:
                async with session.get(f"{settings.VOICEVOX_HOST}/version", timeout=1) as response:
                    if response.status == 200:
                        _voicevox_ready = True
                        return True
            except (aiohttp.ClientError, asyncio.TimeoutError):
                return False
        
        return False
    except Exception:
        return False

def start_voicevox_in_thread() -> bool:
    """
    別スレッドでVOICEVOXエンジンを起動する
    
    Returns:
        bool: 起動プロセス開始成功の場合True
    """
    global _voicevox_ready
    
    # VOICEVOXエンジン起動時に準備完了フラグをリセット
    _voicevox_ready = False
    
    # 残りのコードは既存のままとする
    def run_starter():
        success = start_voicevox_engine()
        logger.info(f"VOICEVOX起動スレッド完了: {'成功' if success else '失敗'}")
    
    starter_thread = threading.Thread(target=run_starter)
    starter_thread.daemon = True
    starter_thread.start()
    logger.info("VOICEVOX起動スレッドを開始しました")
    
    return True

# アプリケーション終了時にVOICEVOXも停止
def cleanup_on_exit() -> None:
    """
    アプリケーション終了時の後処理
    VOICEVOXエンジンを停止する
    """
    if is_voicevox_running():
        stop_voicevox_engine() 