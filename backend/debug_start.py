#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
ヒショたんデスクトップ - ゾンビ検出デバッグスクリプト
このスクリプトはゾンビ検出機能をデバッグするためのものです。
"""

import os
import sys
import time
import argparse
import asyncio
import logging
from pathlib import Path

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# 現在のディレクトリをPYTHONPATHに追加
current_dir = Path(__file__).parent.parent
sys.path.append(str(current_dir))

def setup_parser():
    """コマンドライン引数のパーサーを設定"""
    parser = argparse.ArgumentParser(description='ゾンビ検出デバッグツール')
    parser.add_argument('--threshold', '-t', type=float, default=0.3,
                      help='検出信頼度の閾値 (デフォルト: 0.3)')
    parser.add_argument('--verbose', '-v', action='store_true',
                      help='詳細ログを有効化')
    parser.add_argument('--model-path', '-m', type=str,
                      help='YOLOモデルファイルへのパス (デフォルトはYOLOv8n)')
    return parser

async def debug_zombie_detection(threshold=0.3, verbose=False, model_path=None):
    """ゾンビ検出のデバッグ実行"""
    try:
        # 環境変数の設定
        os.environ["DEBUG_ZOMBIE_DETECTION"] = "1"
        os.environ["ZOMBIE_DETECTION_THRESHOLD"] = str(threshold)
        if verbose:
            os.environ["ZOMBIE_DETECTION_VERBOSE"] = "1"
            logger.setLevel(logging.DEBUG)
        
        logger.info(f"🔍 ゾンビ検出のデバッグを開始します (閾値: {threshold}, 詳細モード: {verbose})")
        
        # detector_coreモジュールをインポート
        try:
            from app.zombie.detector_core import ZombieDetector
            logger.info("ZombieDetectorクラスを正常にインポートしました")
        except ImportError as e:
            logger.error(f"ZombieDetectorのインポートエラー: {e}")
            import traceback
            traceback.print_exc()
            return
        
        # モデルのロード処理を修正
        try:
            # YOLOv8nのデフォルトモデルを使用する場合
            if model_path is None:
                # モデルパスを取得
                try:
                    from ultralytics import YOLO
                    logger.info(f"YOLOをインポートしました")
                    
                    # 標準のYOLOv8nを使用
                    model_path = "yolov8n.pt"
                    logger.info(f"デフォルトのYOLOv8nモデルを使用します: {model_path}")
                except ImportError as e:
                    logger.error(f"YOLOのインポートエラー: {e}")
            else:
                logger.info(f"指定されたモデルを使用します: {model_path}")
            
            # モデルパスの存在確認
            if model_path != "yolov8n.pt" and not os.path.exists(model_path):
                logger.warning(f"指定されたモデルファイルが存在しません: {model_path}")
                logger.warning("デフォルトのYOLOv8nモデルを使用します")
                model_path = "yolov8n.pt"
            
            # 検出器インスタンスを作成
            detector = ZombieDetector(model_path=model_path, confidence=threshold, debug_mode=True)
            logger.info(f"ZombieDetectorインスタンスを作成しました: モデル={model_path}, 閾値={threshold}")
            
            # モデルをロード
            logger.info("モデルのロードを開始します...")
            try:
                success = await detector.load_model()
                if not success:
                    logger.error("モデルのロードに失敗しました")
                    return
                logger.info("モデルのロード成功！")
            except Exception as e:
                logger.error(f"モデルロード中に例外が発生: {e}")
                import traceback
                traceback.print_exc()
                return
            
            # テスト用コールバック
            async def test_callback(count, screenshot, additional_data=None):
                logger.info(f"🧟 ゾンビ検出コールバック: {count}体検出")
                if additional_data:
                    logger.info(f"追加データ: {additional_data}")
                return True
            
            # 監視開始
            try:
                logger.info("監視タスクを開始します...")
                monitor_task = await detector.start_monitoring(
                    callback=test_callback,
                    few_zombies_callback=test_callback,
                    warning_zombies_callback=test_callback
                )
                logger.info("監視タスクの開始に成功しました")
            except Exception as e:
                logger.error(f"監視タスクの開始に失敗: {e}")
                import traceback
                traceback.print_exc()
                return
            
            # 30秒間実行（時間短縮）
            logger.info("🕒 テスト実行中... 30秒間監視します")
            await asyncio.sleep(30)
            
            # 監視停止
            logger.info("🛑 テストを終了します")
            await detector.stop_monitoring()
            
        except Exception as e:
            logger.error(f"ZombieDetector初期化中にエラーが発生: {e}")
            import traceback
            traceback.print_exc()
            
    except Exception as e:
        logger.error(f"デバッグ実行中にエラーが発生: {e}")
        import traceback
        traceback.print_exc()

async def main():
    """メイン関数"""
    parser = setup_parser()
    args = parser.parse_args()
    
    logger.info(f"🚀 デバッグスクリプトを開始します")
    logger.info(f"設定: 閾値={args.threshold}, 詳細モード={args.verbose}")
    
    await debug_zombie_detection(
        threshold=args.threshold, 
        verbose=args.verbose,
        model_path=args.model_path
    )
    
    logger.info(f"✅ デバッグスクリプトを終了します")

if __name__ == "__main__":
    asyncio.run(main()) 