/**
 * paw-context-menu.js
 * 肉球UI用の右クリックメニュー処理
 * Viteモジュール構成に対応
 */

// 初期化時にコンソールログ
console.log('🐾 右クリックメニュー機能を初期化します');

// APIクライアントをインポート
import apiClient from '@core/apiClient.js';

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
  // APIクライアントを使用してバックエンドから設定を取得
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
    transition: all 0.2s;
    align-self: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  `;
  
  closeButton.addEventListener('click', () => {
    hideBubble();
  });
  
  settingUI.appendChild(closeButton);
  
  // 設定UIを吹き出しに追加
  speechBubble.appendChild(settingUI);
  
  // 吹き出しを表示
  speechBubble.classList.add('active');
}

// グローバルアクセス用に公開
window.createTestSettingsUI = createTestSettingsUI;
window.hideBubble = hideBubble;

/**
 * コンテキストメニューイベントの設定
 */
function setupContextMenuEvents() {
  // 右クリックイベントをリスンする
  document.addEventListener('contextmenu', handleRightClick);
  
  // 吹き出し以外の場所をクリックしたら吹き出しを閉じる
  document.addEventListener('click', (event) => {
    const speechBubble = document.getElementById('speechBubble');
    const paw = document.getElementById('paw-button');
    
    // 吹き出しが表示中で、クリックが吹き出し外かつ肉球ボタン外の場合
    if (
      speechBubble && 
      speechBubble.classList.contains('active') && 
      !speechBubble.contains(event.target) && 
      (!paw || !paw.contains(event.target))
    ) {
      hideBubble();
    }
  });
}

/**
 * 右クリックイベントの処理
 */
function handleRightClick(event) {
  // 右クリックメニューを表示しない
  event.preventDefault();
  
  // 肉球ボタンを探す
  const pawButton = document.getElementById('paw-button');
  if (!pawButton) {
    console.error('肉球ボタンが見つかりません');
    return;
  }
  
  // テスト用設定UIを呼び出す
  createTestSettingsUI();
}

// イベントをセットアップ
document.addEventListener('DOMContentLoaded', setupContextMenuEvents);

// エクスポート
export {
  hideBubble,
  createTestSettingsUI,
  getSettingsData
}; 