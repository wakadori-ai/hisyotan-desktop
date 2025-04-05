// bubbleManager.js
// 吹き出しの管理

import { logDebug } from '@core/logger.js';
import { fadeIn, fadeOut as animationFadeOut } from './animationHandler.js';

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
  
  // テキスト要素のデータを保持
  const textElement = document.getElementById('speechText');
  if (textElement) {
    // 現在のテキストをデータ属性にバックアップ
    const currentText = textElement.textContent;
    if (currentText && currentText.trim() !== '') {
      console.log(`💾 非表示前にテキストをバックアップ: "${currentText.substring(0, 20)}${currentText.length > 20 ? '...' : ''}"`);
      textElement.dataset.lastText = currentText;
      textElement.dataset.hiddenAt = Date.now().toString();
    }
  }
  
  // アニメーションで非表示（テキストは消さない）
  fadeOutBubble(bubble);
}

/**
 * 要素をフェードアウトさせる（バブル専用の拡張バージョン）
 * @param {HTMLElement} element - フェードアウトさせる要素
 */
function fadeOutBubble(element) {
  if (!element) return;
  
  console.log('🔚 吹き出しフェードアウト開始');
  
  // クラスでアニメーション
  element.classList.remove('show');
  element.classList.add('hide');
  
  // テキスト要素を直接消去しないようにする
  // 吹き出し自体の表示/非表示のみを制御
  setTimeout(() => {
    // displayをnoneにすると子要素も表示されなくなるが、
    // 要素自体とその中身は保持される
    element.style.display = 'none';
    
    // テキスト要素自体は維持
    const textElement = document.getElementById('speechText');
    if (textElement) {
      // テキスト内容をクリアせず、非表示フラグのみ設定
      textElement.dataset.hidden = 'true';
    }
    
    console.log('🔚 吹き出しフェードアウト完了');
  }, 500); // CSS トランジションの時間に合わせる
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