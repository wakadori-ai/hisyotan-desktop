/**
 * renderer.js
 * レンダラープロセスのエントリーポイント
 * UIやイベントハンドリングの初期化を行います
 */

// スタイルシート読み込み（インポート時にコンソール出力を追加）
console.log('🎨 styles.cssを読み込み開始します');
import '../ui/styles/main.css';
console.log('✅ styles.cssの読み込み完了');

// ヘルパーモジュールをインポート
import * as assistantUI from './assistantUI.js';
import apiClient from '../core/apiClient.js';
import speechManager from '../emotion/speechManager.js';

// デバッグ情報
console.log('🌸 renderer.js が読み込まれました');
console.log('🔍 ビルドモード:', import.meta.env.MODE);
console.log('📁 現在の実行パス:', import.meta.env.BASE_URL);

// グローバルアクセス用に設定
window.assistantUI = assistantUI;
window.settingsApi = apiClient;
window.speechManager = speechManager;
console.log('🎤 SpeechManager をグローバルに登録しました');

// DOM構築後の初期化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🌟 UIの初期化を開始します');
  
  // UIを生成
  assistantUI.createUI();
  
  // 設定読み込み
  try {
    const config = await apiClient.getSettings();
    console.log('⚙️ 設定をロードしました', config);

    // SpeechManagerに設定をセット
    if (window.speechManager) {
      speechManager.setConfig(config.settings);
      console.log('🎤 SpeechManagerに設定をセットしました');
      
      // VOICEVOX接続確認
      speechManager.checkVoicevoxConnection()
        .then(connected => {
          console.log(`🎙️ VOICEVOX接続確認結果: ${connected ? '接続成功' : '接続失敗'}`);
        })
        .catch(err => {
          console.error('🎙️ VOICEVOX接続確認エラー:', err);
        });
    }
  } catch (error) {
    console.error('⚠️ 設定のロードに失敗しました:', error);
  }
  
  // 歓迎メッセージを表示
  assistantUI.showBubble('default');
  
  // スタイル適用確認
  setTimeout(() => {
    console.log('⏱️ タイムアウト後のスタイル確認:');
    const bubbleElement = document.getElementById('speechBubble');
    if (bubbleElement) {
      console.log('吹き出しのスタイル:', {
        display: bubbleElement.style.display,
        computedDisplay: window.getComputedStyle(bubbleElement).display,
        visibility: window.getComputedStyle(bubbleElement).visibility,
        opacity: window.getComputedStyle(bubbleElement).opacity
      });
    }
  }, 1000);
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
  assistantUI,
  apiClient,
  speechManager
}; 