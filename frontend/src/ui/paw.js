/**
 * paw.js
 * 肉球UI用のメインJSファイル
 * Viteビルドのエントリーポイント
 */
// スタイルシート読み込み - 複数の方法を試す
// import './styles.css'; // 相対パス
// import '/src/ui/styles.css'; // 絶対パス

import { createTestSettingsUI, hideBubble } from './paw-context-menu.js';
import apiClient from '@core/apiClient.js';

// デバッグ情報
console.log('🌸 paw.js が読み込まれました');
console.log('🔍 ビルドモード:', import.meta.env.MODE);
console.log('📁 現在の実行パス:', import.meta.env.BASE_URL);

// グローバルアクセス用に設定
window.settingsApi = apiClient;
window.createTestSettingsUI = createTestSettingsUI;
window.hideBubble = hideBubble;

// DOM構築後の初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌟 肉球UIが初期化されました');
  
  // 肉球UI用のHTML構造を動的に生成
  const appDiv = document.getElementById('app');
  if (appDiv) {
    appDiv.innerHTML = `
      <div class="paw-button-wrapper">
        <div id="paw-button">🐾</div>
        <div class="paw-background"></div>
      </div>
      <div id="quit-button">×</div>
      <div class="quit-bubble">アプリを終了しますか？</div>
      <div id="speechBubble" class="speech-bubble">
        <div id="speechText" class="speech-text">「こんにちは！何かお手伝いしましょうか？」</div>
        <img id="assistantImage" class="assistant-image" src="/assets/secretary.png" alt="秘書たん">
      </div>
    `;
    
    // 終了ボタンのイベント設定
    const quitButton = document.getElementById('quit-button');
    if (quitButton) {
      quitButton.addEventListener('click', () => {
        if (window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send('quit-app');
        } else {
          console.error('Electron IPCが利用できません');
        }
      });
    }
    
    // 肉球ボタンのイベント設定
    const pawButton = document.getElementById('paw-button');
    if (pawButton) {
      pawButton.addEventListener('click', async () => {
        await createTestSettingsUI();
      });
    }
  }
});

// Electronからのイベントを処理するためのリスナー
if (window.electron && window.electron.ipcRenderer) {
  // SpeechManager操作を受け取るリスナー
  window.electron.ipcRenderer.on('speech-manager-operation', (data) => {
    console.log('🎯 SpeechManager操作イベントを受信:', data);
    
    if (!window.speechManager) {
      console.error('speechManagerが利用できません');
      return;
    }
    
    const { method, args } = data;
    
    // メソッドが存在するか確認
    if (typeof window.speechManager[method] === 'function') {
      // メソッドを呼び出す
      try {
        window.speechManager[method](...args);
      } catch (error) {
        console.error(`speechManager.${method}の呼び出しエラー:`, error);
      }
    } else {
      console.error(`speechManagerに${method}メソッドが存在しません`);
    }
  });
}

// ビルド環境の表示
console.log(`🔧 現在の実行環境: ${import.meta.env.MODE}`);

// エクスポート
export default {
  apiClient,
  createTestSettingsUI,
  hideBubble
}; 