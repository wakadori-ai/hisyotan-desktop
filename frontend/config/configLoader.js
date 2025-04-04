// configLoader.js
// 設定読み込み用のモジュール

import { logDebug, logError } from '@core/logger.js';

// デフォルト設定
const defaultConfig = {
  voicevox: {
    host: 'http://127.0.0.1:50021',
    speaker_id: 8
  },
  voice: {
    secretary_voice_params: {
      normal: {
        speed_scale: 0.9,
        pitch_scale: 0.05,
        intonation_scale: 1.1,
        volume_scale: 1.0
      }
    }
  },
  backend: {
    host: 'http://127.0.0.1:8000',
    ws_url: 'ws://127.0.0.1:8000/ws',
    ws_url_alt: 'ws://localhost:8000/ws'  // 代替WebSocket URL（localhost版）
  },
  api: {
    baseUrl: 'http://127.0.0.1:8000'
  }
};

// グローバル変数
let config = { ...defaultConfig }; // デフォルト設定で初期化

// APIのデフォルトベースURL
const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000';

/**
 * 設定を読み込む
 * @param {Object} configData - 設定データ
 */
export function loadConfig(configData) {
  if (!configData) {
    logDebug('設定データがnullのため、デフォルト設定を使用します');
    return { ...defaultConfig };
  }
  
  // デフォルト設定をベースに、渡された設定で上書き
  config = { ...defaultConfig, ...configData };
  logDebug('設定を読み込みました');
  
  // APIベースURLがなければデフォルト値を設定
  if (!config.api) {
    config.api = { baseUrl: DEFAULT_API_BASE_URL };
  } else if (!config.api.baseUrl) {
    config.api.baseUrl = DEFAULT_API_BASE_URL;
  }
  
  // バックエンド設定がなければデフォルト値を設定
  if (!config.backend) {
    config.backend = { ...defaultConfig.backend };
  }
  
  // WebSocket URLの代替値がなければデフォルト値を設定
  if (!config.backend.ws_url_alt) {
    config.backend.ws_url_alt = defaultConfig.backend.ws_url_alt;
  }
  
  return config;
}

/**
 * 設定を取得する
 * @returns {Object} 設定データ
 */
export function getConfig() {
  return config;
}

/**
 * APIのベースURLを取得する
 * @returns {string} APIのベースURL
 */
export function getAPIBaseUrl() {
  if (!config || !config.api || !config.api.baseUrl) {
    return DEFAULT_API_BASE_URL;
  }
  return config.api.baseUrl;
}

/**
 * 感情パラメータを取得する
 * @param {string} emotion - 感情名
 * @returns {Object} パラメータオブジェクト
 */
export function getEmotionParams(emotion) {
  if (!config || !config.emotions || !config.emotions.states) {
    return { threshold: 0, expression: 'normal', decay_rate: 0.5 };
  }
  
  // 感情名から対応するパラメータを取得
  const emotionData = config.emotions.states.find(state => state.name === emotion);
  if (!emotionData) {
    // デフォルト値を返す
    return { threshold: 0, expression: 'normal', decay_rate: 0.5 };
  }
  
  return emotionData;
}

/**
 * 感情に対応するVOICEVOXパラメータを取得
 * @param {Object} cfg - 設定オブジェクト
 * @param {string} emotion - 感情名
 * @returns {Object} パラメータオブジェクト
 */
export function getVoiceParams(cfg, emotion = 'normal') {
  if (!cfg) {
    cfg = config;
  }
  
  // デフォルト値
  const defaultParams = {
    speed_scale: 1.0,
    pitch_scale: 0.0,
    intonation_scale: 1.0
  };
  
  try {
    // 設定が存在しない場合はデフォルト
    if (!cfg || !cfg.voice || !cfg.voice.secretary_voice_params) {
      logDebug('ボイスパラメータが設定されていません。デフォルト値を使用します');
      return defaultParams;
    }
    
    // 指定された感情のパラメータを取得
    const voiceParams = cfg.voice.secretary_voice_params[emotion];
    if (!voiceParams) {
      logDebug(`感情「${emotion}」のボイスパラメータが見つかりません。デフォルト値を使用します`);
      return cfg.voice.secretary_voice_params.normal || defaultParams;
    }
    
    return voiceParams;
  } catch (error) {
    logError(`ボイスパラメータの取得でエラー: ${error.message}`);
    return defaultParams;
  }
}

/**
 * デフォルト設定を取得する
 * @returns {Object} デフォルト設定オブジェクト
 */
export function getDefaultConfig() {
  return JSON.parse(JSON.stringify(defaultConfig));
} 