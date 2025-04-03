/**
 * apiClient.js
 * APIリクエスト用のaxiosクライアントを提供
 */

import axios from 'axios';

// APIクライアントの設定
const BASE_URL = 'http://localhost:8000';

// axiosインスタンスの作成
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * 設定を更新するAPIを呼び出す
 * @param {string} key - 設定キー
 * @param {boolean|string|number} value - 設定値
 * @returns {Promise<Object>} - レスポンスデータ
 */
export async function updateSetting(key, value) {
  try {
    console.log(`🔄 設定更新API呼び出し: ${key}=${value}`);
    const response = await apiClient.post('/api/settings/update', {
      key,
      value
    });
    console.log('✅ 設定更新API成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ 設定更新APIエラー:', error);
    throw error;
  }
}

/**
 * すべての設定を取得するAPIを呼び出す
 * @returns {Promise<Object>} - レスポンスデータ
 */
export async function getAllSettings() {
  try {
    console.log('🔍 全設定取得API呼び出し');
    const response = await apiClient.get('/api/settings/all');
    console.log('✅ 全設定取得API成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ 全設定取得APIエラー:', error);
    throw error;
  }
}

/**
 * 設定を取得するAPIを呼び出す（getAllSettingsのエイリアス）
 * @returns {Promise<Object>} - レスポンスデータ
 */
export async function getSettings() {
  console.log('🔍 getSettings関数が呼び出されました');
  return getAllSettings();
}

export default {
  updateSetting,
  getAllSettings,
  getSettings
}; 