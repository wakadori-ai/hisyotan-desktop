"""
メインエントリーポイント

アプリケーションの起動と初期化処理を行う
"""

import os
import sys
import asyncio
import uvicorn
import threading
import time
import signal
import psutil
from pathlib import Path
from fastapi import FastAPI, Body
import argparse
from typing import Optional
import types

# 標準出力・標準エラー出力のエンコーディングを明示的に設定
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# ベースディレクトリの設定
BASE_DIR = Path(__file__).parent.absolute()
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

# カスタムロガー設定
from app.core.logger import setup_logger
logger = setup_logger(__name__)
logger.info("🚀 秘書たんバックエンドサーバーを初期化しています...")

# 環境変数の設定（必要に応じて）
os.environ.setdefault('DEBUG_MODE', 'false')
# UTF-8エンコーディングを強制
os.environ['PYTHONIOENCODING'] = 'utf-8'

# アプリケーションの作成
from app.core import create_application
app = create_application()

# ゾンビ監視の開始
from app.events.startup_handler import start_zombie_monitoring

# シャットダウン用のグローバル変数
should_exit = False
exit_code = 0

# すべての子プロセスを含めて終了する関数
def terminate_process_tree():
    """
    現在のプロセスとすべての子プロセスを強制終了します
    """
    try:
        # 自身のプロセスID
        current_pid = os.getpid()
        logger.info(f"🔄 プロセスツリーの終了を開始します (PID: {current_pid})")
        
        # psutilを使って自身のプロセスと子プロセスを取得
        current_process = psutil.Process(current_pid)
        
        # 子プロセスを取得
        children = current_process.children(recursive=True)
        logger.info(f"🔍 子プロセス数: {len(children)}")
        
        # 子プロセスをまず終了
        for child in children:
            try:
                logger.info(f"🛑 子プロセス終了: PID={child.pid}, 名前={child.name()}")
                child.terminate()
            except Exception as e:
                logger.error(f"❌ 子プロセス終了エラー (PID={child.pid}): {e}")
        
        # すべての子プロセスが終了するのを待つ（最大3秒）
        _, alive = psutil.wait_procs(children, timeout=3)
        
        # まだ生きているプロセスを強制終了
        for child in alive:
            try:
                logger.info(f"💥 子プロセス強制終了: PID={child.pid}")
                child.kill()
            except Exception as e:
                logger.error(f"❌ 子プロセス強制終了エラー (PID={child.pid}): {e}")
        
        logger.info("✅ プロセスツリーの終了処理が完了しました")
    except Exception as e:
        logger.error(f"❌ プロセスツリー終了処理エラー: {e}")

# uvicornサーバーを制御するためのハンドラー
class GracefulExitHandler:
    def __init__(self, app: FastAPI) -> None:
        self.app = app
        self.should_exit = False
        self.exit_code = 0
        
    def handle_exit(self, sig: Optional[int] = None, frame: Optional[types.FrameType] = None, exit_code: int = 0) -> None:
        self.should_exit = True
        self.exit_code = exit_code
        logger.info(f"🔌 終了シグナルを受信しました。exit_code={exit_code}")
        
        # プロセスツリーを終了（子プロセスを含む）
        terminate_process_tree()
        
        # 自分自身のプロセスに終了シグナルを送信
        if os.name == 'nt':  # Windows
            pid = os.getpid()
            logger.info(f"🛑 Windows環境でプロセス {pid} を終了します")
            # 少し遅延させて応答が返せるようにする
            def delayed_exit():
                time.sleep(2)
                try:
                    os.kill(pid, signal.CTRL_C_EVENT)
                except Exception as e:
                    logger.error(f"❌ プロセス終了シグナル送信エラー: {e}")
                    # 最終手段としてexit関数を使用
                    sys.exit(exit_code)
            threading.Thread(target=delayed_exit).start()
        else:  # Linux/Mac
            pid = os.getpid()
            logger.info(f"🛑 Unix環境でプロセス {pid} を終了します")
            # 少し遅延させて応答が返せるようにする
            def delayed_exit():
                time.sleep(2)
                try:
                    os.kill(pid, signal.SIGTERM)
                except Exception as e:
                    logger.error(f"❌ プロセス終了シグナル送信エラー: {e}")
                    # 最終手段としてexit関数を使用
                    sys.exit(exit_code)
            threading.Thread(target=delayed_exit).start()

# グローバルのハンドラーインスタンス
exit_handler = GracefulExitHandler(app)

# プロセスID取得エンドポイント
@app.get("/api/pid")
def get_process_id():
    """
    現在のバックエンドプロセスのPIDを返す
    
    Returns:
        dict: PID情報
    """
    pid = os.getpid()
    logger.info(f"💡 PID照会: {pid}")
    return {
        "pid": pid,
        "parent_pid": os.getppid() if hasattr(os, 'getppid') else None,
        "process_name": "python",
        "message": f"バックエンドプロセスID: {pid}"
    }

# シャットダウンエンドポイント
@app.post("/api/shutdown")
async def shutdown(force: bool = Body(False)):
    """
    アプリケーションを安全に終了するエンドポイント
    
    Args:
        force (bool): 強制終了するかどうか
    
    Returns:
        dict: 結果メッセージ
    """
    logger.info(f"🔌 シャットダウンリクエストを受信しました。force={force}")
    pid = os.getpid()
    
    # 非同期で終了処理を実行（レスポンスを返してから終了するため）
    def shutdown_app():
        # 少し遅延させてレスポンスが返せるようにする
        logger.info(f"⏱️ 3秒後にアプリケーションを終了します... (PID: {pid})")
        time.sleep(3)
        
        logger.info("🔄 アプリケーションを終了しています...")
        # 終了ハンドラーを呼び出し
        exit_code = 0 if not force else 1
        exit_handler.handle_exit(exit_code=exit_code)
        
        # さらに最終手段として、明示的にexitを呼び出す（少し遅延させる）
        def final_exit():
            time.sleep(2)
            logger.info("💥 最終手段: sys.exit()を実行します")
            sys.exit(exit_code)
        
        threading.Thread(target=final_exit).start()
    
    # 別スレッドで終了処理を実行
    threading.Thread(target=shutdown_app).start()
    
    return {"message": f"アプリケーションをシャットダウンしています (PID: {pid})"}

# ルートエンドポイント（ステータスチェック用）
@app.head("/")
@app.get("/")
def read_root():
    """
    ルートエンドポイント - アプリケーションの稼働状態を確認する
    
    Returns:
        dict: ステータス情報
    """
    return {
        "status": "ok",
        "service": "hisyotan-backend",
        "version": "1.0.0", 
        "message": "秘書たんバックエンドサーバーが正常に動作しています",
        "pid": os.getpid()
    }

# メイン関数（初期化処理用）
async def main():
    """
    メイン関数：アプリケーションの起動前の初期化処理
    """
    logger.info("🔄 非同期初期化処理を実行しています...")
    # 必要な非同期初期化処理があればここに追加
    logger.info("✅ 非同期初期化処理が完了しました")

# サーバー起動
if __name__ == "__main__":
    # コマンドライン引数のパース
    parser = argparse.ArgumentParser(description='7DTD秘書たんバックエンドサーバー')
    parser.add_argument('--enable-monitoring', action='store_true', help='起動時にゾンビ監視を有効にする')
    parser.add_argument('--zombie-detection', action='store_true', help='ゾンビ検出機能を有効にする')
    parser.add_argument('--debug', action='store_true', help='デバッグモードを有効にする')
    args = parser.parse_args()
    
    # デバッグモードの設定
    debug_mode = args.debug or os.environ.get('DEBUG_MODE', 'false').lower() == 'true'
    if debug_mode:
        os.environ['DEBUG_MODE'] = 'true'
    
    # 非同期初期化処理の実行
    loop = asyncio.get_event_loop()
    loop.run_until_complete(main())
    
    # ゾンビ監視の開始
    monitoring_enabled = args.enable_monitoring or args.zombie_detection
    try:
        # ゾンビ監視を非同期で開始し、初期化処理と同じループで実行
        monitoring_task = loop.run_until_complete(start_zombie_monitoring())
        if monitoring_task:
            logger.info("👁️ ゾンビ監視を開始しました")
        elif monitoring_enabled:
            logger.warning("⚠️ ゾンビ監視の自動開始が有効ですが、監視タスクを開始できませんでした")
    except Exception as e:
        logger.error(f"❌ ゾンビ監視の開始に失敗しました: {e}")
    
    # 終了シグナルハンドラの設定
    signal.signal(signal.SIGINT, exit_handler.handle_exit)
    signal.signal(signal.SIGTERM, exit_handler.handle_exit)
    
    # PID情報の表示
    current_pid = os.getpid()
    logger.info(f"🆔 バックエンドプロセスID: {current_pid}")
    
    # FastAPIサーバーの起動
    logger.info(f"🌐 FastAPIサーバーを起動します (デバッグモード: {debug_mode})")
    # uvicornの型情報は重要ではないので無視
    uvicorn.run(  # type: ignore
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=debug_mode,
        log_level="debug" if debug_mode else "info",
        lifespan="on"
    ) 