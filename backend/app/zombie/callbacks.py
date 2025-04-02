"""
ゾンビ検出コールバックモジュール

ゾンビが検出された際のコールバック関数と通知処理を実装
"""

import logging
import time
import random
import threading
from typing import Dict, Any, Optional, TypeVar, Callable, Coroutine, Union, List, Set, Tuple
import asyncio
from datetime import datetime, timedelta

# ロガーの設定
logger = logging.getLogger(__name__)

# 型変数の定義（リンターエラー修正用）
T = TypeVar('T')

# 最後のコールバック実行時刻を記録する辞書
last_callback_times: Dict[str, float] = {
    "zombie_alert": 0.0,  # 大量ゾンビアラート
    "zombie_few": 0.0,    # 少数ゾンビアラート
    "zombie_warning": 0.0  # 警戒レベルゾンビアラート
}

# コールバックのデバウンス時間（秒）
DEBOUNCE_TIMES: Dict[str, float] = {
    "zombie_alert": 60.0,   # 大量ゾンビアラートは60秒間隔
    "zombie_few": 30.0,     # 少数ゾンビアラートは30秒間隔
    "zombie_warning": 30.0  # 警戒レベルゾンビアラートは30秒間隔
}

# ③ 閾値（confidence threshold）のデバッグ用変数
# この値を調整することでモデルの検出感度を変更できる
DEBUG_CONFIDENCE_THRESHOLD = 0.45  # デフォルト値

def is_callback_throttled(callback_type: str) -> bool:
    """
    コールバックがデバウンス期間中かどうかを確認する
    
    Args:
        callback_type: コールバックタイプ
        
    Returns:
        bool: デバウンス中の場合はTrue
    """
    current_time = time.time()
    last_time = last_callback_times.get(callback_type, 0)
    debounce_time = DEBOUNCE_TIMES.get(callback_type, 30.0)
    
    # デバウンス期間中かチェック
    if current_time - last_time < debounce_time:
        return True
    
    # 最終実行時刻を更新
    last_callback_times[callback_type] = current_time
    return False

def _zombie_alert_callback(count: int, frame_data: Optional[Any] = None, additional_data: Optional[Dict[str, Any]] = None) -> None:
    """
    多数のゾンビが検出された時のコールバック（同期版）
    
    Args:
        count: 検出されたゾンビの数
        frame_data: キャプチャされたフレームデータ（オプション）
        additional_data: 追加データ（ResNetの検出結果など）
    """
    from ..ws.manager import send_notification
    from ..voice.engine import safe_play_voice
    from ..config.settings import Settings
    import asyncio
    
    # 設定を取得
    settings = Settings()
    
    # ResNetの検出結果を取得
    resnet_result = False
    resnet_prob = 0.0
    
    if additional_data and "resnet_result" in additional_data:
        resnet_result = additional_data.get("resnet_result", False)
        resnet_prob = additional_data.get("resnet_probability", 0.0)
    
    # 非同期メソッドを同期的に実行するためのヘルパー関数
    def run_async(coro: Coroutine[Any, Any, T]) -> T:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    
    logger.warning(f"🚨 多数のゾンビを検出: {count}体, ResNet結果: {resnet_result}({resnet_prob:.2f})")
    
    # デバウンスチェック
    if is_callback_throttled("zombie_alert"):
        logger.debug("多数ゾンビアラートはデバウンス中のためスキップ")
        return
    
    # 通知メッセージの作成
    message_suffix = ""
    if not resnet_result and resnet_prob < 0.3:
        message_suffix = "（誤検出の可能性あり）"
        
    # 対応するAPIエンドポイントを非同期呼び出し
    try:
        run_async(
            send_notification(
                f"多数のゾンビが接近中！ ({count}体){message_suffix}",
                message_type="zombieAlert",
                title="😱 ゾンビ接近警報",
                importance="high"
            )
        )
        
        # ResNetの結果に基づいてセリフを選択
        if resnet_result and resnet_prob > 0.7:
            # ResNetも高確率で検出（本当に危険）
            if count >= 15:
                messages = [
                    "完全に囲まれてる！すぐに逃げて！",
                    "ゾンビの大群よ！早く安全な場所へ！",
                    "もう手遅れかも！このままじゃ危険！",
                    "大変！ゾンビがたくさんいるわ！急いで！"
                ]
            elif count >= 8:
                messages = [
                    "危険よ！ゾンビが大量に接近中！",
                    "こんなに多いなんて！急いで逃げて！",
                    "周りがゾンビだらけよ！気をつけて！",
                    "ゾンビの群れが迫ってきてる！"
                ]
            else:
                messages = [
                    "ゾンビが複数接近中よ！注意して！",
                    "危ないわ！ゾンビの集団が来てる！",
                    "複数のゾンビを確認！気を付けて！",
                    "周囲にゾンビが増えてきたわ！"
                ]
        elif not resnet_result and resnet_prob < 0.3:
            # ResNetはあまり確信していない（誤検出の可能性）
            messages = [
                "あれ…？何か見間違えたかも…でも念のため注意して！",
                "ちょっと変…本当にゾンビかな？でも警戒したほうがいいかも…",
                "なんだか違和感があるけど…一応気をつけて！",
                "はっきりとは言えないけど…何か多く動いてるわ！"
            ]
        else:
            # 通常のメッセージ
            if count >= 15:
                messages = [
                    "完全に囲まれてる！すぐに逃げて！",
                    "ゾンビの大群よ！早く安全な場所へ！",
                    "もう手遅れかも！このままじゃ危険！",
                    "大変！ゾンビがたくさんいるわ！急いで！"
                ]
            elif count >= 8:
                messages = [
                    "危険よ！ゾンビが大量に接近中！",
                    "こんなに多いなんて！急いで逃げて！",
                    "周りがゾンビだらけよ！気をつけて！",
                    "ゾンビの群れが迫ってきてる！"
                ]
            else:
                messages = [
                    "ゾンビが複数接近中よ！注意して！",
                    "危ないわ！ゾンビの集団が来てる！",
                    "複数のゾンビを確認！気を付けて！",
                    "周囲にゾンビが増えてきたわ！"
                ]
        
        message = random.choice(messages)
        
        # 音声プリセット選択
        voice_preset = None
        if not resnet_result and resnet_prob < 0.3:
            # 誤検出の可能性がある場合は「疑問」プリセット
            voice_preset = settings.VOICE_PRESETS.get("疑問・思案", settings.VOICE_PRESETS["びっくり"])
        else:
            # 通常は「びっくり」プリセット
            voice_preset = settings.VOICE_PRESETS["びっくり"]
        
        # 音声合成・再生
        safe_play_voice(
            message,
            speaker_id=settings.VOICEVOX_SPEAKER,
            speed=voice_preset["speed"],
            pitch=voice_preset["pitch"],
            intonation=voice_preset["intonation"],
            message_type="zombie_alert"
        )
        
    except Exception as e:
        logger.error(f"ゾンビアラートコールバック実行中にエラーが発生しました: {str(e)}")
        logger.exception("詳細:")

# ゾンビ検出時の音声反応の呼び出しを追加
async def zombie_few_alert(count: int, frame_data: Optional[Any] = None, additional_data: Optional[Dict[str, Any]] = None, play_audio: bool = True, force: bool = False):
    """
    少数のゾンビが検出された時のAPIハンドラー
    
    Args:
        count: 検出されたゾンビの数
        frame_data: キャプチャされたフレームデータ（オプション）
        additional_data: 追加データ（ResNetの検出結果など）
        play_audio: 音声を再生するかどうか
        force: 強制的に実行するかどうか
    """
    from ..ws.manager import send_notification
    from ..voice.engine import react_to_zombie
    from ..config.settings import Settings
    
    # 設定を取得
    settings = Settings()
    
    # ResNetの検出結果を取得
    resnet_result = False
    resnet_prob = 0.0
    
    if additional_data and "resnet_result" in additional_data:
        resnet_result = additional_data.get("resnet_result", False)
        resnet_prob = additional_data.get("resnet_probability", 0.0)
    
    logger.info(f"🟠 少数のゾンビを検出: {count}体, ResNet結果: {resnet_result}({resnet_prob:.2f})")
    print(f"[BACKEND] 少数のゾンビを検出: {count}体, ResNet結果: {resnet_result}({resnet_prob:.2f})")
    
    # デバウンスチェック（強制フラグがない場合）
    if not force and is_callback_throttled("zombie_few"):
        logger.debug("少数ゾンビアラートはデバウンス中のためスキップ")
        print("[BACKEND] 少数ゾンビアラートはデバウンス中のためスキップ")
        return {"status": "throttled", "message": "デバウンス中のためスキップされました"}
    
    # 距離情報を取得（ない場合はデフォルト値）
    distance = 0.0
    if additional_data and "closest_distance" in additional_data:
        distance = additional_data.get("closest_distance", 0.0)
    
    # 確定アラートとして音声反応を実行
    if play_audio:
        try:
            await asyncio.to_thread(
                react_to_zombie,
                count, 
                distance, 
                "confirm", 
                resnet_result, 
                resnet_prob
            )
            print(f"[BACKEND] 確定アラート音声再生完了: {count}体")
        except Exception as e:
            logger.error(f"確定アラート音声再生エラー: {e}")
    
    # 通知メッセージの作成
    message_suffix = ""
    if not resnet_result and resnet_prob < 0.3:
        message_suffix = "（誤検出の可能性あり）"
    
    # WebSocketで送信するデータを作成
    positions = []
    
    # 🆕 通知のタイプを設定
    alert_type = "warning" if count >= 3 else "info"
    
    # 位置情報がある場合
    if additional_data and "boxes" in additional_data:
        boxes = additional_data["boxes"]
        for box in boxes:
            if "bbox" in box:
                x1, y1, x2, y2 = box["bbox"]
                conf = box.get("confidence", 0.0)
                positions.append({
                    "x": (x1 + x2) // 2,
                    "y": (y1 + y2) // 2,
                    "w": x2 - x1,
                    "h": y2 - y1,
                    "confidence": conf
                })
    
    # 通知送信
    await send_notification(
        f"ゾンビ {count}体を検出しました{message_suffix}",
        message_type=alert_type,
        title="ゾンビ検出",
        importance="high",
        data={
            "count": count,
            "positions": positions,
            "resnet_result": resnet_result,
            "resnet_probability": resnet_prob
        }
    )
    
    return {
        "status": "success",
        "message": f"少数ゾンビアラートを送信しました ({count}体)"
    }

async def zombie_warning(count: int, frame_data: Optional[Any] = None, additional_data: Optional[Dict[str, Any]] = None, play_audio: bool = True, force: bool = False):
    """
    警戒レベルのゾンビが検出された時のAPIハンドラー
    
    Args:
        count: 検出されたゾンビの数
        frame_data: キャプチャされたフレームデータ（オプション）
        additional_data: 追加データ（ResNetの検出結果など）
        play_audio: 音声を再生するかどうか
        force: 強制的に実行するかどうか
    """
    from ..ws.manager import send_notification
    from ..voice.engine import react_to_zombie
    from ..config.settings import Settings
    
    # 設定を取得
    settings = Settings()
    
    # ResNetの検出結果を取得
    resnet_result = False
    resnet_prob = 0.0
    
    if additional_data and "resnet_result" in additional_data:
        resnet_result = additional_data.get("resnet_result", False)
        resnet_prob = additional_data.get("resnet_probability", 0.0)
    
    logger.warning(f"🟠 警戒レベルのゾンビを検出: {count}体, ResNet結果: {resnet_result}({resnet_prob:.2f})")
    print(f"[BACKEND] 警戒レベルのゾンビを検出: {count}体, ResNet結果: {resnet_result}({resnet_prob:.2f})")
    
    # デバウンスチェック（強制フラグがない場合）
    if not force and is_callback_throttled("zombie_warning"):
        logger.debug("警戒レベルゾンビアラートはデバウンス中のためスキップ")
        print("[BACKEND] 警戒レベルゾンビアラートはデバウンス中のためスキップ")
        return {"status": "throttled", "message": "デバウンス中のためスキップされました"}
    
    # 距離情報を取得（ない場合はデフォルト値）
    distance = 0.0
    if additional_data and "closest_distance" in additional_data:
        distance = additional_data.get("closest_distance", 0.0)
    
    # 確定アラートとして音声反応を実行
    if play_audio:
        try:
            await asyncio.to_thread(
                react_to_zombie,
                count, 
                distance, 
                "confirm", 
                resnet_result, 
                resnet_prob
            )
            print(f"[BACKEND] 警戒レベル音声再生完了: {count}体")
        except Exception as e:
            logger.error(f"警戒レベル音声再生エラー: {e}")
    
    # 通知メッセージの作成
    message_suffix = ""
    if not resnet_result and resnet_prob < 0.3:
        message_suffix = "（誤検出の可能性あり）"
    
    # WebSocketで送信するデータを作成
    positions = []
    if additional_data and "boxes" in additional_data:
        positions = additional_data["boxes"]
    
    # ② WebSocket送信前にログを追加
    zombie_warning_data = {
        "type": "zombie_warning",
        "data": {
            "count": count,
            "positions": positions
        }
    }
    print(f"[BACKEND] WebSocket送信予定: {zombie_warning_data}")
    
    # WebSocketで直接送信（zombie_warning型のメッセージ）
    try:
        # まず直接zombie_warningメッセージを送信
        await manager.broadcast(zombie_warning_data)
        print(f"[BACKEND] WebSocket送信完了: zombie_warning {count}体")
    except Exception as e:
        print(f"[BACKEND] WebSocket zombie_warning送信エラー: {str(e)}")
        logger.error(f"WebSocket zombie_warning送信エラー: {e}")
    
    # 通知を送信
    try:
        notification_data = {
            "message": f"警戒レベルのゾンビが周辺にいます ({count}体){message_suffix}",
            "message_type": "zombieWarning",
            "title": "⚠️ ゾンビ警戒情報",
            "importance": "normal",
            "skipAudio": not play_audio
        }
        print(f"[BACKEND] 通知送信: {notification_data}")
        
        await send_notification(
            f"警戒レベルのゾンビが周辺にいます ({count}体){message_suffix}",
            message_type="zombieWarning",
            title="⚠️ ゾンビ警戒情報",
            importance="normal",
            skipAudio=not play_audio
        )
        
        print(f"[BACKEND] 通知送信完了: zombieWarning {count}体")
        
        # 音声再生が有効な場合
        if play_audio:
            # YOLOとResNetの結果の組み合わせに基づいてセリフを選択
            if resnet_result and resnet_prob > 0.7:
                # ResNetも高確率で検出（本当に危険）
                messages = [
                    "ふにゃっ…ちょっと多いかも…警戒して動こうっ！",
                    "これは危険かも…周りをしっかり確認して！",
                    "ゾンビの集団よ！慎重に行動して！",
                    "ゾンビがけっこういるわ！気をつけて！"
                ]
            elif not resnet_result and resnet_prob < 0.3:
                # ResNetはあまり確信していない（誤検出の可能性）
                messages = [
                    "ゾンビに見えるけど…ちょっと違和感があるわ…",
                    "何か検出したけど…確実じゃないかも…",
                    "警戒したほうがいいけど…見間違いの可能性もあるかな",
                    "動きはあるけど…はっきりとは言えないわ…"
                ]
            else:
                # 通常の警戒メッセージ
                messages = [
                    "周辺にゾンビがいるみたい。気をつけて行動してね。",
                    "ゾンビの気配を感じるわ。警戒したほうがいいかも？",
                    "ゾンビが近くにいるかも。用心して行動してね。",
                    "何か動くものを感知したわ。もしかしたらゾンビかも。",
                    "周囲を警戒したほうがいいわ。ゾンビがいるかもしれないから。"
                ]
            
            message = random.choice(messages)
            
            # 音声合成・再生（状況に応じたプリセットを選択）
            voice_preset = None
            
            if resnet_result and resnet_prob > 0.7:
                # 確実な検出の場合は「強い警戒」プリセット
                voice_preset = settings.VOICE_PRESETS.get("警戒・心配", settings.VOICE_PRESETS["通常"])
            elif not resnet_result and resnet_prob < 0.3:
                # 誤検出の可能性がある場合は「疑問」プリセット
                voice_preset = settings.VOICE_PRESETS.get("疑問・思案", settings.VOICE_PRESETS["通常"])
            else:
                # 通常の警戒
                voice_preset = settings.VOICE_PRESETS.get("警戒・心配", settings.VOICE_PRESETS["通常"])
            
            safe_play_voice(
                message,
                speaker_id=settings.VOICEVOX_SPEAKER,
                speed=voice_preset["speed"],
                pitch=voice_preset["pitch"],
                intonation=voice_preset["intonation"],
                force=force,
                message_type="zombie_warning"
            )
        
        return {"status": "success", "message": "ゾンビ警戒アラートが送信されました", "count": count, "resnet": resnet_result}
        
    except Exception as e:
        logger.error(f"ゾンビ警戒アラートエラー: {e}")
        print(f"[BACKEND] ゾンビ警戒アラートエラー: {str(e)}")
        return {"status": "error", "message": f"エラーが発生しました: {str(e)}"}

def zombie_few_alert_callback(count: int, frame_data: Optional[Any] = None, additional_data: Optional[Dict[str, Any]] = None) -> None:
    """
    少数のゾンビが検出された時のコールバック（同期版）
    
    Args:
        count: 検出されたゾンビの数
        frame_data: キャプチャされたフレームデータ（オプション）
        additional_data: 追加データ（ResNetの検出結果など）
    """
    import asyncio
    
    # 非同期メソッドを同期的に実行するためのヘルパー関数
    def run_async(coro: Coroutine[Any, Any, T]) -> T:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    
    # 非同期版を呼び出し
    run_async(zombie_few_alert(count, frame_data, additional_data))

def zombie_warning_callback(count: int, frame_data: Optional[Any] = None, additional_data: Optional[Dict[str, Any]] = None) -> None:
    """
    警戒レベルのゾンビが検出された時のコールバック（同期版）
    
    Args:
        count: 検出されたゾンビの数
        frame_data: キャプチャされたフレームデータ（オプション）
        additional_data: 追加データ（ResNetの検出結果など）
    """
    import asyncio
    
    # 非同期メソッドを同期的に実行するためのヘルパー関数
    def run_async(coro: Coroutine[Any, Any, T]) -> T:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    
    # 非同期版を呼び出し
    run_async(zombie_warning(count, frame_data, additional_data))

# エクスポートする関数
__all__ = [
    'is_callback_throttled',
    '_zombie_alert_callback', 
    'zombie_few_alert', 
    'zombie_warning',
    'zombie_few_alert_callback',
    'zombie_warning_callback'
] 