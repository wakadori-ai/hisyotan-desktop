// debugPanel.js
// デバッグパネルの設定と管理

import { logDebug } from '@core/logger.js';
import { sendTestZombieWarning, sendTestDetection } from '@core/websocketHandler.js';

/**
 * デバッグパネルの設定
 */
export function setupDebugPanel() {
  logDebug('デバッグパネルをセットアップしています');
  
  // デバッグパネルの表示切り替えボタン
  const debugToggleBtn = document.getElementById('debugToggleBtn');
  const debugPanel = document.getElementById('debugPanel');
  
  if (debugToggleBtn && debugPanel) {
    debugToggleBtn.addEventListener('click', function() {
      debugPanel.classList.toggle('active');
    });
    
    // デバッグ用アクションの設定
    setupDebugActions();
  } else {
    logDebug('デバッグパネルの要素が見つかりません');
  }
}

/**
 * デバッグパネル内のアクション設定
 */
function setupDebugActions() {
  // ゾンビ警告テストボタン
  const testZombieBtn = document.getElementById('testZombieBtn');
  if (testZombieBtn) {
    testZombieBtn.addEventListener('click', function() {
      sendTestZombieWarning();
    });
  }
  
  // 検出テストボタン
  const testDetectionBtn = document.getElementById('testDetectionBtn');
  if (testDetectionBtn) {
    testDetectionBtn.addEventListener('click', function() {
      sendTestDetection();
    });
  }
  
  // 音声テストボタン
  const testVoiceBtn = document.getElementById('testVoiceBtn');
  if (testVoiceBtn) {
    testVoiceBtn.addEventListener('click', function() {
      if (window.testVoice && typeof window.testVoice === 'function') {
        window.testVoice();
      }
    });
  }
  
  // 表情切り替えテストセレクトボックス
  const expressionSelect = document.getElementById('expressionSelect');
  if (expressionSelect) {
    expressionSelect.addEventListener('change', function() {
      const selectedExpression = expressionSelect.value;
      if (window.setExpression && typeof window.setExpression === 'function') {
        window.setExpression(selectedExpression);
      }
    });
  }
  
  // クリックスルー切り替えボタン
  const toggleClickThroughBtn = document.getElementById('toggleClickThroughBtn');
  if (toggleClickThroughBtn) {
    toggleClickThroughBtn.addEventListener('click', function() {
      if (window.electronAPI && window.electronAPI.toggleClickThrough) {
        window.electronAPI.toggleClickThrough();
        updateClickThroughButtonStatus();
      }
    });
    
    // 初期状態を設定
    updateClickThroughButtonStatus();
  }
  
  // 自動透明化切り替えボタン
  const toggleAutoHideBtn = document.getElementById('toggleAutoHideBtn');
  if (toggleAutoHideBtn) {
    toggleAutoHideBtn.addEventListener('click', function() {
      toggleAutoHideSetting();
    });
    
    // 初期状態を設定
    updateAutoHideButtonStatus();
  }
  
  // ホードモードテストボタン
  const testHordeModeBtn = document.getElementById('testHordeModeBtn');
  if (testHordeModeBtn) {
    testHordeModeBtn.addEventListener('click', function() {
      if (window.zombieOverlayManager && typeof window.zombieOverlayManager.showHordeWarning === 'function') {
        window.zombieOverlayManager.showHordeWarning();
      }
    });
  }
}

/**
 * クリックスルーボタンの状態更新
 */
function updateClickThroughButtonStatus() {
  if (!window.electronAPI || !window.electronAPI.isClickThroughEnabled) return;
  
  const toggleClickThroughBtn = document.getElementById('toggleClickThroughBtn');
  if (!toggleClickThroughBtn) return;
  
  window.electronAPI.isClickThroughEnabled().then(isEnabled => {
    if (isEnabled) {
      toggleClickThroughBtn.textContent = 'クリックスルーを無効化';
      toggleClickThroughBtn.classList.add('active');
    } else {
      toggleClickThroughBtn.textContent = 'クリックスルーを有効化';
      toggleClickThroughBtn.classList.remove('active');
    }
  });
}

/**
 * 自動透明化設定の切り替え
 */
function toggleAutoHideSetting() {
  // 設定が存在しない場合は作成
  if (!window.currentSettings) {
    window.currentSettings = {};
  }
  
  // 現在の値を反転
  window.currentSettings.autoHide = !window.currentSettings.autoHide;
  
  // ボタン表示を更新
  updateAutoHideButtonStatus();
  
  // bodyクラスの更新
  if (window.currentSettings.autoHide === false) {
    document.body.classList.add('auto-hide-disabled');
  } else {
    document.body.classList.remove('auto-hide-disabled');
  }
  
  // 設定を保存
  if (window.electronAPI && window.electronAPI.saveSettings) {
    window.electronAPI.saveSettings({
      assistant: window.currentSettings
    });
  }
}

/**
 * 自動透明化ボタンの状態更新
 */
function updateAutoHideButtonStatus() {
  const toggleAutoHideBtn = document.getElementById('toggleAutoHideBtn');
  if (!toggleAutoHideBtn) return;
  
  if (window.currentSettings && window.currentSettings.autoHide === false) {
    toggleAutoHideBtn.textContent = '自動透明化を有効化';
    toggleAutoHideBtn.classList.remove('active');
  } else {
    toggleAutoHideBtn.textContent = '自動透明化を無効化';
    toggleAutoHideBtn.classList.add('active');
  }
} 