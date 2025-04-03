/**
 * paw-context-menu.js
 * 肉球UI (paw.html) 用の右クリックメニュー処理
 * Viteパスエイリアスに依存しない独立したスクリプト
 */

// 初期化時にコンソールログ
console.log('🐾 右クリックメニュー機能を初期化します');

// APIクライアントを動的にインポート
let apiClient = null;

// このスクリプトがロードされたら、APIクライアントを動的にインポート
(async function() {
  try {
    const module = await import('./apiClient.js');
    apiClient = module.default;
    console.log('✅ APIクライアントをロードしました');
  } catch (error) {
    console.error('❌ APIクライアントのロードに失敗しました:', error);
  }
})();

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
 * 設定項目のデータを取得する
 * @returns {Promise<Object>} 設定データ
 */
async function getSettingsData() {
  // APIクライアントが利用可能な場合、バックエンドから設定を取得
  if (apiClient) {
    try {
      console.log('🔍 全設定を取得します');
      const result = await apiClient.getAllSettings();
      console.log('✅ 設定を取得しました:', result);
      
      if (result && result.success && result.data && result.data.settings) {
        return result.data.settings;
      }
    } catch (error) {
      console.error('❌ 設定取得エラー:', error);
    }
  }
  
  // APIから取得できない場合はデフォルト値を返す
  return {
    zombieDetection: true,
    voiceNotification: true,
    multipleDetection: true
  };
}

/**
 * テスト用設定UI - speechManagerが利用できない場合のフォールバック
 */
async function createTestSettingsUI() {
  const speechBubble = document.getElementById('speechBubble');
  const speechText = document.getElementById('speechText');
  
  if (!speechBubble || !speechText) {
    console.error('吹き出し要素が見つかりません');
    return;
  }
  
  // 設定データを取得
  const settings = await getSettingsData();
  
  // テキストを設定
  speechText.textContent = '「どの機能を変更する？」';
  
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
    flex-direction: column;
    gap: 8px;
    padding: 5px;
    background: rgba(255, 240, 245, 0.5);
    border-radius: 8px;
  `;
  
  // 設定項目を作成
  const createSettingItem = (key, label, value) => {
    const itemContainer = document.createElement('div');
    itemContainer.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px;
    `;
    
    // ラベル要素
    const labelElem = document.createElement('span');
    labelElem.textContent = label;
    labelElem.style.cssText = `
      flex-grow: 1;
      font-size: 14px;
    `;
    
    // トグルボタン
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = value ? 'ON' : 'OFF';
    toggleBtn.dataset.state = value.toString();
    toggleBtn.style.cssText = `
      background: ${value ? '#ffaacc' : '#ddd'};
      border: none;
      border-radius: 12px;
      padding: 2px 10px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.3s;
      pointer-events: auto !important;
      user-select: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    `;
    
    // クリックイベント
    toggleBtn.addEventListener('click', async function() {
      console.log('🖱️ ボタンがクリックされました');
      const currentState = toggleBtn.dataset.state === 'true';
      const newState = !currentState;
      
      // 表示を更新
      toggleBtn.dataset.state = newState.toString();
      toggleBtn.textContent = newState ? 'ON' : 'OFF';
      toggleBtn.style.background = newState ? '#ffaacc' : '#ddd';
      
      console.log(`設定が変更されました: ${key}=${newState}`);
      
      // APIを呼び出して設定を保存
      if (apiClient) {
        try {
          const result = await apiClient.updateSetting(key, newState);
          console.log('✅ 設定更新成功:', result);
          
          // フィードバックメッセージを表示
          speechText.textContent = newState 
            ? `「${label}をオンにしたよ。よろしくね。」` 
            : `「${label}をオフにしたよ。また必要になったら教えてね。」`;
        } catch (error) {
          console.error('❌ 設定更新エラー:', error);
          speechText.textContent = `「ごめんなさい、設定の更新に失敗しました。」`;
        }
      } else {
        // テキストを変更（APIクライアントが利用できない場合）
        speechText.textContent = newState 
          ? `「${label}をオンにしたよ。よろしくね。」` 
          : `「${label}をオフにしたよ。また必要になったら教えてね。」`;
      }
    });
    
    itemContainer.appendChild(labelElem);
    itemContainer.appendChild(toggleBtn);
    
    return itemContainer;
  };
  
  // 設定項目を追加
  settingUI.appendChild(createSettingItem('zombieDetection', 'ゾンビ検出', settings.zombieDetection));
  settingUI.appendChild(createSettingItem('voiceNotification', '音声通知', settings.voiceNotification));
  settingUI.appendChild(createSettingItem('multipleDetection', '複数ゾンビ検出', settings.multipleDetection));
  
  // 閉じるボタン
  const closeButton = document.createElement('button');
  closeButton.textContent = '閉じる';
  closeButton.style.cssText = `
    margin-top: 5px;
    background: #f0f0f0;
    border: none;
    border-radius: 12px;
    padding: 4px 12px;
    font-size: 12px;
    cursor: pointer;
    align-self: center;
  `;
  closeButton.addEventListener('click', () => {
    hideBubble();
  });
  
  settingUI.appendChild(closeButton);
  
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
  if (window.speechManager) {
    if (window.speechManager.speakWithObject) {
      console.log('speechManager.speakWithObjectを直接使用して設定UIを表示します');
      
      // 現在の状態を取得（利用可能な場合）
      const currentState = window.speechManager.getHordeModeState && window.speechManager.getHordeModeState() || false;
      
      // 設定UI表示用のペイロードを作成
      const settingSpeech = {
        id: "setting_horde_mode",
        type: "setting",
        text: "今夜はホード夜モードにする…？",
        emotion: "gentle",
        uiPayload: {
          type: "toggle",
          label: "ホード夜モード",
          value: currentState,
          onChange: (newValue) => {
            console.log(`ホード夜モードが${newValue ? 'オン' : 'オフ'}に変更されました`);
            
            // 状態を保存（可能な場合）
            if (window.speechManager.setHordeModeState) {
              window.speechManager.setHordeModeState(newValue);
            }
            
            // 変更後のフィードバックセリフ
            const feedbackMessage = newValue 
              ? "ホード夜モードをオンにしたよ。怖いけど一緒に頑張ろうね…" 
              : "ホード夜モードをオフにしたよ。ほっとした～";
            
            const feedbackEmotion = newValue ? "serious" : "relieved";
            
            // 少し遅延させてフィードバックを表示
            setTimeout(() => {
              if (window.speechManager.speak) {
                window.speechManager.speak(
                  feedbackMessage,
                  feedbackEmotion,
                  5000,
                  null,
                  "horde_mode_feedback"
                );
              }
            }, 500);
          }
        }
      };
      
      window.speechManager.speakWithObject(settingSpeech);
      return;
    }
  }
  
  // 3. speechManagerProxyが利用可能な場合（preloadスクリプト経由で公開されている場合）
  if (window.speechManagerProxy && window.speechManagerProxy.speakWithObject) {
    console.log('speechManagerProxyを使用して設定UIを表示します');
    
    // 現在の状態を取得
    window.speechManagerProxy.getHordeModeState()
      .then(currentState => {
        // 設定UI表示用のペイロードを作成
        const settingSpeech = {
          id: "setting_horde_mode",
          type: "setting",
          text: "今夜はホード夜モードにする…？",
          emotion: "gentle",
          uiPayload: {
            type: "toggle",
            label: "ホード夜モード",
            value: currentState,
            onChange: (newValue) => {
              console.log(`ホード夜モードが${newValue ? 'オン' : 'オフ'}に変更されました`);
              
              // 状態を保存
              window.speechManagerProxy.setHordeModeState(newValue);
              
              // 変更後のフィードバックセリフ
              const feedbackMessage = newValue 
                ? "ホード夜モードをオンにしたよ。怖いけど一緒に頑張ろうね…" 
                : "ホード夜モードをオフにしたよ。ほっとした～";
              
              const feedbackEmotion = newValue ? "serious" : "relieved";
              
              // 少し遅延させてフィードバックを表示
              setTimeout(() => {
                window.speechManagerProxy.speak(
                  feedbackMessage,
                  feedbackEmotion,
                  5000,
                  null,
                  "horde_mode_feedback"
                );
              }, 500);
            }
          }
        };
        
        // 設定UIを表示
        window.speechManagerProxy.speakWithObject(settingSpeech);
      })
      .catch(error => {
        console.error('状態取得エラー:', error);
        // エラーの場合はテスト用UIを表示
        createTestSettingsUI();
      });
    
    return;
  }
  
  // 4. フォールバック：テスト用設定UIを表示
  console.log('speechManagerが利用できないため、テスト用設定UIを表示します');
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