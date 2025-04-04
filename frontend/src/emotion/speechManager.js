/**
 * speechManager.js
 * 発話・音声合成用のモジュール
 * 後方互換性のためのラッパー
 */

import { SpeechManager } from './SpeechManager/SpeechManager.js';
import { logDebug } from '@core/logger.js';

// SpeechManagerのインスタンスを作成
const instance = new SpeechManager();
logDebug('speechManager: 後方互換ラッパーを初期化しました');

// 全てのメソッドをエクスポート
export const {
  speak,
  speakWithObject,
  speakWithPreset,
  sayMessage,
  checkVoicevoxConnection,
  setConfig,
  showHordeModeToggle,
  getHordeModeState,
  setHordeModeState,
  isPlaying,
  getFormattedMessage
} = instance;

// このモジュールのオブジェクトを作成（挙動の一貫性を保つため）
const speechManager = {
  speak,
  speakWithObject,
  speakWithPreset,
  sayMessage,
  checkVoicevoxConnection,
  setConfig,
  showHordeModeToggle,
  getHordeModeState,
  setHordeModeState,
  isPlaying,
  getFormattedMessage,
  hideTimeoutMap: instance.hideTimeoutMap
};

// グローバルスコープにspeechManagerを公開（テストなどで使用）
if (typeof window !== 'undefined') {
  window.speechManager = speechManager;
  logDebug('speechManagerをグローバルスコープに公開しました');
}

// デフォルトエクスポート
export default speechManager; 