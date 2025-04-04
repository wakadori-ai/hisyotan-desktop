/**
 * assistantUI.js
 * UI操作関連の機能を集約したヘルパーモジュール
 */

// スタイルシートをインポート
import '@ui/styles/main.css';
// CSS変数のある変数ファイルも直接インポート
import '@ui/styles/base/_variables.css';
// 立ち絵・吹き出し用コンポーネントスタイルも明示的にインポート
import '@ui/styles/components/_assistant.css';

// 不要な古い設定UI関数のインポートを削除
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
    // errorBubble関連の要素を完全に削除
    statusIndicator: { id: 'statusIndicator', type: 'div' }
    // speechSettingUI要素を削除（吹き出し内に表示するため）
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
  
  // 既存の吹き出し要素をすべて取得（重複チェック用）
  const allBubbles = document.querySelectorAll('#speechBubble');
  if (allBubbles.length > 1) {
    console.log(`⚠️ 重複する吹き出し要素が ${allBubbles.length} 個見つかりました。クリーンアップします。`);
    cleanupDuplicateElements();
  }
  
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
  } else {
    // テキスト要素内の余分な要素をクリア
    textElement.innerHTML = '';
  }
  
  // テキストを設定（複数の方法で確実に）
  setText(text);
  
  // 吹き出しのスタイルを設定
  bubble.className = 'speech-bubble';
  bubble.classList.add('show');
  bubble.classList.add('fixed-position');
  
  // タイプに応じたクラスを追加
  if (type === 'warning') {
    bubble.classList.add('warning');
  } else if (type === 'error') {
    bubble.classList.add('error');
  } else if (type === 'success') {
    bubble.classList.add('success');
  } else if (type === 'zombie_warning') {
    bubble.classList.add('zombie-warning');
  }
  
  // 吹き出しが非表示にならないように監視
  startBubbleObserver();
  
  // 強制的に再描画を促す
  void bubble.offsetWidth;
  
  // 親要素の確認と表示状態の調整
  ensureBubbleVisibility(bubble);
  
  // タイマーを使って再度表示をチェック
  setTimeout(() => {
    const computedStyle = getComputedStyle(bubble);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      console.log('⚠️ 吹き出しが再び非表示になっています。強制表示を試みます。');
      ensureBubbleVisibility(bubble);
    }
    
    // テキストが空になっている場合は再設定
    if (!textElement.textContent || textElement.textContent.trim() === '') {
      console.log('⚠️ テキストが空になっています。再設定します。');
      setText(text);
    }
  }, 100);
}

// 吹き出しの表示状態を監視する関数
let bubbleObserver = null;
function startBubbleObserver() {
  if (bubbleObserver) return; // 既に監視中なら何もしない
  
  const checkBubbleVisibility = () => {
    const bubble = document.getElementById('speechBubble') || speechBubble;
    if (!bubble) return;
    
    const computedStyle = window.getComputedStyle(bubble);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || parseFloat(computedStyle.opacity) < 0.1) {
      console.log('💬 吹き出しが非表示になっていました。表示状態を復元します。');
      bubble.style.display = 'flex';
      bubble.style.visibility = 'visible';
      bubble.style.opacity = '1';
    }
  };
  
  // 定期的に表示状態をチェック
  bubbleObserver = setInterval(checkBubbleVisibility, 500);
}

// 監視を停止する関数
function stopBubbleObserver() {
  if (bubbleObserver) {
    clearInterval(bubbleObserver);
    bubbleObserver = null;
  }
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
  
  console.log(`📝 テキストを設定: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);
  
  // テキスト要素内を空にする
  textElement.innerHTML = '';
  
  try {
    // テキストを設定
    textElement.textContent = text;
    
    // 確実に表示されるよう、中にspanを作成して設定
    const spanElement = document.createElement('span');
    spanElement.textContent = text;
    spanElement.className = 'speech-text-content';
    textElement.appendChild(spanElement);
    
    // データ属性にバックアップ
    textElement.dataset.originalText = text;
    
  } catch (error) {
    console.error('テキスト設定エラー:', error);
  }
  
  // 強制的に再描画を促す
  void textElement.offsetHeight;
  
  // 設定後の確認
  setTimeout(() => {
    if (!textElement.textContent || textElement.textContent.trim() === '') {
      console.warn('⚠️ テキスト設定後も空になっています。再試行します。');
      // 単純なテキストノードを追加
      const textNode = document.createTextNode(text);
      textElement.appendChild(textNode);
    }
  }, 50);
}

/**
 * 吹き出しを非表示にする
 * 設定UIが表示されている場合は非表示にしない
 */
export function hideSpeechBubble() {
  const bubble = document.getElementById('speechBubble') || speechBubble;
  if (!bubble) return;
  
  // 設定UIが表示されているかチェック
  const textElement = document.getElementById('speechText') || speechText;
  if (textElement && textElement.querySelector('.settings-container')) {
    console.log('🔧 設定UIが表示中のため、吹き出しを非表示にしません');
    return; // 設定UI表示中は非表示にしない
  }
  
  console.log('💬 吹き出しを非表示にします');
  
  // クラスの切り替え
  bubble.classList.remove('show');
  bubble.classList.add('hide');
  
  // 一定時間後に状態リセット
  setTimeout(() => {
    bubble.style.display = 'none';
    // 次回表示時のためにクラスをリセット
    bubble.classList.remove('hide', 'warning', 'error', 'success', 'zombie-warning');
  }, 500);
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
  
  // 立ち絵の作成
  const assistantImage = document.createElement('img');
  assistantImage.id = 'assistantImage';
  assistantImage.className = 'assistant-image active';
  assistantImage.src = '/assets/images/secretary_normal.png';
  assistantImage.alt = '秘書たん';
  assistantImage.style.width = '256px'; // 明示的なサイズ指定
  assistantImage.style.height = 'auto';
  assistantImage.style.minHeight = '250px';
  assistantImage.style.webkitAppRegion = 'drag'; // ドラッグ可能に設定
  assistantImage.style.imageRendering = 'auto'; // レンダリング設定
  assistantImage.style.objectFit = 'contain';
  assistantImage.style.display = 'block';
  assistantImage.style.visibility = 'visible';
  assistantImage.style.opacity = '1';
  
  // 吹き出しの作成
  const speechBubble = document.createElement('div');
  speechBubble.id = 'speechBubble';
  speechBubble.className = 'speech-bubble show'; // showクラスを追加
  speechBubble.style.cssText = `
    display: flex !important; 
    visibility: visible !important; 
    opacity: 1 !important;
    position: fixed !important;
    z-index: 9999 !important;
    bottom: 300px !important;
    right: 10px !important;
    width: 250px !important;
    max-width: 300px !important;
  `;
  speechBubble.style.webkitAppRegion = 'drag'; // ドラッグ可能に設定
  
  // 吹き出しテキストの作成
  const speechText = document.createElement('div');
  speechText.id = 'speechText';
  speechText.className = 'speech-text';
  speechText.textContent = 'こんにちは！何かお手伝いしましょうか？';
  
  // 吹き出し要素を組み立て
  speechBubble.appendChild(speechText);
  
  // 肉球ボタンの作成
  const pawButton = document.createElement('div');
  pawButton.id = 'paw-button';
  pawButton.className = 'paw-button';
  pawButton.textContent = '🐾';
  pawButton.style.webkitAppRegion = 'no-drag'; // クリック可能に設定（これだけはインラインで）
  
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
  quitButton.textContent = '×';
  quitButton.style.webkitAppRegion = 'no-drag'; // クリック可能に設定（これだけはインラインで）
  
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

// 立ち絵を表示する関数
export function showAssistantImage() {
  console.log('🖼️ 立ち絵を表示します');
  const imgElement = document.getElementById('assistantImage') || assistantImage;
  
  if (imgElement) {
    // 画像のソースを確認
    if (!imgElement.src || !imgElement.src.includes('secretary_')) {
      console.log('🖼️ 立ち絵のソースが設定されていません。デフォルト画像を設定します。');
      imgElement.src = '/assets/images/secretary_normal.png';
    }
    
    // サイズを明示的に設定
    imgElement.style.width = '256px';
    imgElement.style.height = 'auto';
    imgElement.style.minHeight = '250px';
    
    // 表示スタイルを設定
    imgElement.style.display = 'block';
    imgElement.style.visibility = 'visible';
    imgElement.style.opacity = '1';
    
    // レンダリングオプションを設定
    imgElement.style.imageRendering = 'auto';
    imgElement.style.objectFit = 'contain';
    
    // GPUアクセラレーションを有効化
    imgElement.style.transform = 'translateZ(0)';
    imgElement.style.backfaceVisibility = 'hidden';
    
    // アクティブクラスを追加
    imgElement.classList.add('active');
    
    // 表示位置の確認と調整
    const container = document.getElementById('assistant-container');
    if (container) {
      container.style.bottom = '0px';
      container.style.right = '0px';
    }
    
    // 画像の読み込みを監視
    imgElement.onload = () => {
      console.log('🖼️ 立ち絵画像の読み込みが完了しました。サイズ:', {
        naturalWidth: imgElement.naturalWidth,
        naturalHeight: imgElement.naturalHeight,
        displayWidth: imgElement.offsetWidth,
        displayHeight: imgElement.offsetHeight
      });
    };
    
    console.log('✅ 立ち絵を表示しました');
  } else {
    console.error('❌ 立ち絵要素が見つかりません');
  }
}

// エクスポート
export {
  hideBubble,
  showSettingsInBubble
}; 

// DOMの読み込み完了後にUIを初期化
let domInitialized = false;
document.addEventListener('DOMContentLoaded', () => {
  // 多重初期化の防止
  if (domInitialized) {
    console.log('🔄 DOMContentLoadedは既に処理済みです。処理をスキップします。');
    return;
  }
  
  // 初期化フラグを設定
  domInitialized = true;
  
  console.log('🌟 DOMContentLoaded: assistantUI初期化を開始します');
  
  // すでに初期化済みかどうかをフラグで確認
  if (window._assistantUIInitialized) {
    console.log('🔄 UI要素はすでに初期化済みです。再初期化をスキップします。');
    return;
  }
  
  // 重複要素のクリーンアップを最初に実行
  cleanupDuplicateElements();
  
  // DOM構造やCSSをチェックし、問題があれば修正
  setTimeout(() => {
    verifyAndFixUIStructure();
  }, 300);
  
  // 既存のUI要素の初期化
  initUIElements();
  
  // すでにDOMに存在する要素を確認
  if (!document.getElementById('assistantImage')) {
    console.log('🎨 UIを新規作成します');
    createUI();
  } else {
    console.log('♻️ 既存のUI要素を再利用します');
  }
  
  // 立ち絵を表示
  setTimeout(() => {
    showAssistantImage();
  }, 100);
  
  // 初期化済みフラグを設定
  window._assistantUIInitialized = true;
  
  console.log('🌸 assistantUI初期化完了');
});

/**
 * DOM構造とスタイルを確認し、問題があれば修正する
 */
function verifyAndFixUIStructure() {
  console.log('🔍 UI構造を検証・修復します');
  
  // 必要なCSSクラスが適用されているか確認
  const assistantImage = document.getElementById('assistantImage');
  if (assistantImage) {
    if (!assistantImage.classList.contains('assistant-image')) {
      console.log('⚠️ 立ち絵にassistant-imageクラスが付与されていません。追加します。');
      assistantImage.classList.add('assistant-image');
    }
    
    // スタイル適用確認
    const computedStyle = getComputedStyle(assistantImage);
    if (computedStyle.width === '0px' || computedStyle.height === '0px') {
      console.log('⚠️ 立ち絵のサイズが0pxです。修正します。');
      
      // インラインスタイルで修正
      assistantImage.style.width = '256px';
      assistantImage.style.height = 'auto';
      assistantImage.style.minHeight = '250px';
      assistantImage.style.maxHeight = '400px';
      assistantImage.style.display = 'block';
      assistantImage.style.visibility = 'visible';
      assistantImage.style.opacity = '1';
      assistantImage.style.objectFit = 'contain';
      assistantImage.style.imageRendering = 'auto';
    }
    
    // ソースパスの確認
    if (!assistantImage.src || !assistantImage.src.includes('secretary_')) {
      console.log('⚠️ 立ち絵の画像パスが不正です。修正します。');
      assistantImage.src = '/assets/images/secretary_normal.png';
    }
  }
  
  // 吹き出しの構造確認
  const speechBubble = document.getElementById('speechBubble');
  if (speechBubble) {
    if (!speechBubble.classList.contains('speech-bubble')) {
      console.log('⚠️ 吹き出しにspeech-bubbleクラスが付与されていません。追加します。');
      speechBubble.classList.add('speech-bubble');
    }
    
    // スタイル適用確認
    const computedStyle = getComputedStyle(speechBubble);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || parseFloat(computedStyle.opacity) < 0.1) {
      console.log('⚠️ 吹き出しが非表示状態です。修正します。');
      
      // インラインスタイルで修正
      speechBubble.style.cssText = `
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: fixed !important;
        z-index: 9999 !important;
        bottom: 300px !important;
        right: 10px !important;
        width: 250px !important;
        max-width: 300px !important;
      `;
    }
    
    // テキスト要素の確認
    const speechText = document.getElementById('speechText');
    if (!speechText) {
      console.log('⚠️ テキスト要素が見つかりません。作成します。');
      const newText = document.createElement('div');
      newText.id = 'speechText';
      newText.className = 'speech-text';
      newText.textContent = 'こんにちは！何かお手伝いしましょうか？';
      speechBubble.appendChild(newText);
    } else if (!speechText.textContent || speechText.textContent.trim() === '') {
      console.log('⚠️ テキスト要素が空です。テキストを設定します。');
      speechText.textContent = 'こんにちは！何かお手伝いしましょうか？';
    }
  }
  
  console.log('✅ UI構造の検証・修復が完了しました');
}

/**
 * 重複する要素を削除するクリーンアップ関数
 */
function cleanupDuplicateElements() {
  console.log('🧹 重複要素のクリーンアップを開始します');
  
  // 吹き出し要素の重複チェック
  const speechBubbles = document.querySelectorAll('#speechBubble');
  if (speechBubbles.length > 1) {
    console.log(`💬 重複する吹き出し要素が ${speechBubbles.length} 個見つかりました。古い要素を削除します。`);
    
    // 最初の要素以外を削除（インデックス1以降）
    for (let i = 1; i < speechBubbles.length; i++) {
      console.log(`🗑️ 吹き出し要素 ${i+1}/${speechBubbles.length} を削除します`);
      speechBubbles[i].remove();
    }
  }
  
  // 立ち絵要素の重複チェック
  const assistantImages = document.querySelectorAll('#assistantImage');
  if (assistantImages.length > 1) {
    console.log(`🖼️ 重複する立ち絵要素が ${assistantImages.length} 個見つかりました。古い要素を削除します。`);
    
    // 最初の要素以外を削除（インデックス1以降）
    for (let i = 1; i < assistantImages.length; i++) {
      console.log(`🗑️ 立ち絵要素 ${i+1}/${assistantImages.length} を削除します`);
      assistantImages[i].remove();
    }
  }
  
  // テキスト要素の重複チェック
  const speechTexts = document.querySelectorAll('#speechText');
  if (speechTexts.length > 1) {
    console.log(`📝 重複するテキスト要素が ${speechTexts.length} 個見つかりました。古い要素を削除します。`);
    
    // 最初の要素以外を削除（インデックス1以降）
    for (let i = 1; i < speechTexts.length; i++) {
      console.log(`🗑️ テキスト要素 ${i+1}/${speechTexts.length} を削除します`);
      speechTexts[i].remove();
    }
  }
  
  // quitボタン要素の重複チェック
  const quitButtons = document.querySelectorAll('#quit-button');
  if (quitButtons.length > 1) {
    console.log(`🚪 重複する終了ボタン要素が ${quitButtons.length} 個見つかりました。古い要素を削除します。`);
    
    // 最初の要素以外を削除（インデックス1以降）
    for (let i = 1; i < quitButtons.length; i++) {
      console.log(`🗑️ 終了ボタン要素 ${i+1}/${quitButtons.length} を削除します`);
      quitButtons[i].remove();
    }
  }
  
  // pawボタン要素の重複チェック
  const pawButtons = document.querySelectorAll('#paw-button');
  if (pawButtons.length > 1) {
    console.log(`🐾 重複する肉球ボタン要素が ${pawButtons.length} 個見つかりました。古い要素を削除します。`);
    
    // 最初の要素以外を削除（インデックス1以降）
    for (let i = 1; i < pawButtons.length; i++) {
      console.log(`🗑️ 肉球ボタン要素 ${i+1}/${pawButtons.length} を削除します`);
      pawButtons[i].remove();
    }
  }
  
  console.log('🧹 重複要素のクリーンアップが完了しました');
}

/**
 * 吹き出しの表示を確実にするためのヘルパー関数
 * @param {HTMLElement} bubble - 吹き出し要素
 */
function ensureBubbleVisibility(bubble) {
  if (!bubble) return;
  
  console.log('💬 吹き出しの表示状態を確認します');
  
  // 親要素の表示状態を確認
  const parent = bubble.parentElement;
  if (parent) {
    // 親要素が表示状態であることを確認
    if (getComputedStyle(parent).display === 'none') {
      console.log('⚠️ 親要素が非表示です。表示に設定します。');
      parent.style.display = 'block';
    }
    
    // 親要素のz-indexを確認
    const parentZIndex = parseInt(getComputedStyle(parent).zIndex);
    if (!isNaN(parentZIndex) && parentZIndex >= 9999) {
      console.log('⚠️ 親要素のz-indexが高すぎます。吹き出しのz-indexを上げます。');
      bubble.style.zIndex = (parentZIndex + 1);
    }
  }
  
  // 吹き出しの表示状態を再確認
  setTimeout(() => {
    const computedStyle = getComputedStyle(bubble);
    console.log('💬 吹き出し表示状態:', {
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      zIndex: computedStyle.zIndex,
      position: computedStyle.position
    });
    
    // 表示されていない場合は強制的に表示
    if (computedStyle.display === 'none' || 
        computedStyle.visibility === 'hidden' || 
        parseFloat(computedStyle.opacity) < 0.1) {
      console.log('⚠️ 吹き出しが表示されていません。強制的に表示します。');
      
      // 再度クラスを適用
      bubble.className = 'speech-bubble show fixed-position';
      
      // DOMツリーの最後に移動（他の要素の下に隠れる問題を解決）
      document.body.appendChild(bubble);
    }
  }, 100);
}

// UIデバッグユーティリティ
export function debugUI() {
  console.log('🔍 UIデバッグ情報を出力します');
  
  // UI要素の状態を確認
  const elements = {
    speechBubble: document.getElementById('speechBubble'),
    speechText: document.getElementById('speechText'),
    assistantImage: document.getElementById('assistantImage'),
    pawButton: document.getElementById('paw-button'),
    quitButton: document.getElementById('quit-button'),
    container: document.getElementById('assistant-container')
  };
  
  // 要素の存在をチェック
  console.log('🔍 UI要素の存在チェック:');
  for (const [name, element] of Object.entries(elements)) {
    console.log(`- ${name}: ${element ? '✅ 存在します' : '❌ 存在しません'}`);
  }
  
  // 吹き出し要素の重複チェック
  const speechBubbles = document.querySelectorAll('#speechBubble');
  console.log(`🔍 吹き出し要素の数: ${speechBubbles.length}`);
  
  // テキスト要素の重複チェック
  const speechTexts = document.querySelectorAll('#speechText');
  console.log(`🔍 テキスト要素の数: ${speechTexts.length}`);
  
  // 立ち絵要素の重複チェック
  const assistantImages = document.querySelectorAll('#assistantImage');
  console.log(`🔍 立ち絵要素の数: ${assistantImages.length}`);
  
  // 吹き出しの表示状態を確認
  if (elements.speechBubble) {
    const style = getComputedStyle(elements.speechBubble);
    console.log('🔍 吹き出し要素の表示状態:', {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      zIndex: style.zIndex,
      position: style.position,
      width: style.width,
      height: style.height
    });
    
    // テキスト内容を確認
    if (elements.speechText) {
      console.log('🔍 テキスト要素の内容:', {
        textContent: elements.speechText.textContent,
        innerHTML: elements.speechText.innerHTML,
        childNodes: elements.speechText.childNodes.length
      });
    }
  }
  
  // 立ち絵の表示状態を確認
  if (elements.assistantImage) {
    const style = getComputedStyle(elements.assistantImage);
    console.log('🔍 立ち絵要素の表示状態:', {
      src: elements.assistantImage.src,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      width: style.width,
      height: style.height,
      naturalWidth: elements.assistantImage.naturalWidth,
      naturalHeight: elements.assistantImage.naturalHeight
    });
  }
  
  return {
    elements,
    restart: function() {
      // 重複要素をクリーンアップ
      cleanupDuplicateElements();
      
      // UI要素を作成し直す
      createUI();
      
      // 立ち絵を表示
      setTimeout(() => {
        showAssistantImage();
      }, 100);
      
      return 'UIを再構築しました。問題が解決したか確認してください。';
    },
    fixBubble: function() {
      // 吹き出し修復
      if (elements.speechBubble) {
        elements.speechBubble.remove();
      }
      
      // 新しい吹き出しを作成
      const newBubble = document.createElement('div');
      newBubble.id = 'speechBubble';
      newBubble.className = 'speech-bubble show fixed-position';
      
      // テキスト要素を作成
      const newText = document.createElement('div');
      newText.id = 'speechText';
      newText.className = 'speech-text';
      newText.textContent = 'こんにちは！何かお手伝いしましょうか？';
      newBubble.appendChild(newText);
      
      // コンテナに追加
      if (elements.container) {
        elements.container.appendChild(newBubble);
      } else {
        document.body.appendChild(newBubble);
      }
      
      return '吹き出しを修復しました。表示を確認してください。';
    },
    // 設定UIを吹き出しに表示する関数をエクスポート
    showSettingsInBubble
  };
} 