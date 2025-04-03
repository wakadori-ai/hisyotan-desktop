// uiHelper.js
// UI表示制御用のモジュール

import { logDebug, logError, logZombieWarning } from '../core/logger.js';
import { updateSetting } from './apiClient.js';

// DOM要素
let speechBubble;
let speechText;
let speechSettingUI; // 設定UI要素
let errorBubble;
let errorText;
let statusIndicator;

// グローバルでMutationObserverを追跡するための変数
window._speechTextObserver = null;
window._speechTextObserverAttached = false;

// 起動猶予期間の設定
const INIT_GRACE_PERIOD_MS = 5000;
const startTime = Date.now();
let lastShownErrorMessage = null;
let lastErrorTime = 0;

/**
 * エラーを表示すべきかどうかを判断する
 * @returns {boolean} エラーを表示すべきならtrue
 */
export function shouldShowError() {
  return Date.now() - startTime > INIT_GRACE_PERIOD_MS;
}

/**
 * DOM要素を初期化する
 */
export function initUIElements() {
  logDebug('UI要素初期化を開始');
  
  // 要素の取得と確認
  speechBubble = document.getElementById('speechBubble');
  speechText = document.getElementById('speechText');
  errorBubble = document.getElementById('errorBubble');
  errorText = document.getElementById('errorText');
  statusIndicator = document.getElementById('statusIndicator');
  
  // 設定UI用のコンテナ作成（なければ）
  if (!document.getElementById('speechSettingUI')) {
    if (speechBubble) {
      console.log('🏗 initUIElements: speechSettingUIを新規作成します');
      speechSettingUI = document.createElement('div');
      speechSettingUI.id = 'speechSettingUI';
      speechSettingUI.className = 'speech-setting-ui';
      speechSettingUI.style.display = 'none';
      speechBubble.appendChild(speechSettingUI);
      console.log('🏗 speechSettingUI作成完了:', speechSettingUI);
      console.log('🏗 親要素:', speechBubble);
      logDebug('設定UI要素を作成しました');
    } else {
      console.log('❌ initUIElements: speechBubbleが存在しないためspeechSettingUIを作成できません');
    }
  } else {
    console.log('🏗 initUIElements: 既存のspeechSettingUIを取得します');
    speechSettingUI = document.getElementById('speechSettingUI');
    console.log('🏗 取得結果:', speechSettingUI);
  }
  
  // 必須要素の存在チェック
  if (!speechBubble) {
    logError('speechBubble要素が見つかりません', new Error('DOM要素が見つかりません'));
  }
  if (!speechText) {
    logError('speechText要素が見つかりません', new Error('DOM要素が見つかりません'));
  }
  if (!errorBubble) {
    logError('errorBubble要素が見つかりません', new Error('DOM要素が見つかりません'));
  }
  if (!errorText) {
    logError('errorText要素が見つかりません', new Error('DOM要素が見つかりません'));
  }
  if (!statusIndicator) {
    logError('statusIndicator要素が見つかりません', new Error('DOM要素が見つかりません'));
  }
  
  // エラーバブルの初期設定（要素が存在する場合のみ）
  if (errorBubble) {
    // 初期非表示
    errorBubble.style.cssText = `
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    `;
    logDebug('エラーバブルを初期化しました');
  }
  
  // 吹き出しバブルの初期設定（要素が存在する場合のみ）
  if (speechBubble) {
    // 初期非表示
    speechBubble.style.cssText = `
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    `;
    logDebug('吹き出しバブルを初期化しました');
  }
  
  // 既存のMutationObserverをリセット
  if (window._speechTextObserver) {
    window._speechTextObserver.disconnect();
    window._speechTextObserver = null;
    window._speechTextObserverAttached = false;
    logDebug('既存のMutationObserverをリセットしました');
  }
  
  logDebug('UI要素初期化完了');
}

/**
 * 吹き出しを表示する
 * @param {string} eventType - イベントタイプ（オプション）
 */
export function showBubble(eventType = 'default') {
  if (eventType === 'zombie_warning') {
    logZombieWarning(`吹き出しを表示します... (イベント: ${eventType})`);
  } else {
    logDebug(`吹き出しを表示します... (イベント: ${eventType})`);
  }
  
  // DOMが確実にあるか確認
  if (!speechBubble) {
    if (eventType === 'zombie_warning') {
      logZombieWarning('speechBubble要素が見つかりません');
    } else {
      logDebug('speechBubble要素が見つかりません');
    }
    speechBubble = document.getElementById('speechBubble');
    if (!speechBubble) {
      if (eventType === 'zombie_warning') {
        logZombieWarning('speechBubble要素の再取得に失敗しました');
      } else {
        logDebug('speechBubble要素の再取得に失敗しました');
      }
      return;
    }
  }
  
  // zombie_warningイベントの場合は特別に強調
  const isZombieWarning = eventType === 'zombie_warning';
  if (isZombieWarning) {
    logZombieWarning('★★★ ZOMBIE WARNING表示の特別処理を実行 ★★★');
  }
  
  // クラスをリセットして表示クラスを追加（CSSカスケードの問題を避けるため）
  speechBubble.className = '';
  
  // すべての非表示スタイルを解除してから表示クラスを追加
  // CSSトランジションの問題を避けるためにまず非表示状態をリセット
  speechBubble.style.display = 'flex';
  speechBubble.style.visibility = 'visible';
  speechBubble.style.opacity = '1';
  
  // 明示的に!importantを使用
  speechBubble.style.cssText = `
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: absolute !important;
    z-index: 2147483647 !important;
    top: 20% !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
  `;
  
  // クラスを後から追加してアニメーション効果を適用
  // タイミングの問題を避けるためにrequestAnimationFrameを使用
  requestAnimationFrame(() => {
    // ゾンビ警告の場合は特別なクラスを追加
    if (isZombieWarning) {
      speechBubble.className = 'speech-bubble show zombie-warning';
    } else {
      speechBubble.className = 'speech-bubble show';
    }
  
    // アニメーションをリセットして再適用（CSSアニメーションの問題に対処）
    speechBubble.style.animation = 'none';
    speechBubble.offsetHeight; // リフロー
    speechBubble.style.animation = 'popIn 0.3s ease forwards !important';
  });
  
  // zombie_warning時は追加の強制表示処理
  if (isZombieWarning) {
    // 少し遅延させて強制的に表示を確保
    setTimeout(() => {
      if (speechBubble) {
        logZombieWarning('ZOMBIE WARNING: 吹き出し表示を再強制');
        speechBubble.style.cssText = `
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: absolute !important;
          top: 20% !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 2147483647 !important;
          pointer-events: auto !important;
        `;
        speechBubble.className = 'speech-bubble show zombie-warning';
        
        // コンピューテッドスタイルを取得して確認
        const computedStyle = window.getComputedStyle(speechBubble);
        logZombieWarning(`強制表示後の計算済みスタイル: display=${computedStyle.display}, visibility=${computedStyle.visibility}, opacity=${computedStyle.opacity}`);
      }
    }, 50);
    
    // さらに時間をおいて二度目の確認
    setTimeout(() => {
      if (speechBubble) {
        const computedStyle = window.getComputedStyle(speechBubble);
        if (computedStyle.display !== 'flex' || computedStyle.visibility !== 'visible' || parseFloat(computedStyle.opacity) < 0.5) {
          logZombieWarning('ZOMBIE WARNING: 吹き出しが正しく表示されていません。最終強制表示を実行');
          
          // 強制的に表示（スタイルを直接適用）
          speechBubble.setAttribute('style', `
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: absolute !important;
            top: 20% !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 2147483647 !important;
            pointer-events: auto !important;
            background-color: #fff5e0 !important;
            border: 3px solid #8B4513 !important;
            border-radius: 18px !important;
            padding: 14px 18px !important;
            margin-bottom: 20px !important;
            max-width: 280px !important;
            min-height: 60px !important;
            min-width: 200px !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5) !important;
          `);
          
          // 明示的にclassNameを再設定
          speechBubble.className = 'speech-bubble show zombie-warning';
        }
      }
    }, 200);
  }
  
  if (eventType === 'zombie_warning') {
    logZombieWarning(`吹き出し表示設定完了: クラス=${speechBubble.className}, 表示=${speechBubble.style.display}, 可視性=${speechBubble.style.visibility}`);
  } else {
    logDebug(`吹き出し表示設定完了: クラス=${speechBubble.className}, 表示=${speechBubble.style.display}, 可視性=${speechBubble.style.visibility}`);
  }
}

/**
 * 吹き出しを非表示にする
 */
export function hideBubble() {
  logDebug('吹き出しを非表示にします...');
  
  if (!speechBubble) {
    logDebug('speechBubble要素が見つかりません');
    return;
  }
  
  // クラス名を変更
  speechBubble.className = 'speech-bubble hide';
  
  // トランジションが終了した後に完全に非表示にするが、
  // 必ず非表示になることを保証するため直接スタイルも設定
  speechBubble.style.opacity = '0';
  speechBubble.style.visibility = 'hidden';
  
  // CSSトランジションが完了するまで少し待つ
  setTimeout(() => {
    speechBubble.style.display = 'none';
    logDebug('吹き出し完全に非表示完了');
  }, 300); // CSSトランジションの時間に合わせる
  
  logDebug('吹き出し非表示処理開始');
}

/**
 * 吹き出しにテキストを設定する
 * @param {string} text - 表示するテキスト
 */
export function setText(text) {
  if (!text) {
    logError('setText: テキストが空です');
    return;
  }

  logDebug(`テキスト設定開始: "${text}"`);
  
  // MutationObserverが既に存在する場合はリセット
  if (window._speechTextObserver) {
    window._speechTextObserver.disconnect();
    window._speechTextObserver = null;
    window._speechTextObserverAttached = false;
    logDebug('既存のMutationObserverをリセットしました');
  }
  
  // 吹き出し要素の取得
  const bubble = document.getElementById('speechBubble');
  if (!bubble) {
    logError('speechBubble要素が見つかりません。表示できません');
    return;
  }
  
  // speechText要素の取得または作成
  let speechText = document.getElementById('speechText');
  
  if (!speechText) {
    logDebug('speechText要素が見つかりません。新規作成します');
    
    // 新しいspeechText要素を作成
    speechText = document.createElement('span');
    speechText.id = 'speechText';
    speechText.className = 'bubble-text';
    
    // 適切な位置に挿入（アイコンやUIの前に配置）
    // 通常、テキストは最初の要素なので、最初の子要素として挿入
    bubble.insertBefore(speechText, bubble.firstChild);
    logDebug('新しいspeechText要素を作成して吹き出しに挿入しました');
  }
  
  // テキストを設定
  speechText.textContent = text;
  
  // 強制再描画トリガー
  void speechText.offsetHeight;
  speechText.style.transform = 'scale(1.00001)';
  
  // HTMLエスケープして設定（念のため）
  const safeText = text.replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#039;');
  speechText.innerHTML = safeText;
  
  // 必要に応じて保険設定（Electron特有の問題対策）
  setTimeout(() => {
    if (speechText && speechText.textContent.trim() === '') {
      logZombieWarning('テキストが空です。強制再設定します');
      
      // データ属性に保存して復元を確実に
      speechText.dataset.originalText = text;
      speechText.innerHTML = safeText;
      speechText.innerText = text;
      
      // 強制再描画のためにCSSプロパティを一時的に変更
      const originalDisplay = speechText.style.display;
      speechText.style.display = 'inline-block';
      void speechText.offsetHeight;
      speechText.style.display = originalDisplay;
    }
  }, 0);
  
  logDebug(`テキスト設定完了: "${text}"`);
}

/**
 * 吹き出し再表示保証用のMutationObserverをセットアップ
 * @private
 */
function observeSpeechTextAutoRecovery() {
  const speechText = document.getElementById('speechText');
  const speechBubble = document.getElementById('speechBubble');

  if (!speechText || !speechBubble) {
    logError('[Observer] 吹き出し要素が見つかりません。監視をスキップします');
    return;
  }
  
  // 既存のObserverを切断
  if (window._speechTextObserver) {
    window._speechTextObserver.disconnect();
    window._speechTextObserver = null;
    window._speechTextObserverAttached = false;
    logZombieWarning('[Observer] 既存のObserverを切断しました');
  }
  
  // 監視開始の詳細な時系列ログを追加
  const now = new Date();
  const timeStamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  
  logZombieWarning(`[${timeStamp}] [Observer] 吹き出し監視開始: speechText=${!!speechText}, speechBubble=${!!speechBubble}, classes=${speechBubble.className}`);

  window._speechTextObserver = new MutationObserver((mutations) => {
    // 変更検出時のタイムスタンプを生成
    const now = new Date();
    const timeStamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    
    // 監視対象の要素が存在するか再確認
    if (!document.body.contains(speechText) || !document.body.contains(speechBubble)) {
      logError('[Observer] 監視対象の要素がDOMから削除されました。監視を終了します');
      window._speechTextObserver.disconnect();
      window._speechTextObserver = null;
      window._speechTextObserverAttached = false;
      return;
    }

    // テキストと表示状態を確認
    const text = speechText.textContent.trim();
    const backupText = speechText.dataset.backupText || '';
    const computed = window.getComputedStyle(speechBubble);
    const visible = computed.visibility;
    const displayed = computed.display;
    const opacity = parseFloat(computed.opacity);

    // テキストが空または吹き出しが非表示の場合に自動復旧
    if ((text === '' && speechBubble.classList.contains('show')) || 
        (visible !== 'visible' && speechBubble.classList.contains('show')) ||
        (displayed !== 'flex' && speechBubble.classList.contains('show')) ||
        (opacity < 0.5 && speechBubble.classList.contains('show'))) {
      
      logZombieWarning(`[${timeStamp}] [Observer] 吹き出しの異常を検出: テキスト空または非表示です。復旧を試みます`);
      logZombieWarning(`[${timeStamp}] [Observer] 状態: テキスト="${text}", display=${displayed}, visibility=${visible}, opacity=${opacity}, classList=${speechBubble.className}`);
      
      // テキストが空でもコンテンツを設定
      if (text === '') {
        // バックアップテキストがあればそれを使用
        if (backupText) {
          speechText.textContent = backupText;
          logZombieWarning(`[${timeStamp}] [Observer] バックアップテキストで復元: "${backupText}"`);
        } else {
          speechText.textContent = '「ごめん、もう一度言うねっ」';
          logZombieWarning(`[${timeStamp}] [Observer] 空テキスト修正済み (デフォルトテキスト使用)`);
        }
      }
      
      // 吹き出しのスタイルを強制的に修正
      speechBubble.className = 'speech-bubble show';
      speechBubble.style.cssText = `
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: absolute !important;
        top: 20% !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
      `;
      
      logZombieWarning(`[${timeStamp}] [Observer] 吹き出し強制復旧実行完了`);
    }
  });

  // テキスト要素のみ監視（属性変更とテキスト変更）
  window._speechTextObserver.observe(speechText, {
    characterData: true,
    subtree: true,
    characterDataOldValue: true
  });
  
  // 吹き出し自体の表示状態を監視
  window._speechTextObserver.observe(speechBubble, {
    attributes: true,
    attributeFilter: ['class', 'style'],
    attributeOldValue: true
  });

  logDebug('[Observer] 吹き出し要素の監視を開始しました');
  
  // 監視開始の印
  window._speechTextObserverAttached = true;
}

/**
 * エラーメッセージを表示する
 * @param {string} message - エラーメッセージ
 * @param {boolean} force - 猶予期間に関わらず強制表示するかどうか
 */
export function showError(message, force = false) {
  // 起動猶予期間中は表示しない（forceフラグがない場合）
  if (!force && !shouldShowError()) {
    logDebug(`起動猶予期間中のためエラー表示をスキップします: ${message}`);
    return;
  }

  // 同じエラーが短時間に連続表示されることを防止（3秒以内の重複は無視）
  const now = Date.now();
  if (message === lastShownErrorMessage && now - lastErrorTime < 3000) {
    logDebug(`重複エラーのため表示をスキップします（3秒以内）: ${message}`);
    return;
  }

  // エラーメッセージと表示時間を記録
  lastShownErrorMessage = message;
  lastErrorTime = now;
  
  logDebug(`エラー表示関数が呼び出されました: ${message}`);
  
  // DOM要素が確実に取得できるか再チェック
  if (!errorText || !errorBubble) {
    logDebug('errorText/errorBubble要素が見つかりません。再取得を試みます');
    errorText = document.getElementById('errorText');
    errorBubble = document.getElementById('errorBubble');
    
    if (!errorText || !errorBubble) {
      logError('エラー表示要素の取得に失敗しました', new Error('DOM要素が見つかりません'));
      console.error('エラーメッセージを表示できません:', message);
      return;
    }
  }
  
  // エラーメッセージをセット
  errorText.textContent = `「${message}」`;
  
  // 確実に表示するため強制的なスタイル設定
  errorBubble.style.cssText = `
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: absolute !important;
    top: 20px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    z-index: 2147483647 !important;
    pointer-events: auto !important;
  `;
  
  // 8秒後に非表示
  setTimeout(() => {
    errorBubble.style.cssText = `
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    `;
    logDebug(`エラー表示を終了: ${message}`);
  }, 8000);
  
  logDebug(`エラー表示を開始: ${message}`);
}

/**
 * 接続状態の表示を更新する
 * @param {string} status - 接続状態
 * @param {number} reconnectAttempts - 再接続試行回数
 * @param {number} maxReconnectAttempts - 最大再接続試行回数
 */
export function updateConnectionStatus(status, reconnectAttempts = 0, maxReconnectAttempts = 5) {
  if (statusIndicator) {
    statusIndicator.className = `status-indicator ${status}`;
    
    switch (status) {
      case 'connected':
        statusIndicator.title = '接続済み';
        break;
      case 'disconnected':
        statusIndicator.title = '切断されました';
        break;
      case 'reconnecting':
        statusIndicator.title = `再接続中 (${reconnectAttempts}/${maxReconnectAttempts})`;
        break;
      case 'error':
        statusIndicator.title = '接続エラー';
        break;
      case 'failed':
        statusIndicator.title = '接続失敗';
        break;
      default:
        statusIndicator.title = status;
    }
    
    logDebug(`接続状態更新: ${status}`);
  }
}

/**
 * 設定UI要素をレンダリングする
 * @param {Object|Array} uiPayload - UI表示用のペイロード（単一オブジェクトまたは配列）
 */
export function renderSettingUI(uiPayload) {
  console.log('🛠 renderSettingUI() が呼ばれました！');
  console.log('payload:', uiPayload);
  
  logDebug(`設定UI表示: ${Array.isArray(uiPayload) ? `${uiPayload.length}個の項目` : `タイプ=${uiPayload.type}`}`);
  
  if (!speechSettingUI) {
    console.log('💭 speechSettingUIが存在しないので取得または作成します');
    speechSettingUI = document.getElementById('speechSettingUI');
    if (!speechSettingUI) {
      logError('speechSettingUI要素が見つかりません');
      console.log('💭 speechSettingUI要素が見つからないため新規作成します');
      
      // 吹き出し内に作成
      if (speechBubble) {
        speechSettingUI = document.createElement('div');
        speechSettingUI.id = 'speechSettingUI';
        speechSettingUI.className = 'speech-setting-ui';
        speechBubble.appendChild(speechSettingUI);
        console.log('🧱 DOMに追加しました！', speechSettingUI);
        console.log('親の speechBubble:', speechBubble);
        logDebug('設定UI要素を動的に作成しました');
      } else {
        console.log('❌ speechBubble要素が存在しません！', speechBubble);
        logError('speechBubble要素も見つかりません。設定UIを表示できません');
        return;
      }
    } else {
      console.log('💭 既存のspeechSettingUIを取得しました', speechSettingUI);
    }
  } else {
    console.log('💭 speechSettingUIは既に存在します', speechSettingUI);
  }
  
  // 内容をクリア
  speechSettingUI.innerHTML = '';
  console.log('💭 speechSettingUIの内容をクリアしました');
  
  // 複数のUIペイロードに対応（配列の場合）
  const payloads = Array.isArray(uiPayload) ? uiPayload : [uiPayload];
  
  // 各UIペイロードごとに処理
  payloads.forEach((payload, index) => {
    // UIタイプに応じたコンテンツを作成
    if (payload.type === 'toggle') {
      console.log(`💭 トグルUI(${index})を描画します:`, payload);
      renderToggleSwitch(payload, index);
    } else {
      console.log(`❌ 未対応のUIタイプ: ${payload.type}`);
      logError(`未対応の設定UIタイプ: ${payload.type}`);
    }
  });
  // 設定UI要素を表示
  speechSettingUI.style.setProperty('display', 'block', 'important');
  console.log('💭 speechSettingUIを表示に設定しました');
  
  // 閉じるボタンが存在することを確認
  if (speechBubble) {
    // 既存の閉じるボタンを確認
    let closeButton = speechBubble.querySelector('.bubble-close');
    if (!closeButton) {
      console.log('💭 閉じるボタンが見つからないため新規作成します');
      closeButton = document.createElement('div');
      closeButton.className = 'bubble-close';
      closeButton.textContent = '×';
      closeButton.onclick = function() {
        hideBubble();
      };
      speechBubble.appendChild(closeButton);
      console.log('💭 閉じるボタンを追加しました');
    } else {
      console.log('💭 既存の閉じるボタンを確認しました:', closeButton);
    }
  }
  
  // 吹き出しにマウスイベントリスナーを追加（設定UI表示中はマウスフォーカス中に表示を維持）
  if (speechBubble) {
    // 既存のリスナーを削除
    speechBubble.removeEventListener('mouseenter', keepBubbleVisible);
    speechBubble.removeEventListener('mouseleave', allowBubbleHide);
    
    // 新しいリスナーを追加
    speechBubble.addEventListener('mouseenter', keepBubbleVisible);
    speechBubble.addEventListener('mouseleave', allowBubbleHide);
    console.log('💭 吹き出しのマウスイベントリスナーを設定しました');
  } else {
    console.log('❌ マウスイベント追加時にspeechBubbleが存在しません');
  }
  
  console.log('💬 最終的な speechBubble の中身:', speechBubble?.innerHTML || '存在しません');
  logDebug('設定UI表示完了');
}

/**
 * トグルスイッチを描画する（renderSettingUIの補助関数）
 * @private
 * @param {Object} payload - トグルスイッチの設定
 * @param {number} index - トグルスイッチのインデックス
 */
function renderToggleSwitch(payload, index) {
  console.log('✨ renderToggleSwitch 開始:', payload);
  
  // トグルスイッチを作成
  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'toggle-container';
  
  // ラベルを作成
  const label = document.createElement('label');
  label.className = 'toggle-label';
  label.textContent = payload.label;
  
  // トグルスイッチを作成
  const toggleSwitch = document.createElement('div');
  toggleSwitch.className = 'toggle-switch-container';
  
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.id = `setting-toggle-${Date.now()}-${index}`;
  toggle.className = 'toggle-switch';
  toggle.checked = payload.value;
  
  const toggleSlider = document.createElement('label');
  toggleSlider.className = 'toggle-slider';
  toggleSlider.htmlFor = toggle.id;
  
  // トグルの説明テキストがあれば追加
  if (payload.description) {
    const description = document.createElement('div');
    description.className = 'toggle-description';
    description.textContent = payload.description;
    toggleContainer.appendChild(description);
  }
  
  // ①トグル要素自体へのchangeイベントリスナー
  toggle.addEventListener('change', (e) => {
    console.log('🔄 トグル変更イベント発生: ', e.target.checked);
    const newValue = e.target.checked;
    logDebug(`設定値変更: "${payload.label}" = ${newValue}`);
    
    // 効果音再生（任意）
    if (typeof window.playPresetSound === 'function') {
      window.playPresetSound(newValue ? 'toggle_on' : 'toggle_off').catch(() => {});
    }
    
    // アニメーション効果（任意）
    toggleSlider.classList.add('toggled');
    setTimeout(() => toggleSlider.classList.remove('toggled'), 300);
    
    // 設定キーが指定されている場合はAPIを呼び出す
    if (payload.key) {
      try {
        console.log(`🔄 設定APIを呼び出します: ${payload.key}=${newValue}`);
        updateSetting(payload.key, newValue)
          .then(response => {
            console.log('✅ 設定更新成功:', response);
          })
          .catch(error => {
            console.error('❌ 設定更新失敗:', error);
            logError(`設定APIエラー: ${error.message || '不明なエラー'}`);
          });
      } catch (err) {
        console.error('設定API呼び出しエラー:', err);
        logError(`設定API呼び出しエラー: ${err.message}`);
      }
    }
    
    // コールバック関数を呼び出し
    if (typeof payload.onChange === 'function') {
      try {
        console.log('🔄 onChange コールバックを実行: ', payload.onChange);
        payload.onChange(newValue);
      } catch (err) {
        logError(`設定変更コールバックでエラー: ${err.message}`);
        console.error('コールバックエラー詳細: ', err);
      }
    } else {
      console.log('⚠️ onChangeコールバックが関数ではありません: ', payload.onChange);
    }
  });
  
  // ②トグルスライダーへのクリックイベントリスナー
  toggleSlider.addEventListener('click', (e) => {
    console.log('👆 トグルスライダークリックイベント発生');
    e.preventDefault(); // デフォルトの動作を防止
    
    // toggle要素のチェック状態を反転
    toggle.checked = !toggle.checked;
    
    // 手動でchangeイベントを発火
    const changeEvent = new Event('change', { bubbles: true });
    toggle.dispatchEvent(changeEvent);
  });
  
  // ③ラベルへのクリックイベントリスナー（追加）
  label.addEventListener('click', (e) => {
    console.log('👆 ラベルクリックイベント発生');
    e.preventDefault(); // デフォルトの動作を防止
    
    // toggle要素のチェック状態を反転
    toggle.checked = !toggle.checked;
    
    // 手動でchangeイベントを発火
    const changeEvent = new Event('change', { bubbles: true });
    toggle.dispatchEvent(changeEvent);
  });
  
  // ④トグルコンテナ全体へのクリックイベントリスナー（追加）
  toggleContainer.addEventListener('click', (e) => {
    // toggleやlabelのクリックイベントと重複しないように
    if (e.target === toggleContainer) {
      console.log('👆 トグルコンテナクリックイベント発生');
      
      // toggle要素のチェック状態を反転
      toggle.checked = !toggle.checked;
      
      // 手動でchangeイベントを発火
      const changeEvent = new Event('change', { bubbles: true });
      toggle.dispatchEvent(changeEvent);
    }
  });
  
  // 要素を組み立て
  toggleSwitch.appendChild(toggle);
  toggleSwitch.appendChild(toggleSlider);
  
  toggleContainer.appendChild(label);
  toggleContainer.appendChild(toggleSwitch);
  
  speechSettingUI.appendChild(toggleContainer);
  
  console.log('✅ renderToggleSwitch 完了:', {
    container: toggleContainer,
    toggle: toggle,
    slider: toggleSlider,
    label: label
  });
}

/**
 * 吹き出しを表示状態に維持する（マウスホバー時）
 * @private
 */
function keepBubbleVisible() {
  logDebug('吹き出しにマウスが入りました。表示を維持します');
  
  // 既存の非表示タイマーをクリア
  if (window.hideTimeoutMap && window.hideTimeoutMap.size > 0) {
    for (const [key, timerId] of window.hideTimeoutMap.entries()) {
      clearTimeout(timerId);
      logDebug(`タイマー ${key} をクリアしました`);
    }
    window.hideTimeoutMap.clear();
  }
  
  // 吹き出しに特別なクラスを追加
  if (speechBubble) {
    speechBubble.classList.add('keep-visible');
  }
}

/**
 * 吹き出しの自動非表示を許可する（マウスリーブ時）
 * @private
 */
function allowBubbleHide() {
  logDebug('吹き出しからマウスが離れました。表示維持を解除します');
  
  // 吹き出しから特別なクラスを削除
  if (speechBubble) {
    speechBubble.classList.remove('keep-visible');
  }
} 