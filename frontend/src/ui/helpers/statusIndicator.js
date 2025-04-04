// statusIndicator.js
// 接続状態インジケーター機能を担当するモジュール

import { logDebug, logError } from '@core/logger.js';

// DOM要素
let statusIndicator;

/**
 * 接続状態インジケーターのDOM要素を初期化する
 */
export function initStatusIndicator() {
  logDebug('接続状態インジケーター初期化を開始');
  
  // 要素の取得
  statusIndicator = document.getElementById('statusIndicator');
  
  // 要素の存在確認とログ
  if (statusIndicator) {
    logDebug('statusIndicator要素を取得しました');
  } else {
    logError('statusIndicator要素が見つかりません');
  }
  
  logDebug('接続状態インジケーター初期化が完了しました');
}

/**
 * 接続状態の表示を更新する
 * @param {string} status - 接続状態
 * @param {number} reconnectAttempts - 再接続試行回数
 * @param {number} maxReconnectAttempts - 最大再接続試行回数
 */
export function updateConnectionStatus(status, reconnectAttempts = 0, maxReconnectAttempts = 5) {
  if (!statusIndicator) {
    statusIndicator = document.getElementById('statusIndicator');
    if (!statusIndicator) {
      logError('statusIndicator要素が見つかりません。接続状態を更新できません');
      return;
    }
  }
  
  statusIndicator.className = `status-indicator ${status}`;
  
  switch (status) {
    case 'connected':
      statusIndicator.title = '接続済み';
      break;
    case 'disconnected':
      statusIndicator.title = '切断されました';
      break;
    case 'reconnecting':
      statusIndicator.title = `再接続中 (${reconnectAttempts}/${maxReconnectAttempts})`;
      break;
    case 'error':
      statusIndicator.title = '接続エラー';
      break;
    case 'failed':
      statusIndicator.title = '接続失敗';
      break;
    default:
      statusIndicator.title = status;
  }
  
  logDebug(`接続状態更新: ${status}`);
}

// グローバルアクセス用のオブジェクトをエクスポート
export const statusIndicatorModule = {
  initStatusIndicator,
  updateConnectionStatus
}; 