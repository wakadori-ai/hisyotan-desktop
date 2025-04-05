// speechObserver.js
// 吹き出し要素の監視と復旧機能を担当するモジュール

import { logDebug, logError, logZombieWarning } from '@core/logger.js';

// グローバルでMutationObserverを追跡するための変数
window._speechTextObserver = null;
window._speechTextObserverAttached = false;

/**
 * 吹き出し再表示保証用のMutationObserverをセットアップ
 */
export function observeSpeechTextAutoRecovery() {
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
    
    // 🔒 speechBubble.jsの復元中フラグをチェック
    // window.isRecoveringはspeechBubble.jsで定義されたグローバル変数
    if (typeof window.isRecovering === 'boolean' && window.isRecovering === true) {
      logZombieWarning(`[${timeStamp}] [Observer] 🔒 他のモジュールが保護モード中のため変更を無視します`);
      return;
    }
    
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
      
      // ロックされている場合は処理をスキップ
      if (speechText.dataset.locked === 'true') {
        const lockTime = parseInt(speechText.dataset.setTime || '0', 10);
        const now = Date.now();
        // 1秒以内にロックされた場合はスキップ
        if (now - lockTime < 1000) {
          logZombieWarning(`[${timeStamp}] [Observer] 🔒 テキストがロックされているため復旧をスキップします（${now - lockTime}ms前にセット）`);
          return;
        }
      }
      
      // テキストが空だけどinnerHTMLが存在する場合は復旧スキップ
      if (
        text === '' &&
        speechText.innerHTML.includes('<span') &&
        speechText.innerHTML.includes('speech-text-content')
      ) {
        // 既にTextMonitorが復旧処理を実行済みでないことを確認
        if (speechText.dataset.recoveredByTextMonitor === 'true') {
          const recoveryTime = parseInt(speechText.dataset.recoveryTime || '0', 10);
          const now = Date.now();
          // 復旧されてから500ms以内の場合は処理をスキップ
          if (now - recoveryTime < 500) {
            logZombieWarning(`[${timeStamp}] [Observer] TextMonitorが既に復旧済み（${now - recoveryTime}ms前）のため処理をスキップします`);
            return;
          }
        }
        
        // 🔒 speechBubble.jsの復元中フラグをセット
        if (typeof window.isRecovering !== 'undefined') {
          window.isRecovering = true;
        }
        
        // バックアップテキストがあればそれを使用
        const recoveryText = backupText || '「ごめん、もう一度言うねっ」';
        
        // spanによる復旧に切り替える
        const newSpan = document.createElement('span');
        newSpan.className = 'speech-text-content recovered-by-observer';
        newSpan.textContent = recoveryText;
        newSpan.style.cssText = `
          color: #4e3b2b !important;
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          font-size: 1.05rem !important;
          line-height: 1.6 !important;
          position: relative !important;
          z-index: 5 !important;
          margin: 0 !important;
          padding: 0 !important;
          text-shadow: 0 0 1px rgba(255,255,255,0.7) !important;
        `;
        
        // 内容をクリアして新しいspanを追加
        // ロックされている場合は元の内容を保護
        if (speechText.dataset.locked === 'true') {
          // ロックされている場合、クリアをスキップしてdataset.originalTextから復元を試みる
          logZombieWarning(`[${timeStamp}] [Observer] 🛡️ speechTextはロック中、observerによる消去をスキップします`);
          
          // すでにspanがあるか確認し、なければdataset.originalTextから復元
          if (!speechText.querySelector('.speech-text-content') && speechText.dataset.originalText) {
            const lockedSpan = document.createElement('span');
            lockedSpan.className = 'speech-text-content locked-content-restored';
            lockedSpan.textContent = speechText.dataset.originalText;
            lockedSpan.style.cssText = `
              color: #4e3b2b !important;
              display: inline-block !important;
              visibility: visible !important;
              opacity: 1 !important;
              width: 100% !important;
              font-size: 1.05rem !important;
              line-height: 1.6 !important;
              position: relative !important;
              z-index: 5 !important;
              margin: 0 !important;
              padding: 0 !important;
              text-shadow: 0 0 1px rgba(255,255,255,0.7) !important;
            `;
            
            speechText.innerHTML = ''; // 既存の内容を一旦クリア
            speechText.appendChild(lockedSpan);
            logZombieWarning(`[${timeStamp}] [Observer] 🔄 ロック中のテキストをoriginalTextから復元: "${speechText.dataset.originalText.substring(0, 20)}${speechText.dataset.originalText.length > 20 ? '...' : ''}"`);
          }
        } else {
          // ロックされていない場合は通常の復旧処理
          speechText.innerHTML = '';
          speechText.appendChild(newSpan);
          
          // データ属性を更新
          speechText.dataset.recoveredByObserver = 'true';
          speechText.dataset.recoveryTime = Date.now().toString();
          
          logZombieWarning(`[${timeStamp}] [Observer] spanによるテキスト復元: "${recoveryText.substring(0, 20)}${recoveryText.length > 20 ? '...' : ''}"`);
        }
        
        // ⏱️ 一定時間後に保護を解除
        if (typeof window.isRecovering !== 'undefined') {
          setTimeout(() => {
            window.isRecovering = false;
            logZombieWarning(`[${timeStamp}] [Observer] 🔓 復元保護モード終了`);
          }, 500);
        }
      }
      
      // 吹き出しのスタイルを強制的に修正
      speechBubble.className = 'speech-bubble show fixed-position';
      speechBubble.style.cssText = `
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: fixed !important;
        top: 15% !important;
        right: 50px !important;
        left: auto !important;
        width: auto !important;
        min-width: 280px !important;
        max-width: 350px !important;
        min-height: 80px !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        overflow: visible !important;
        height: auto !important;
        background: rgba(255, 255, 255, 0.9) !important;
        padding: 14px 18px !important;
      `;
      
      // speechTextがspeechBubbleの子要素でない場合は追加
      if (!speechBubble.contains(speechText)) {
        logZombieWarning(`[${timeStamp}] [Observer] ⚠️ speechTextがspeechBubbleの子要素ではありません。追加します。`);
        
        // 念のため既存の親から切り離す
        if (speechText.parentElement) {
          try {
            speechText.parentElement.removeChild(speechText);
          } catch (e) {
            logError(`[Observer] 親要素からspeechTextを切り離す際にエラー: ${e.message}`);
          }
        }
        
        // speechBubbleに追加
        try {
          speechBubble.appendChild(speechText);
          logZombieWarning(`[${timeStamp}] [Observer] ✅ speechTextをspeechBubbleに追加しました。`);
        } catch (e) {
          logError(`[Observer] speechTextをspeechBubbleに追加する際にエラー: ${e.message}`);
        }
      }
      
      // 構造をログ出力
      logZombieWarning(`[${timeStamp}] [Observer] 💬 DOM構造確認: speechTextIsChildOfBubble=${speechBubble.contains(speechText)}, speechBubbleChildCount=${speechBubble.childElementCount}`);
      
      logZombieWarning(`[${timeStamp}] [Observer] 吹き出し強制復旧実行完了`);
    }
  });

  // テキスト要素のみ監視（属性変更とテキスト変更）
  window._speechTextObserver.observe(speechText, {
    characterData: true,
    childList: true, // 子ノードの追加・削除を監視
    subtree: true,   // 子孫ノードの変更も監視
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
 * 監視の初期化またはリセット
 */
export function resetObserver() {
  // 既存のObserverを切断
  if (window._speechTextObserver) {
    window._speechTextObserver.disconnect();
    window._speechTextObserver = null;
    window._speechTextObserverAttached = false;
    logDebug('Observerをリセットしました');
  }
}

// グローバルアクセス用のオブジェクトをエクスポート
export const speechObserverModule = {
  observeSpeechTextAutoRecovery,
  resetObserver
};

// グローバル変数に登録（他モジュールからのアクセス用）
if (typeof window !== 'undefined') {
  window.speechObserver = speechObserverModule;
} 