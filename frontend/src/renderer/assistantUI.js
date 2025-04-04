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
    if (key === 'pawButton') pawButton = element;
    if (key === 'quitButton') quitButton = element;
    if (key === 'speechBubble') speechBubble = element;
    if (key === 'speechText') speechText = element;
    if (key === 'assistantImage') assistantImage = element;
  }
  
  // イベントリスナーの設定
  setupEventListeners();
}

// イベントリスナーの設定を分離
function setupEventListeners() {
  // pawButton
  const pawBtn = document.getElementById('paw-button') || pawButton;
  if (pawBtn) {
    console.log('🐾 pawButtonにイベントリスナーを設定します');
    setupPawButtonEvents(pawBtn);
  } else {
    console.warn('⚠️ pawButtonが見つかりません');
  }
  
  // quitButton
  const quitBtn = document.getElementById('quit-button') || quitButton;
  if (quitBtn) {
    console.log('🚪 quitButtonにイベントリスナーを設定します');
    setupQuitButtonEvents(quitBtn);
  } else {
    console.warn('⚠️ quitButtonが見つかりません');
  }
  
  // 立ち絵と吹き出しのイベント設定
  const imgElement = document.getElementById('assistantImage') || assistantImage;
  if (imgElement instanceof HTMLElement) {
    console.log('🖼️ assistantImageにイベントリスナーを設定します');
    imgElement.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      console.log('🖼️ 立ち絵が右クリックされました - 右クリックメニューを無効化');
    });
  } else {
    console.warn('⚠️ assistantImage要素が見つからないか、HTML要素ではありません');
  }
  
  // 吹き出し
  const bubble = document.getElementById('speechBubble') || speechBubble;
  if (bubble instanceof HTMLElement) {
    console.log('💬 speechBubbleにイベントリスナーを設定します');
    bubble.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      console.log('💬 吹き出しが右クリックされました - 右クリックメニューを無効化');
    });
  } else {
    console.warn('⚠️ speechBubble要素が見つからないか、HTML要素ではありません');
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
  
  // 吹き出し要素を取得（グローバル変数かDOM直接取得）
  const bubble = speechBubble || document.getElementById('speechBubble');
  const textElem = speechText || document.getElementById('speechText');
  
  if (!bubble || !textElem) {
    console.error('💔 speechBubbleまたはspeechTextが見つかりません。要素作成を試みます...');
    
    // 要素が存在しない場合は動的に作成
    try {
      // 既存のコンテナを探す
      let container = document.querySelector('.assistant-container');
      
      // コンテナがなければ作成
      if (!container) {
        container = document.createElement('div');
        container.className = 'assistant-container';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.zIndex = '1000';
        document.body.appendChild(container);
      }
      
      // 吹き出しが見つからなければ作成
      if (!bubble) {
        const newBubble = document.createElement('div');
        newBubble.id = 'speechBubble';
        newBubble.className = 'speech-bubble';
        newBubble.style.display = 'block';
        newBubble.style.position = 'absolute';
        newBubble.style.top = '-80px';
        newBubble.style.background = 'rgba(255, 255, 255, 0.9)';
        newBubble.style.padding = '10px';
        newBubble.style.borderRadius = '15px';
        newBubble.style.zIndex = '3';
        container.appendChild(newBubble);
        
        // グローバル変数を更新
        speechBubble = newBubble;
      }
      
      // テキスト要素が見つからなければ作成
      if (!textElem) {
        const newTextElem = document.createElement('div');
        newTextElem.id = 'speechText';
        newTextElem.className = 'speech-text';
        newTextElem.style.fontSize = '14px';
        newTextElem.style.color = '#333';
        
        // 吹き出しに追加
        (speechBubble || document.getElementById('speechBubble')).appendChild(newTextElem);
        
        // グローバル変数を更新
        speechText = newTextElem;
      }
      
      console.log('✅ 不足していた吹き出し要素の作成が完了しました');
      
      // 再帰的に呼び出し（ただ一度だけ）
      return showBubble(type, text);
    } catch (error) {
      console.error('💔 吹き出し要素の動的作成に失敗しました:', error);
      return;
    }
  }
  
  // 要素のスタイル情報をログ出力
  console.log('🎨 speechBubbleの現在のスタイル:', {
    display: bubble.style.display,
    className: bubble.className
  });
  
  // テキスト設定
  if (type === 'default' && (!text || text === 'default')) {
    text = 'こんにちは！何かお手伝いしましょうか？';
  }
  
  // テキストを設定
  textElem.textContent = text;
  
  // 吹き出しを表示
  bubble.style.display = 'block';
  
  // 表示状態をログ出力
  console.log('✅ 吹き出しを表示しました', { 
    text: textElem.textContent,
    display: bubble.style.display 
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
  // thisではなくモジュールスコープの変数に直接割り当てる
  pawButton = pawButton;
  quitButton = quitButton;
  speechBubble = speechBubble;
  speechText = speechText;
  assistantImage = assistantImage;

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
  
  // 既存のUI要素の初期化
  initUIElements();
  
  // すでにDOMに存在する要素を確認
  if (!document.getElementById('assistantImage')) {
    console.log('🎨 UIを新規作成します');
    createUI();
  } else {
    console.log('♻️ 既存のUI要素を再利用します');
  }
  
  console.log('🌸 assistantUI初期化完了');
}); 