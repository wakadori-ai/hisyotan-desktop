/**
 * bubbleDisplay.js
 * 吹き出し表示を制御するヘルパーモジュール
 */

import { logDebug, logError, logZombieWarning } from '@core/logger.js';
import { showBubble, setText, initUIElements } from '@ui/uiHelper.js';
import { hideBubble } from '@ui/handlers/bubbleManager.js';

/**
 * メッセージの整形（語尾を統一）
 * @param {string} message - 整形前のメッセージ
 * @returns {string} 整形後のメッセージ
 */
export function formatMessage(message) {
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
export function forceShowBubble(formattedText, eventType = 'default') {
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
    
    // クラスをリセット
    speechBubble.classList.remove('hide', 'show', 'speech-bubble', 'zombie-warning');
    speechBubble.removeAttribute('style');
    
    // 最優先のスタイルを設定
    speechBubble.style.cssText = `
      display: flex !important;
      visibility: visible !important;
      opacity: 0 !important;  /* 最初は透明に設定 */
      position: absolute !important;
      z-index: 2147483647 !important;
      top: 20% !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      pointer-events: auto !important;
    `;

    // speech-bubbleクラスを追加
    speechBubble.classList.add('speech-bubble');
    console.log('[forceShowBubble] 基本クラス追加後:', speechBubble.className);
    
    // リフローを強制
    void speechBubble.offsetWidth;
    
    // 遅延してからアニメーション用クラスを追加
    setTimeout(() => {
      // オパシティを1に設定
      speechBubble.style.opacity = '1 !important';
      
      // showクラスを追加
      speechBubble.classList.add('show');
      if (isZombieEvent) {
        speechBubble.classList.add('zombie-warning');
      }
      console.log('[forceShowBubble] show クラス追加後:', speechBubble.className);
    }, 20);
  } else {
    logError('forceShowBubble: 吹き出し要素が見つかりません');
    initUIElements();
  }
}

/**
 * 吹き出しにテキストを表示する簡易ヘルパー
 * @param {string} text - 表示するテキスト
 * @param {string} eventType - イベントタイプ
 */
export function displayTextInBubble(text, eventType = 'default') {
  const formattedMessage = formatMessage(text);
  setText(formattedMessage);
  showBubble(eventType);
  
  // 吹き出しが確実に表示されているか確認
  setTimeout(() => {
    const speechBubble = document.getElementById('speechBubble');
    const speechText = document.getElementById('speechText');
    
    if (!speechBubble) {
      logError('吹き出し要素が見つかりません');
      return;
    }
    
    // 表示状態を確認し、問題があれば強制表示
    const computedStyle = window.getComputedStyle(speechBubble);
    if (computedStyle.display !== 'flex' || 
        computedStyle.visibility !== 'visible' || 
        parseFloat(computedStyle.opacity) < 0.9 ||
        (speechText && speechText.textContent.trim() === '')) {
      
      logDebug('吹き出しの表示に問題があります。強制表示を実行します');
      forceShowBubble(formattedMessage, eventType);
    }
  }, 50);
}

export default {
  formatMessage,
  forceShowBubble,
  displayTextInBubble
}; 