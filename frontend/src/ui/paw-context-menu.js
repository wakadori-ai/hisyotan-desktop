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
    const module = await import('../core/apiClient.js');
    apiClient = module.default;
    console.log('✅ APIクライアントをロードしました');
  } catch (error) {
    console.error('❌ APIクライアントのロードに失敗しました:', error);
  }
})();

// bubbleManager.jsからhideBubbleをインポート
import { hideBubble } from './handlers/bubbleManager.js';

/**
 * 設定項目のデータを取得する
 * @returns {Promise<Object>} 設定データ
 */
async function getSettingsData() {
  // APIクライアントが利用可能な場合、バックエンドから設定を取得
  if (apiClient) {
    try {
      const settings = await apiClient.getSettings();
      return settings;
    } catch (error) {
      console.error('設定の取得に失敗しました:', error);
    }
  }
  
  // APIクライアントが利用できない場合、デフォルト設定を返す
  return {
    voice: {
      enabled: true,
      pitch: 1.0,
      speed: 1.0
    },
    emotion: {
      enabled: true,
      sensitivity: 0.7
    },
    ui: {
      bubbleOpacity: 0.9,
      showStatusIndicator: true
    }
  };
}

/**
 * テスト用の設定UIを作成する
 * @returns {Promise<HTMLElement>} 設定UI要素
 */
async function createTestSettingsUI() {
  // 設定データを取得
  const settings = await getSettingsData();
  
  // 設定UIコンテナを作成
  const settingsContainer = document.createElement('div');
  settingsContainer.className = 'paw-settings-container';
  settingsContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 255, 255, 0.9);
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    z-index: 9999;
    max-width: 400px;
    width: 90%;
  `;
  
  // 設定項目を作成
  const createSettingItem = (key, label, value) => {
    const item = document.createElement('div');
    item.className = 'paw-setting-item';
    item.style.cssText = `
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.cssText = `
      font-weight: bold;
      color: #333;
    `;
    
    let controlElement;
    
    // 値の型に応じて適切なコントロールを作成
    if (typeof value === 'boolean') {
      // トグルスイッチ
      controlElement = document.createElement('div');
      controlElement.className = 'paw-toggle';
      controlElement.style.cssText = `
        position: relative;
        width: 50px;
        height: 24px;
        background: ${value ? '#4CAF50' : '#ccc'};
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.3s;
      `;
      
      const toggleKnob = document.createElement('div');
      toggleKnob.style.cssText = `
        position: absolute;
        top: 2px;
        left: ${value ? '26px' : '2px'};
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        transition: left 0.3s;
      `;
      
      controlElement.appendChild(toggleKnob);
      
      // クリックイベント
      controlElement.addEventListener('click', () => {
        const newValue = !value;
        toggleKnob.style.left = newValue ? '26px' : '2px';
        controlElement.style.background = newValue ? '#4CAF50' : '#ccc';
        
        // 設定を更新
        updateSetting(key, newValue);
      });
      
    } else if (typeof value === 'number') {
      // スライダー
      controlElement = document.createElement('input');
      controlElement.type = 'range';
      controlElement.min = 0;
      controlElement.max = 2;
      controlElement.step = 0.1;
      controlElement.value = value;
      controlElement.style.cssText = `
        width: 150px;
        height: 20px;
      `;
      
      // 値表示
      const valueDisplay = document.createElement('span');
      valueDisplay.textContent = value.toFixed(1);
      valueDisplay.style.cssText = `
        margin-left: 10px;
        min-width: 30px;
        text-align: right;
      `;
      
      // 値変更イベント
      controlElement.addEventListener('input', () => {
        const newValue = parseFloat(controlElement.value);
        valueDisplay.textContent = newValue.toFixed(1);
        
        // 設定を更新
        updateSetting(key, newValue);
      });
      
      // スライダーと値表示をコンテナに追加
      const sliderContainer = document.createElement('div');
      sliderContainer.style.cssText = `
        display: flex;
        align-items: center;
      `;
      sliderContainer.appendChild(controlElement);
      sliderContainer.appendChild(valueDisplay);
      controlElement = sliderContainer;
      
    } else {
      // その他の型（文字列など）は表示のみ
      controlElement = document.createElement('span');
      controlElement.textContent = value;
      controlElement.style.cssText = `
        color: #666;
      `;
    }
    
    item.appendChild(labelElement);
    item.appendChild(controlElement);
    
    return item;
  };
  
  // 設定項目を追加
  const addSettingSection = (title, settings) => {
    const section = document.createElement('div');
    section.className = 'paw-setting-section';
    section.style.cssText = `
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #eee;
    `;
    
    const sectionTitle = document.createElement('h3');
    sectionTitle.textContent = title;
    sectionTitle.style.cssText = `
      margin-bottom: 15px;
      color: #333;
      font-size: 16px;
    `;
    
    section.appendChild(sectionTitle);
    
    // 設定項目を追加
    for (const [key, value] of Object.entries(settings)) {
      const fullKey = `${title.toLowerCase()}.${key}`;
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      section.appendChild(createSettingItem(fullKey, label, value));
    }
    
    return section;
  };
  
  // 各セクションを追加
  if (settings.voice) {
    settingsContainer.appendChild(addSettingSection('Voice', settings.voice));
  }
  
  if (settings.emotion) {
    settingsContainer.appendChild(addSettingSection('Emotion', settings.emotion));
  }
  
  if (settings.ui) {
    settingsContainer.appendChild(addSettingSection('UI', settings.ui));
  }
  
  // 閉じるボタン
  const closeButton = document.createElement('button');
  closeButton.textContent = '閉じる';
  closeButton.style.cssText = `
    margin-top: 15px;
    padding: 8px 15px;
    background: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    float: right;
  `;
  
  closeButton.addEventListener('click', () => {
    document.body.removeChild(settingsContainer);
  });
  
  settingsContainer.appendChild(closeButton);
  
  return settingsContainer;
}

/**
 * 設定を更新する
 * @param {string} key - 設定キー
 * @param {any} value - 設定値
 */
async function updateSetting(key, value) {
  if (apiClient) {
    try {
      await apiClient.updateSetting(key, value);
      console.log(`設定を更新しました: ${key} = ${value}`);
    } catch (error) {
      console.error('設定の更新に失敗しました:', error);
    }
  } else {
    console.log(`APIクライアントが利用できないため、設定を更新できません: ${key} = ${value}`);
  }
}

/**
 * 右クリックメニューのイベントを設定する
 */
function setupContextMenuEvents() {
  // 右クリックイベントを監視
  document.addEventListener('contextmenu', handleRightClick);
  
  // キーボードショートカットを監視
  document.addEventListener('keydown', (event) => {
    // Ctrl+Shift+S で設定を表示
    if (event.ctrlKey && event.shiftKey && event.key === 'S') {
      event.preventDefault();
      showSettings();
    }
    
    // Esc で設定を閉じる
    if (event.key === 'Escape') {
      const settingsContainer = document.querySelector('.paw-settings-container');
      if (settingsContainer) {
        document.body.removeChild(settingsContainer);
      }
    }
  });
  
  console.log('✅ 右クリックメニューイベントを設定しました');
}

/**
 * 右クリックイベントを処理する
 * @param {MouseEvent} event - マウスイベント
 */
function handleRightClick(event) {
  // デフォルトのコンテキストメニューを防止
  event.preventDefault();
  
  // クリック位置に基づいてメニューを表示
  const x = event.clientX;
  const y = event.clientY;
  
  // メニュー項目を定義
  const menuItems = [
    { label: '設定を開く', action: showSettings },
    { label: '吹き出しを非表示', action: hideBubble },
    { label: 'デバッグ情報', action: showDebugInfo }
  ];
  
  // メニューを作成
  const menu = document.createElement('div');
  menu.className = 'paw-context-menu';
  menu.style.cssText = `
    position: fixed;
    top: ${y}px;
    left: ${x}px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    padding: 10px 0;
    z-index: 9999;
    min-width: 150px;
  `;
  
  // メニュー項目を追加
  menuItems.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.className = 'paw-menu-item';
    menuItem.textContent = item.label;
    menuItem.style.cssText = `
      padding: 8px 15px;
      cursor: pointer;
      transition: background 0.2s;
    `;
    
    // ホバー効果
    menuItem.addEventListener('mouseover', () => {
      menuItem.style.background = '#f0f0f0';
    });
    
    menuItem.addEventListener('mouseout', () => {
      menuItem.style.background = 'transparent';
    });
    
    // クリックイベント
    menuItem.addEventListener('click', () => {
      item.action();
      document.body.removeChild(menu);
    });
    
    menu.appendChild(menuItem);
  });
  
  // メニューを表示
  document.body.appendChild(menu);
  
  // メニュー外のクリックで閉じる
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      document.body.removeChild(menu);
      document.removeEventListener('click', closeMenu);
    }
  };
  
  // 少し遅延させてイベントリスナーを追加（即時実行を防ぐ）
  setTimeout(() => {
    document.addEventListener('click', closeMenu);
  }, 100);
}

/**
 * 設定UIを表示する
 */
async function showSettings() {
  // 既存の設定UIがあれば削除
  const existingSettings = document.querySelector('.paw-settings-container');
  if (existingSettings && existingSettings.parentNode) {
    existingSettings.parentNode.removeChild(existingSettings);
    return;
  }
  
  // 新しい設定UIを作成
  const settingsUI = await createTestSettingsUI();
  document.body.appendChild(settingsUI);
}

/**
 * デバッグ情報を表示する
 */
function showDebugInfo() {
  // デバッグ情報を表示するロジック
  console.log('デバッグ情報を表示します');
  
  // ここにデバッグ情報の表示ロジックを実装
  alert('デバッグ情報: この機能は開発中です');
}

// 初期化
setupContextMenuEvents(); 

// 必要な関数をエクスポート
export { createTestSettingsUI, showSettings, showDebugInfo }; 