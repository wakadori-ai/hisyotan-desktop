// settingsLoader.js
// 設定の読み込みと適用

import { logDebug, logError } from '@core/logger.js';

/**
 * 保存された設定の読み込みと適用
 */
export async function loadAndApplySettings() {
  try {
    logDebug('設定を読み込み、適用します');
    
    if (!window.electronAPI || !window.electronAPI.getSettings) {
      logDebug('ElectronAPI または getSettings 関数が見つかりません');
      return;
    }
    
    // 設定を取得
    const config = await window.electronAPI.getSettings();
    
    // 設定があれば適用
    if (config && config.assistant) {
      window.currentSettings = config.assistant;
      
      // 透明度の適用
      applyOpacitySetting(config.assistant);
      
      // サイズの適用
      applySizeSetting(config.assistant);
      
      // 位置の適用
      applyPositionSetting(config.assistant);
      
      // 自動透明化設定の適用
      applyAutoHideSetting(config.assistant);
      
      logDebug('すべての設定が適用されました');
    } else {
      logDebug('設定が見つからないか、適用できる設定がありません');
    }
  } catch (error) {
    logError(`設定の読み込みエラー: ${error.message}`);
  }
}

/**
 * 透明度設定の適用
 * @param {Object} settings - アシスタント設定オブジェクト
 */
function applyOpacitySetting(settings) {
  if (typeof settings.opacity === 'number') {
    const assistantImage = document.getElementById('assistantImage');
    if (assistantImage) {
      assistantImage.style.opacity = settings.opacity / 100;
    }
    
    // UI要素にも値を反映
    const opacitySlider = document.getElementById('opacitySlider');
    const opacityValue = document.getElementById('opacityValue');
    if (opacitySlider && opacityValue) {
      opacitySlider.value = settings.opacity;
      opacityValue.textContent = settings.opacity;
    }
  }
}

/**
 * サイズ設定の適用
 * @param {Object} settings - アシスタント設定オブジェクト
 */
function applySizeSetting(settings) {
  if (typeof settings.size === 'number') {
    const assistantImage = document.getElementById('assistantImage');
    if (assistantImage) {
      // まずサイズ制限を確認
      if (!assistantImage.style.maxWidth) {
        assistantImage.style.maxWidth = '35vw';
        assistantImage.style.maxHeight = '70vh';
      }
      // 次にスケールを適用
      assistantImage.style.transform = `scale(${settings.size / 100})`;
    }
    
    // UI要素にも値を反映
    const sizeSlider = document.getElementById('sizeSlider');
    const sizeValue = document.getElementById('sizeValue');
    if (sizeSlider && sizeValue) {
      sizeSlider.value = settings.size;
      sizeValue.textContent = settings.size;
    }
  }
}

/**
 * 位置設定の適用
 * @param {Object} settings - アシスタント設定オブジェクト
 */
function applyPositionSetting(settings) {
  if (settings.position) {
    const container = document.querySelector('.assistant-container');
    if (container) {
      // 位置に応じてスタイルを変更
      switch (settings.position) {
        case 'topLeft':
          container.style.alignItems = 'flex-start';
          container.style.justifyContent = 'flex-start';
          container.style.paddingRight = '0';
          container.style.paddingLeft = '30px';
          break;
        case 'topRight':
          container.style.alignItems = 'flex-end';
          container.style.justifyContent = 'flex-start';
          container.style.paddingRight = '30px';
          container.style.paddingLeft = '0';
          break;
        case 'bottomLeft':
          container.style.alignItems = 'flex-start';
          container.style.justifyContent = 'flex-end';
          container.style.paddingRight = '0';
          container.style.paddingLeft = '30px';
          break;
        case 'bottomRight':
        default:
          container.style.alignItems = 'flex-end';
          container.style.justifyContent = 'flex-end';
          container.style.paddingRight = '30px';
          container.style.paddingLeft = '0';
          break;
      }
    }
    
    // UI要素にも視覚的に反映（ボタンにアクティブクラスを追加する場合）
    const positionButtons = document.querySelectorAll('.position-buttons button');
    if (positionButtons && positionButtons.length === 4) {
      // 一度すべてのアクティブクラスを削除
      positionButtons.forEach(btn => btn.classList.remove('active'));
      
      // 現在の位置に応じてアクティブクラスを追加
      let activeIndex = 0;
      switch (settings.position) {
        case 'topLeft': activeIndex = 0; break;
        case 'topRight': activeIndex = 1; break;
        case 'bottomLeft': activeIndex = 2; break;
        case 'bottomRight': activeIndex = 3; break;
      }
      
      positionButtons[activeIndex].classList.add('active');
    }
  }
}

/**
 * 自動透明化設定の適用
 * @param {Object} settings - アシスタント設定オブジェクト
 */
function applyAutoHideSetting(settings) {
  // 自動透明化が無効の場合
  if (settings.autoHide === false) {
    document.body.classList.add('auto-hide-disabled');
    
    // メニュー項目が存在する場合は表示を更新
    const menuItem = document.getElementById('menuToggleAutoHide');
    if (menuItem) {
      menuItem.textContent = '自動透明化をオンにする';
    }
  } else {
    document.body.classList.remove('auto-hide-disabled');
    
    // メニュー項目が存在する場合は表示を更新
    const menuItem = document.getElementById('menuToggleAutoHide');
    if (menuItem) {
      menuItem.textContent = '自動透明化をオフにする ✓';
    }
  }
} 