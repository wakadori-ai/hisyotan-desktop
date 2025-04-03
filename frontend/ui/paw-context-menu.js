/**
 * paw-context-menu.js
 * 肉球UI (paw.html) 用の右クリックメニュー処理
 * Viteパスエイリアスに依存しない独立したスクリプト
 */

// 初期化時にコンソールログ
console.log('🐾 右クリックメニュー機能を初期化します');

/**
 * 秘書たんUIの吹き出しを非表示にする
 */
function hideBubble() {
  const speechBubble = document.getElementById('speechBubble');
  const secretaryTan = document.getElementById('assistantImage');
  
  if (speechBubble) {
    speechBubble.classList.remove('active');
  }
  
  if (secretaryTan) {
    secretaryTan.classList.remove('active');
    // アニメーション終了後に非表示
    setTimeout(() => {
      secretaryTan.style.opacity = '0';
    }, 300);
  }
}

/**
 * テスト用設定UI - speechManagerが利用できない場合のフォールバック
 */
function createTestSettingsUI() {
  const speechBubble = document.getElementById('speechBubble');
  const speechText = document.getElementById('speechText');
  
  if (!speechBubble || !speechText) {
    console.error('吹き出し要素が見つかりません');
    return;
  }
  
  // テキストを設定
  speechText.textContent = '「今夜はホード夜モードにする…？」';
  
  // 吹き出しの中身をクリア
  const existingSettingUI = speechBubble.querySelector('.setting-ui');
  if (existingSettingUI) {
    existingSettingUI.remove();
  }
  
  // 設定UI要素を作成
  const settingUI = document.createElement('div');
  settingUI.className = 'setting-ui';
  settingUI.style.cssText = `
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px;
    background: rgba(255, 240, 245, 0.5);
    border-radius: 8px;
  `;
  
  // ラベル要素
  const label = document.createElement('span');
  label.textContent = 'ホード夜モード';
  label.style.cssText = `
    flex-grow: 1;
    font-size: 14px;
  `;
  
  // トグルボタン
  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = 'OFF';
  toggleBtn.dataset.state = 'false';
  toggleBtn.style.cssText = `
    background: #ddd;
    border: none;
    border-radius: 12px;
    padding: 2px 10px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.3s;
  `;
  
  // クリックイベント
  toggleBtn.addEventListener('click', function() {
    const currentState = toggleBtn.dataset.state === 'true';
    const newState = !currentState;
    
    // 表示を更新
    toggleBtn.dataset.state = newState.toString();
    toggleBtn.textContent = newState ? 'ON' : 'OFF';
    toggleBtn.style.background = newState ? '#ffaacc' : '#ddd';
    
    console.log(`設定が変更されました: ${newState}`);
    
    // 変更後のフィードバック
    setTimeout(() => {
      // テキストを変更
      const feedbackMessage = newState 
        ? '「ホード夜モードをオンにしたよ。怖いけど一緒に頑張ろうね…」' 
        : '「ホード夜モードをオフにしたよ。ほっとした～」';
      
      speechText.textContent = feedbackMessage;
      
      // 設定UIを削除
      settingUI.remove();
      
      // 5秒後に吹き出しを閉じる
      setTimeout(() => {
        hideBubble();
      }, 5000);
    }, 500);
  });
  
  // 要素を組み立て
  settingUI.appendChild(label);
  settingUI.appendChild(toggleBtn);
  
  // 吹き出しに追加
  speechBubble.appendChild(settingUI);
  
  // 吹き出しを表示
  speechBubble.classList.add('active');
  
  // 秘書たん画像を表示
  const secretaryTan = document.getElementById('assistantImage');
  if (secretaryTan) {
    const emotionType = 'gentle';
    const imagePath = `/assets/images/secretary_${emotionType}.png`;
    
    // Electron API が利用可能な場合は画像パスを解決
    if (window.electronAPI && window.electronAPI.resolveAssetPath) {
      window.electronAPI.resolveAssetPath(`assets/images/${emotionType}.png`)
        .then(resolvedPath => {
          if (resolvedPath) {
            secretaryTan.src = resolvedPath;
          }
        })
        .catch(error => {
          console.error('画像パス解決エラー:', error);
        });
    } else {
      secretaryTan.src = imagePath;
    }
    
    secretaryTan.style.opacity = '1';
    secretaryTan.classList.add('active');
  }
}

/**
 * 右クリックイベントハンドラを設定
 */
function setupContextMenuEvents() {
  // 右クリック対象要素
  const pawWrapper = document.querySelector('.paw-button-wrapper');
  const assistantImage = document.getElementById('assistantImage');
  
  // 対象要素に右クリックイベントを設定
  [pawWrapper, assistantImage].forEach(element => {
    if (element) {
      element.addEventListener('contextmenu', handleRightClick);
      console.log(`✅ 右クリックイベントを設定: ${element.id || element.className}`);
    }
  });
  
  // 全体にも右クリックイベントを設定（バブリングされたイベントをキャッチ）
  document.addEventListener('contextmenu', (event) => {
    // 関連要素からのイベントかチェック
    const isFromAssistant = event.composedPath().some(el => {
      if (el instanceof Element) {
        return el.id === 'assistantImage' || 
               el.classList?.contains('paw-button-wrapper');
      }
      return false;
    });
    
    // 秘書たん関連要素からのイベントの場合
    if (isFromAssistant) {
      handleRightClick(event);
    }
  });
}

/**
 * 右クリックイベントハンドラ
 * @param {MouseEvent} event - 右クリックイベント
 */
function handleRightClick(event) {
  // デフォルトのコンテキストメニューを抑制
  event.preventDefault();
  event.stopPropagation();
  
  console.log('🖱️ 右クリックイベント検出: 設定UI表示');
  
  // 1. Electron IPCを経由してmainプロセスからspeechManagerを呼び出す方法
  if (window.electronAPI && window.electronAPI.showSettingsUI) {
    console.log('Electron IPC経由で設定UIを表示します');
    window.electronAPI.showSettingsUI();
    return;
  }
  
  // 2. window.speechManagerが利用可能な場合（renderer.js読み込み済みの場合）
  if (window.speechManager && window.speechManager.showHordeModeToggle) {
    console.log('speechManager経由で設定UIを表示します');
    const currentState = window.speechManager.getHordeModeState && window.speechManager.getHordeModeState() || false;
    window.speechManager.showHordeModeToggle(currentState);
    return;
  }
  
  // 3. フォールバック：独自の設定UI表示
  console.log('フォールバック: 独自の設定UIを表示します');
  createTestSettingsUI();
}

// DOMコンテンツロード時に初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('🐾 肉球UI用コンテキストメニュー機能を初期化します');
  setupContextMenuEvents();
});

// Electron環境で実行されているかを判定
const isElectronContext = window && window.electronAPI;
if (!isElectronContext) {
  console.log('⚠️ Electron APIが検出されませんでした。一部機能が制限されます。');
} 