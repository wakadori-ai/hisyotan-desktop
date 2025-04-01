"""
ゾンビ検出コールバックモジュール

ゾンビが検出された際のコールバック関数と通知処理を実装
"""

import logging
import time
import random
from typing import Dict, Any, Optional, TypeVar, Callable, Coroutine, Union

# ロガーの設定
logger = logging.getLogger(__name__)

# 型変数の定義（リンターエラー修正用）
T = TypeVar('T')

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
    from ..voice.engine import safe_play_voice
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
    
    # デバウンスチェック（強制フラグがない場合）
    if not force and is_callback_throttled("zombie_few_alert"):
        logger.debug("少数ゾンビアラートはデバウンス中のためスキップ")
        return {"status": "throttled", "message": "デバウンス中のためスキップされました"}
    
    # 通知メッセージの作成
    message_suffix = ""
    if count == 0 and resnet_result:
        message = "ゾンビの気配を感じます..."
        title = "👀 ゾンビの気配"
        message_type = "zombiePresence"
    else:
        message = f"少数のゾンビを検出しました ({count}体)"
        title = "⚠️ ゾンビ少数検出"
        message_type = "fewZombiesAlert"
        
        # ResNetの結果に基づく補足情報
        if count > 0 and not resnet_result and resnet_prob < 0.3:
            message_suffix = "（誤検出の可能性あり）"
    
    # 通知を送信
    try:
        await send_notification(
            message + message_suffix,
            message_type=message_type,
            title=title,
            importance="normal",
            skipAudio=not play_audio
        )
        
        # 音声再生が有効な場合
        if play_audio:
            # YOLOとResNetの結果に基づいてセリフを選択
            if count == 0 and resnet_result:
                # ゾンビの気配のみを検出
                messages = [
                    "……気配がするの。見えないけど…何か来る…っ",
                    "何かいる気がする…目には見えないけど…",
                    "変な感じがする…周りを警戒して…",
                    "この感覚…ゾンビがどこかにいるかも…"
                ]
            elif count > 0 and resnet_result:
                # YOLOとResNetが一致して検出
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
            elif count > 0 and not resnet_result and resnet_prob < 0.3:
                # YOLOが検出したがResNetが確信していない（誤検出の可能性）
                messages = [
                    "……うーん、ちょっと見間違いだったかも？",
                    "何か動いたと思ったけど…気のせいかな？",
                    "ちょっと不確かだけど…念のため警戒しておこう",
                    "はっきりとは言えないけど…何か見えたような…"
                ]
            else:
                # デフォルトのメッセージ
                messages = [
                    "ゾンビがいるみたい。注意して！",
                    "ゾンビを見つけたわ。気をつけて！",
                    "近くにゾンビがいるわ。警戒して！",
                    "ゾンビよ！気をつけてね！"
                ]
            
            message = random.choice(messages)
            
            # 音声合成・再生（状況に応じたプリセットを選択）
            voice_preset = None
            
            if count == 0 and resnet_result:
                # 気配感知時は「不安」プリセット
                voice_preset = settings.VOICE_PRESETS.get("不安・怯え", settings.VOICE_PRESETS["警戒・心配"])
            elif count > 0 and not resnet_result and resnet_prob < 0.3:
                # 誤検出の可能性がある場合は「疑問」プリセット
                voice_preset = settings.VOICE_PRESETS.get("疑問・思案", settings.VOICE_PRESETS["通常"])
            else:
                # 通常の検出は「警戒」プリセット
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
            
        return {"status": "success", "message": "少数ゾンビアラートが送信されました", "count": count, "resnet": resnet_result}
        
    except Exception as e:
        logger.error(f"少数ゾンビアラートエラー: {e}")
        return {"status": "error", "message": f"エラーが発生しました: {str(e)}"}

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
    from ..voice.engine import safe_play_voice
    from ..config.settings import Settings
    
    # 設定を取得
    settings = Settings()
    
    # ResNetの検出結果を取得
    resnet_result = False
    resnet_prob = 0.0
    
    if additional_data and "resnet_result" in additional_data:
        resnet_result = additional_data.get("resnet_result", False)
        resnet_prob = additional_data.get("resnet_probability", 0.0)
    
    logger.info(f"🟡 警戒レベルのゾンビを検出: {count}体, ResNet結果: {resnet_result}({resnet_prob:.2f})")
    
    # デバウンスチェック（強制フラグがない場合）
    if not force and is_callback_throttled("zombie_warning"):
        logger.debug("警戒ゾンビアラートはデバウンス中のためスキップ")
        return {"status": "throttled", "message": "デバウンス中のためスキップされました"}
    
    # 通知メッセージの作成
    message_suffix = ""
    if not resnet_result and resnet_prob < 0.3:
        message_suffix = "（誤検出の可能性あり）"
    
    # 通知を送信
    try:
        await send_notification(
            f"警戒レベルのゾンビが周辺にいます ({count}体){message_suffix}",
            message_type="zombieWarning",
            title="⚠️ ゾンビ警戒情報",
            importance="normal",
            skipAudio=not play_audio
        )
        
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