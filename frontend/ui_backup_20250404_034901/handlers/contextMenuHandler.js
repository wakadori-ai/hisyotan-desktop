// contextMenuHandler.js
// 右クリックメニューの処理

import { logDebug } from '@core/logger.js';
import { sendTestZombieWarning, sendTestDetection } from '@core/websocketHandler.js';

/**
 * コンテキストメニューのイベント設定
 */
export function setupContextMenuEvents() {
  logDebug('コンテキストメニューイベントをセットアップしています');
  
  // 右クリックメニュー用の要素を取得
  const contextMenu = document.getElementById('contextMenu');
  const assistantImage = document.getElementById('assistantImage');
  
  if (!contextMenu || !assistantImage) {
    logDebug('コンテキストメニューまたはアシスタント画像要素が見つかりません');
    return;
  }
  
  // 右クリックイベントの設定
  assistantImage.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    
    // メニュー位置の調整
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${e.clientY}px`;
    contextMenu.classList.add('active');
    
    // ドキュメント全体にクリックイベントを追加（メニュー外クリックで閉じる）
    setTimeout(() => {
      document.addEventListener('click', hideContextMenu);
    }, 0);
  });
  
  // 各メニュー項目のイベント設定
  setupContextMenuItems();
}

/**
 * コンテキストメニュー項目の設定
 */
function setupContextMenuItems() {
  // メニュー項目の要素を取得
  const menuItems = {
    settings: document.getElementById('menuSettings'),
    testZombie: document.getElementById('menuTestZombie'),
    testVoice: document.getElementById('menuTestVoice'),
    testDetection: document.getElementById('menuTestDetection'),
    toggleClickThrough: document.getElementById('menuToggleClickThrough'),
    toggleAutoHide: document.getElementById('menuToggleAutoHide'),
    close: document.getElementById('menuClose'),
  };
  
  // 設定メニュー項目のイベント
  if (menuItems.settings) {
    menuItems.settings.addEventListener('click', function() {
      showMultipleSettings();
      hideContextMenu();
    });
  }
  
  // ゾンビテスト項目のイベント
  if (menuItems.testZombie) {
    menuItems.testZombie.addEventListener('click', function() {
      sendTestZombieWarning();
      hideContextMenu();
    });
  }
  
  // 音声テスト項目のイベント
  if (menuItems.testVoice) {
    menuItems.testVoice.addEventListener('click', function() {
      // 音声テスト関数を呼び出し
      if (window.testVoice && typeof window.testVoice === 'function') {
        window.testVoice();
      }
      hideContextMenu();
    });
  }
  
  // 検出テスト項目のイベント
  if (menuItems.testDetection) {
    menuItems.testDetection.addEventListener('click', function() {
      sendTestDetection();
      hideContextMenu();
    });
  }
  
  // クリックスルー切り替え項目のイベント
  if (menuItems.toggleClickThrough) {
    menuItems.toggleClickThrough.addEventListener('click', function() {
      toggleClickThrough();
      hideContextMenu();
    });
  }
  
  // 自動透明化切り替え項目のイベント
  if (menuItems.toggleAutoHide) {
    menuItems.toggleAutoHide.addEventListener('click', function() {
      toggleAutoHide();
      hideContextMenu();
    });
  }
  
  // 終了メニュー項目のイベント
  if (menuItems.close) {
    menuItems.close.addEventListener('click', function() {
      if (window.electronAPI && window.electronAPI.closeApp) {
        window.electronAPI.closeApp();
      }
      hideContextMenu();
    });
  }
}

/**
 * コンテキストメニューを非表示にする
 */
function hideContextMenu() {
  const contextMenu = document.getElementById('contextMenu');
  if (contextMenu) {
    contextMenu.classList.remove('active');
  }
  
  // イベントリスナーを削除
  document.removeEventListener('click', hideContextMenu);
}

/**
 * クリックスルー設定を切り替える
 */
function toggleClickThrough() {
  if (window.electronAPI && window.electronAPI.toggleClickThrough) {
    window.electronAPI.toggleClickThrough();
    
    // 表示を更新
    updateClickThroughStatus();
  }
}

/**
 * クリックスルー状態を更新表示
 */
function updateClickThroughStatus() {
  if (window.electronAPI && window.electronAPI.isClickThroughEnabled) {
    window.electronAPI.isClickThroughEnabled().then(isEnabled => {
      const menuItem = document.getElementById('menuToggleClickThrough');
      if (menuItem) {
        if (isEnabled) {
          menuItem.textContent = 'クリックスルーをオフにする ✓';
        } else {
          menuItem.textContent = 'クリックスルーをオンにする';
        }
      }
    });
  }
}

/**
 * 自動透明化設定を切り替える
 */
function toggleAutoHide() {
  // 設定が存在しない場合は作成
  if (!window.currentSettings) {
    window.currentSettings = {};
  }
  
  // 現在の値を反転
  window.currentSettings.autoHide = !window.currentSettings.autoHide;
  
  // メニューアイテムの表示を更新
  updateAutoHideStatus();
  
  // 設定を保存
  if (window.electronAPI && window.electronAPI.saveSettings) {
    window.electronAPI.saveSettings({
      assistant: window.currentSettings
    });
  }
}

/**
 * 自動透明化状態の表示を更新
 */
function updateAutoHideStatus() {
  const menuItem = document.getElementById('menuToggleAutoHide');
  if (menuItem) {
    if (window.currentSettings && window.currentSettings.autoHide === false) {
      menuItem.textContent = '自動透明化をオンにする';
      document.body.classList.add('auto-hide-disabled');
    } else {
      menuItem.textContent = '自動透明化をオフにする ✓';
      document.body.classList.remove('auto-hide-disabled');
    }
  }
}

/**
 * 複数設定パネルを表示
 */
export function showMultipleSettings() {
  // 設定パネルが存在するか確認
  const settingsPanel = document.getElementById('settingsPanel');
  if (!settingsPanel) return;
  
  // パネルを表示
  settingsPanel.classList.add('active');
  
  // 閉じるボタンのイベント設定
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', function() {
      settingsPanel.classList.remove('active');
    });
  }
  
  // 設定パネル外をクリックした場合も閉じる
  settingsPanel.addEventListener('click', function(e) {
    if (e.target === settingsPanel) {
      settingsPanel.classList.remove('active');
    }
  });
  
  // 各設定コントロールの初期設定
  setupSettingsControls();
} 