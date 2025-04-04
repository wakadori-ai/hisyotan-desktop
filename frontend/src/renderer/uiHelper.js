/**
 * uiHelper.js
 * UI操作関連の機能を集約したヘルパーモジュール
 */

import { createTestSettingsUI, hideBubble } from '../ui/paw-context-menu.js';

// グローバル要素の参照を保持
let pawButton;
let quitButton;
let speechBubble;
let speechText;
let assistantImage;

/**
 * UI要素の初期化
 */
export function initUIElements() {
  console.log('🌸 uiHelper: UI要素を初期化します');
  
  // 肉球UIの要素を取得
  pawButton = document.getElementById('paw-button');
  quitButton = document.getElementById('quit-button');
  speechBubble = document.getElementById('speechBubble');
  speechText = document.getElementById('speechText');
  assistantImage = document.getElementById('assistantImage');
  
  // 肉球ボタンのイベント設定
  if (pawButton) {
    console.log('🐾 pawButtonにイベントリスナーを設定します');
    pawButton.addEventListener('click', () => {
      console.log('🐾 肉球ボタンがクリックされました');
      createTestSettingsUI();
    });
  } else {
    console.error('❌ pawButtonが見つかりません');
  }
  
  // 終了ボタンのイベント設定
  if (quitButton) {
    console.log('🚪 quitButtonにイベントリスナーを設定します');
    quitButton.addEventListener('click', () => {
      console.log('🚪 終了ボタンがクリックされました');
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.send('quit-app');
      } else {
        console.error('Electron IPCが利用できません');
      }
    });
  } else {
    console.error('❌ quitButtonが見つかりません');
  }
  
  // 立ち絵を表示
  if (assistantImage) {
    console.log('👩‍💼 assistantImageを表示します');
    // 即時クラス追加に変更
    assistantImage.classList.add('active');
  } else {
    console.error('❌ assistantImageが見つかりません');
  }
  
  console.log('✨ uiHelper: UI要素の初期化が完了しました');
}

/**
 * 吹き出しにテキストを表示
 * @param {string} text - 表示するテキスト
 * @param {string} type - 吹き出しのタイプ（default, warning, error など）
 */
export function showBubble(type = 'default', text = 'こんにちは！何かお手伝いしましょうか？') {
  console.log('🔍 showBubble関数が呼び出されました', { type, text });
  
  if (!speechBubble || !speechText) {
    console.error('💔 speechBubbleまたはspeechTextが見つかりません');
    return;
  }
  
  // 要素のスタイル情報をログ出力
  console.log('🎨 speechBubbleの現在のスタイル:', {
    display: speechBubble.style.display,
    className: speechBubble.className,
    computedStyle: window.getComputedStyle(speechBubble)
  });
  
  // 吹き出し表示
  speechBubble.style.display = 'block';
  speechText.textContent = `「${text}」`;
  
  // タイプによって吹き出しのスタイルを変更
  speechBubble.className = `speech-bubble speech-bubble-${type} show`;
  
  // スタイル適用後の状態をログ出力
  console.log('✅ スタイル適用後のspeechBubble:', {
    display: speechBubble.style.display,
    className: speechBubble.className,
    computedStyle: window.getComputedStyle(speechBubble)
  });
}

/**
 * 吹き出しを非表示にする
 */
export function hideSpeechBubble() {
  if (speechBubble) {
    speechBubble.style.display = 'none';
  }
}

/**
 * UIを生成する
 */
export function createUI() {
  // 肉球UI用のHTML構造を動的に生成
  const appDiv = document.getElementById('app');
  if (appDiv) {
    // body要素の背景を透明に設定
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    
    appDiv.innerHTML = `
      <div class="assistant-container">
        <div id="speechBubble" class="speech-bubble">
          <div id="speechText" class="speech-text">「こんにちは！何かお手伝いしましょうか？」</div>
        </div>
        <img id="assistantImage" class="assistant-image" src="/src/ui/public/assets/images/secretary_normal.png" alt="秘書たん">
        <div class="ui-buttons">
          <div id="paw-button">
            <div class="paw-button-wrapper">
              <div class="paw-background"></div>
              <span class="paw-icon">🐾</span>
            </div>
          </div>
          <div id="quit-button">×</div>
        </div>
      </div>
    `;
    
    // 要素の初期化
    initUIElements();
  }
}

// エクスポート
export {
  createTestSettingsUI,
  hideBubble
}; 