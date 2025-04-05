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
import { initAssistantUI } from './assistantUI.js';

// デバッグ情報
console.log('🌸 renderer.js が読み込まれました');
console.log('🔍 ビルドモード:', import.meta.env.MODE);
console.log('📁 現在の実行パス:', import.meta.env.BASE_URL);

// 初期化状態を追跡するフラグ
let isAppInitialized = false;

// グローバルアクセス用に設定
window.assistantUI = assistantUI;
window.settingsApi = apiClient;

// speechManagerが正しく読み込まれていることを確認
try {
  if (!speechManager) {
    console.error('❌ speechManagerのインポートに失敗しました');
  } else {
    window.speechManager = speechManager;
    console.log('🎤 SpeechManager をグローバルに登録しました:', 
      Object.keys(speechManager).join(', '));
      
    // メソッドの存在確認
    if (typeof speechManager.speak === 'function') {
      console.log('✅ speechManager.speakメソッドが存在します');
    } else {
      console.error('❌ speechManager.speakメソッドが見つかりません');
    }
  }
} catch (err) {
  console.error('❌ speechManager初期化エラー:', err);
}

// フォールバック：speechManagerが存在しない場合の簡易実装
if (!window.speechManager) {
  console.log('⚠️ フォールバックspeechManagerを作成します');
  window.speechManager = {
    speak: (text, emotion, duration) => {
      console.log(`フォールバックspeak: ${text} (${emotion}, ${duration}ms)`);
      assistantUI.showBubble('default', text);
      return true;
    },
    checkVoicevoxConnection: async () => false,
    setConfig: (config) => console.log('フォールバックsetConfig:', config)
  };
}

/**
 * レンダラープロセスの初期化
 */
async function init() {
  try {
    console.log('🚀 レンダラープロセスを初期化します');
    
    // アシスタントUIの初期化
    initAssistantUI();
    
    // ここにアプリケーションの初期化コードを追加
    
    console.log('✅ レンダラープロセスの初期化が完了しました');
  } catch (error) {
    console.error('⚠️ レンダラープロセスの初期化エラー:', error);
  }
}

// 初期化実行
init();

// DOM構築後の初期化
document.addEventListener('DOMContentLoaded', () => {
  console.log('🌟 DOMContentLoaded: UIの初期化を開始します');
  
  // 少し遅延を入れてDOM要素が完全に読み込まれるのを確保
  setTimeout(async () => {
    await initializeApp();
  }, 100);

  // スタイル適用確認
  setTimeout(() => {
    console.log('⏱️ タイムアウト後のスタイル確認:');
    checkUIElements(true);
  }, 1000);
});

// デバッグ用：UI要素の存在確認
function checkUIElements(includeStyles = false) {
  const elements = [
    'paw-button', 'quit-button', 'speechBubble', 
    'speechText', 'assistantImage'
    // 'errorBubble' を削除（不要なため）
  ];
  
  console.log('🔍 UI要素チェック結果:');
  elements.forEach(id => {
    const el = document.getElementById(id);
    console.log(`${id}: ${el ? '✅ 存在します' : '❌ 見つかりません'}`);
    
    // スタイル情報も表示する場合
    if (includeStyles && el) {
      const computedStyle = window.getComputedStyle(el);
      console.log(`  - display: ${computedStyle.display}`);
      console.log(`  - visibility: ${computedStyle.visibility}`);
      console.log(`  - opacity: ${computedStyle.opacity}`);
      
      if (id === 'assistantImage') {
        // 立ち絵の追加チェック
        console.log(`  - width: ${computedStyle.width}`);
        console.log(`  - height: ${computedStyle.height}`);
        console.log(`  - src: ${el.src}`);
        
        // 立ち絵が表示されていない場合は修正
        if (computedStyle.display === 'none' || parseFloat(computedStyle.opacity) < 0.1) {
          console.log('立ち絵が表示されていません。表示設定を適用します。');
          el.style.display = 'block';
          el.style.opacity = '1';
          el.style.visibility = 'visible';
        }
      }
      
      // pawButtonの見た目を確認・修正
      if (id === 'paw-button') {
        console.log(`  - backgroundColor: ${computedStyle.backgroundColor}`);
        console.log(`  - backgroundImage: ${computedStyle.backgroundImage}`);
        
        // 肉球ボタンの外観を強化（白い四角の問題を解決）
        if (computedStyle.backgroundImage === 'none' || computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)') {
          console.log('肉球ボタンの見た目に問題があります。スタイルを強化します。');
          el.style.backgroundImage = 'radial-gradient(circle, #ffb6c1 0%, #ff69b4 100%)';
          el.style.backgroundColor = 'rgba(255, 192, 203, 0.8)';
          el.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
          el.style.fontSize = '24px';
          el.textContent = '🐾';
        }
      }
    }
  });
}

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