/**
 * assistantUI.js
 * UI操作関連の機能を集約したヘルパーモジュール
 */

import { createTestSettingsUI } from '@ui/paw-context-menu.js';
import { hideBubble } from '@ui/handlers/bubbleManager.js';

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
  console.log('🌸 assistantUI: UI要素を初期化します');
  
  // 必要なUI要素の定義
  const requiredElements = {
    pawButton: { id: 'paw-button', type: 'button' },
    quitButton: { id: 'quit-button', type: 'button' },
    speechBubble: { id: 'speechBubble', type: 'div' },
    speechText: { id: 'speechText', type: 'div' },
    assistantImage: { id: 'assistantImage', type: 'img' },
    errorBubble: { id: 'errorBubble', type: 'div' },
    errorText: { id: 'errorText', type: 'div' },
    statusIndicator: { id: 'statusIndicator', type: 'div' },
    speechSettingUI: { id: 'speechSettingUI', type: 'div' }
  };
  
  // 各要素の初期化
  for (const [key, config] of Object.entries(requiredElements)) {
    let element = document.getElementById(config.id);
    
    if (!element) {
      console.log(`🆕 ${config.id}要素を作成します`);
      element = document.createElement(config.type);
      element.id = config.id;
      
      // 要素に応じた初期設定
      switch (config.id) {
        case 'speechBubble':
          element.className = 'speech-bubble';
          break;
        case 'speechText':
          element.className = 'speech-text';
          break;
        case 'errorBubble':
          element.className = 'error-bubble';
          break;
        case 'errorText':
          element.className = 'error-text';
          break;
        case 'statusIndicator':
          element.className = 'status-indicator';
          break;
        case 'speechSettingUI':
          element.className = 'speech-setting-ui';
          break;
      }
      
      document.body.appendChild(element);
    }
    
    // グローバル変数に要素を保存
    window[key] = element;
  }
  
  // イベントリスナーの設定
  setupEventListeners();
}

// イベントリスナーの設定を分離
function setupEventListeners() {
  if (window.pawButton) {
    console.log('🐾 pawButtonにイベントリスナーを設定します');
    setupPawButtonEvents(window.pawButton);
  }
  
  if (window.quitButton) {
    console.log('🚪 quitButtonにイベントリスナーを設定します');
    setupQuitButtonEvents(window.quitButton);
  }
  
  // 立ち絵と吹き出しのイベント設定
  if (window.assistantImage) {
    window.assistantImage.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      console.log('🖼️ 立ち絵が右クリックされました - 右クリックメニューを無効化');
    });
  }
  
  if (window.speechBubble) {
    window.speechBubble.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      console.log('💬 吹き出しが右クリックされました - 右クリックメニューを無効化');
    });
  }
}

// 肉球ボタンのイベント設定を分離
function setupPawButtonEvents(pawButton) {
  let lastClickTime = 0;
  const COOLDOWN_TIME = 3000;
  
  pawButton.style.webkitAppRegion = 'no-drag';
  
  pawButton.addEventListener('click', (event) => {
    console.log('🐾 肉球ボタンがクリックされました');
    
    if (window._wasDragging) {
      window._wasDragging = false;
      return;
    }
    
    const currentTime = Date.now();
    if (currentTime - lastClickTime < COOLDOWN_TIME) {
      console.log('🕒 クールタイム中です');
      return;
    }
    
    lastClickTime = currentTime;
    handlePawButtonClick();
  });
  
  pawButton.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    console.log('🔧 肉球ボタンが右クリックされました');
    handlePawButtonRightClick();
  });
}

// 終了ボタンのイベント設定を分離
function setupQuitButtonEvents(quitButton) {
  quitButton.addEventListener('click', () => {
    console.log('🚪 終了ボタンがクリックされました');
    handleQuitButtonClick();
  });
}

// 肉球ボタンのクリック処理
function handlePawButtonClick() {
  if (window.speechManager && window.speechManager.speak) {
    const messages = [
      'こんにちは！何かお手伝いしましょうか？',
      'お疲れ様です！休憩も大切ですよ✨',
      '何か質問があればいつでも声をかけてくださいね',
      'お仕事頑張ってますね！素敵です',
      'リラックスタイムも必要ですよ〜',
      'デスクの整理、手伝いましょうか？'
    ];
    
    const randomIndex = Math.floor(Math.random() * messages.length);
    const message = messages[randomIndex];
    
    window.speechManager.speak(message, 'normal', 5000);
    return;
  }
  
  if (window.electron && window.electron.ipcRenderer) {
    try {
      window.electron.ipcRenderer.send('show-random-message');
    } catch (error) {
      console.error('IPC呼び出しエラー:', error);
      showBubble('default', 'こんにちは！何かお手伝いしましょうか？');
    }
  } else {
    showBubble('default', 'こんにちは！何かお手伝いしましょうか？');
  }
}

// 肉球ボタンの右クリック処理
function handlePawButtonRightClick() {
  try {
    createTestSettingsUI();
    
    if (window.speechManager && window.speechManager.speak) {
      window.speechManager.speak('設定メニューを開きますね', 'normal', 3000);
    } else {
      showBubble('default', '設定メニューを開きますね');
    }
  } catch (error) {
    console.error('設定UI表示エラー:', error);
    showBubble('warning', '設定を開けませんでした');
  }
}

// 終了ボタンのクリック処理
function handleQuitButtonClick() {
  if (window.speechManager) {
    window.speechManager.speak('さようなら、またね！', 'normal', 2000, null, 'quit_app');
  }
  
  if (window.electron && window.electron.ipcRenderer) {
    try {
      window.electron.ipcRenderer.send('quit-app-with-backend');
      
      setTimeout(() => {
        window.electron.ipcRenderer.send('quit-app');
      }, 500);
      
      setTimeout(() => {
        try {
          window.electron.ipcRenderer.invoke('quit-app')
            .catch(() => window.close());
        } catch (error) {
          window.close();
        }
      }, 300);
    } catch (error) {
      window.close();
    }
  } else {
    window.close();
  }
}

/**
 * ウィンドウドラッグを直接処理するハンドラ
 * 注: CSSの-webkit-app-region: dragを使用するため、
 * このハンドラは実際には使われません。
 * 互換性のために残しています。
 */
function directWindowDragHandler(initialEvent) {
  console.log('🖱️ CSSによるドラッグ機能が使用されます');
  // CSSで-webkit-app-region: dragを使用するため実装は空
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
  console.log('🎨 UI要素を作成します');
  
  // メインコンテナの作成
  const container = document.createElement('div');
  container.className = 'assistant-container';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.zIndex = '2147483647';
  container.style.width = '200px';
  container.style.height = '300px';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.alignItems = 'center';
  container.style.justifyContent = 'flex-end';
  
  // 立ち絵の作成
  const assistantImage = document.createElement('img');
  assistantImage.id = 'assistantImage';
  assistantImage.className = 'assistant-image';
  assistantImage.src = '/assets/images/secretary_normal.png';
  assistantImage.alt = '秘書たん';
  assistantImage.style.width = '100%';
  assistantImage.style.height = 'auto';
  assistantImage.style.display = 'block';
  assistantImage.style.position = 'relative';
  assistantImage.style.zIndex = '1';
  assistantImage.style.objectFit = 'contain';
  
  // 肉球ボタンの作成
  const pawButton = document.createElement('div');
  pawButton.id = 'paw-button';
  pawButton.className = 'paw-button';
  pawButton.style.position = 'absolute';
  pawButton.style.bottom = '10px';
  pawButton.style.right = '10px';
  pawButton.style.width = '40px';
  pawButton.style.height = '40px';
  pawButton.style.borderRadius = '50%';
  pawButton.style.backgroundColor = 'rgba(255, 192, 203, 0.8)';
  pawButton.style.cursor = 'pointer';
  pawButton.style.zIndex = '2';
  pawButton.style.display = 'flex';
  pawButton.style.alignItems = 'center';
  pawButton.style.justifyContent = 'center';
  pawButton.style.fontSize = '24px';
  pawButton.style.transition = 'transform 0.2s ease-in-out';
  pawButton.style.transform = 'scale(1)';
  pawButton.textContent = '🐾';
  
  // ホバーエフェクト
  pawButton.addEventListener('mouseover', () => {
    pawButton.style.transform = 'scale(1.1)';
  });
  
  pawButton.addEventListener('mouseout', () => {
    pawButton.style.transform = 'scale(1)';
  });
  
  // 終了ボタンの作成
  const quitButton = document.createElement('div');
  quitButton.id = 'quit-button';
  quitButton.className = 'quit-button';
  quitButton.style.position = 'absolute';
  quitButton.style.bottom = '-20px';
  quitButton.style.right = '-20px';
  quitButton.style.width = '30px';
  quitButton.style.height = '30px';
  quitButton.style.borderRadius = '50%';
  quitButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
  quitButton.style.cursor = 'pointer';
  quitButton.style.zIndex = '3';
  quitButton.style.display = 'flex';
  quitButton.style.alignItems = 'center';
  quitButton.style.justifyContent = 'center';
  quitButton.style.color = 'white';
  quitButton.style.fontSize = '20px';
  quitButton.style.transition = 'opacity 0.2s ease-in-out';
  quitButton.style.opacity = '0.8';
  quitButton.textContent = '×';
  
  // ホバーエフェクト
  quitButton.addEventListener('mouseover', () => {
    quitButton.style.opacity = '1';
  });
  
  quitButton.addEventListener('mouseout', () => {
    quitButton.style.opacity = '0.8';
  });
  
  // 要素をコンテナに追加
  container.appendChild(assistantImage);
  container.appendChild(pawButton);
  container.appendChild(quitButton);
  
  // コンテナをドキュメントに追加
  document.body.appendChild(container);
  
  // イベントリスナーの設定
  setupEventListeners();
  
  console.log('✨ UI要素の作成が完了しました');
}

// エクスポート
export {
  createTestSettingsUI,
  hideBubble
}; 