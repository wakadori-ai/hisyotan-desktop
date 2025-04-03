/**
 * renderer.js
 * レンダラープロセスのエントリーポイント
 * UIやイベントハンドリングの初期化を行います
 */

// スタイルシート読み込み（インポート時にコンソール出力を追加）
console.log('🎨 styles.cssを読み込み開始します');
import stylesModule from '../ui/styles.css?inline';
console.log('✅ styles.cssの読み込み完了:', stylesModule);

// 明示的にCSSを適用する試み
const ensureCssApplied = () => {
  // CSSが読み込まれたことを視覚的に確認するための要素を追加
  const debugMarker = document.createElement('div');
  debugMarker.className = 'css-load-marker';
  debugMarker.textContent = 'CSS読込確認';
  debugMarker.style.cssText = `
    position: fixed;
    top: 150px;
    left: 20px;
    background: purple;
    color: white;
    padding: 5px;
    z-index: 999999;
    font-size: 12px;
    border-radius: 4px;
  `;
  document.body.appendChild(debugMarker);
  
  console.log('💫 明示的なCSS適用処理を実行しました');
};

// ヘルパーモジュールをインポート
import * as uiHelper from './uiHelper.js';
import apiClient from '../core/apiClient.js';

// デバッグ情報
console.log('🌸 renderer.js が読み込まれました');
console.log('🔍 ビルドモード:', import.meta.env.MODE);
console.log('📁 現在の実行パス:', import.meta.env.BASE_URL);

// グローバルアクセス用に設定
window.uiHelper = uiHelper;
window.settingsApi = apiClient;

// DOM構築後の初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌟 UIの初期化を開始します');
  
  // CSSが確実に適用されるようにする
  ensureCssApplied();
  
  // UIを生成
  uiHelper.createUI();
  
  // 歓迎メッセージを表示
  uiHelper.showBubble('default');
  
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
  uiHelper,
  apiClient
}; 