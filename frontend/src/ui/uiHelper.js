// uiHelper.js
// UI表示制御のためのメインモジュール
// 各ヘルパーモジュールをまとめて再エクスポートします

import { logDebug } from '@core/logger.js';

// 初期化フラグ
let isUIInitialized = false;

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

// errorBubble関連のインポートを削除（不要なため）

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

/**
 * 全てのUI要素を初期化する
 */
export function initUIElements() {
  logDebug('UI要素初期化を開始');
  
  // 既に初期化済みであればスキップ
  if (isUIInitialized) {
    logDebug('UI要素は既に初期化済みです。スキップします。');
    return;
  }
  
  // 各モジュールの初期化関数を呼び出し
  initSpeechBubbleElements();
  // initErrorElements の呼び出しを削除
  initStatusIndicator();
  initSettingUI();
  
  // 初期化済みフラグを設定
  isUIInitialized = true;
  
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
  
  // errorBubble関連のエクスポートを削除
  
  // statusIndicator
  updateConnectionStatus,
  
  // settingPanel
  renderSettingUI
};

// モジュールオブジェクトをまとめて定義（完全性のため）
export const modules = {
  speechBubble: speechBubbleModule,
  speechObserver: speechObserverModule,
  // errorBubble: errorBubbleModule, の行を削除
  statusIndicator: statusIndicatorModule,
  settingPanel: settingPanelModule
};

// ブラウザ環境でのグローバルアクセス用
if (typeof window !== 'undefined') {
  // 既にuiHelperが存在しなければグローバル変数を初期化
  if (!window.uiHelper) {
    window.uiHelper = {
      showBubble,
      hideBubble,
      setText,
      // showError, shouldShowError, を削除
      updateConnectionStatus,
      renderSettingUI,
      initUIElements,
      debugBubbleStyles,
      forceResetAndShowBubble,
      testBubbleDisplay,
      testBubbleToggle,
    };
    
    // speechObserverをグローバルに公開
    window.speechObserver = {
      observeSpeechTextAutoRecovery,
      resetObserver
    };
    
    // DOMContentLoadedイベントでuiHelperの存在を確認
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🔍 uiHelper初期化状態確認:', !!window.uiHelper);
      console.log('🧰 利用可能な関数:', Object.keys(window.uiHelper).join(', '));
      
      // DOMContentLoadedでは自動的に初期化しない
      // それぞれのモジュールが必要に応じて初期化する
    });
  }
  
  // 初期化直後にもコンソールに状態を出力
  console.log('🚀 uiHelper初期化完了:', !!window.uiHelper);
}

// デフォルトエクスポート
export default {
  showBubble,
  hideBubble,
  setText,
  // showError, shouldShowError, を削除
  updateConnectionStatus,
  renderSettingUI,
  initUIElements,
  debugBubbleStyles,
  forceResetAndShowBubble,
  testBubbleDisplay,
  testBubbleToggle,
}; 
