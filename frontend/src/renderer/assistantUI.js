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

// 初期化済みフラグ
let isUIInitialized = false;

/**
 * UI要素の初期化
 */
export function initUIElements() {
  console.log('🌸 assistantUI: UI要素を初期化します');
  
  // 既に初期化済みの場合は早期リターン
  if (isUIInitialized && document.getElementById('paw-button')) {
    console.log('🔄 UI要素はすでに初期化済みです');
    return;
  }
  
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
    if (key === 'pawButton') pawButton = element;
    if (key === 'quitButton') quitButton = element;
    if (key === 'speechBubble') speechBubble = element;
    if (key === 'speechText') speechText = element;
    if (key === 'assistantImage') assistantImage = element;
  }
  
  // イベントリスナーの設定
  setupEventListeners();
  
  // 初期化済みフラグをセット
  isUIInitialized = true;
}

// イベントリスナーの設定を分離
function setupEventListeners() {
  // ガード処理 - すでにリスナーが設定されているかをチェック
  if (window._eventListenersInitialized) {
    console.log('🔄 イベントリスナーはすでに設定済みです');
    return;
  }

  // pawButton
  const pawBtn = document.getElementById('paw-button') || pawButton;
  if (pawBtn) {
    console.log('🐾 pawButtonにイベントリスナーを設定します');
    setupPawButtonEvents(pawBtn);
  } else {
    console.log('ℹ️ pawButtonが見つかりません。UI初期化後に再試行します');
  }
  
  // quitButton
  const quitBtn = document.getElementById('quit-button') || quitButton;
  if (quitBtn) {
    console.log('🚪 quitButtonにイベントリスナーを設定します');
    setupQuitButtonEvents(quitBtn);
  } else {
    console.log('ℹ️ quitButtonが見つかりません。UI初期化後に再試行します');
  }
  
  // 立ち絵と吹き出しのイベント設定
  const imgElement = document.getElementById('assistantImage') || assistantImage;
  if (imgElement instanceof HTMLElement) {
    console.log('🖼️ assistantImageにイベントリスナーを設定します');
    // CSS -webkit-app-regionを使用してドラッグ可能にする
    imgElement.style.webkitAppRegion = 'drag';
    
    imgElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      console.log('🖼️ 立ち絵が右クリックされました - 右クリックメニューを無効化');
    });
  } else {
    console.log('ℹ️ assistantImage要素が見つかりません。UI初期化後に再試行します');
  }
  
  // 吹き出し
  const bubble = document.getElementById('speechBubble') || speechBubble;
  if (bubble instanceof HTMLElement) {
    console.log('💬 speechBubbleにイベントリスナーを設定します');
    // CSS -webkit-app-regionを使用してドラッグ可能にする
    bubble.style.webkitAppRegion = 'drag';
    
    bubble.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      console.log('💬 吹き出しが右クリックされました - 右クリックメニューを無効化');
    });
  } else {
    console.log('ℹ️ speechBubble要素が見つかりません。UI初期化後に再試行します');
  }

  // 設定済みフラグを設定
  window._eventListenersInitialized = true;
}

// 肉球ボタンのイベント設定を分離
function setupPawButtonEvents(pawButton) {
  let lastClickTime = 0;
  const COOLDOWN_TIME = 3000;
  
  // ボタンは -webkit-app-region: no-drag に設定してクリック可能に
  pawButton.style.webkitAppRegion = 'no-drag';
  
  // 左クリックイベント
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
  
  // 右クリックイベント（設定表示）
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
      // バックエンドも含めて完全終了
      window.electron.ipcRenderer.send('quit-app-with-backend');
      
      // Windows環境ではPythonプロセスも明示的に終了
      if (navigator.platform.includes('Win')) {
        window.electron.ipcRenderer.send('kill-python-process');
      }
      
      // 遅延を入れて確実に終了するようにする
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
 * ウィンドウのドラッグハンドラ
 * 注: CSSの-webkit-app-region: dragを使用するため、
 * 実際にはElectron側で自動的に処理されます。
 * この関数は空の実装です。
 */
function directWindowDragHandler(initialEvent) {
  // CSSで-webkit-app-region: dragを使用するため実装は空
  console.log('ウィンドウドラッグ: CSS -webkit-app-region: drag を使用');
}

/**
 * 吹き出しを表示する
 * @param {string} type - 吹き出しタイプ
 * @param {string} text - 表示テキスト
 */
export function showBubble(type = 'default', text = 'こんにちは！何かお手伝いしましょうか？') {
  console.log(`🗨️ 吹き出しを表示: ${type} - "${text.substring(0, 15)}..."`);
  
  // 吹き出し要素の取得
  const bubble = document.getElementById('speechBubble') || speechBubble;
  if (!bubble) {
    console.log('💬 speechBubble要素が見つかりません。作成します。');
    createUI();
    return setTimeout(() => showBubble(type, text), 10);
  }
  
  // テキスト要素の取得
  const textElement = document.getElementById('speechText') || speechText;
  if (!textElement) {
    console.log('💬 speechText要素が見つかりません。作成します。');
    const newText = document.createElement('div');
    newText.id = 'speechText';
    newText.className = 'speech-text';
    bubble.appendChild(newText);
    speechText = newText;
  }
  
  // テキストを設定
  setText(text);
  
  // 吹き出しのスタイルを設定
  bubble.style.cssText = `
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    z-index: 2147483647 !important;
    pointer-events: auto !important;
  `;
  
  // 必要に応じてクラスを設定
  bubble.className = 'speech-bubble';
  bubble.classList.add('show');
  
  if (type === 'warning') {
    bubble.classList.add('warning');
  } else if (type === 'error') {
    bubble.classList.add('error');
  } else if (type === 'success') {
    bubble.classList.add('success');
  } else if (type === 'zombie_warning') {
    bubble.classList.add('zombie-warning');
  }
  
  // 強制的に再描画を促す
  void bubble.offsetWidth;
}

/**
 * 吹き出しにテキストを設定
 * @param {string} text - 表示テキスト
 */
function setText(text) {
  if (!text) {
    console.error('setText: テキストが空です');
    return;
  }
  
  // テキスト要素の取得
  const textElement = document.getElementById('speechText') || speechText;
  if (!textElement) {
    console.error('speechText要素が見つかりません');
    return;
  }
  
  // テキストを設定（安全のために複数の方法で設定）
  textElement.textContent = text;
  textElement.innerText = text;
  textElement.dataset.originalText = text;
  
  // 強制的に再描画を促す
  void textElement.offsetHeight;
}

/**
 * 吹き出しを非表示にする
 */
export function hideSpeechBubble() {
  const bubble = document.getElementById('speechBubble') || speechBubble;
  if (bubble) {
    bubble.style.display = 'none';
    bubble.classList.remove('show');
    bubble.classList.add('hide');
  }
}

/**
 * UI要素を作成
 */
export function createUI() {
  console.log('🎨 UI要素を作成します');
  
  // 既に要素が存在する場合は作成しない
  if (document.getElementById('assistant-container')) {
    console.log('既にUIコンテナが存在します。スキップします。');
    return;
  }
  
  // メインコンテナの作成
  const container = document.createElement('div');
  container.id = 'assistant-container';
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
  assistantImage.style.webkitAppRegion = 'drag'; // ドラッグ可能に設定
  
  // 吹き出しの作成
  const speechBubble = document.createElement('div');
  speechBubble.id = 'speechBubble';
  speechBubble.className = 'speech-bubble';
  speechBubble.style.position = 'absolute';
  speechBubble.style.top = '-80px';
  speechBubble.style.left = '0';
  speechBubble.style.width = '200px';
  speechBubble.style.maxWidth = '300px';
  speechBubble.style.padding = '10px 15px';
  speechBubble.style.background = 'rgba(255, 255, 255, 0.9)';
  speechBubble.style.borderRadius = '20px';
  speechBubble.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
  speechBubble.style.zIndex = '3';
  speechBubble.style.display = 'none';
  speechBubble.style.webkitAppRegion = 'drag'; // ドラッグ可能に設定
  
  // 吹き出しテキストの作成
  const speechText = document.createElement('div');
  speechText.id = 'speechText';
  speechText.className = 'speech-text';
  speechText.style.fontSize = '14px';
  speechText.style.color = '#333';
  speechText.style.lineHeight = '1.4';
  speechText.textContent = 'こんにちは！何かお手伝いしましょうか？';
  
  // 吹き出し要素を組み立て
  speechBubble.appendChild(speechText);
  
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
  pawButton.style.webkitAppRegion = 'no-drag'; // クリック可能に設定
  
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
  quitButton.style.top = '5px';
  quitButton.style.right = '5px';
  quitButton.style.width = '30px';
  quitButton.style.height = '30px';
  quitButton.style.borderRadius = '50%';
  quitButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
  quitButton.style.cursor = 'pointer';
  quitButton.style.zIndex = '10';
  quitButton.style.display = 'flex';
  quitButton.style.alignItems = 'center';
  quitButton.style.justifyContent = 'center';
  quitButton.style.color = 'white';
  quitButton.style.fontSize = '20px';
  quitButton.style.transition = 'opacity 0.2s ease-in-out';
  quitButton.style.opacity = '0.8';
  quitButton.textContent = '×';
  quitButton.style.webkitAppRegion = 'no-drag'; // クリック可能に設定
  
  // ホバーエフェクト
  quitButton.addEventListener('mouseover', () => {
    quitButton.style.opacity = '1';
  });
  
  quitButton.addEventListener('mouseout', () => {
    quitButton.style.opacity = '0.8';
  });
  
  // 要素をコンテナに追加
  container.appendChild(assistantImage);
  container.appendChild(speechBubble);
  container.appendChild(pawButton);
  container.appendChild(quitButton);
  
  // コンテナをドキュメントに追加
  document.body.appendChild(container);
  
  // グローバル変数に要素を割り当て（参照をセット）
  window.pawButton = pawButton;
  window.quitButton = quitButton;
  window.speechBubble = speechBubble;
  window.speechText = speechText;
  window.assistantImage = assistantImage;

  // モジュール内グローバル変数にも割り当て
  globalThis.pawButton = pawButton;
  globalThis.quitButton = quitButton;
  globalThis.speechBubble = speechBubble;
  globalThis.speechText = speechText;
  globalThis.assistantImage = assistantImage;

  // イベントリスナーの設定（DOM要素を直接渡す）
  setTimeout(() => {
    console.log('🔄 イベントリスナーを設定します');
    // DOMツリーに追加されたことを確認した上で設定
    setupEventListeners();
  }, 50);

  console.log('✨ UI要素の作成が完了しました');
}

// エクスポート
export {
  createTestSettingsUI,
  hideBubble
}; 

// DOMの読み込み完了後にUIを初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌟 DOMContentLoaded: assistantUI初期化を開始します');
  
  // すでに初期化済みかどうかをフラグで確認
  if (window._assistantUIInitialized) {
    console.log('🔄 UI要素はすでに初期化済みです。再初期化をスキップします。');
    return;
  }
  
  // 既存のUI要素の初期化
  initUIElements();
  
  // すでにDOMに存在する要素を確認
  if (!document.getElementById('assistantImage')) {
    console.log('🎨 UIを新規作成します');
    createUI();
  } else {
    console.log('♻️ 既存のUI要素を再利用します');
  }
  
  // 初期化済みフラグを設定
  window._assistantUIInitialized = true;
  
  console.log('🌸 assistantUI初期化完了');
}); 