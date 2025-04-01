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
from typing import List, Dict, Any, Tuple, Optional, Callable, Coroutine
from ultralytics import YOLO
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
    
    def __init__(self, model_path: str = None, confidence: float = 0.45, debug_mode: bool = False, target_classes: Optional[List[int]] = None):
        """
        ZombieDetectorクラスのコンストラクタ
        
        Args:
            model_path: YOLOモデルファイルのパス（指定がなければデフォルトのYOLOv8nを使用）
            confidence: 検出信頼度の閾値（デフォルト: 0.45）
            debug_mode: デバッグモードフラグ
            target_classes: 検出対象のクラスIDリスト（デフォルトは人物クラス[0]のみ）
        """
        # デフォルトのモデルパス
        if model_path is None:
            model_path = os.path.join(DATA_DIR, "models", "yolov8n.pt")
        
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
        
        logger.info(f"ZombieDetector初期化完了: confidence={self.confidence}, debug_mode={self.debug_mode}, frame_interval={self.adaptive_interval}秒, resize_factor={self.resize_factor}, skip_ratio={self.skip_ratio}")
    
    async def load_model(self):
        """YOLOモデルの非同期ロード"""
        try:
            # モデルのロードは重い処理なので非同期で行う
            loop = asyncio.get_event_loop()
            self.model = await loop.run_in_executor(None, lambda: YOLO(self.model_path))
            logger.info(f"YOLOモデルのロードに成功: {self.model_path}")
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
            検出結果オブジェクト
        """
        try:
            # モデルが読み込まれていない場合
            if self.model is None:
                logger.warning("モデルが読み込まれていません")
                return None
            
            # 非同期処理でモデル推論を実行
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None, 
                lambda: self.model(
                    screenshot, 
                    conf=self.confidence,
                    verbose=False
                )
            )
            
            # デバッグ用：検出結果の内容確認ログ
            if self.debug_mode:
                if results and len(results) > 0:
                    r = results[0]
                    if hasattr(r, 'boxes') and r.boxes is not None:
                        num_boxes = len(r.boxes)
                        logger.info(f"検出結果: {num_boxes}個のボックスを検出")
                        for i, box in enumerate(r.boxes):
                            cls_id = int(box.cls.cpu().numpy()[0])
                            conf = float(box.conf.cpu().numpy()[0])
                            logger.info(f"  - ボックス {i}: クラスID={cls_id}, 信頼度={conf:.2f}")
                    else:
                        logger.warning("検出結果にboxesが含まれていません")
                else:
                    logger.info("検出結果が空です")
            
            return results
        except Exception as e:
            logger.error(f"ゾンビ検出中にエラー発生: {e}")
            return None
    
    async def _process_detection_results(self, 
                                      results, 
                                      screenshot, 
                                      zombie_callback, 
                                      few_zombies_callback,
                                      warning_zombies_callback):
        """
        検出結果を処理する
        
        Args:
            results: YOLOによる検出結果
            screenshot: 検出に使用したスクリーンショット
            zombie_callback: 多数ゾンビ検出時のコールバック
            few_zombies_callback: 少数ゾンビ検出時のコールバック
            warning_zombies_callback: 警戒レベルゾンビ検出時のコールバック
            
        Returns:
            None
        """
        try:
            # 検出されたオブジェクト数を計算
            detections = []
            classes_detected = set()  # 検出されたクラスIDを記録
            
            for r in results:
                boxes = r.boxes
                
                # デバッグ用：検出されたすべてのクラスを確認
                if self.debug_mode and len(boxes) > 0:
                    all_classes = [int(box.cls.cpu().numpy()[0]) for box in boxes]
                    logger.info(f"検出されたすべてのクラスID: {all_classes}")
                
                for box in boxes:
                    # クラスIDを取得
                    cls_id = int(box.cls.cpu().numpy()[0])
                    classes_detected.add(cls_id)
                    
                    # 対象クラスの検出（人物クラス=0およびその他の可能性のあるクラス）
                    # YOLOv8のCOCOデータセットでは、0=人物(person)
                    # その他の可能性：YOLOv8 Pose modelでの人物検出や、カスタムデータでのゾンビクラス
                    target_classes = self.target_classes
                    
                    if cls_id in target_classes:
                        confidence = float(box.conf.cpu().numpy()[0])
                        if confidence >= self.confidence:
                            detections.append({
                                'confidence': confidence,
                                'box': box.xyxy.cpu().numpy()[0],
                                'class_id': cls_id
                            })
            
            # デバッグ情報：検出されたクラスの一覧
            if self.debug_mode:
                logger.info(f"検出された全クラスID: {classes_detected}")
                logger.info(f"フィルタ後の検出数: {len(detections)}")
            
            zombie_count = len(detections)
            
            # 検出履歴に追加
            self.detection_history.append(zombie_count)
            if len(self.detection_history) > self.history_size:
                self.detection_history.pop(0)
            
            # デバッグ用：検出履歴の状態を出力
            if self.debug_mode:
                logger.info(f"検出履歴: {self.detection_history}, 必要連続検出数: {self.required_consecutive_detections}")
                
            # 連続検出条件を満たさない場合は通知スキップ
            if zombie_count == 0 or len(self.detection_history) < self.required_consecutive_detections:
                if self.debug_mode and zombie_count > 0:
                    logger.info(f"検出履歴が不足しているため通知をスキップ: 履歴サイズ={len(self.detection_history)}, 必要={self.required_consecutive_detections}")
                return
                
            # 履歴内の必要フレーム数で検出があったかチェック
            confirmed_detections = sum(1 for count in self.detection_history[-self.required_consecutive_detections:] if count > 0)
            if self.debug_mode:
                logger.info(f"連続検出数: {confirmed_detections}/{self.required_consecutive_detections}")
                
            if confirmed_detections < self.required_consecutive_detections:
                if self.debug_mode:
                    logger.info(f"連続検出条件を満たしていないため通知をスキップ: {confirmed_detections}/{self.required_consecutive_detections}")
                return
                
            # デバッグモードの場合は検出結果を画像に描画して保存
            if self.debug_mode:
                debug_img = screenshot.copy()
                for det in detections:
                    box = det['box']
                    x1, y1, x2, y2 = map(int, box)
                    # クラスIDに応じて色を変える
                    color = (0, 255, 0)  # 基本は緑色
                    if 'class_id' in det and det['class_id'] != 0:
                        color = (0, 0, 255)  # 人物以外は赤色
                    
                    cv2.rectangle(debug_img, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(debug_img, f"{det['confidence']:.2f} (cls:{det.get('class_id', 0)})", 
                                (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                debug_path = os.path.join(DEBUG_DIR, f"debug_{timestamp}_{zombie_count}.jpg")
                cv2.imwrite(debug_path, debug_img)
                logger.info(f"デバッグ画像を保存しました: {debug_path}")
            
            current_time = time.time()
            
            # クールダウン状態の確認（デバッグ用）
            if self.debug_mode:
                for cooldown_type, timestamp in self.cooldown_timestamps.items():
                    remaining = timestamp - current_time
                    if remaining > 0:
                        logger.info(f"クールダウン中 ({cooldown_type}): あと{remaining:.1f}秒")
            
            # ゾンビの数に応じたアクション
            if zombie_count >= 10:
                # 多数のゾンビが検出された場合
                if current_time >= self.cooldown_timestamps["many"]:
                    logger.warning(f"多数のゾンビを検出！ (数: {zombie_count})")
                    if zombie_callback:
                        await self._call_callback(zombie_callback, zombie_count, screenshot)
                    # クールダウン更新
                    self.cooldown_timestamps["many"] = current_time + self.cooldown_periods["many"]
                elif self.debug_mode:
                    remaining = self.cooldown_timestamps["many"] - current_time
                    logger.info(f"多数ゾンビのクールダウン中: あと{remaining:.1f}秒")
            elif zombie_count >= 5:
                # 警戒レベルのゾンビが検出された場合
                if current_time >= self.cooldown_timestamps["warning"]:
                    logger.warning(f"警戒レベルのゾンビを検出 (数: {zombie_count})")
                    if warning_zombies_callback:
                        await self._call_callback(warning_zombies_callback, zombie_count, screenshot)
                    # クールダウン更新
                    self.cooldown_timestamps["warning"] = current_time + self.cooldown_periods["warning"]
                elif self.debug_mode:
                    remaining = self.cooldown_timestamps["warning"] - current_time
                    logger.info(f"警戒レベルゾンビのクールダウン中: あと{remaining:.1f}秒")
            elif zombie_count > 0:
                # 少数のゾンビが検出された場合
                if current_time >= self.cooldown_timestamps["few"]:
                    logger.info(f"少数のゾンビを検出 (数: {zombie_count})")
                    if few_zombies_callback:
                        await self._call_callback(few_zombies_callback, zombie_count, screenshot)
                    # クールダウン更新
                    self.cooldown_timestamps["few"] = current_time + self.cooldown_periods["few"]
                elif self.debug_mode:
                    remaining = self.cooldown_timestamps["few"] - current_time
                    logger.info(f"少数ゾンビのクールダウン中: あと{remaining:.1f}秒")
            
        except Exception as e:
            logger.error(f"検出結果の処理中にエラー発生: {e}")
            logger.error(traceback.format_exc())
    
    async def _call_callback(self, callback, zombie_count, screenshot):
        """
        コールバック関数を安全に呼び出す
        
        Args:
            callback: 呼び出すコールバック関数
            zombie_count: 検出されたゾンビの数
            screenshot: スクリーンショット画像
            
        Returns:
            None
        """
        try:
            if self.debug_mode:
                logger.info(f"コールバック関数を呼び出します: ゾンビ数={zombie_count}")
                
            # コールバックが同期関数か非同期関数かを判定
            if asyncio.iscoroutinefunction(callback):
                if self.debug_mode:
                    logger.info("非同期コールバック関数を実行")
                await callback(zombie_count, screenshot)
            else:
                if self.debug_mode:
                    logger.info("同期コールバック関数を実行")
                callback(zombie_count, screenshot)
                
            if self.debug_mode:
                logger.info("コールバック関数の実行が完了しました")
                
        except Exception as e:
            logger.error(f"コールバック呼び出し中にエラー発生: {e}")
            # スタックトレースを記録
            logger.error(traceback.format_exc())
            
            # カスタムエラー情報
            if hasattr(callback, "__name__"):
                callback_name = callback.__name__
            else:
                callback_name = str(callback)
            logger.error(f"エラーが発生したコールバック: {callback_name}, ゾンビ数: {zombie_count}")
            
            # 可能であれば通知を送信（コールバックが失敗してもユーザーに情報を提供）
            try:
                from ..ws.manager import send_notification
                await send_notification(
                    "ゾンビ検出コールバックでエラーが発生しました",
                    message_type="error",
                    title="エラー",
                    importance="high"
                )
            except Exception as notification_error:
                logger.error(f"通知送信中にもエラーが発生: {notification_error}")
    
    # 以下、実装の詳細については省略（ファイルサイズの制約のため）
