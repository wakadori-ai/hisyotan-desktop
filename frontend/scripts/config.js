// configLoader.js
// 設定読み込み用のモジュール

import { logDebug, logError } from './logger.js';

// デフォルト設定
const defaultConfig = {
  voicevox: {
    host: 'http://127.0.0.1:50021',
    speaker_id: 8
  },
  backend: {
    host: 'http://127.0.0.1:8000',
    ws_url: 'ws://127.0.0.1:8000/ws'
  },
  api: {
    baseUrl: 'http://127.0.0.1:8000'
  }
};

// グローバル変数
let config = { ...defaultConfig }; // デフォルト設定で初期化

/**
 * 設定を読み込む
 * @param {Object} configData - 設定データ
 */
export function loadConfig(configData) {
  if (!configData) {
    logDebug('設定データがnullのため、デフォルト設定を使用します');
    return;
  }
  
  // デフォルト設定をベースに、渡された設定で上書き
  config = { ...defaultConfig, ...configData };
  logDebug('設定を読み込みました');
  
  // APIベースURLがなければデフォルト値を設定
  if (!config.api) {
    config.api = { baseUrl: defaultConfig.api.baseUrl };
  } else if (!config.api.baseUrl) {
    config.api.baseUrl = defaultConfig.api.baseUrl;
  }
}

/**
 * 設定を取得する
 * @returns {Object} 設定データ
 */
export function getConfig() {
  return config;
} 