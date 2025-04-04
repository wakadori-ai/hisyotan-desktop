// settingPanel.js
// 設定UI表示機能を担当するモジュール

import { logDebug, logError } from '@core/logger.js';
import { updateSetting } from '@ui/apiClient.js';
import { keepBubbleVisible, allowBubbleHide } from './speechBubble.js';

// DOM要素
let speechSettingUI;
let speechBubble;

/**
 * 設定UI関連のDOM要素を初期化する
 */
export function initSettingUI() {
  logDebug('設定UI要素初期化を開始');
  
  // 吹き出し要素の取得
  speechBubble = document.getElementById('speechBubble');
  
  // 設定UI用のコンテナ作成（なければ）
  if (!document.getElementById('speechSettingUI')) {
    if (speechBubble) {
      console.log('🏗 initSettingUI: speechSettingUIを新規作成します');
      speechSettingUI = document.createElement('div');
      speechSettingUI.id = 'speechSettingUI';
      speechSettingUI.className = 'speech-setting-ui';
      speechSettingUI.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(255, 255, 255, 0.9);
        padding: 10px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        display: none;
      `;
      speechBubble.appendChild(speechSettingUI);
    }
  } else {
    speechSettingUI = document.getElementById('speechSettingUI');
  }
  
  // 要素の存在確認とログ
  if (speechSettingUI) {
    logDebug('speechSettingUI要素を取得/作成しました');
  } else {
    logError('speechSettingUI要素が作成できません');
  }
  
  logDebug('設定UI要素初期化が完了しました');
}

/**
 * 設定UI要素をレンダリングする
 * @param {Object|Array} uiPayload - UI表示用のペイロード（単一オブジェクトまたは配列）
 */
export function renderSettingUI(uiPayload) {
  console.log('🛠 renderSettingUI() が呼ばれました！');
  console.log('payload:', uiPayload);
  
  logDebug(`設定UI表示: ${Array.isArray(uiPayload) ? `${uiPayload.length}個の項目` : `タイプ=${uiPayload.type}`}`);
  
  if (!speechSettingUI) {
    console.log('💭 speechSettingUIが存在しないので取得または作成します');
    speechSettingUI = document.getElementById('speechSettingUI');
    if (!speechSettingUI) {
      logError('speechSettingUI要素が見つかりません');
      console.log('💭 speechSettingUI要素が見つからないため新規作成します');
      
      // 吹き出し内に作成
      if (speechBubble) {
        speechSettingUI = document.createElement('div');
        speechSettingUI.id = 'speechSettingUI';
        speechSettingUI.className = 'speech-setting-ui';
        speechBubble.appendChild(speechSettingUI);
        console.log('🧱 DOMに追加しました！', speechSettingUI);
        console.log('親の speechBubble:', speechBubble);
        logDebug('設定UI要素を動的に作成しました');
      } else {
        console.log('❌ speechBubble要素が存在しません！', speechBubble);
        logError('speechBubble要素も見つかりません。設定UIを表示できません');
        return;
      }
    } else {
      console.log('💭 既存のspeechSettingUIを取得しました', speechSettingUI);
    }
  } else {
    console.log('💭 speechSettingUIは既に存在します', speechSettingUI);
  }
  
  // 内容をクリア
  speechSettingUI.innerHTML = '';
  console.log('💭 speechSettingUIの内容をクリアしました');
  
  // 複数のUIペイロードに対応（配列の場合）
  const payloads = Array.isArray(uiPayload) ? uiPayload : [uiPayload];
  
  // 各UIペイロードごとに処理
  payloads.forEach((payload, index) => {
    // UIタイプに応じたコンテンツを作成
    if (payload.type === 'toggle') {
      console.log(`💭 トグルUI(${index})を描画します:`, payload);
      renderToggleSwitch(payload, index);
    } else {
      console.log(`❌ 未対応のUIタイプ: ${payload.type}`);
      logError(`未対応の設定UIタイプ: ${payload.type}`);
    }
  });
  // 設定UI要素を表示
  speechSettingUI.style.setProperty('display', 'block', 'important');
  console.log('💭 speechSettingUIを表示に設定しました');
  
  // 閉じるボタンが存在することを確認
  if (speechBubble) {
    // 既存の閉じるボタンを確認
    let closeButton = speechBubble.querySelector('.bubble-close');
    if (!closeButton) {
      console.log('💭 閉じるボタンが見つからないため新規作成します');
      closeButton = document.createElement('div');
      closeButton.className = 'bubble-close';
      closeButton.textContent = '×';
      closeButton.onclick = function() {
        if (typeof window.bubbleManager?.hideBubble === 'function') {
          window.bubbleManager.hideBubble();
        } else {
          // fallback to import
          import('@ui/handlers/bubbleManager.js').then(module => {
            module.hideBubble();
          });
        }
      };
      speechBubble.appendChild(closeButton);
      console.log('💭 閉じるボタンを追加しました');
    } else {
      console.log('💭 既存の閉じるボタンを確認しました:', closeButton);
    }
  }
  
  // 吹き出しにマウスイベントリスナーを追加（設定UI表示中はマウスフォーカス中に表示を維持）
  if (speechBubble) {
    // 既存のリスナーを削除
    speechBubble.removeEventListener('mouseenter', keepBubbleVisible);
    speechBubble.removeEventListener('mouseleave', allowBubbleHide);
    
    // 新しいリスナーを追加
    speechBubble.addEventListener('mouseenter', keepBubbleVisible);
    speechBubble.addEventListener('mouseleave', allowBubbleHide);
    console.log('💭 吹き出しのマウスイベントリスナーを設定しました');
  } else {
    console.log('❌ マウスイベント追加時にspeechBubbleが存在しません');
  }
  
  console.log('💬 最終的な speechBubble の中身:', speechBubble?.innerHTML || '存在しません');
  logDebug('設定UI表示完了');
}

/**
 * トグルスイッチを描画する（renderSettingUIの補助関数）
 * @private
 * @param {Object} payload - トグルスイッチの設定
 * @param {number} index - トグルスイッチのインデックス
 */
function renderToggleSwitch(payload, index) {
  console.log('✨ renderToggleSwitch 開始:', payload);
  
  // トグルスイッチを作成
  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'toggle-container';
  
  // ラベルを作成
  const label = document.createElement('label');
  label.className = 'toggle-label';
  label.textContent = payload.label;
  
  // トグルスイッチを作成
  const toggleSwitch = document.createElement('div');
  toggleSwitch.className = 'toggle-switch-container';
  
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.id = `setting-toggle-${Date.now()}-${index}`;
  toggle.className = 'toggle-switch';
  toggle.checked = payload.value;
  
  const toggleSlider = document.createElement('label');
  toggleSlider.className = 'toggle-slider';
  toggleSlider.htmlFor = toggle.id;
  
  // トグルの説明テキストがあれば追加
  if (payload.description) {
    const description = document.createElement('div');
    description.className = 'toggle-description';
    description.textContent = payload.description;
    toggleContainer.appendChild(description);
  }
  
  // ①トグル要素自体へのchangeイベントリスナー
  toggle.addEventListener('change', (e) => {
    console.log('🔄 トグル変更イベント発生: ', e.target.checked);
    const newValue = e.target.checked;
    logDebug(`設定値変更: "${payload.label}" = ${newValue}`);
    
    // 効果音再生（任意）
    if (typeof window.playPresetSound === 'function') {
      window.playPresetSound(newValue ? 'toggle_on' : 'toggle_off').catch(() => {});
    }
    
    // アニメーション効果（任意）
    toggleSlider.classList.add('toggled');
    setTimeout(() => toggleSlider.classList.remove('toggled'), 300);
    
    // 設定キーが指定されている場合はAPIを呼び出す
    if (payload.key) {
      try {
        console.log(`🔄 設定APIを呼び出します: ${payload.key}=${newValue}`);
        updateSetting(payload.key, newValue)
          .then(response => {
            console.log('✅ 設定更新成功:', response);
          })
          .catch(error => {
            console.error('❌ 設定更新失敗:', error);
            logError(`設定APIエラー: ${error.message || '不明なエラー'}`);
          });
      } catch (err) {
        console.error('設定API呼び出しエラー:', err);
        logError(`設定API呼び出しエラー: ${err.message}`);
      }
    }
    
    // コールバック関数を呼び出し
    if (typeof payload.onChange === 'function') {
      try {
        console.log('🔄 onChange コールバックを実行: ', payload.onChange);
        payload.onChange(newValue);
      } catch (err) {
        logError(`設定変更コールバックでエラー: ${err.message}`);
        console.error('コールバックエラー詳細: ', err);
      }
    } else {
      console.log('⚠️ onChangeコールバックが関数ではありません: ', payload.onChange);
    }
  });
  
  // ②トグルスライダーへのクリックイベントリスナー
  toggleSlider.addEventListener('click', (e) => {
    console.log('👆 トグルスライダークリックイベント発生');
    e.preventDefault(); // デフォルトの動作を防止
    
    // toggle要素のチェック状態を反転
    toggle.checked = !toggle.checked;
    
    // 手動でchangeイベントを発火
    const changeEvent = new Event('change', { bubbles: true });
    toggle.dispatchEvent(changeEvent);
  });
  
  // ③ラベルへのクリックイベントリスナー（追加）
  label.addEventListener('click', (e) => {
    console.log('👆 ラベルクリックイベント発生');
    e.preventDefault(); // デフォルトの動作を防止
    
    // toggle要素のチェック状態を反転
    toggle.checked = !toggle.checked;
    
    // 手動でchangeイベントを発火
    const changeEvent = new Event('change', { bubbles: true });
    toggle.dispatchEvent(changeEvent);
  });
  
  // ④トグルコンテナ全体へのクリックイベントリスナー（追加）
  toggleContainer.addEventListener('click', (e) => {
    // toggleやlabelのクリックイベントと重複しないように
    if (e.target === toggleContainer) {
      console.log('👆 トグルコンテナクリックイベント発生');
      
      // toggle要素のチェック状態を反転
      toggle.checked = !toggle.checked;
      
      // 手動でchangeイベントを発火
      const changeEvent = new Event('change', { bubbles: true });
      toggle.dispatchEvent(changeEvent);
    }
  });
  
  // 要素を組み立て
  toggleSwitch.appendChild(toggle);
  toggleSwitch.appendChild(toggleSlider);
  
  toggleContainer.appendChild(label);
  toggleContainer.appendChild(toggleSwitch);
  
  speechSettingUI.appendChild(toggleContainer);
  
  console.log('✅ renderToggleSwitch 完了:', {
    container: toggleContainer,
    toggle: toggle,
    slider: toggleSlider,
    label: label
  });
}

// グローバルアクセス用のオブジェクトをエクスポート
export const settingPanelModule = {
  initSettingUI,
  renderSettingUI
}; 