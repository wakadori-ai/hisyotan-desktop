// errorBubble.js
// エラー表示機能を担当するモジュール

import { logDebug, logError } from '@core/logger.js';

// DOM要素
let errorBubble;
let errorText;

// 起動猶予期間の設定
const INIT_GRACE_PERIOD_MS = 5000;
const startTime = Date.now();
let lastShownErrorMessage = null;
let lastErrorTime = 0;

/**
 * エラー表示関連のDOM要素を初期化する
 */
export function initErrorElements() {
  logDebug('エラー表示要素初期化を開始');
  
  // 要素の取得
  errorBubble = document.getElementById('errorBubble');
  errorText = document.getElementById('errorText');
  
  // 各要素の存在確認とログ
  if (errorBubble) {
    logDebug('errorBubble要素を取得しました');
  } else {
    logError('errorBubble要素が見つかりません');
  }
  
  if (errorText) {
    logDebug('errorText要素を取得しました');
  } else {
    logError('errorText要素が見つかりません');
  }
  
  logDebug('エラー表示要素初期化が完了しました');
}

/**
 * エラーを表示すべきかどうかを判断する
 * @returns {boolean} エラーを表示すべきならtrue
 */
export function shouldShowError() {
  return Date.now() - startTime > INIT_GRACE_PERIOD_MS;
}

/**
 * エラーメッセージを表示する
 * @param {string} message - エラーメッセージ
 * @param {boolean} force - 猶予期間に関わらず強制表示するかどうか
 */
export function showError(message, force = false) {
  // 起動猶予期間中は表示しない（forceフラグがない場合）
  if (!force && !shouldShowError()) {
    logDebug(`起動猶予期間中のためエラー表示をスキップします: ${message}`);
    return;
  }

  // 同じエラーが短時間に連続表示されることを防止（3秒以内の重複は無視）
  const now = Date.now();
  if (message === lastShownErrorMessage && now - lastErrorTime < 3000) {
    logDebug(`重複エラーのため表示をスキップします（3秒以内）: ${message}`);
    return;
  }

  // エラーメッセージと表示時間を記録
  lastShownErrorMessage = message;
  lastErrorTime = now;
  
  logDebug(`エラー表示関数が呼び出されました: ${message}`);
  
  // DOM要素が確実に取得できるか再チェック
  if (!errorText || !errorBubble) {
    logDebug('errorText/errorBubble要素が見つかりません。再取得を試みます');
    errorText = document.getElementById('errorText');
    errorBubble = document.getElementById('errorBubble');
    
    if (!errorText || !errorBubble) {
      logError('エラー表示要素の取得に失敗しました', new Error('DOM要素が見つかりません'));
      console.error('エラーメッセージを表示できません:', message);
      return;
    }
  }
  
  // エラーメッセージをセット
  errorText.textContent = `「${message}」`;
  
  // 確実に表示するため強制的なスタイル設定
  errorBubble.style.cssText = `
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: absolute !important;
    top: 20px !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    z-index: 2147483647 !important;
    pointer-events: auto !important;
  `;
  
  // 8秒後に非表示
  setTimeout(() => {
    errorBubble.style.cssText = `
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    `;
    logDebug(`エラー表示を終了: ${message}`);
  }, 8000);
  
  logDebug(`エラー表示を開始: ${message}`);
}

// グローバルアクセス用のオブジェクトをエクスポート
export const errorBubbleModule = {
  initErrorElements,
  showError,
  shouldShowError
}; 