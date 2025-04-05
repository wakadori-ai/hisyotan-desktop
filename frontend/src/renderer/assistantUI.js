/**
 * assistantUI.js
 * アシスタントUIの初期化と制御
 */

// 必要なモジュールのインポート
import { observeSpeechTextAutoRecovery } from '../ui/helpers/speechObserver.js';
import { createUI, initUIElements } from '../ui/helpers/uiBuilder.js';
import { setupEventListeners } from '../ui/handlers/uiEventHandlers.js';
import { showHordeModeSettings, showBubble, setText } from '../ui/helpers/speechController.js';
import { showAssistantImage } from '../ui/helpers/assistantImage.js';
import { cleanupDuplicateElements, verifyAndFixUIStructure } from '../ui/helpers/uiVerifier.js';

// スタイルシートをインポート
import '@ui/styles/main.css';
// CSS変数のある変数ファイルも直接インポート
import '@ui/styles/base/_variables.css';
// 立ち絵・吹き出し用コンポーネントスタイルも明示的にインポート
import '@ui/styles/components/_assistant.css';
// 肉球ボタン用スタイルを明示的にインポート
import '@ui/styles/components/_paw-button.css';

// グローバル要素の参照を保持
let pawButton;
let quitButton;
let speechBubble;
let speechText;
let assistantImage;



// エクスポート
export {
  showHordeModeSettings,
  setText,
  showBubble
}; 

// DOMの読み込み完了後にUIを初期化
let domInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
  // 多重初期化の防止
  if (domInitialized) {
    console.log('🔄 DOMContentLoadedは既に処理済みです。処理をスキップします。');
    return;
  }
  
  // 初期化フラグを設定
  domInitialized = true;
  
  console.log('🌟 DOMContentLoaded: assistantUI初期化を開始します');
  
  // すでに初期化済みかどうかをフラグで確認
  if (window._assistantUIInitialized) {
    console.log('🔄 UI要素はすでに初期化済みです。再初期化をスキップします。');
    return;
  }
  
  // 重複要素のクリーンアップを最初に実行
  cleanupDuplicateElements();
  
  // DOM構造やCSSをチェックし、問題があれば修正
  setTimeout(() => {
    verifyAndFixUIStructure();
  }, 300);
  
  // すでにDOMに存在する要素を確認
  if (!document.getElementById('assistantImage')) {
    console.log('🎨 UIを新規作成します');
    createUI();
  } else {
    console.log('♻️ 既存のUI要素を再利用します');
  }
  
  // 立ち絵を表示
  setTimeout(() => {
    showAssistantImage();
    
    // ウェルカムメッセージを設定し、自動非表示を防止
    const welcomeMessage = 'こんにちは！何かお手伝いしましょうか？';
    console.log('🌸 ウェルカムメッセージを表示します:', welcomeMessage);
    
    // 安定したウェルカムメッセージ表示（遅延処理）
    setTimeout(() => {
      // 吹き出し要素の取得
      const bubble = document.getElementById('speechBubble');
      const textElement = document.getElementById('speechText');
      
      if (bubble && textElement) {
        // 吹き出しを表示状態に設定
        bubble.style.cssText = `
          display: flex !important; 
          visibility: visible !important; 
          opacity: 1 !important;
          z-index: 9999 !important;
        `;
        bubble.classList.add('speech-bubble', 'show', 'fixed-position');
        
        // setText関数を使用してウェルカムメッセージを設定
        setText(welcomeMessage);
        
        // データ属性に初期メッセージであることを記録
        textElement.dataset.isWelcomeMessage = 'true';
        
        // 吹き出しが非表示にならないように監視
        startWelcomeMessageProtection();
      } else {
        console.error('speechBubbleまたはspeechText要素が見つかりません');
      }
    }, 500);
  }, 100);
  
  // 初期化済みフラグを設定
  window._assistantUIInitialized = true;
  
  console.log('🌸 assistantUI初期化完了');
});



/**
 * ウェルカムメッセージの保護機能
 * 初期化後の一定時間、ウェルカムメッセージが消えないようにする
 */
function startWelcomeMessageProtection() {
  console.log('🛡️ ウェルカムメッセージ保護を開始します');
  
  // 保護期間（5秒）
  const PROTECTION_DURATION = 5000;
  
  // メッセージが消えていないか定期的にチェック
  const textRestoreInterval = setInterval(() => {
    const textElement = document.getElementById('speechText');
    const bubble = document.getElementById('speechBubble');
    
    if (textElement && bubble) {
      // テキストが空になっていないか確認
      if (!textElement.textContent || textElement.textContent.trim() === '') {
        // データ属性から元のテキストを取得
        const originalText = textElement.dataset.originalText;
        
        if (originalText) {
          console.log(`🔄 空になったウェルカムメッセージを復元します: "${originalText}"`);
          
          // setText関数を使用してテキストを復元
          setText(originalText);
          
          // 吹き出しも表示状態に戻す
          bubble.style.cssText = `
            display: flex !important; 
            visibility: visible !important; 
            opacity: 1 !important;
            z-index: 9999 !important;
          `;
          bubble.classList.add('show');
          bubble.classList.remove('hide');
        }
      }
    }
  }, 100);
  
  // 保護期間後に監視を終了
  setTimeout(() => {
    clearInterval(textRestoreInterval);
    console.log('🛡️ ウェルカムメッセージ保護期間が終了しました');
  }, PROTECTION_DURATION);
} 

/**
 * アシスタントUIの初期化処理
 */
export function initAssistantUI() {
  try {
    console.log('アシスタントUIを初期化します');
    
    // UIの準備
    createUI();
    
    // イベントハンドラの設定
    setupEventListeners();
    
    // 吹き出し要素の初期化
    initUIElements();
    
    // スピーチテキスト監視を開始
    if (typeof observeSpeechTextAutoRecovery === 'function') {
      observeSpeechTextAutoRecovery();
      console.log('スピーチテキスト自動復旧の監視を開始しました');
    } else {
      console.error('observeSpeechTextAutoRecovery関数が見つかりません');
    }
    
    // ウェルカムメッセージはdelayを設けて安定させる
    setTimeout(() => {
      // 初期化時のウェルカムメッセージ表示（すでに表示済みでなければ）
      if (!window.hasShownWelcomeMessage) {
        console.log('🌸 ウェルカムメッセージを表示します（初期化）');
        
        // electronAPI.speakの存在チェック
        if (typeof window.electronAPI?.speak === 'function') {
          window.electronAPI.speak('お疲れ様です！休憩も大切ですよ✨', 'smile');
        } else {
          console.warn('⚠️ window.electronAPI.speak が未定義です。代替手段を使用します。');
          
          // speechManager.speakを使用（代替手段）
          if (window.speechManager?.speak) {
            window.speechManager.speak('お疲れ様です！休憩も大切ですよ✨', 'smile');
          } else {
            // 最終手段：直接テキスト表示
            console.log('⚠️ 代替手段も使用できません。直接テキスト表示を行います。');
            setText('お疲れ様です！休憩も大切ですよ✨');
          }
        }
        
        // ウェルカムメッセージ表示済みフラグを設定
        window.hasShownWelcomeMessage = true;
      } else {
        console.log('🌸 ウェルカムメッセージはすでに表示済みです（スキップ）');
      }
    }, 800); // 800ms待ってから表示（UI初期化が完了するのを待つ）
    
    console.log('アシスタントUIの初期化が完了しました');
    return true;
  } catch (error) {
    console.error('アシスタントUI初期化エラー:', error);
    return false;
  }
} 