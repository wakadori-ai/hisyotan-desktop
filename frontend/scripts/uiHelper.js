// uiHelper.js
// UI表示制御用のモジュール

import { logDebug, logError, logZombieWarning } from './logger.js';

// DOM要素
let speechBubble;
let speechText;
let errorBubble;
let errorText;
let statusIndicator;

// グローバルでMutationObserverを追跡するための変数
window._speechTextObserver = null;
window._speechTextObserverAttached = false;

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
  
  // 再取得を試みる
  if (!speechText) {
    logDebug('speechText要素が見つかりません。再取得を試みます');
    speechText = document.getElementById('speechText');
    
    if (!speechText) {
      logDebug('speechText要素が見つからないため、吹き出し全体を確認します');
      
      // 吹き出し要素自体の確認
      const bubble = document.getElementById('speechBubble');
      if (bubble) {
        // 吹き出し内にテキスト要素がない場合は作成
        speechText = document.createElement('span');
        speechText.id = 'speechText';
        speechText.className = 'bubble-text';
        
        // 既存の内容をクリア
        while (bubble.firstChild) {
          bubble.removeChild(bubble.firstChild);
        }
        
        // アイコン要素を追加
        const icon = document.createElement('span');
        icon.className = 'bubble-icon';
        icon.textContent = '💭';
        bubble.appendChild(icon);
        
        // テキスト要素を追加
        bubble.appendChild(speechText);
        
        // 閉じるボタンを追加
        const closeBtn = document.createElement('div');
        closeBtn.className = 'bubble-close-button';
        closeBtn.id = 'bubbleCloseButton';
        closeBtn.textContent = '×';
        closeBtn.onclick = function() { hideBubble(); };
        bubble.appendChild(closeBtn);
        
        logDebug('吹き出し内の要素を再構築しました');
      } else {
        logError('speechBubble要素も見つかりません。表示できません');
        return;
      }
    }
  }
  
  // 複数の方法でテキスト設定を試みる
  if (speechText) {
    // 方法1: 直接プロパティ設定
    speechText.textContent = text;
    speechText.innerText = text;
    
    // 強制再描画トリガー
    void speechText.offsetHeight;
    speechText.style.transform = 'scale(1.00001)';
    
    // 方法2: innerHTML経由で設定（HTMLエスケープに注意）
    const safeText = text.replace(/&/g, '&amp;')
                          .replace(/</g, '&lt;')
                          .replace(/>/g, '&gt;')
                          .replace(/"/g, '&quot;')
                          .replace(/'/g, '&#039;');
    speechText.innerHTML = safeText;
    
    // 方法3: 子要素として設定
    requestAnimationFrame(() => {
      if (speechText) {
        // 既存の内容をクリア
        while (speechText.firstChild) {
          speechText.removeChild(speechText.firstChild);
        }
        
        // テキストノードを作成して追加
        const textNode = document.createTextNode(text);
        speechText.appendChild(textNode);
        
        // 設定後の状態確認
        logDebug(`テキスト設定後の内容確認: "${speechText.textContent || '空'}"`);
        
        // innerTextで再設定
        if (!speechText.textContent || speechText.textContent === '') {
          speechText.innerText = text;
          logDebug('textContentが空のため、innerTextで再設定しました');
        }
        
        // 強制的にリフローさせて確実に反映
        void speechText.offsetHeight;
        
        // 1フレーム遅延で確認・再設定（表示タイミング競合対策）
        setTimeout(() => {
          if (!speechText.textContent.trim()) {
            logZombieWarning('💥 再描画後も空だったので再設定を試みます');
            // 根本的に作り直す
            const parent = speechText.parentNode;
            if (parent) {
              const newText = document.createElement('span');
              newText.id = 'speechText';
              newText.className = 'bubble-text';
              newText.textContent = text;
              newText.innerText = text;
              parent.replaceChild(newText, speechText);
              speechText = newText;
              logDebug('テキスト要素を作り直しました');
            } else {
              speechText.textContent = text;
              speechText.innerText = text;
              logDebug('親要素なし。textContent/innerTextで再設定しました');
            }
          }
        }, 16);
      }
    });
    
    // 必要に応じて保険設定（Electron特有の問題対策）
    setTimeout(() => {
      if (speechText && speechText.textContent.trim() === '') {
        logZombieWarning('直接設定後もテキストが空です。強制再設定します');
        
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
  } else {
    logError(`setText: speechText要素取得失敗。テキスト "${text}" を設定できません`);
  }
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
 */
export function showError(message) {
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