import cv2
import numpy as np
import mss
import time
import os
import asyncio
import logging
import psutil  # CPU使用率の取得
import glob
import shutil
import traceback  # スタックトレース取得用
import json  # デバッグ情報のJSON出力用
import torch
from typing import List, Dict, Any, Tuple, Optional, Callable, Coroutine
from ultralytics import YOLO
from ultralytics.nn.tasks import DetectionModel
from ultralytics.nn.modules import Conv
from torch.nn import Sequential
from datetime import datetime, timedelta
from pathlib import Path

# 内部モジュールのインポート
from .performance import PERFORMANCE_SETTINGS
from .notification import notification_manager

# ロガーの設定
logger = logging.getLogger(__name__)

# データ保存用のディレクトリ設定
WORKSPACE_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(WORKSPACE_ROOT, "data")
DETECTION_DIR = os.path.join(DATA_DIR, "detections")
DEBUG_DIR = os.path.join(DATA_DIR, "debug")

# 検出保持設定
MAX_DETECTIONS_PER_DAY = 100  # 1日あたりの最大保存数
MAX_DETECTION_DIR_SIZE_MB = 500  # 検出ディレクトリの最大サイズ（MB）

class ZombieDetector:
    """ゾンビ検出クラス"""
    
    def __init__(self, model_path: str = None, confidence: float = 0.45, debug_mode: bool = False, target_classes: Optional[List[int]] = None, resnet_enabled: bool = True):
        """
        ZombieDetectorクラスのコンストラクタ
        
        Args:
            model_path: YOLOモデルファイルのパス（指定がなければデフォルトのYOLOv8nを使用）
            confidence: 検出信頼度の閾値（デフォルト: 0.45）
            debug_mode: デバッグモードフラグ
            target_classes: 検出対象のクラスIDリスト（デフォルトは人物クラス[0]のみ）
            resnet_enabled: ResNet分類器を有効にするかどうか
        """
        
        self.model_path = model_path
        self.confidence = confidence
        self.debug_mode = debug_mode
        self.model = None
        self.monitor_task = None
        self.is_monitoring = False
        self.frame_count = 0
        self.last_cpu_check_time = 0
        self.cpu_check_interval = 10  # CPU使用率チェックの間隔（秒）
        self.adaptive_interval = PERFORMANCE_SETTINGS["frame_interval"]
        self.resize_factor = PERFORMANCE_SETTINGS["resize_factor"]
        self.skip_ratio = PERFORMANCE_SETTINGS["skip_ratio"]
        self.cpu_threshold = PERFORMANCE_SETTINGS["cpu_threshold"]
        
        # ResNet分類器の設定
        self.resnet_enabled = resnet_enabled
        self.resnet_classifier = None
        
        # 検出対象クラスの設定
        self.target_classes = target_classes if target_classes is not None else [0]  # デフォルトは人物クラスのみ
        
        # 検出履歴の初期化（パラメータ調整）
        self.detection_history = []
        self.history_size = 3
        self.required_consecutive_detections = 1  # 緩和：1フレームの検出でOKに変更
        
        # クールダウン時間の調整
        self.cooldown_timestamps = {
            "few": 0,       # 少数ゾンビ（1〜4体）
            "warning": 0,   # 警戒レベル（5〜9体）
            "many": 0       # 多数ゾンビ（10体以上）
        }
        self.cooldown_periods = {
            "few": 10,      # 少数ゾンビ: 10秒（テスト用に短縮）
            "warning": 10,  # 警戒レベル: 10秒（テスト用に短縮）
            "many": 10      # 多数ゾンビ: 10秒（テスト用に短縮）
        }
        
        # ディレクトリ準備
        os.makedirs(DETECTION_DIR, exist_ok=True)
        os.makedirs(DEBUG_DIR, exist_ok=True)
        
        logger.info(f"ZombieDetector初期化完了: confidence={self.confidence}, debug_mode={self.debug_mode}, frame_interval={self.adaptive_interval}秒, resize_factor={self.resize_factor}, skip_ratio={self.skip_ratio}, resnet_enabled={self.resnet_enabled}")
    
    async def load_model(self):
        """YOLOモデルの非同期ロード"""
        try:            
            # モデルのロードは重い処理なので非同期で行う
            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(None, lambda: YOLO(self.model_path))
            logger.info(f"YOLOモデルのロードに成功: {self.model_path}")
            
            # ResNet分類器も初期化
            if self.resnet_enabled:
                try:
                    # 絶対パスではなく相対パスを使ってインポート
                    import sys
                    sys.path.append(str(Path(__file__).parent.parent.parent.parent))
                    from ml.train import ZombieClassifier
                    logger.info("ZombieClassifierをインポートしました")
                    
                    # 分類器のインスタンス化と実行
                    self.resnet_classifier = await loop.run_in_executor(
                        None, 
                        lambda: ZombieClassifier(data_path=os.path.join(DATA_DIR, "datasets", "zombie_classifier"))
                    )
                    logger.info("ResNet分類器の初期化に成功しました")
                except ImportError as e:
                    logger.error(f"ZombieClassifierのインポートに失敗: {e}")
                    
                    # 最小限のダミー実装を提供
                    class DummyClassifier:
                        def predict_image(self, img_path):
                            logger.warning("ダミー分類器が使用されています！")
                            return "not_zombie", 0.0
                    
                    self.resnet_classifier = DummyClassifier()
                    logger.warning("ダミーのResNet分類器を使用します")
                except Exception as e:
                    logger.error(f"ResNet分類器の初期化に失敗: {e}")
                    logger.exception("詳細なスタックトレース:")
                    self.resnet_enabled = False
            
            return True
        except Exception as e:
            logger.error(f"YOLOモデルのロードに失敗: {e}")
            return False
    
    async def start_monitoring(self, 
                             callback: Optional[Callable[[int, Any], Any]] = None, 
                             few_zombies_callback: Optional[Callable[[int, Any], Any]] = None,
                             warning_zombies_callback: Optional[Callable[[int, Any], Any]] = None) -> asyncio.Task:
        """
        ゾンビ検出監視を開始する
        
        Args:
            callback: 多数ゾンビ検出時のコールバック関数
            few_zombies_callback: 少数ゾンビ検出時のコールバック関数
            warning_zombies_callback: 警戒レベルゾンビ検出時のコールバック関数
            
        Returns:
            asyncio.Task: 監視タスク
        """
        if self.is_monitoring:
            logger.warning("すでに監視中です")
            return self.monitor_task
        
        # モデルがロードされていなければロード
        if self.model is None:
            success = await self.load_model()
            if not success:
                raise Exception("モデルのロードに失敗しました")
        
        # 監視タスクを開始
        self.is_monitoring = True
        self.monitor_task = asyncio.create_task(
            self._monitor_loop(callback, few_zombies_callback, warning_zombies_callback)
        )
        logger.info("ゾンビ検出監視を開始しました")
        
        return self.monitor_task
    
    async def stop_monitoring(self):
        """ゾンビ検出監視を停止する"""
        if not self.is_monitoring or self.monitor_task is None:
            logger.warning("監視中ではありません")
            return
        
        self.is_monitoring = False
        if not self.monitor_task.done():
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
        
        self.monitor_task = None
        logger.info("ゾンビ検出監視を停止しました")
    
    async def _monitor_loop(self, 
                          zombie_callback: Optional[Callable[[int, Any], Any]] = None,
                          few_zombies_callback: Optional[Callable[[int, Any], Any]] = None,
                          warning_zombies_callback: Optional[Callable[[int, Any], Any]] = None):
        """
        監視ループの実装
        
        Args:
            zombie_callback: 多数ゾンビ検出時のコールバック関数
            few_zombies_callback: 少数ゾンビ検出時のコールバック関数
            warning_zombies_callback: 警戒レベルゾンビ検出時のコールバック関数
        """
        logger.info("監視ループを開始します")
        
        # 画面キャプチャの設定
        with mss.mss() as sct:
            # モニターの取得
            monitor = sct.monitors[1]  # プライマリーモニター
            
            while self.is_monitoring:
                try:
                    # フレームカウントを更新
                    self.frame_count += 1
                    
                    # スキップレートが設定されている場合、一部のフレームをスキップ
                    if self.skip_ratio > 1 and self.frame_count % self.skip_ratio != 0:
                        # スキップする場合は短い待機時間
                        await asyncio.sleep(0.1)
                        continue
                    
                    # CPU使用率を定期的にチェックし、高負荷時はパフォーマンス設定を調整
                    current_time = time.time()
                    if current_time - self.last_cpu_check_time > self.cpu_check_interval:
                        self._adjust_performance_settings()
                        self.last_cpu_check_time = current_time
                    
                    # 画面キャプチャを実行
                    screenshot = await self._capture_screen(sct, monitor)
                    if screenshot is None:
                        logger.warning("画面キャプチャに失敗しました")
                        await asyncio.sleep(1)
                        continue
                    
                    # ゾンビ検出を実行
                    results = await self._detect_zombies(screenshot)
                    if results is None:
                        await asyncio.sleep(self.adaptive_interval)
                        continue
                    
                    # 検出結果を処理
                    await self._process_detection_results(
                        results, 
                        screenshot, 
                        zombie_callback, 
                        few_zombies_callback, 
                        warning_zombies_callback
                    )
                    
                    # 次のフレームまで待機
                    await asyncio.sleep(self.adaptive_interval)
                    
                except asyncio.CancelledError:
                    logger.info("監視タスクがキャンセルされました")
                    break
                except Exception as e:
                    logger.error(f"監視ループ中にエラーが発生しました: {e}")
                    logger.error(traceback.format_exc())
                    await asyncio.sleep(2)  # エラー発生時は少し長めの待機
        
        logger.info("監視ループを終了しました")
    
    def _adjust_performance_settings(self):
        """
        CPU使用率に基づいてパフォーマンス設定を調整する
        """
        try:
            # 現在のCPU使用率を取得
            cpu_percent = psutil.cpu_percent(interval=0.5)
            
            # 高負荷時の調整
            if cpu_percent > self.cpu_threshold:
                # CPU使用率が閾値を超えた場合、フレーム間隔を増やし、リサイズ率を下げる
                self.adaptive_interval = min(PERFORMANCE_SETTINGS["frame_interval"] * 1.5, 10.0)
                self.resize_factor = max(PERFORMANCE_SETTINGS["resize_factor"] * 0.8, 0.3)
                self.skip_ratio = min(PERFORMANCE_SETTINGS["skip_ratio"] + 1, 5)
                logger.info(f"高CPU負荷 ({cpu_percent:.1f}%)のため設定調整: interval={self.adaptive_interval:.1f}s, resize={self.resize_factor:.2f}")
            else:
                # 通常負荷時は標準設定に戻す
                self.adaptive_interval = PERFORMANCE_SETTINGS["frame_interval"]
                self.resize_factor = PERFORMANCE_SETTINGS["resize_factor"]
                self.skip_ratio = PERFORMANCE_SETTINGS["skip_ratio"]
        except Exception as e:
            logger.error(f"パフォーマンス設定の調整中にエラー発生: {e}")
            # エラー時はデフォルト設定に戻す
            self.adaptive_interval = PERFORMANCE_SETTINGS["frame_interval"]
            self.resize_factor = PERFORMANCE_SETTINGS["resize_factor"]
            self.skip_ratio = PERFORMANCE_SETTINGS["skip_ratio"]
    
    async def _capture_screen(self, sct, monitor):
        """
        画面キャプチャを実行する
        
        Args:
            sct: mssのスクリーンキャプチャオブジェクト
            monitor: キャプチャ対象のモニター情報
            
        Returns:
            np.ndarray: キャプチャした画像（OpenCV形式）
        """
        try:
            # スクリーンショットを取得
            sct_img = sct.grab(monitor)
            
            # PIL形式からOpenCV形式に変換
            screenshot = np.array(sct_img)
            
            # RGBAからRGBに変換（4チャンネルから3チャンネルへ）
            if screenshot.shape[2] == 4:
                screenshot = cv2.cvtColor(screenshot, cv2.COLOR_RGBA2RGB)
            
            # リサイズが必要な場合
            if self.resize_factor < 1.0:
                height, width = screenshot.shape[:2]
                new_width = int(width * self.resize_factor)
                new_height = int(height * self.resize_factor)
                screenshot = cv2.resize(screenshot, (new_width, new_height))
            
            return screenshot
        except Exception as e:
            logger.error(f"画面キャプチャ中にエラー発生: {e}")
            return None
    
    async def _detect_zombies(self, screenshot):
        """
        スクリーンショットからゾンビを検出する
        
        Args:
            screenshot: スクリーンショット画像
            
        Returns:
            dict: 検出結果
        """
        try:
            # time変数の名前衝突を回避するために別名でインポート
            import time as time_module
            
            # 処理開始時刻
            start_time = time_module.time()
            
            # ResNetの結果を初期化
            resnet_result = {
                "is_zombie_scene": False,
                "probability": 0.0
            }
            
            # スクリーンショットをリサイズして処理速度を向上
            if self.resize_factor < 1.0:
                h, w = screenshot.shape[:2]
                new_h, new_w = int(h * self.resize_factor), int(w * self.resize_factor)
                screenshot_resized = cv2.resize(screenshot, (new_w, new_h))
            else:
                screenshot_resized = screenshot
            
            # サイズ情報をログに記録
            h, w = screenshot_resized.shape[:2]
            logger.debug(f"ゾンビ検出を実行: 画像サイズ={w}x{h}")
            
            # 環境変数からデバッグモードと閾値を取得
            import os
            debug_mode = os.environ.get("DEBUG_ZOMBIE_DETECTION", "0") == "1"
            verbose_mode = os.environ.get("ZOMBIE_DETECTION_VERBOSE", "0") == "1"
            
            # 閾値の設定（環境変数で上書き可能）
            effective_threshold = self.confidence
            if debug_mode:
                try:
                    threshold_env = os.environ.get("ZOMBIE_DETECTION_THRESHOLD")
                    if threshold_env:
                        effective_threshold = float(threshold_env)
                        if verbose_mode:
                            print(f"[BACKEND] 環境変数から検出閾値を設定: {effective_threshold}")
                except (ValueError, TypeError) as e:
                    print(f"[BACKEND] 閾値設定エラー: {e}")
            
            if verbose_mode:
                print(f"[BACKEND] ゾンビ検出 - 閾値: {effective_threshold}, デバッグモード: {debug_mode}")
            
            # 非同期で画像処理を実行
            loop = asyncio.get_event_loop()
            
            # 実際の検出処理はバックグラウンドスレッドで実行
            result = await loop.run_in_executor(
                None, 
                lambda: self.model.predict(
                    source=screenshot_resized,
                    conf=effective_threshold,  # 環境変数から設定された閾値を使用
                    verbose=False
                )
            )
            
            # 結果から人物クラス（ID=0）の検出結果を抽出
            detection_count = 0
            boxes = []
            
            # 検出情報を準備
            for r in result:
                for box in r.boxes:
                    # クラスIDを取得
                    cls_id = int(box.cls.item())
                    
                    # 対象のクラスかチェック
                    if cls_id in self.target_classes:
                        # 信頼度を取得
                        conf = float(box.conf.item())
                        
                        # ③ 閾値判定は環境変数で設定済みのeffective_thresholdを使用
                        if conf > effective_threshold:
                            # 座標を取得
                            x1, y1, x2, y2 = map(int, box.xyxy.tolist()[0])
                            
                            boxes.append({
                                "bbox": [x1, y1, x2, y2],
                                "confidence": conf,
                                "class_id": cls_id
                            })
                            
                            # カウント増加
                            detection_count += 1
                            
                            if verbose_mode:
                                print(f"[BACKEND] 検出: クラス={cls_id}, 信頼度={conf:.4f}, 座標=({x1},{y1})-({x2},{y2})")
            
            # 終了時刻を記録
            end_time = time_module.time()
            process_time = (end_time - start_time) * 1000  # ミリ秒単位
            
            # 詳細ログ出力
            if verbose_mode:
                print(f"[BACKEND] YOLO検出完了: {detection_count}体 (処理時間: {process_time:.1f}ms)")
            
            # ResNet分類器による判定（有効な場合のみ）
            if self.resnet_enabled and self.resnet_classifier:
                try:
                    # 1. ファイルを介さない方法を試みる
                    # 画像をメモリ上でエンコード
                    try:
                        if verbose_mode:
                            print(f"[BACKEND] ResNet分類 - メモリ内処理開始")
                        is_success, img_encoded = cv2.imencode('.jpg', screenshot)
                        if is_success:
                            # メモリ上での分類を試みる（ファイルI/Oを回避）
                            from io import BytesIO
                            img_bytes = BytesIO(img_encoded.tobytes())
                            
                            # バイナリデータから直接分類できるメソッドがあれば使用
                            if hasattr(self.resnet_classifier, 'predict_bytes'):
                                result_class, prob = await loop.run_in_executor(
                                    None,
                                    lambda: self.resnet_classifier.predict_bytes(img_bytes.getvalue())
                                )
                                
                                # 結果を格納して処理終了
                                resnet_result = {
                                    "is_zombie_scene": result_class == "zombie",
                                    "probability": float(prob)
                                }
                                if verbose_mode:
                                    print(f"[BACKEND] ResNet分類 - メモリ内処理成功: {result_class}, {prob}")
                                
                                # メモリ処理が成功したら以降のファイル処理はスキップ
                                return {
                                    "timestamp": time_module.time(),
                                    "detection_count": detection_count,
                                    "boxes": boxes,
                                    "resnet_result": resnet_result,
                                    "process_time_ms": process_time
                                }
                    except Exception as e:
                        print(f"[BACKEND] ResNet分類 - メモリ内処理失敗: {e}")
                        # エラーが発生した場合は従来のファイルベース処理にフォールバック
                        pass
                    
                    # 2. 従来のファイルベース処理（リトライ処理付き）
                    import os
                    import tempfile
                    
                    # 一時ファイルパスを生成
                    temp_file = None
                    temp_filename = ""
                    
                    try:
                        if verbose_mode:
                            print(f"[BACKEND] ResNet分類 - 一時ファイル処理開始")
                        # NamedTemporaryFile を使用
                        temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
                        temp_filename = temp_file.name
                        temp_file.close()  # 明示的にファイルを閉じる
                        
                        # 画像をファイルに書き込み
                        cv2.imwrite(temp_filename, screenshot)
                        
                        # ファイルアクセス可能か確認（最大5回リトライ）
                        file_accessible = False
                        for retry in range(5):
                            if os.path.exists(temp_filename):
                                try:
                                    with open(temp_filename, 'rb') as f:
                                        # ファイルが読み込めることを確認
                                        f.read(1)
                                        file_accessible = True
                                        break
                                except (PermissionError, IOError) as e:
                                    if verbose_mode:
                                        print(f"[BACKEND] ファイルアクセス待機中... リトライ {retry+1}/5: {e}")
                                    time_module.sleep(0.2)  # 少し待機
                        
                        if not file_accessible:
                            print(f"[BACKEND] ファイルアクセス失敗: {temp_filename}")
                            raise IOError(f"ファイルにアクセスできません: {temp_filename}")
                        
                        # 分類実行（バックグラウンドスレッドで）
                        if verbose_mode:
                            print(f"[BACKEND] ResNet分類実行中: {temp_filename}")
                        result_class, prob = await loop.run_in_executor(
                            None, 
                            lambda: self.resnet_classifier.predict_image(temp_filename)
                        )
                        
                        # 結果を格納
                        resnet_result = {
                            "is_zombie_scene": result_class == "zombie",
                            "probability": float(prob)
                        }
                        
                        if verbose_mode:
                            print(f"[BACKEND] ResNet分類結果: {result_class}, {prob}")
                        
                    except Exception as e:
                        print(f"[BACKEND] ResNet分類エラー: {e}")
                        import traceback
                        traceback.print_exc()  # フルスタックトレースを出力
                        logger.error(f"ResNet分類器の実行中にエラー: {e}")
                        logger.error(traceback.format_exc())
                    
                    finally:
                        # 一時ファイルを削除（リトライ処理付き）
                        if temp_filename and os.path.exists(temp_filename):
                            for retry in range(5):
                                try:
                                    os.unlink(temp_filename)
                                    if verbose_mode:
                                        print(f"[BACKEND] 一時ファイル削除成功: {temp_filename}")
                                    break
                                except (PermissionError, IOError) as e:
                                    if verbose_mode:
                                        print(f"[BACKEND] 一時ファイル削除リトライ {retry+1}/5: {e}")
                                    time_module.sleep(0.2)  # 少し待機
                        
                except Exception as e:
                    print(f"[BACKEND] ResNet全体処理エラー: {e}")
                    import traceback
                    traceback.print_exc()  # フルスタックトレースを出力
                    logger.error(f"ResNet分類器の実行中にエラー: {e}")
                    logger.error(traceback.format_exc())
            
            # デバッグ情報（一度に含まれる情報量を減らす）
            if detection_count > 0:
                logger.debug(f"ゾンビ検出結果: {detection_count}体 (処理時間: {process_time:.1f}ms) - 現在のしきい値: {effective_threshold}")
            
            # 検出結果をマップに格納
            return {
                "timestamp": time_module.time(),
                "detection_count": detection_count,
                "boxes": boxes,
                "resnet_result": resnet_result,
                "process_time_ms": process_time
            }
            
        except Exception as e:
            print(f"[BACKEND] ゾンビ検出中にエラー: {e}")
            import traceback
            traceback.print_exc()  # フルスタックトレースを出力
            logger.error(f"ゾンビ検出中にエラーが発生: {e}")
            logger.error(traceback.format_exc())
            return None
    
    async def _process_detection_results(self, 
                                      results, 
                                      screenshot, 
                                      zombie_callback, 
                                      few_zombies_callback,
                                      warning_zombies_callback):
        """
        検出結果の処理とコールバック実行
        
        Args:
            results: 検出結果
            screenshot: 原画像
            zombie_callback: 多数ゾンビ検出時のコールバック
            few_zombies_callback: 少数ゾンビ検出時のコールバック
            warning_zombies_callback: 警戒レベルゾンビ検出時のコールバック
        """
        if results is None:
            return
        
        count = results["detection_count"]
        resnet_info = results.get("resnet_result", {"is_zombie_scene": False, "probability": 0.0})
        resnet_result = resnet_info.get("is_zombie_scene", False)
        resnet_prob = resnet_info.get("probability", 0.0)
        
        # ① ゾンビ検出直後にログ出力を追加
        print(f"[BACKEND] ゾンビ検出数: {count}")
        if "boxes" in results:
            print(f"[BACKEND] 検出内容: {results['boxes']}")
        else:
            print(f"[BACKEND] 検出内容: 詳細なし")
        
        # ③ 閾値（confidence threshold）の確認
        print(f"[BACKEND] 現在の信頼度しきい値: {self.confidence}")
        
        # 検出数に応じた処理
        try:
            # 検出履歴に追加
            self.detection_history.append(count)
            self.detection_history = self.detection_history[-self.history_size:]
            
            # 一定数以上の連続検出があるか確認
            if sum(1 for c in self.detection_history if c > 0) >= self.required_consecutive_detections:
                # ログに記録
                from .monitor import log_zombie_detection
                log_zombie_detection(count)
                
                # 通知処理用の追加データ
                callback_data = {
                    "count": count,
                    "resnet_result": resnet_result,
                    "resnet_probability": resnet_prob,
                    "timestamp": results["timestamp"]
                }
                
                current_time = time.time()
                
                # 多数のゾンビ検出時（10体以上）
                if count >= 10:
                    if current_time - self.cooldown_timestamps["many"] > self.cooldown_periods["many"]:
                        if zombie_callback:
                            print(f"[BACKEND] 多数のゾンビ検出コールバック呼び出し: {count}体")
                            await self._call_callback(zombie_callback, count, screenshot, callback_data)
                        self.cooldown_timestamps["many"] = current_time
                
                # 警戒レベルのゾンビ検出時（5〜9体）
                elif count >= 5:
                    if current_time - self.cooldown_timestamps["warning"] > self.cooldown_periods["warning"]:
                        if warning_zombies_callback:
                            print(f"[BACKEND] 警戒レベルゾンビ検出コールバック呼び出し: {count}体")
                            await self._call_callback(warning_zombies_callback, count, screenshot, callback_data)
                        self.cooldown_timestamps["warning"] = current_time
                
                # 少数のゾンビ検出時（1〜4体）
                elif count > 0:
                    if current_time - self.cooldown_timestamps["few"] > self.cooldown_periods["few"]:
                        if few_zombies_callback:
                            print(f"[BACKEND] 少数ゾンビ検出コールバック呼び出し: {count}体")
                            await self._call_callback(few_zombies_callback, count, screenshot, callback_data)
                        self.cooldown_timestamps["few"] = current_time
                
                # ResNetが検出したがYOLOが検出しなかった場合（気配感知）
                elif count == 0 and resnet_result and resnet_prob > 0.7:
                    if current_time - self.cooldown_timestamps["few"] > self.cooldown_periods["few"]:
                        # 「気配」として少数ゾンビコールバックを使用
                        if few_zombies_callback:
                            print(f"[BACKEND] ゾンビの気配検出コールバック呼び出し: ResNet確率={resnet_prob:.2f}")
                            await self._call_callback(few_zombies_callback, 0, screenshot, callback_data)
                        self.cooldown_timestamps["few"] = current_time
                        logger.info(f"ゾンビの気配を検出: ResNet確率={resnet_prob:.2f}")
                
                # デバッグ画像保存
                if self.debug_mode and count > 0:
                    self._save_detection_image(screenshot, results["boxes"])
                    
        except Exception as e:
            logger.error(f"検出結果の処理中にエラーが発生: {e}")
    
    async def _call_callback(self, callback, zombie_count, screenshot, additional_data=None):
        """
        コールバック関数の呼び出し
        
        Args:
            callback: 呼び出すコールバック関数
            zombie_count: ゾンビの検出数
            screenshot: スクリーンショット
            additional_data: 追加データ（ResNet結果など）
        """
        try:
            from .notification import notification_manager
            
            # コールバックのシグネチャに応じて引数を調整
            import inspect
            sig = inspect.signature(callback)
            
            # ゾンビ数ごとの通知タイプを決定
            if zombie_count >= 10:
                notification_type = "many"
            elif zombie_count >= 5:
                notification_type = "warning"
            elif zombie_count > 0:
                notification_type = "few"
            else:
                # ResNetが検出したが、YOLOが検出しなかった場合
                resnet_result = additional_data.get("resnet_result", False) if additional_data else False
                if resnet_result:
                    notification_type = "presence"  # ゾンビの気配
                else:
                    notification_type = "few"  # デフォルト
            
            # 通知マネージャから権限を取得
            allowed, notification_id = notification_manager.try_acquire_notification(
                zombie_count, source="detector", detection_type=notification_type
            )
            
            if not allowed:
                logger.debug(f"通知マネージャが{notification_type}タイプのコールバック実行を拒否")
                return
            
            try:
                # コールバック関数の実行
                if len(sig.parameters) >= 3:  # additional_dataを受け取れる場合
                    result = await callback(zombie_count, screenshot, additional_data)
                else:
                    result = await callback(zombie_count, screenshot)
                
                logger.debug(f"ゾンビコールバック実行結果: {result}")
            finally:
                # 通知権限を解放
                notification_manager.release_notification(notification_id)
            
        except Exception as e:
            logger.error(f"コールバック呼び出し中にエラーが発生: {e}")
    
    def _save_detection_image(self, screenshot, boxes):
        """
        検出結果の画像を保存する
        
        Args:
            screenshot: スクリーンショット画像
            boxes: 検出されたバウンディングボックスの情報
        """
        try:
            import cv2
            from datetime import datetime
            
            # タイムスタンプの取得
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # 画像のコピーを作成
            debug_img = screenshot.copy()
            
            # バウンディングボックスの描画
            for box in boxes:
                if "bbox" in box:
                    x1, y1, x2, y2 = box["bbox"]
                    conf = box.get("confidence", 0.0)
                    class_id = box.get("class_id", 0)
                    
                    # 色の設定 (クラスIDによって変える)
                    color = (0, 255, 0)  # 基本は緑色
                    if class_id != 0:
                        color = (0, 0, 255)  # 人物以外は赤色
                    
                    # バウンディングボックスと信頼度の描画
                    cv2.rectangle(debug_img, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(debug_img, f"{conf:.2f}", (x1, y1-10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            # 画像の保存
            detection_count = len(boxes)
            debug_path = os.path.join(DEBUG_DIR, f"detection_{timestamp}_{detection_count}.jpg")
            cv2.imwrite(debug_path, debug_img)
            
            logger.debug(f"検出画像を保存しました: {debug_path}")
            
        except Exception as e:
            logger.error(f"検出画像の保存中にエラーが発生: {e}")
            # エラーが起きても処理を続行
