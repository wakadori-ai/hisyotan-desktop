"""
ゾンビ検出コールバックモジュール

ゾンビが検出された際のコールバック関数と通知処理を実装
"""

import logging
import time
import random
from typing import Dict, Any, Optional

# ロガーの設定
logger = logging.getLogger(__name__)

# デバウンス用のタイマー
last_callback_time: Dict[str, float] = {
    "zombie_alert": 0,
    "zombie_few_alert": 0,
    "zombie_warning": 0
}

# コールバックデバウンスチェッカー
def is_callback_throttled(callback_type: str) -> bool:
    """
    コールバックのデバウンス状態をチェック。
    短時間での重複呼び出しを防止するためにスロットリングを行う。
    
    Args:
        callback_type: コールバックの種類
        
    Returns:
        bool: デバウンス中の場合はTrue
    """
    from ..config.settings import Settings
    
    current_time = time.time()
    settings = Settings()
    
    if callback_type in last_callback_time:
        last_time = last_callback_time[callback_type]
        cooldown = settings.CALLBACK_COOLDOWN.get(callback_type, 5.0)
        
        # クールダウン中かチェック
        if current_time - last_time < cooldown:
            logger.debug(f"コールバック {callback_type} はデバウンス中 ({current_time - last_time:.1f}秒 < {cooldown}秒)")
            return True
    
    # 最終呼び出し時刻を更新
    last_callback_time[callback_type] = current_time
    return False

def _zombie_alert_callback(count: int, frame_data: Optional[Any] = None) -> None:
    """
    多数のゾンビが検出された時のコールバック（同期版）
    
    Args:
        count: 検出されたゾンビの数
        frame_data: キャプチャされたフレームデータ（オプション）
    """
    from ..ws.manager import send_notification
    from ..voice.engine import safe_play_voice
    from ..config.settings import Settings
    import asyncio
    
    # 設定を取得
    settings = Settings()
    
    # 非同期メソッドを同期的に実行するためのヘルパー関数
    def run_async(coro):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    
    logger.warning(f"🚨 多数のゾンビを検出: {count}体")
    
    # デバウンスチェック
    if is_callback_throttled("zombie_alert"):
        logger.debug("多数ゾンビアラートはデバウンス中のためスキップ")
        return
    
    # 対応するAPIエンドポイントを非同期呼び出し
    try:
        run_async(
            send_notification(
                f"多数のゾンビが接近中！ ({count}体)",
                message_type="zombieAlert",
                title="😱 ゾンビ接近警報",
                importance="high"
            )
        )
        
        # ゾンビ数に応じてセリフを変える
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
        
        # 音声合成・再生
        voice_preset = settings.VOICE_PRESETS["びっくり"]
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

async def zombie_few_alert(count: int, frame_data: Optional[Any] = None, play_audio: bool = True, force: bool = False):
    """
    少数のゾンビが検出された時のAPIハンドラー
    
    Args:
        count: 検出されたゾンビの数
        frame_data: キャプチャされたフレームデータ（オプション）
        play_audio: 音声を再生するかどうか
        force: 強制的に実行するかどうか
    """
    from ..ws.manager import send_notification
    from ..voice.engine import safe_play_voice
    from ..config.settings import Settings
    
    # 設定を取得
    settings = Settings()
    
    logger.info(f"🟠 少数のゾンビを検出: {count}体")
    
    # デバウンスチェック（強制フラグがない場合）
    if not force and is_callback_throttled("zombie_few_alert"):
        logger.debug("少数ゾンビアラートはデバウンス中のためスキップ")
        return {"status": "throttled", "message": "デバウンス中のためスキップされました"}
    
    # 通知を送信
    try:
        await send_notification(
            f"少数のゾンビを検出しました ({count}体)",
            message_type="fewZombiesAlert",
            title="⚠️ ゾンビ少数検出",
            importance="normal",
            skipAudio=not play_audio
        )
        
        # 音声再生が有効な場合
        if play_audio:
            # ゾンビ数に応じてセリフを変える
            if count >= 3:
                messages = [
                    "数匹のゾンビが見えるわ。気をつけて！",
                    "ゾンビを何体か確認したわ。注意して！",
                    "ゾンビが少し集まってる…警戒して！",
                    "ゾンビが数体いるわ！気をつけて！"
                ]
            else:
                messages = [
                    "ゾンビを見つけたわ。注意して！",
                    "ゾンビがいるわ！気をつけて！",
                    "ちょっと、ゾンビが近くにいるわよ！",
                    "あっ、ゾンビよ！気をつけて！"
                ]
            
            message = random.choice(messages)
            
            # 音声合成・再生
            voice_preset = settings.VOICE_PRESETS["警戒・心配"]
            safe_play_voice(
                message,
                speaker_id=settings.VOICEVOX_SPEAKER,
                speed=voice_preset["speed"],
                pitch=voice_preset["pitch"],
                intonation=voice_preset["intonation"],
                force=force,
                message_type="zombie_few_alert"
            )
            
        return {"status": "success", "message": "少数ゾンビアラートが送信されました", "count": count}
        
    except Exception as e:
        logger.error(f"少数ゾンビアラートエラー: {e}")
        return {"status": "error", "message": f"エラーが発生しました: {str(e)}"}

async def zombie_warning(count: int, frame_data: Optional[Any] = None, play_audio: bool = True, force: bool = False):
    """
    警戒レベルのゾンビが検出された時のAPIハンドラー
    
    Args:
        count: 検出されたゾンビの数
        frame_data: キャプチャされたフレームデータ（オプション）
        play_audio: 音声を再生するかどうか
        force: 強制的に実行するかどうか
    """
    from ..ws.manager import send_notification
    from ..voice.engine import safe_play_voice
    from ..config.settings import Settings
    
    # 設定を取得
    settings = Settings()
    
    logger.info(f"🟡 警戒レベルのゾンビを検出: {count}体")
    
    # デバウンスチェック（強制フラグがない場合）
    if not force and is_callback_throttled("zombie_warning"):
        logger.debug("警戒ゾンビアラートはデバウンス中のためスキップ")
        return {"status": "throttled", "message": "デバウンス中のためスキップされました"}
    
    # 通知を送信
    try:
        await send_notification(
            f"警戒レベルのゾンビが周辺にいます ({count}体)",
            message_type="zombieWarning",
            title="⚠️ ゾンビ警戒情報",
            importance="normal",
            skipAudio=not play_audio
        )
        
        # 音声再生が有効な場合
        if play_audio:
            # セリフをランダムに選択
            messages = [
                "周辺にゾンビがいるみたい。気をつけて行動してね。",
                "ゾンビの気配を感じるわ。警戒したほうがいいかも？",
                "ゾンビが近くにいるかも。用心して行動してね。",
                "何か動くものを感知したわ。もしかしたらゾンビかも。",
                "周囲を警戒したほうがいいわ。ゾンビがいるかもしれないから。"
            ]
            
            message = random.choice(messages)
            
            # 音声合成・再生
            voice_preset = settings.VOICE_PRESETS["警戒・心配"]
            safe_play_voice(
                message,
                speaker_id=settings.VOICEVOX_SPEAKER,
                speed=voice_preset["speed"],
                pitch=voice_preset["pitch"],
                intonation=voice_preset["intonation"],
                force=force,
                message_type="zombie_warning"
            )
            
        return {"status": "success", "message": "ゾンビ警戒通知が送信されました", "count": count}
        
    except Exception as e:
        logger.error(f"ゾンビ警戒アラートエラー: {e}")
        return {"status": "error", "message": f"エラーが発生しました: {str(e)}"}

def zombie_few_alert_callback(count: int, frame_data: Optional[Any] = None) -> None:
    """
    少数のゾンビが検出された時のコールバック（同期版）
    
    Args:
        count: 検出されたゾンビの数
        frame_data: キャプチャされたフレームデータ（オプション）
    """
    import asyncio
    
    # 非同期メソッドを同期的に実行するためのヘルパー関数
    def run_async(coro):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    
    logger.info(f"🟠 少数のゾンビを検出（コールバック）: {count}体")
    
    # 対応するAPIエンドポイントを非同期呼び出し
    try:
        run_async(zombie_few_alert(count, frame_data))
    except Exception as e:
        logger.error(f"少数ゾンビコールバック実行中にエラーが発生しました: {str(e)}")
        logger.exception("詳細:")

def zombie_warning_callback(count: int, frame_data: Optional[Any] = None) -> None:
    """
    警戒レベルのゾンビが検出された時のコールバック（同期版）
    
    Args:
        count: 検出されたゾンビの数
        frame_data: キャプチャされたフレームデータ（オプション）
    """
    import asyncio
    
    # 非同期メソッドを同期的に実行するためのヘルパー関数
    def run_async(coro):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()
    
    logger.info(f"🟡 警戒レベルのゾンビを検出（コールバック）: {count}体")
    
    # 対応するAPIエンドポイントを非同期呼び出し
    try:
        run_async(zombie_warning(count, frame_data))
    except Exception as e:
        logger.error(f"警戒ゾンビコールバック実行中にエラーが発生しました: {str(e)}")
        logger.exception("詳細:")

# エクスポートする関数
__all__ = [
    'is_callback_throttled',
    '_zombie_alert_callback', 
    'zombie_few_alert', 
    'zombie_warning',
    'zombie_few_alert_callback',
    'zombie_warning_callback'
] 