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
    // errorBubble と errorText は削除（不要なため生成しない）
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
    // 独立したUIではなく吹き出し内に設定メニューを表示
    showSettingsInBubble();
    
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

// 吹き出し内に設定UIを表示する関数
async function showSettingsInBubble() {
  // 吹き出し要素の取得
  const bubble = document.getElementById('speechBubble') || speechBubble;
  if (!bubble) {
    console.error('吹き出し要素が見つかりません');
    return;
  }
  
  // 吹き出しテキスト要素の取得
  const textElement = document.getElementById('speechText') || speechText;
  if (!textElement) {
    console.error('テキスト要素が見つかりません');
    return;
  }
  
  console.log('🔧 吹き出し内に設定UIを表示します');
  
  // 設定データを取得（APIクライアントが利用可能であれば使用）
  let settings = {};
  
  try {
    if (window.settingsApi && typeof window.settingsApi.getSettings === 'function') {
      const response = await window.settingsApi.getSettings();
      settings = response.settings || {};
    }
  } catch (error) {
    console.warn('設定データの取得に失敗しました:', error);
    // デフォルト設定を使用
    settings = {
      voice: {
        pitch: 1.0,
        speed: 1.0,
        enabled: true
      },
      ui: {
        opacity: 0.9,
        size: 100
      }
    };
  }
  
  // 吹き出しを表示（非表示の場合）
  bubble.style.display = 'flex';
  bubble.style.visibility = 'visible';
  bubble.style.opacity = '1';
  bubble.classList.add('show');
  
  // 設定UIのHTMLを生成
  const settingsHTML = `
    <div class="settings-container">
      <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; color: #555;">⚙️ 設定メニュー</h3>
      
      <div class="settings-section">
        <h4 style="margin: 8px 0; font-size: 13px; color: #666;">🎤 音声設定</h4>
        
        <div class="settings-item" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #555;">話速</label>
          <div style="display: flex; align-items: center;">
            <input type="range" id="voice-speed" min="0.5" max="2.0" step="0.1" value="${settings.voice?.speed || 1.0}" 
                  style="width: 100px; height: 6px;">
            <span id="speed-value" style="margin-left: 8px; font-size: 12px; min-width: 24px;">${settings.voice?.speed || 1.0}</span>
          </div>
        </div>
        
        <div class="settings-item" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #555;">声の高さ</label>
          <div style="display: flex; align-items: center;">
            <input type="range" id="voice-pitch" min="0.5" max="2.0" step="0.1" value="${settings.voice?.pitch || 1.0}" 
                  style="width: 100px; height: 6px;">
            <span id="pitch-value" style="margin-left: 8px; font-size: 12px; min-width: 24px;">${settings.voice?.pitch || 1.0}</span>
          </div>
        </div>
        
        <div class="settings-item" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #555;">声を有効</label>
          <label class="switch" style="position: relative; display: inline-block; width: 36px; height: 20px;">
            <input type="checkbox" id="voice-enabled" ${settings.voice?.enabled ? 'checked' : ''}>
            <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; border-radius: 10px; transition: .3s;"></span>
          </label>
        </div>
      </div>
      
      <div class="settings-section">
        <h4 style="margin: 8px 0; font-size: 13px; color: #666;">🎨 見た目設定</h4>
        
        <div class="settings-item" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #555;">透明度</label>
          <div style="display: flex; align-items: center;">
            <input type="range" id="ui-opacity" min="0.1" max="1.0" step="0.1" value="${settings.ui?.opacity || 0.9}" 
                  style="width: 100px; height: 6px;">
            <span id="opacity-value" style="margin-left: 8px; font-size: 12px; min-width: 24px;">${settings.ui?.opacity || 0.9}</span>
          </div>
        </div>
        
        <div class="settings-item" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 12px; color: #555;">サイズ</label>
          <div style="display: flex; align-items: center;">
            <input type="range" id="ui-size" min="50" max="150" step="10" value="${settings.ui?.size || 100}" 
                  style="width: 100px; height: 6px;">
            <span id="size-value" style="margin-left: 8px; font-size: 12px; min-width: 24px;">${settings.ui?.size || 100}%</span>
          </div>
        </div>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-top: 12px;">
        <button id="settings-close" style="padding: 4px 10px; font-size: 12px; border: none; background: #eee; border-radius: 4px; cursor: pointer;">
          閉じる
        </button>
        <button id="settings-save" style="padding: 4px 10px; font-size: 12px; border: none; background: #4caf50; color: white; border-radius: 4px; cursor: pointer;">
          保存
        </button>
      </div>
    </div>
  `;
  
  // 吹き出しにHTMLを設定
  textElement.innerHTML = settingsHTML;
  
  // イベントリスナーを設定
  setTimeout(() => {
    // スライダーの変更を監視して値を表示
    const speedSlider = document.getElementById('voice-speed');
    const speedValue = document.getElementById('speed-value');
    if (speedSlider && speedValue) {
      speedSlider.addEventListener('input', () => {
        speedValue.textContent = speedSlider.value;
      });
    }
    
    const pitchSlider = document.getElementById('voice-pitch');
    const pitchValue = document.getElementById('pitch-value');
    if (pitchSlider && pitchValue) {
      pitchSlider.addEventListener('input', () => {
        pitchValue.textContent = pitchSlider.value;
      });
    }
    
    const opacitySlider = document.getElementById('ui-opacity');
    const opacityValue = document.getElementById('opacity-value');
    if (opacitySlider && opacityValue) {
      opacitySlider.addEventListener('input', () => {
        opacityValue.textContent = opacitySlider.value;
      });
    }
    
    const sizeSlider = document.getElementById('ui-size');
    const sizeValue = document.getElementById('size-value');
    if (sizeSlider && sizeValue) {
      sizeSlider.addEventListener('input', () => {
        sizeValue.textContent = `${sizeSlider.value}%`;
      });
    }
    
    // 閉じるボタン
    const closeButton = document.getElementById('settings-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        hideBubble();
      });
    }
    
    // 保存ボタン
    const saveButton = document.getElementById('settings-save');
    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        try {
          // 設定値を取得
          const newSettings = {
            voice: {
              speed: parseFloat(speedSlider?.value || settings.voice?.speed || 1.0),
              pitch: parseFloat(pitchSlider?.value || settings.voice?.pitch || 1.0),
              enabled: document.getElementById('voice-enabled')?.checked ?? settings.voice?.enabled ?? true
            },
            ui: {
              opacity: parseFloat(opacitySlider?.value || settings.ui?.opacity || 0.9),
              size: parseInt(sizeSlider?.value || settings.ui?.size || 100)
            }
          };
          
          console.log('新しい設定を保存します:', newSettings);
          
          // 設定を保存（APIクライアントが利用可能であれば）
          if (window.settingsApi && typeof window.settingsApi.saveSettings === 'function') {
            await window.settingsApi.saveSettings(newSettings);
          }
          
          // SpeechManagerに設定を適用
          if (window.speechManager && typeof window.speechManager.setConfig === 'function') {
            window.speechManager.setConfig(newSettings);
          }
          
          // UIに透明度とサイズを適用
          const assistantImg = document.getElementById('assistantImage');
          if (assistantImg) {
            assistantImg.style.opacity = newSettings.ui.opacity;
            assistantImg.style.transform = `scale(${newSettings.ui.size / 100})`;
          }
          
          // 成功メッセージを表示
          showBubble('success', '設定を保存しました ✨');
        } catch (error) {
          console.error('設定の保存に失敗しました:', error);
          showBubble('error', '設定の保存に失敗しました');
        }
      });
    }
  }, 50);
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
  
  // 肉球ボタンのスタイル強化
  pawButton.style.backgroundImage = 'radial-gradient(circle, #ffb6c1 0%, #ff69b4 100%)';
  pawButton.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
  pawButton.style.userSelect = 'none';
  
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