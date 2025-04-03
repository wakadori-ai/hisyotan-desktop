// speechManager.js
// 発話・音声合成用のモジュール

import { logDebug, logError, logZombieWarning } from '@core/logger.js';
import { showError, shouldShowError } from '@ui/uiHelper.js';
import { setText, showBubble, hideBubble, initUIElements, renderSettingUI } from '@ui/uiHelper.js';
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
import { playPresetSound } from '@voice/audioReactor.js';

// 設定データ
let config = null;

// 非表示タイマーをMapで管理（イベントタイプごとに異なるタイマーを持つ）
let hideTimeoutMap = new Map(); 
const messageDisplayTime = 5000; // デフォルトのメッセージ表示時間（ミリ秒）

// 表示制御用フラグと現在のイベント状態管理
let currentSpeechEvent = null;
let hasAlreadyForced = false;
let lastForceTime = 0;

// 多重実行防止用の変数
let lastSpokenEvent = null;
let lastSpokenMessage = null;
let lastZombieWarningTime = 0;
const zombieCooldownMs = 10000; // ゾンビ警告のクールダウン時間（10秒）

// 音声再生中フラグ
let isAudioPlaying = false;

// リクエストキャンセル用のAbortController
let currentSpeakAbort = null;

// 現在再生中のAudioオブジェクト
let currentAudio = null;

// VOICEVOX接続状態管理変数
let voicevoxRetryCount = 0;
const MAX_VOICEVOX_RETRIES = 5;
const VOICEVOX_RETRY_INTERVAL = 3000; // 再確認間隔（ミリ秒）
let voicevoxConnectionErrorShown = false;

// 現在表示中のセリフデータ
let currentSpeech = null;

// ホード夜モードの状態管理
let isHordeModeEnabled = false;

// 🌟 モジュール読み込み時にUI要素を初期化（これがキモ！）
initUIElements();
logDebug('speechManagerモジュール初期化: UI要素を初期化しました');

// hideTimeoutMapをエクスポート
export { hideTimeoutMap };

/**
 * 設定をセットする
 * @param {Object} configData - 設定データ
 */
export function setConfig(configData) {
  config = configData;
  logDebug('音声合成設定をセットしました');
}

/**
 * メッセージの整形（語尾を統一）
 * @param {string} message - 整形前のメッセージ
 * @returns {string} 整形後のメッセージ
 */
function formatMessage(message) {
  if (!message.startsWith('「')) {
    message = '「' + message;
  }
  if (!message.endsWith('」') && !message.endsWith('」。')) {
    message = message + '」';
  }
  return message;
}

/**
 * 吹き出しの表示を強制する
 * @param {string} formattedText - 表示するテキスト
 * @param {string} eventType - イベントタイプ（デフォルトは'default'）
 */
function forceShowBubble(formattedText, eventType = 'default') {
  logDebug('吹き出しの表示を強制します');
  const speechBubble = document.getElementById('speechBubble');
  const speechText = document.getElementById('speechText');

  // ゾンビ警告用の特別なデバッグログ
  const isZombieEvent = (eventType === 'zombie_warning' || eventType === 'zombie_few');
  if (isZombieEvent) {
    logZombieWarning(`吹き出しの強制表示を実行: イベントタイプ="${eventType}", テキスト="${formattedText}"`);
  }

  if (speechBubble && speechText) {
    // テキストを直接設定
    speechText.textContent = formattedText;
    speechText.innerText = formattedText;
    
    // データ属性にバックアップ
    speechText.dataset.backupText = formattedText;
    
    // スタイルをリセットしてクラスも再設定
    speechBubble.classList.remove('hide', 'show', 'speech-bubble', 'zombie-warning');
    speechBubble.removeAttribute('style');
    
    // 最優先のスタイルを設定
    speechBubble.style.cssText = `
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: absolute !important;
      z-index: 2147483647 !important;
      top: 20% !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      pointer-events: auto !important;
    `;

    // クラスを追加
    requestAnimationFrame(() => {
      speechBubble.classList.add('speech-bubble', 'show');
      
      if (isZombieEvent) {
        speechBubble.classList.add('zombie-warning');
      }
    });
  } else {
    logError('forceShowBubble: 吹き出し要素が見つかりません');
    initUIElements();
  }
}

/**
 * 拡張された秘書たんセリフオブジェクト型を使用して発話させる
 * @param {Object} speechObj - セリフオブジェクト
 * @param {string} speechObj.id - セリフID
 * @param {string} speechObj.type - セリフの種類（'normal'|'system'|'setting'）
 * @param {string} speechObj.text - セリフテキスト
 * @param {string} [speechObj.emotion] - 感情タイプ
 * @param {number} [speechObj.duration] - 表示時間（ミリ秒）
 * @param {Object} [speechObj.uiPayload] - UI表示用のペイロード（typeが'setting'の場合）
 */
export function speakWithObject(speechObj) {
  try {
    if (!speechObj || !speechObj.text) {
      logError('セリフオブジェクトまたはテキストが指定されていません');
      return;
    }
    
    // デフォルト値の設定
    const type = speechObj.type || 'normal';
    const emotion = speechObj.emotion || 'normal';
    const duration = speechObj.duration || messageDisplayTime;
    const eventType = speechObj.id || 'default';
    
    // 現在のセリフを保存
    currentSpeech = speechObj;
    
    logDebug(`拡張セリフ表示: タイプ=${type}, ID=${eventType}, テキスト="${speechObj.text}"`);
    
    // 設定UIタイプの場合は専用の処理
    if (type === 'setting' && speechObj.uiPayload) {
      showBubble(eventType);
      const formattedMessage = formatMessage(speechObj.text);
      
      // 通常のテキスト設定（uiPayloadとともに）
      setText(formattedMessage);
      
      // setText後のDOM状態をチェック
      console.log('🔍 setText()後の吹き出し状態:', {
        speechBubble: document.getElementById('speechBubble'),
        speechText: document.getElementById('speechText'),
        speechSettingUI: document.getElementById('speechSettingUI'),
        bubbleHTML: document.getElementById('speechBubble')?.innerHTML || '存在しません'
      });
      
      // 設定UI要素をレンダリング
      renderSettingUI(speechObj.uiPayload);
      
      // renderSettingUI後の最終状態確認
      console.log('🏁 renderSettingUI()後の最終状態:', {
        speechBubble: document.getElementById('speechBubble'),
        speechText: document.getElementById('speechText'),
        speechSettingUI: document.getElementById('speechSettingUI'),
        bubbleHTML: document.getElementById('speechBubble')?.innerHTML || '存在しません'
      });
      
      // 設定UIの場合は自動非表示しない
      return;
    }
    
    // 通常の発話処理
    speak(
      speechObj.text, 
      emotion, 
      duration, 
      null, // アニメーションはemotionから自動設定
      eventType
    );
    
  } catch (err) {
    logError(`拡張セリフ表示処理でエラー: ${err.message}`);
  }
}

/**
 * 秘書たんにセリフを話させる
 * @param {string} message - セリフ
 * @param {string} emotion - 感情（normal, happy, surprised, serious, sleepy, relieved, smile）
 * @param {number} displayTime - 表示時間（ミリ秒）
 * @param {string} animation - アニメーション（bounce_light, trembling, nervous-shake, null）
 * @param {string} eventType - イベントタイプ（イベント識別用、デフォルトは'default'）
 * @param {string} presetSound - 先行再生するプリセット音声の名前（オプション）
 */
export function speak(message, emotion = 'normal', displayTime = messageDisplayTime, animation = null, eventType = 'default', presetSound = null) {
  try {
    // 基本的なセリフオブジェクトを作成（後方互換性のため）
    currentSpeech = {
      id: eventType,
      type: 'normal',
      text: message,
      emotion: emotion,
      duration: displayTime
    };
    
    // 多重実行チェック（同一メッセージ・同一イベントタイプの場合はスキップ）
    const isDuplicate = (lastSpokenEvent === eventType && lastSpokenMessage === message);
    if (isDuplicate) {
      logDebug(`発話スキップ（重複検出）: "${message}" (イベント: ${eventType})`);
      return;
    }
    
    // 再生中フラグチェック（ゾンビ警告系イベントのみ）
    if ((eventType === 'zombie_warning' || eventType === 'zombie_few') && isAudioPlaying) {
      logDebug(`🔁 音声が再生中のためスキップ: "${message}"`);
      return;
    }
    
    // ゾンビ警告のクールダウン制御
    if (eventType === "zombie_warning" || eventType === "zombie_few") {
      const now = Date.now();
      if (now - lastZombieWarningTime < zombieCooldownMs) {
        logDebug(`ゾンビ警告をスキップ（クールダウン中: ${Math.round((now - lastZombieWarningTime) / 1000)}秒経過）: "${message}"`);
        return;
      }
      lastZombieWarningTime = now;
    }
    
    logDebug(`発話開始: "${message}" (感情: ${emotion}, 表示時間: ${displayTime}ms, アニメーション: ${animation || 'なし'}, イベントタイプ: ${eventType})`);

    // 状態リセット：新しい発話が始まるたびにリセット
    hasAlreadyForced = false;
    lastForceTime = Date.now();
    currentSpeechEvent = eventType;

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
    
    // プリセット音声が指定されている場合は先に再生し、再生完了後に合成音声をリクエスト
    if (presetSound) {
      logDebug(`プリセット音声を先に再生: ${presetSound}`);
      playPresetSound(presetSound)
        .then(success => {
          if (success) {
            logDebug(`プリセット音声再生完了、合成音声リクエストを開始`);
            // プリセット音声再生完了後、合成音声リクエストを行う
            requestVoiceSynthesis(message, emotion, eventType, formattedMessage);
          } else {
            logError(`プリセット音声再生失敗、合成音声のみでリカバリ`);
            // 失敗した場合も合成音声リクエストは行う
            requestVoiceSynthesis(message, emotion, eventType, formattedMessage);
          }
        })
        .catch(err => {
          logError(`プリセット音声再生エラー: ${err}`);
          // エラー時も合成音声リクエストは行う
          requestVoiceSynthesis(message, emotion, eventType, formattedMessage);
        });
    } else {
      // 通常通り合成音声リクエスト
      requestVoiceSynthesis(message, emotion, eventType, formattedMessage);
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
    
    // 非表示タイマーをセット（デフォルトのディスプレイタイム）
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
      }, 500);
      
    }, displayTime);
    
    // タイマーIDをMapに保存
    hideTimeoutMap.set(eventType, hideTimerId);
    
    // 吹き出しが実際に表示されたか確認するためのデバッグ
    setTimeout(() => {
      const speechBubble = document.getElementById('speechBubble');
      const speechText = document.getElementById('speechText');
      if (!speechBubble) {
        logError('吹き出し要素が見つかりません');
        return;
      }
      
      // 強制的に表示を保証（フラグを考慮）
      if ((speechBubble.style.display !== 'flex' || speechBubble.style.visibility !== 'visible' || (speechText && speechText.textContent.trim() === '')) && !hasAlreadyForced) {
        logDebug('吹き出しまたはテキストに問題があります。強制表示します');
        forceShowBubble(formattedMessage, eventType);
        hasAlreadyForced = true;
        lastForceTime = Date.now();
      }
    }, 50);
  } catch (error) {
    logError(`発話エラー: ${error.message}`);
    showError(`発話処理に失敗しました: ${error.message}`);
  }
}

/**
 * 音声合成リクエストを送信する
 * @param {string} text - 合成するテキスト
 * @param {string} emotion - 感情
 * @param {string} eventType - イベントタイプ（イベント識別用）
 * @param {string} formattedMessage - 表示用の整形済みメッセージ
 * @returns {Promise<boolean>} 成功したかどうか
 */
async function requestVoiceSynthesis(text, emotion = 'normal', eventType = 'default', formattedMessage = null) {
  try {
    // 前回のリクエストが残っていればキャンセル
    if (currentSpeakAbort) {
      currentSpeakAbort.abort();
      logDebug("🎙 前回の発話リクエストをキャンセルしました");
    }
    
    // 再生中のAudioがあれば手動で停止
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      currentAudio.src = "";
      logDebug("🛑 前の音声再生を手動で停止しました");
    }

    // 新しいAbortControllerを作成
    const controller = new AbortController();
    currentSpeakAbort = controller;
    
    // 設定から話者IDを取得
    const speakerId = config?.voicevox?.speaker_id || 8;
    
    // バックエンドAPIのベースURLを設定
    const apiBaseUrl = 'http://127.0.0.1:8000';
    
    logDebug(`バックエンドの音声合成APIを呼び出します (話者ID: ${speakerId}, 感情: ${emotion})`);
    
    // タイムアウト設定
    const timeoutSignal = AbortSignal.timeout(10000); // 10秒でタイムアウト
    
    // 複数のシグナルを組み合わせる関数
    const combineSignals = (...signals) => {
      const controller = new AbortController();
      const { signal } = controller;
      
      signals.forEach(s => {
        if (s.aborted) {
          controller.abort(s.reason);
          return;
        }
        
        s.addEventListener('abort', () => controller.abort(s.reason), { once: true });
      });
      
      return signal;
    };
    
    // コントローラのシグナルとタイムアウトシグナルを組み合わせる
    const combinedSignal = combineSignals(controller.signal, timeoutSignal);
    
    // リクエストボディを準備
    const requestBody = {
      text: text,
      emotion: emotion,
      speaker_id: speakerId
    };
    
    logDebug(`リクエスト内容: ${JSON.stringify(requestBody)}`);
    
    // バックエンド側で音声合成＆再生するAPIを呼び出す
    const response = await fetch(`${apiBaseUrl}/api/voice/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: combinedSignal
    });
    
    if (!response.ok) {
      // レスポンスのテキストを取得してエラーメッセージに含める
      const errorText = await response.text();
      logError(`バックエンドAPI呼び出し失敗: ${response.status} ${response.statusText}`);
      logError(`エラー詳細: ${errorText}`);
      throw new Error(`バックエンドAPI呼び出し失敗: ${response.status} ${response.statusText}`);
    }
    
    // レスポンスからステータスを確認
    const result = await response.json();
    if (result.status !== 'success') {
      logError(`音声再生リクエストエラー: ${result.message}`);
      throw new Error(`音声再生リクエストエラー: ${result.message}`);
    }
    
    logDebug(`音声再生リクエスト成功: ${result.message}`);
    
    // 音声再生開始（バックエンドで再生中と仮定）
    isAudioPlaying = true;
    logDebug("🔈 音声再生開始 → フラグON (バックエンド側で再生中)");
    
    // 口パクアニメーション開始
    startTalking();
    
    // 約4秒後に再生終了とみなす
    // 実際のテキスト長に応じて調整するのがベター（1文字あたり約0.15秒が目安）
    const estimatedDuration = text.length * 150; // ミリ秒単位（1文字あたり約150ms）
    const minDuration = 2000; // 最低2秒
    const maxDuration = 10000; // 最大10秒
    const duration = Math.min(Math.max(estimatedDuration, minDuration), maxDuration);
    
    logDebug(`推定音声再生時間: ${duration}ms (テキスト長: ${text.length}文字)`);
    
    // 口パクと再生中フラグを制御するタイマー設定
    setTimeout(() => {
      // 音声再生フラグをオフに
      isAudioPlaying = false;
      logDebug("🔕 音声再生完了（推定時間経過）→ フラグ解除");
      
      // 口パクアニメーション停止
      stopTalking();
    }, duration);
    
    return true;
  } catch (error) {
    // エラーハンドリング：AbortErrorの場合は正常処理
    if (error.name === 'AbortError') {
      if (error.message === 'The operation was aborted due to timeout') {
        logDebug("⏱ 音声合成リクエストがタイムアウトしました");
        showError('バックエンドへの接続がタイムアウトしました。サーバーが起動しているか確認してください。');
      } else {
        logDebug("🎙 発話リクエストがキャンセルされました");
      }
      return false;
    }
    
    // ネットワークエラーの場合
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      logDebug(`ネットワークエラー: バックエンドサーバーに接続できません`);
      showError('バックエンドサーバーに接続できません。サーバーが起動しているか確認してください。');
      return false;
    }
    
    logError(`音声合成エラー: ${error.message}`);
    showError(`音声合成に失敗しました (${error.message})`);
    
    return false;
  }
}

/**
 * VOICEVOXの接続確認
 * @returns {Promise<boolean>} 接続成功したかどうか
 */
export async function checkVoicevoxConnection() {
  try {
    // バックエンドAPIのURLを直接指定
    const apiBaseUrl = 'http://127.0.0.1:8000';
    const response = await fetch(`${apiBaseUrl}/api/voice/check-connection`);
    
    if (response.ok) {
      const result = await response.json();
      logDebug(`VOICEVOX接続確認結果: ${result.connected ? '接続成功' : '接続失敗'}`);
      
      if (result.connected) {
        // 接続成功時はリトライカウントをリセット
        voicevoxRetryCount = 0;
        voicevoxConnectionErrorShown = false;
        return true;
      } else {
        // 接続失敗だがリトライ可能
        throw new Error('VOICEVOX接続失敗: エンジンが起動していません');
      }
    } else {
      throw new Error(`接続確認エラー: ${response.status}`);
    }
  } catch (error) {
    logDebug(`VOICEVOX接続エラー: ${error.message}`);
    
    // リトライ処理
    voicevoxRetryCount++;
    if (voicevoxRetryCount <= MAX_VOICEVOX_RETRIES) {
      logDebug(`VOICEVOX接続リトライ予定 (${voicevoxRetryCount}/${MAX_VOICEVOX_RETRIES}): ${VOICEVOX_RETRY_INTERVAL}ms後`);
      
      // 数秒後に再試行
      setTimeout(() => {
        checkVoicevoxConnection().catch(err => logDebug(`再試行時のエラー: ${err.message}`));
      }, VOICEVOX_RETRY_INTERVAL);
    } else if (shouldShowError() && !voicevoxConnectionErrorShown) {
      // 最大再試行回数を超えた場合のみエラー表示（猶予期間後）
      showError('VOICEVOXに接続できません。VOICEVOXが起動しているか確認してください。');
      voicevoxConnectionErrorShown = true;
    }
    
    return false;
  }
}

/**
 * メッセージの表示と音声合成を行う
 * @param {string} message - メッセージ
 * @param {string} emotion - 感情
 * @param {number} duration - 表示時間
 */
export function sayMessage(message, emotion = 'normal', duration = 5000) {
  // テキストを吹き出しに表示
  setText(formatMessage(message));
  showBubble();
  
  // 音声合成リクエスト
  requestVoiceSynthesis(message, emotion);
  
  // タイマーを設定して表示を終了
  if (hideTimeoutMap.has('say_message')) {
    clearTimeout(hideTimeoutMap.get('say_message'));
    hideTimeoutMap.delete('say_message');
  }
  
  const timeoutId = setTimeout(() => {
    hideBubble();
    setExpression('normal');
  }, duration);
  
  hideTimeoutMap.set('say_message', timeoutId);
}

/**
 * プリセット音声とセリフを組み合わせて発話させる
 * @param {string} presetSound - プリセット音声名
 * @param {string} message - セリフ
 * @param {string} emotion - 感情
 * @param {number} displayTime - 表示時間（ミリ秒）
 * @param {string} eventType - イベントタイプ
 */
export function speakWithPreset(presetSound, message, emotion = 'normal', displayTime = messageDisplayTime, eventType = 'notification') {
  try {
    if (!presetSound || !message) {
      logError('プリセット音声または発話テキストが指定されていません');
      return;
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
    speak(message, emotion, displayTime, animation, eventType, presetSound);
    
  } catch (err) {
    logError(`プリセット音声付き発話処理でエラー: ${err.message}`);
  }
}

/**
 * ホード夜モードの切り替え設定UIを表示する
 * @param {boolean} currentState - 現在のホード夜モードの状態
 * @param {Function} onChangeCallback - 状態変更時のコールバック関数（オプション）
 * @returns {Promise<void>} 非同期処理の結果
 */
export async function showHordeModeToggle(currentState = false, onChangeCallback) {
  try {
    // 現在の状態を設定
    isHordeModeEnabled = currentState;
    
    // UI要素を初期化（呼び出されたHTMLコンテキストに応じて）
    const speechBubble = document.getElementById('speechBubble');
    const speechText = document.getElementById('speechText');
    
    // 要素が見つからない場合はUIElementを再初期化
    if (!speechBubble || !speechText) {
      logDebug('吹き出し要素が見つからないためUIを再初期化します');
      initUIElements();
    }
    
    // ホード夜モード設定用のセリフオブジェクトを作成
    const hordeToggleSpeech = {
      id: "setting_horde_mode",
      type: "setting",
      text: "今夜はホード夜モードにする…？",
      emotion: "gentle", // またはnormal
      uiPayload: {
        type: "toggle",
        label: "ホード夜モード",
        value: currentState,
        onChange: (newValue) => {
          // 状態を更新
          isHordeModeEnabled = newValue;
          logDebug(`ホード夜モードが${newValue ? 'オン' : 'オフ'}に変更されました`);
          
          // カスタムコールバックが指定されていれば実行
          if (typeof onChangeCallback === 'function') {
            onChangeCallback(newValue);
          }
          
          // 変更後のフィードバックセリフ
          const feedbackMessage = newValue 
            ? "ホード夜モードをオンにしたよ。怖いけど一緒に頑張ろうね…" 
            : "ホード夜モードをオフにしたよ。ほっとした～";
          
          const feedbackEmotion = newValue ? "serious" : "relieved";
          
          // 少し遅延させてフィードバックを表示
          setTimeout(() => {
            speak(
              feedbackMessage,
              feedbackEmotion,
              5000,
              null,
              "horde_mode_feedback"
            );
          }, 500);
        }
      }
    };
    
    // セリフオブジェクトを表示
    speakWithObject(hordeToggleSpeech);
    
    // 自動クローズタイマーは設定しない（ユーザーのマウスアウトで閉じる）
    
    return true;
  } catch (err) {
    logError(`ホード夜モードトグル表示エラー: ${err.message}`);
    return false;
  }
}

/**
 * 現在のホード夜モードの状態を取得する
 * @returns {boolean} ホード夜モードが有効ならtrue
 */
export function getHordeModeState() {
  return isHordeModeEnabled;
}

/**
 * ホード夜モードの状態を直接設定する
 * @param {boolean} enabled - 設定する状態
 */
export function setHordeModeState(enabled) {
  isHordeModeEnabled = !!enabled;
  logDebug(`ホード夜モードを直接${isHordeModeEnabled ? 'オン' : 'オフ'}に設定しました`);
  return isHordeModeEnabled;
}

// グローバルスコープにspeechManagerを公開（テストなどで使用）
if (typeof window !== 'undefined') {
  window.speechManager = {
    speak,
    speakWithObject,
    speakWithPreset,
    sayMessage,
    checkVoicevoxConnection,
    setConfig,
    hideTimeoutMap,
    showHordeModeToggle,
    getHordeModeState,
    setHordeModeState
  };
  logDebug('speechManagerをグローバルスコープに公開しました');
} 