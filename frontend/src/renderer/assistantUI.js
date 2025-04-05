/**
 * assistantUI.js
 * アシスタントUIの初期化と制御
 */

// 必要なモジュールのインポート
import { showBubble as showBubbleFromHelper, setText as setTextFromHelper, initSpeechBubbleElements } from '../ui/helpers/speechBubble.js';
import { observeSpeechTextAutoRecovery } from '../ui/helpers/speechObserver.js';
import { createUI, initUIElements } from '../ui/helpers/uiBuilder.js';
import { setupEventListeners } from '../ui/handlers/uiEventHandlers.js';
import { showHordeModeSettings } from '../ui/helpers/speechController.js';
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
  
  // 既存のUI要素の初期化
  initUIElements();
  
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
        
        // テキスト要素の初期化
        textElement.innerHTML = '';
        textElement.style.cssText = `
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          color: #4e3b2b !important;
          width: 100% !important;
        `;
        
        // ウェルカムメッセージをセット
        const spanElement = document.createElement('span');
        spanElement.textContent = welcomeMessage;
        spanElement.className = 'speech-text-content welcome-message';
        spanElement.style.cssText = `
          color: #4e3b2b !important; 
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          font-size: 1.05rem !important;
          line-height: 1.6 !important;
        `;
        textElement.appendChild(spanElement);
        
        // データ属性に初期メッセージであることを記録
        textElement.dataset.originalText = welcomeMessage;
        textElement.dataset.isWelcomeMessage = 'true';
        textElement.dataset.setTime = Date.now().toString();
        
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
 * 吹き出しの表示を確実にするためのヘルパー関数
 * @param {HTMLElement} bubble - 吹き出し要素
 */
function ensureBubbleVisibility(bubble) {
  if (!bubble) return;
  
  console.log('💬 吹き出しの表示状態を確認します');
  
  // 親要素の表示状態を確認
  const parent = bubble.parentElement;
  if (parent) {
    // 親要素が表示状態であることを確認
    if (getComputedStyle(parent).display === 'none') {
      console.log('⚠️ 親要素が非表示です。表示に設定します。');
      parent.style.display = 'block';
    }
    
    // 親要素のz-indexを確認
    const parentZIndex = parseInt(getComputedStyle(parent).zIndex);
    if (!isNaN(parentZIndex) && parentZIndex >= 9999) {
      console.log('⚠️ 親要素のz-indexが高すぎます。吹き出しのz-indexを上げます。');
      bubble.style.zIndex = (parentZIndex + 1);
    }
  }
  
  // 吹き出しの表示状態を再確認
  setTimeout(() => {
    const computedStyle = getComputedStyle(bubble);
    console.log('💬 吹き出し表示状態:', {
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      zIndex: computedStyle.zIndex,
      position: computedStyle.position
    });
    
    // 表示されていない場合は強制的に表示
    if (computedStyle.display === 'none' || 
        computedStyle.visibility === 'hidden' || 
        parseFloat(computedStyle.opacity) < 0.1) {
      console.log('⚠️ 吹き出しが表示されていません。強制的に表示します。');
      
      // 再度クラスを適用
      bubble.className = 'speech-bubble show fixed-position';
      
      // DOMツリーの最後に移動（他の要素の下に隠れる問題を解決）
      document.body.appendChild(bubble);
    }
  }, 100);
}

// UIデバッグユーティリティ
export function debugUI() {
  console.log('🔍 UIデバッグ情報を出力します');
  
  // UI要素の状態を確認
  const elements = {
    speechBubble: document.getElementById('speechBubble'),
    speechText: document.getElementById('speechText'),
    assistantImage: document.getElementById('assistantImage'),
    pawButton: document.getElementById('paw-button'),
    quitButton: document.getElementById('quit-button'),
    container: document.getElementById('assistant-container')
  };
  
  // 要素の存在をチェック
  console.log('🔍 UI要素の存在チェック:');
  for (const [name, element] of Object.entries(elements)) {
    console.log(`- ${name}: ${element ? '✅ 存在します' : '❌ 存在しません'}`);
  }
  
  // 吹き出し要素の重複チェック
  const speechBubbles = document.querySelectorAll('#speechBubble');
  console.log(`🔍 吹き出し要素の数: ${speechBubbles.length}`);
  
  // テキスト要素の重複チェック
  const speechTexts = document.querySelectorAll('#speechText');
  console.log(`🔍 テキスト要素の数: ${speechTexts.length}`);
  
  // 立ち絵要素の重複チェック
  const assistantImages = document.querySelectorAll('#assistantImage');
  console.log(`🔍 立ち絵要素の数: ${assistantImages.length}`);
  
  // 吹き出しの表示状態を確認
  if (elements.speechBubble) {
    const style = getComputedStyle(elements.speechBubble);
    console.log('🔍 吹き出し要素の表示状態:', {
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      zIndex: style.zIndex,
      position: style.position,
      width: style.width,
      height: style.height
    });
    
    // テキスト内容を確認
    if (elements.speechText) {
      console.log('🔍 テキスト要素の内容:', {
        textContent: elements.speechText.textContent,
        innerHTML: elements.speechText.innerHTML,
        childNodes: elements.speechText.childNodes.length
      });
    }
  }
  
  // 立ち絵の表示状態を確認
  if (elements.assistantImage) {
    const style = getComputedStyle(elements.assistantImage);
    console.log('🔍 立ち絵要素の表示状態:', {
      src: elements.assistantImage.src,
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity,
      width: style.width,
      height: style.height,
      naturalWidth: elements.assistantImage.naturalWidth,
      naturalHeight: elements.assistantImage.naturalHeight
    });
  }
  
  return {
    elements,
    restart: function() {
      // 重複要素をクリーンアップ
      cleanupDuplicateElements();
      
      // UI要素を作成し直す
      createUI();
      
      // 立ち絵を表示
      setTimeout(() => {
        showAssistantImage();
      }, 100);
      
      return 'UIを再構築しました。問題が解決したか確認してください。';
    },
    fixBubble: function() {
      // 吹き出し修復
      if (elements.speechBubble) {
        elements.speechBubble.remove();
      }
      
      // 新しい吹き出しを作成
      const newBubble = document.createElement('div');
      newBubble.id = 'speechBubble';
      newBubble.className = 'speech-bubble show fixed-position';
      
      // テキスト要素を作成
      const newText = document.createElement('div');
      newText.id = 'speechText';
      newText.className = 'speech-text';
      newText.textContent = 'こんにちは！何かお手伝いしましょうか？';
      newBubble.appendChild(newText);
      
      // コンテナに追加
      if (elements.container) {
        elements.container.appendChild(newBubble);
      } else {
        document.body.appendChild(newBubble);
      }
      
      return '吹き出しを修復しました。表示を確認してください。';
    },
    // 設定UIを吹き出しに表示する関数をエクスポート
    showHordeModeSettings
  };
}

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
          
          // スパンを再作成してテキストを復元
          textElement.innerHTML = '';
          const newSpan = document.createElement('span');
          newSpan.textContent = originalText;
          newSpan.className = 'speech-text-content welcome-message restored';
          newSpan.style.cssText = `
            color: #4e3b2b !important; 
            display: inline-block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            font-size: 1.05rem !important;
            line-height: 1.6 !important;
          `;
          textElement.appendChild(newSpan);
          
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
    initSpeechBubbleElements();
    
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
        window.electronAPI.speak('お疲れ様です！休憩も大切ですよ✨', 'smile');
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