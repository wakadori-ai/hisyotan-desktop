/**
 * uiHelper.js
 * UI操作関連の機能を集約したヘルパーモジュール
 */

import { createTestSettingsUI, hideBubble } from '../ui/paw-context-menu.js';

// グローバル要素の参照を保持
let pawButton;
let quitButton;
let speechBubble;
let speechText;
let assistantImage;

/**
 * UI要素の初期化
 */
export function initUIElements() {
  console.log('🌸 uiHelper: UI要素を初期化します');
  
  // 肉球UIの要素を取得
  pawButton = document.getElementById('paw-button');
  quitButton = document.getElementById('quit-button');
  speechBubble = document.getElementById('speechBubble');
  speechText = document.getElementById('speechText');
  assistantImage = document.getElementById('assistantImage');
  
  // クールタイム管理用の変数
  let lastClickTime = 0;
  const COOLDOWN_TIME = 3000; // クールタイム3秒
  
  // 肉球ボタンのイベント設定
  if (pawButton) {
    console.log('🐾 pawButtonにイベントリスナーを設定します');
    
    // 左クリック - ランダムセリフ表示（クールタイム付き）
    pawButton.addEventListener('click', (event) => {
      console.log('🐾 肉球ボタンがクリックされました');
      
      // ドラッグ操作の場合はクリックイベントをスキップ
      if (window._wasDragging) {
        window._wasDragging = false;
        return;
      }
      
      // クールタイムチェック
      const currentTime = Date.now();
      if (currentTime - lastClickTime < COOLDOWN_TIME) {
        console.log('🕒 クールタイム中です');
        return;
      }
      
      // クールタイム更新
      lastClickTime = currentTime;
      
      // ランダムセリフ表示
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.invoke('show-random-message')
          .then(message => {
            if (message) {
              console.log(`🗨️ ランダムメッセージ: ${message}`);
            }
          })
          .catch(err => {
            console.error('ランダムメッセージ表示エラー:', err);
          });
      }
    });
    
    // 右クリック - 設定表示
    pawButton.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      console.log('🔧 肉球ボタンが右クリックされました');
      createTestSettingsUI();
    });
    
    // 左ドラッグ - ウィンドウ移動
    pawButton.addEventListener('mousedown', (event) => {
      if (event.button === 0) { // 左クリック
        // マウスの移動距離を計測するための初期位置
        const startX = event.clientX;
        const startY = event.clientY;
        
        // マウスムーブイベント
        const handleMouseMove = (moveEvent) => {
          // 少し動いたらドラッグと判定
          const deltaX = Math.abs(moveEvent.clientX - startX);
          const deltaY = Math.abs(moveEvent.clientY - startY);
          
          if (deltaX > 5 || deltaY > 5) {
            // ドラッグと判定
            window._wasDragging = true;
            
            // ウィンドウドラッグ開始
            if (window.electron && window.electron.ipcRenderer) {
              window.electron.ipcRenderer.invoke('start-window-drag')
                .catch(err => {
                  console.error('ウィンドウドラッグエラー:', err);
                });
            }
            
            // イベントリスナーを削除
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          }
        };
        
        // マウスアップイベント
        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
        
        // イベントリスナーを追加
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    });
  } else {
    console.error('❌ pawButtonが見つかりません');
  }
  
  // 終了ボタンのイベント設定
  if (quitButton) {
    console.log('🚪 quitButtonにイベントリスナーを設定します');
    quitButton.addEventListener('click', () => {
      console.log('🚪 終了ボタンがクリックされました');
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.invoke('quit-app')
          .catch(err => {
            console.error('アプリ終了エラー:', err);
          });
      } else {
        console.error('Electron IPCが利用できません');
      }
    });
  } else {
    console.error('❌ quitButtonが見つかりません');
  }
  
  // 立ち絵と吹き出しのイベント設定（ウィンドウドラッグ用）
  const setupDraggable = (element) => {
    if (!element) return;
    
    element.addEventListener('mousedown', (event) => {
      if (event.button === 0) { // 左クリック
        console.log(`🖱️ ${element.id}で左ドラッグ開始`);
        
        // マウスの移動距離を計測するための初期位置
        const startX = event.clientX;
        const startY = event.clientY;
        
        // マウスムーブイベント
        const handleMouseMove = (moveEvent) => {
          // 少し動いたらドラッグと判定
          const deltaX = Math.abs(moveEvent.clientX - startX);
          const deltaY = Math.abs(moveEvent.clientY - startY);
          
          if (deltaX > 5 || deltaY > 5) {
            // ウィンドウドラッグ開始
            if (window.electron && window.electron.ipcRenderer) {
              window.electron.ipcRenderer.invoke('start-window-drag')
                .catch(err => {
                  console.error('ウィンドウドラッグエラー:', err);
                });
            }
            
            // イベントリスナーを削除
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          }
        };
        
        // マウスアップイベント
        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
        
        // イベントリスナーを追加
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
    });
  };
  
  // 立ち絵と吹き出しにドラッグイベントを設定
  setupDraggable(assistantImage);
  setupDraggable(speechBubble);
  
  // 立ち絵を表示
  if (assistantImage) {
    console.log('👩‍💼 assistantImageを表示します');
    // 即時クラス追加に変更
    assistantImage.classList.add('active');
  } else {
    console.error('❌ assistantImageが見つかりません');
  }
  
  console.log('✨ uiHelper: UI要素の初期化が完了しました');
}

/**
 * 吹き出しにテキストを表示
 * @param {string} text - 表示するテキスト
 * @param {string} type - 吹き出しのタイプ（default, warning, error など）
 */
export function showBubble(type = 'default', text = 'こんにちは！何かお手伝いしましょうか？') {
  console.log('🔍 showBubble関数が呼び出されました', { type, text });
  
  if (!speechBubble || !speechText) {
    console.error('💔 speechBubbleまたはspeechTextが見つかりません');
    return;
  }
  
  // 要素のスタイル情報をログ出力
  console.log('🎨 speechBubbleの現在のスタイル:', {
    display: speechBubble.style.display,
    className: speechBubble.className,
    computedStyle: window.getComputedStyle(speechBubble)
  });
  
  // 吹き出し表示
  speechBubble.style.display = 'block';
  speechText.textContent = `「${text}」`;
  
  // タイプによって吹き出しのスタイルを変更
  speechBubble.className = `speech-bubble speech-bubble-${type} show`;
  
  // スタイル適用後の状態をログ出力
  console.log('✅ スタイル適用後のspeechBubble:', {
    display: speechBubble.style.display,
    className: speechBubble.className,
    computedStyle: window.getComputedStyle(speechBubble)
  });
}

/**
 * 吹き出しを非表示にする
 */
export function hideSpeechBubble() {
  if (speechBubble) {
    speechBubble.style.display = 'none';
  }
}

/**
 * UIを生成する
 */
export function createUI() {
  // 肉球UI用のHTML構造を動的に生成
  const appDiv = document.getElementById('app');
  if (appDiv) {
    // body要素の背景を透明に設定
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    
    appDiv.innerHTML = `
      <div class="assistant-container">
        <div id="speechBubble" class="speech-bubble">
          <div id="speechText" class="speech-text">「こんにちは！何かお手伝いしましょうか？」</div>
        </div>
        <img id="assistantImage" class="assistant-image" src="/src/ui/public/assets/images/secretary_normal.png" alt="秘書たん">
        <div class="ui-buttons">
          <div id="paw-button">
            <div class="paw-button-wrapper">
              <div class="paw-background"></div>
              <span class="paw-icon">🐾</span>
            </div>
          </div>
          <div id="quit-button">×</div>
        </div>
      </div>
    `;
    
    // 要素の初期化
    initUIElements();
  }
}

// エクスポート
export {
  createTestSettingsUI,
  hideBubble
}; 