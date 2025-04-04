/**
 * speakCore.js
 * 発話処理のコア機能を提供するモジュール
 */

import { logDebug, logError, logZombieWarning } from '@core/logger.js';
import { showBubble } from '@ui/uiHelper.js';
import { hideBubble } from '@ui/handlers/bubbleManager.js';
import { 
  setExpression, 
  startTalking, 
  stopTalking, 
  startLightBounce, 
  stopLightBounce,
  startTrembling,
  stopTrembling,
  startNervousShake,
  stopNervousShake
} from '@emotion/expressionManager.js';
import { playPresetSound } from '@emotion/audioReactor.js';
import { formatMessage, forceShowBubble } from '@emotion/bubbleDisplay.js';
import { requestVoiceSynthesis } from './voicevoxClient.js';

/**
 * エラーメッセージを表示する (showErrorの代替関数)
 * @param {string} message - エラーメッセージ
 */
function displayError(message) {
  logError(`エラー: ${message}`);
  showBubble('error', message);
}

// 多重実行防止用の変数
let lastSpokenEvent = null;
let lastSpokenMessage = null;
let lastZombieWarningTime = 0;
const zombieCooldownMs = 10000; // ゾンビ警告のクールダウン時間（10秒）

// 音声再生中フラグ
let isAudioPlaying = false;

/**
 * 秘書たんにセリフを話させる
 * @param {string} message - セリフ
 * @param {string} emotion - 感情（normal, happy, surprised, serious, sleepy, relieved, smile）
 * @param {number} displayTime - 表示時間（ミリ秒）
 * @param {string} animation - アニメーション（bounce_light, trembling, nervous-shake, null）
 * @param {string} eventType - イベントタイプ（イベント識別用、デフォルトは'default'）
 * @param {string} presetSound - 先行再生するプリセット音声の名前（オプション）
 * @param {boolean} autoClose - 自動で閉じるかどうか（デフォルトはtrue）
 * @param {Object} options - その他のオプション
 * @param {Map} options.hideTimeoutMap - 非表示タイマーを管理するMap
 * @param {number} options.messageDisplayTime - デフォルトの表示時間
 * @param {Function} options.onSpeechStart - 発話開始時のコールバック
 * @param {Function} options.onSpeechEnd - 発話終了時のコールバック
 * @param {Object} options.config - 設定オブジェクト
 * @returns {Promise<boolean>} 成功したかどうか
 */
export async function speak(
  message, 
  emotion = 'normal', 
  displayTime = null, 
  animation = null, 
  eventType = 'default', 
  presetSound = null, 
  autoClose = true,
  options = {}
) {
  try {
    // オプションからパラメータを抽出
    const hideTimeoutMap = options.hideTimeoutMap || new Map();
    const messageDisplayTime = options.messageDisplayTime || 5000;
    const onSpeechStart = options.onSpeechStart || (() => {});
    const onSpeechEnd = options.onSpeechEnd || (() => {});
    const config = options.config || null;

    // 表示時間が指定されていない場合はデフォルト値を使用
    if (displayTime === null) {
      displayTime = messageDisplayTime;
    }
    
    // 多重実行チェック（同一メッセージ・同一イベントタイプの場合はスキップ）
    const isDuplicate = (lastSpokenEvent === eventType && lastSpokenMessage === message);
    if (isDuplicate) {
      logDebug(`発話スキップ（重複検出）: "${message}" (イベント: ${eventType})`);
      return false;
    }
    
    // 再生中フラグチェック（ゾンビ警告系イベントのみ）
    if ((eventType === 'zombie_warning' || eventType === 'zombie_few') && isAudioPlaying) {
      logDebug(`🔁 音声が再生中のためスキップ: "${message}"`);
      return false;
    }
    
    // ゾンビ警告のクールダウン制御
    if (eventType === "zombie_warning" || eventType === "zombie_few") {
      const now = Date.now();
      if (now - lastZombieWarningTime < zombieCooldownMs) {
        logDebug(`ゾンビ警告をスキップ（クールダウン中: ${Math.round((now - lastZombieWarningTime) / 1000)}秒経過）: "${message}"`);
        return false;
      }
      lastZombieWarningTime = now;
    }
    
    logDebug(`発話開始: "${message}" (感情: ${emotion}, 表示時間: ${displayTime}ms, アニメーション: ${animation || 'なし'}, イベントタイプ: ${eventType})`);

    // 発話開始コールバックを実行
    onSpeechStart({
      message,
      emotion,
      eventType
    });

    // 既存のタイマーがあれば全てクリア
    if (hideTimeoutMap.size > 0) {
      logDebug(`${hideTimeoutMap.size}個の非表示タイマーを一括クリアします`);
      for (const [key, timerId] of hideTimeoutMap.entries()) {
        clearTimeout(timerId);
        logDebug(`タイマー ${key} をクリアしました`);
      }
      hideTimeoutMap.clear();
    }

    // 表情を変更
    setExpression(emotion);
    
    // メッセージを整形して吹き出しに表示
    const formattedMessage = formatMessage(message);
    
    // 吹き出しを表示
    showBubble(eventType);
    
    // テキストを設定
    const speechText = document.getElementById('speechText');
    if (speechText) {
      speechText.textContent = formattedMessage;
      speechText.innerText = formattedMessage;
    }
    
    // 音声合成処理
    let success = false;
    
    // プリセット音声が指定されている場合は先に再生
    if (presetSound) {
      try {
        logDebug(`プリセット音声を先に再生: ${presetSound}`);
        const presetSuccess = await playPresetSound(presetSound);
        
        if (presetSuccess) {
          logDebug(`プリセット音声再生完了、合成音声リクエストを開始`);
        } else {
          logDebug(`プリセット音声再生失敗、合成音声のみでリカバリ`);
        }
      } catch (err) {
        logError(`プリセット音声再生エラー: ${err}`);
      }
    }
    
    // 設定から話者IDを取得
    const speakerId = config?.voicevox?.speaker_id || 8;
    
    // 音声合成リクエスト
    success = await requestVoiceSynthesis(message, emotion, speakerId);
    
    if (success) {
      // 音声再生開始
      isAudioPlaying = true;
      logDebug("🔈 音声再生開始 → フラグON");
      
      // 口パクアニメーション開始
      startTalking();
      
      // 約4秒後に再生終了とみなす
      // 実際のテキスト長に応じて調整するのがベター（1文字あたり約0.15秒が目安）
      const estimatedDuration = message.length * 150; // ミリ秒単位（1文字あたり約150ms）
      const minDuration = 2000; // 最低2秒
      const maxDuration = 10000; // 最大10秒
      const duration = Math.min(Math.max(estimatedDuration, minDuration), maxDuration);
      
      logDebug(`推定音声再生時間: ${duration}ms (テキスト長: ${message.length}文字)`);
      
      // 口パクと再生中フラグを制御するタイマー設定
      setTimeout(() => {
        // 音声再生フラグをオフに
        isAudioPlaying = false;
        logDebug("🔕 音声再生完了（推定時間経過）→ フラグ解除");
        
        // 口パクアニメーション停止
        stopTalking();
      }, duration);
    }
    
    // アニメーション制御
    if (animation) {
      if (animation === 'bounce_light') {
        startLightBounce();
        
        // 数秒後にバウンスアニメーションを停止
        setTimeout(() => {
          stopLightBounce();
        }, 2000);
      } else if (animation === 'trembling') {
        startTrembling();
        
        // 数秒後に震えアニメーションを停止
        setTimeout(() => {
          stopTrembling();
        }, 2000);
      } else if (animation === 'nervous_shake') {
        startNervousShake();
        
        // 数秒後に不安震えアニメーションを停止
        setTimeout(() => {
          stopNervousShake();
        }, 2000);
      }
    }
    
    // 会話状態を記録（多重実行防止用）
    lastSpokenEvent = eventType;
    lastSpokenMessage = message;
    
    // 吹き出しが実際に表示されたか確認するためのデバッグ
    setTimeout(() => {
      const speechBubble = document.getElementById('speechBubble');
      const speechText = document.getElementById('speechText');
      if (!speechBubble) {
        logError('吹き出し要素が見つかりません');
        return;
      }
      
      // 強制的に表示を保証
      if (speechBubble.style.display !== 'flex' || 
          speechBubble.style.visibility !== 'visible' || 
          (speechText && speechText.textContent.trim() === '')) {
        
        logDebug('吹き出しまたはテキストに問題があります。強制表示します');
        forceShowBubble(formattedMessage, eventType);
      }
    }, 50);
    
    // 設定UIの場合やautoCloseがfalseの場合は自動非表示しない
    if (eventType.startsWith('setting_') || !autoClose) {
      logDebug(`自動非表示タイマーをスキップします（${eventType}${!autoClose ? '、autoClose=false' : ''}）`);
    } else {
      // 非表示タイマーをセット
      const hideTimerId = setTimeout(() => {
        hideBubble();
        hideTimeoutMap.delete(eventType);
        
        // アニメーションも停止
        if (animation) {
          if (animation === 'bounce_light') {
            stopLightBounce();
          } else if (animation === 'trembling') {
            stopTrembling();
          } else if (animation === 'nervous_shake') {
            stopNervousShake();
          }
        }
        
        // 通常表情に戻す（少し時間差を付ける）
        setTimeout(() => {
          setExpression('normal');
          stopTalking();
          
          // 発話終了コールバックを実行
          onSpeechEnd({
            message,
            emotion,
            eventType,
            success
          });
        }, 500);
        
      }, displayTime);
      
      // タイマーIDをMapに保存
      hideTimeoutMap.set(eventType, hideTimerId);
    }
    
    return success;
  } catch (error) {
    logError(`発話エラー: ${error.message}`);
    showBubble('error', `発話処理に失敗しました: ${error.message}`);
    return false;
  }
}

/**
 * プリセット音声とセリフを組み合わせて発話させる
 * @param {string} presetSound - プリセット音声名
 * @param {string} message - セリフ
 * @param {string} emotion - 感情
 * @param {number} displayTime - 表示時間（ミリ秒）
 * @param {string} eventType - イベントタイプ
 * @param {Object} options - オプション
 * @returns {Promise<boolean>} 成功したかどうか
 */
export async function speakWithPreset(presetSound, message, emotion = 'normal', displayTime = null, eventType = 'notification', options = {}) {
  try {
    if (!presetSound || !message) {
      logError('プリセット音声または発話テキストが指定されていません');
      return false;
    }
    
    logDebug(`プリセット音声付き発話: プリセット=${presetSound}, メッセージ="${message}", 感情=${emotion}`);
    
    // アニメーション判定
    let animation = null;
    if (emotion === 'surprised' || emotion === 'fearful') {
      animation = 'nervous_shake';
    } else if (emotion === 'serious') {
      animation = 'trembling';
    }
    
    // プリセット音声付き発話処理を実行
    return await speak(
      message, 
      emotion, 
      displayTime, 
      animation, 
      eventType, 
      presetSound, 
      true,
      options
    );
    
  } catch (err) {
    logError(`プリセット音声付き発話処理でエラー: ${err.message}`);
    return false;
  }
}

/**
 * 発話再生中かどうか確認
 * @returns {boolean} 発話再生中ならtrue
 */
export function isPlaying() {
  return isAudioPlaying;
}

export default {
  speak,
  speakWithPreset,
  isPlaying
}; 