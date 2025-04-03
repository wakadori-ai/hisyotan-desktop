// bubbleManager.js
// 吹き出しの管理

import { logDebug } from '@core/logger.js';
import { fadeIn, fadeOut } from './animationHandler.js';

// タイムアウトを管理するための変数
let bubbleTimeout = null;

/**
 * 吹き出しを表示
 * @param {string} text - 表示するテキスト
 * @param {number} duration - 表示時間（ミリ秒）
 */
export function showBubble(text, duration = 5000) {
  logDebug(`吹き出しを表示: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
  
  // 要素の取得
  const bubble = document.getElementById('speechBubble');
  const bubbleText = document.getElementById('bubbleText');
  
  if (!bubble || !bubbleText) {
    logDebug('吹き出し要素が見つかりません');
    return;
  }
  
  // 既存のタイムアウトをクリア
  if (bubbleTimeout) {
    clearTimeout(bubbleTimeout);
    bubbleTimeout = null;
  }
  
  // テキスト設定とスタイル調整
  bubbleText.innerText = text;
  
  // テキストの長さに応じてサイズを調整
  adjustBubbleSize(bubble, text);
  
  // アニメーションで表示
  fadeIn(bubble).then(() => {
    // 指定時間後に非表示
    if (duration > 0) {
      bubbleTimeout = setTimeout(() => {
        hideBubble();
      }, duration);
    }
  });
}

/**
 * 吹き出しを非表示
 */
export function hideBubble() {
  const bubble = document.getElementById('speechBubble');
  
  if (!bubble) {
    return;
  }
  
  // タイムアウトをクリア
  if (bubbleTimeout) {
    clearTimeout(bubbleTimeout);
    bubbleTimeout = null;
  }
  
  // アニメーションで非表示
  fadeOut(bubble);
}

/**
 * 吹き出しのサイズを調整
 * @param {HTMLElement} bubble - 吹き出し要素
 * @param {string} text - 表示するテキスト
 */
function adjustBubbleSize(bubble, text) {
  // テキストの長さに基づいて幅を調整
  const textLength = text.length;
  
  // デフォルトスタイルの設定
  bubble.style.maxWidth = '300px';
  bubble.style.width = 'auto';
  
  if (textLength > 100) {
    bubble.style.maxWidth = '400px';
  } else if (textLength < 20) {
    bubble.style.maxWidth = '200px';
  }
  
  // スマートフォンなど小さい画面サイズの場合は幅を調整
  if (window.innerWidth < 768) {
    bubble.style.maxWidth = '80vw';
  }
}

/**
 * ホードモード設定を表示
 * @param {boolean} currentValue - 現在の設定値
 * @param {Function} onChangeCallback - 値変更時のコールバック
 */
export function showHordeModeSettings(currentValue = false, onChangeCallback = null) {
  // 要素の取得
  const bubble = document.getElementById('speechBubble');
  const bubbleText = document.getElementById('bubbleText');
  
  if (!bubble || !bubbleText) {
    return;
  }
  
  // 既存のタイムアウトをクリア
  if (bubbleTimeout) {
    clearTimeout(bubbleTimeout);
    bubbleTimeout = null;
  }
  
  // HTML要素の作成
  bubbleText.innerHTML = `
    <div class="settings-container">
      <h3>ホードモード設定</h3>
      <div class="setting-item">
        <label class="toggle-switch">
          <input type="checkbox" id="hordeModeToggle" ${currentValue ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
        <span class="setting-label">有効にする</span>
      </div>
      <button id="closeSettingsBtn" class="btn btn-sm">閉じる</button>
    </div>
  `;
  
  // イベントリスナーの設定
  bubble.style.display = 'block';
  
  const closeBtn = document.getElementById('closeSettingsBtn');
  const toggleSwitch = document.getElementById('hordeModeToggle');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', hideBubble);
  }
  
  if (toggleSwitch && onChangeCallback) {
    toggleSwitch.addEventListener('change', function() {
      onChangeCallback(this.checked);
    });
  }
} 