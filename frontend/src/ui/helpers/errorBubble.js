// errorBubble.js
// エラー表示機能を担当するモジュール

import { logDebug, logError } from '@core/logger.js';
import { showBubble } from '@ui/uiHelper.js';

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
  logDebug('エラー表示は現在 showBubble に移行しました');
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
  
  // showBubbleを使用してエラーメッセージを表示
  showBubble('error', message);
  
  logDebug(`エラー表示を開始: ${message}`);
}

// グローバルアクセス用のオブジェクトをエクスポート
export const errorBubbleModule = {
  initErrorElements,
  showError,
  shouldShowError
}; 