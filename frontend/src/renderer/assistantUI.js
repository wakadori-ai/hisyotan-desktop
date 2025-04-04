/**
 * assistantUI.js
 * UI操作関連の機能を集約したヘルパーモジュール
 */

import { createTestSettingsUI } from '@ui/paw-context-menu.js';
import { hideBubble } from '@ui/handlers/bubbleManager.js';

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
  console.log('🌸 assistantUI: UI要素を初期化します');
  
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
    
    // ドラッグ可能設定を無効化（クリックイベントを優先）
    pawButton.style.webkitAppRegion = 'no-drag';
    
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
      
      // ランダムセリフ表示（マルチレベルフォールバック付き）
      if (window.speechManager && window.speechManager.speak) {
        // 1. SpeechManagerで再生
        const messages = [
          'こんにちは！何かお手伝いしましょうか？',
          'お疲れ様です！休憩も大切ですよ✨',
          '何か質問があればいつでも声をかけてくださいね',
          'お仕事頑張ってますね！素敵です',
          'リラックスタイムも必要ですよ〜',
          'デスクの整理、手伝いましょうか？'
        ];
        
        const randomIndex = Math.floor(Math.random() * messages.length);
        const message = messages[randomIndex];
        
        window.speechManager.speak(message, 'normal', 5000);
        return;
      }
      
      // 2. フォールバック: IPCメッセージ
      if (window.electron && window.electron.ipcRenderer) {
        try {
          // 第1手段: send (より確実なのでsendを先に試す)
          console.log('🔄 sendメソッドでランダムメッセージを要求します');
          window.electron.ipcRenderer.send('show-random-message');
        } catch (error) {
          // エラー発生時は直接メッセージを表示
          console.error('IPC呼び出しエラー:', error);
          showBubble('default', 'こんにちは！何かお手伝いしましょうか？');
        }
      } else {
        // 3. 最終フォールバック: 直接表示
        console.warn('electron IPCが利用できません。直接メッセージを表示します');
        showBubble('default', 'こんにちは！何かお手伝いしましょうか？');
      }
    });
    
    // 右クリック - 設定表示
    pawButton.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      console.log('🔧 肉球ボタンが右クリックされました');
      
      try {
        // 設定UIを表示
        createTestSettingsUI();
        
        // フォールバックとして直接メッセージも表示
        if (window.speechManager && window.speechManager.speak) {
          window.speechManager.speak('設定メニューを開きますね', 'normal', 3000);
        } else {
          showBubble('default', '設定メニューを開きますね');
        }
      } catch (error) {
        console.error('設定UI表示エラー:', error);
        showBubble('warning', '設定を開けませんでした');
      }
    });
    
    // JavaScriptでのドラッグ処理は削除（CSSの-webkit-app-region: dragを使用）
  } else {
    console.error('❌ pawButtonが見つかりません');
  }
  
  // 終了ボタンのイベント設定
  if (quitButton) {
    console.log('🚪 quitButtonにイベントリスナーを設定します');
    quitButton.addEventListener('click', () => {
      console.log('🚪 終了ボタンがクリックされました');
      
      // 終了前の確認メッセージを表示（オプション）
      if (window.speechManager) {
        window.speechManager.speak('さようなら、またね！', 'normal', 2000, null, 'quit_app');
      }
      
      // マルチレベルフォールバック
      if (window.electron && window.electron.ipcRenderer) {
        try {
          // 第1手段: 最も確実なquit-app-with-backend 使用
          if (window.electron.ipcRenderer.send) {
            console.log('🔄 sendメソッドでアプリとバックエンド終了を要求します');
            window.electron.ipcRenderer.send('quit-app-with-backend');
            
            // バックエンドのPythonプロセスを確実に終了するため少し待機
            setTimeout(() => {
              // 通常の方法でも終了を試みる
              window.electron.ipcRenderer.send('quit-app');
            }, 500);
          }
          
          // 第2手段: 通常のquit-app
          console.log('🔄 sendメソッドでアプリ終了を要求します');
          window.electron.ipcRenderer.send('quit-app');
          
          // 保険として少し待ってからinvokeも試す
          setTimeout(() => {
            try {
              console.log('🔄 invokeメソッドでアプリ終了を要求します');
              window.electron.ipcRenderer.invoke('quit-app')
                .catch(err => {
                  console.error('アプリ終了エラー:', err);
                  // 最終手段
                  console.log('🔄 window.closeでウィンドウを閉じます');
                  window.close();
                });
            } catch (invokeErr) {
              console.error('invoke呼び出しエラー:', invokeErr);
              // 最終手段
              window.close();
            }
          }, 300);
        } catch (error) {
          // エラー発生時はwindow.close()
          console.error('IPC呼び出しエラー:', error);
          window.close();
        }
      } else {
        // electronが使用できない場合はwindow.close()
        console.warn('electron IPCが利用できません。window.closeを使用します');
        window.close();
      }
    });
  } else {
    console.error('❌ quitButtonが見つかりません');
  }
  
  // 立ち絵と吹き出しのイベント設定
  // CSSの-webkit-app-region: dragを使用するため、ドラッグ用のイベントリスナーは不要
  if (assistantImage) {
    // 立ち絵の右クリックを無効化（右クリック設定メニューを防止）
    assistantImage.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      console.log('🖼️ 立ち絵が右クリックされました - 右クリックメニューを無効化');
    });
  }
  
  // 吹き出しの右クリックを無効化
  if (speechBubble) {
    speechBubble.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      console.log('💬 吹き出しが右クリックされました - 右クリックメニューを無効化');
    });
  }
  
  // 立ち絵を表示
  if (assistantImage) {
    console.log('👩‍💼 assistantImageを表示します');
    // 即時クラス追加に変更
    assistantImage.classList.add('active');
  } else {
    console.error('❌ assistantImageが見つかりません');
  }
  
  console.log('✨ assistantUI: UI要素の初期化が完了しました');
}

/**
 * ウィンドウドラッグを直接処理するハンドラ
 * 注: CSSの-webkit-app-region: dragを使用するため、
 * このハンドラは実際には使われません。
 * 互換性のために残しています。
 */
function directWindowDragHandler(initialEvent) {
  console.log('🖱️ CSSによるドラッグ機能が使用されます');
  // CSSで-webkit-app-region: dragを使用するため実装は空
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