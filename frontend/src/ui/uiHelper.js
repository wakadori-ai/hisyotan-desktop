// uiHelper.js
// UI表示制御のためのメインモジュール
// 各ヘルパーモジュールをまとめて再エクスポートします

import { logDebug } from '@core/logger.js';

// 各ヘルパーモジュールをインポート
import { 
  speechBubbleModule,
  showBubble,
  setText,
  debugBubbleStyles,
  forceResetAndShowBubble,
  testBubbleDisplay,
  testBubbleToggle,
  initSpeechBubbleElements
} from './helpers/speechBubble.js';

import {
  speechObserverModule,
  observeSpeechTextAutoRecovery,
  resetObserver
} from './helpers/speechObserver.js';

import {
  errorBubbleModule,
  showError,
  initErrorElements,
  shouldShowError
} from './helpers/errorBubble.js';

import {
  statusIndicatorModule,
  updateConnectionStatus,
  initStatusIndicator
} from './helpers/statusIndicator.js';

import {
  settingPanelModule,
  renderSettingUI,
  initSettingUI
} from './helpers/settingPanel.js';

// 追加の依存関係
import { hideBubble } from '@ui/handlers/bubbleManager.js';
import { createTestSettingsUI } from '@ui/paw-context-menu.js';

/**
 * 全てのUI要素を初期化する
 */
export function initUIElements() {
  logDebug('UI要素初期化を開始');
  
  // 各モジュールの初期化関数を呼び出し
  initSpeechBubbleElements();
  initErrorElements();
  initStatusIndicator();
  initSettingUI();
  
  logDebug('UI要素初期化が完了しました');
}

// 各モジュールの関数を再エクスポート
export {
  // speechBubble
  showBubble,
  setText,
  hideBubble,
  debugBubbleStyles,
  forceResetAndShowBubble,
  testBubbleDisplay,
  testBubbleToggle,
  
  // speechObserver
  observeSpeechTextAutoRecovery,
  resetObserver,
  
  // errorBubble
  showError,
  shouldShowError,
  
  // statusIndicator
  updateConnectionStatus,
  
  // settingPanel
  renderSettingUI,
  
  // 追加機能
  createTestSettingsUI
};

// モジュールオブジェクトをまとめて定義（完全性のため）
export const modules = {
  speechBubble: speechBubbleModule,
  speechObserver: speechObserverModule,
  errorBubble: errorBubbleModule,
  statusIndicator: statusIndicatorModule,
  settingPanel: settingPanelModule
};

// ブラウザ環境でのグローバルアクセス用
if (typeof window !== 'undefined') {
  window.uiHelper = {
    showBubble,
    hideBubble,
    setText,
    showError,
    shouldShowError,
    updateConnectionStatus,
    renderSettingUI,
    initUIElements,
    debugBubbleStyles,
    forceResetAndShowBubble,
    testBubbleDisplay,
    testBubbleToggle,
  };
  
  // DOMContentLoadedイベントでuiHelperの存在を確認
  document.addEventListener('DOMContentLoaded', () => {
    console.log('🔍 uiHelper初期化状態確認:', !!window.uiHelper);
    console.log('🧰 利用可能な関数:', Object.keys(window.uiHelper).join(', '));
  });
  
  // 初期化直後にもコンソールに状態を出力
  console.log('🚀 uiHelper初期化完了:', !!window.uiHelper);
}

// デフォルトエクスポート
export default {
  showBubble,
  hideBubble,
  setText,
  showError,
  shouldShowError,
  updateConnectionStatus,
  renderSettingUI,
  initUIElements,
  debugBubbleStyles,
  forceResetAndShowBubble,
  testBubbleDisplay,
  testBubbleToggle,
}; 
