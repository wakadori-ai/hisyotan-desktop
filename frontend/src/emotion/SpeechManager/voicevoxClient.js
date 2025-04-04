/**
 * voicevoxClient.js
 * VOICEVOX音声合成エンジンとの通信を担当するモジュール
 */

import { logDebug, logError } from '@core/logger.js';

/**
 * 音声合成リクエストを送信する
 * @param {string} text - 合成するテキスト
 * @param {string} emotion - 感情
 * @param {number} speakerId - 話者ID
 * @param {AbortSignal} signal - リクエストキャンセル用のシグナル
 * @returns {Promise<boolean>} 成功したかどうか
 */
export async function requestVoiceSynthesis(text, emotion = 'normal', speakerId = 8, signal = null) {
  try {
    // バックエンドAPIのベースURLを設定
    const apiBaseUrl = 'http://127.0.0.1:8000';
    
    logDebug(`VOICEVOX音声合成APIを呼び出します (話者ID: ${speakerId}, 感情: ${emotion})`);
    
    // タイムアウト設定
    const timeoutSignal = AbortSignal.timeout(10000); // 10秒でタイムアウト
    
    // 複数のシグナルを組み合わせる関数
    const combineSignals = (...signals) => {
      // nullや未定義のシグナルを除外
      const validSignals = signals.filter(s => s);
      if (validSignals.length === 0) return null;
      if (validSignals.length === 1) return validSignals[0];
      
      const controller = new AbortController();
      const { signal } = controller;
      
      validSignals.forEach(s => {
        if (s.aborted) {
          controller.abort(s.reason);
          return;
        }
        
        s.addEventListener('abort', () => controller.abort(s.reason), { once: true });
      });
      
      return signal;
    };
    
    // シグナルの組み合わせ
    const combinedSignal = combineSignals(signal, timeoutSignal);
    
    // リクエストボディを準備
    const requestBody = {
      text: text,
      emotion: emotion,
      speaker_id: speakerId
    };
    
    logDebug(`リクエスト内容: ${JSON.stringify(requestBody)}`);
    
    // バックエンド側で音声合成＆再生するAPIを呼び出す
    const response = await fetch(`${apiBaseUrl}/api/voice/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: combinedSignal
    });
    
    if (!response.ok) {
      // レスポンスのテキストを取得してエラーメッセージに含める
      const errorText = await response.text();
      logError(`バックエンドAPI呼び出し失敗: ${response.status} ${response.statusText}`);
      logError(`エラー詳細: ${errorText}`);
      throw new Error(`バックエンドAPI呼び出し失敗: ${response.status} ${response.statusText}`);
    }
    
    // レスポンスからステータスを確認
    const result = await response.json();
    if (result.status !== 'success') {
      logError(`音声再生リクエストエラー: ${result.message}`);
      throw new Error(`音声再生リクエストエラー: ${result.message}`);
    }
    
    logDebug(`音声再生リクエスト成功: ${result.message}`);
    return true;
    
  } catch (error) {
    // エラーハンドリング：AbortErrorの場合は正常処理
    if (error.name === 'AbortError') {
      if (error.message === 'The operation was aborted due to timeout') {
        logDebug("⏱ 音声合成リクエストがタイムアウトしました");
      } else {
        logDebug("🎙 発話リクエストがキャンセルされました");
      }
      return false;
    }
    
    // ネットワークエラーの場合
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      logDebug(`ネットワークエラー: バックエンドサーバーに接続できません`);
      return false;
    }
    
    logError(`VOICEVOX音声合成エラー: ${error.message}`);
    return false;
  }
}

/**
 * VOICEVOX接続確認API呼び出し
 * @returns {Promise<boolean>} 接続成功したかどうか
 */
export async function checkVoicevoxConnection() {
  try {
    // バックエンドAPIのURLを直接指定
    const apiBaseUrl = 'http://127.0.0.1:8000';
    const response = await fetch(`${apiBaseUrl}/api/voice/check-connection`);
    
    if (response.ok) {
      const result = await response.json();
      return result.connected;
    }
    return false;
  } catch (error) {
    logError(`VOICEVOX接続確認エラー: ${error.message}`);
    return false;
  }
}

export default {
  requestVoiceSynthesis,
  checkVoicevoxConnection
}; 