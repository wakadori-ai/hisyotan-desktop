// setupMouseEvents.js
// マウスイベントのハンドリング

import { logDebug } from '@core/logger.js';
import { showRandomLine } from '@emotion/emotionHandler.js';
import { showSettingsInBubble } from '@renderer/assistantUI.js';

// マウス操作検出のための変数
let mouseTimer;
let mouseActive = false;

/**
 * マウスイベント処理の設定
 */
export function setupMouseEventHandling() {
  logDebug('マウスイベント処理をセットアップしています');
  
  // ドラッグ処理の設定
  const assistantContainer = document.querySelector('.assistant-container');
  if (assistantContainer) {
    setupDraggable(assistantContainer);
  }
  
  // 肉球アイコンのイベント設定
  setupPawEvents();
  
  // 閉じるボタンのイベント設定
  setupCloseButton();
  
  setupGeneralMouseTracking();
}

/**
 * 肉球アイコンのイベント設定
 */
function setupPawEvents() {
  const pawButton = document.getElementById('paw-button');
  if (!pawButton) {
    logDebug('肉球ボタンが見つかりません');
    return;
  }
  
  let isDragging = false;
  let startPos = { x: 0, y: 0 };
  
  // クリック処理（ランダムセリフを再生）
  pawButton.addEventListener('click', (e) => {
    // ドラッグ操作ではない場合のみセリフ再生
    if (!isDragging) {
      logDebug('肉球がクリックされました - ランダムセリフを再生します');
      
      // クールタイムチェック（連打防止）
      const now = Date.now();
      const lastClick = pawButton._lastClickTime || 0;
      const cooldown = 1000; // 1秒間のクールタイム
      
      if (now - lastClick < cooldown) {
        logDebug('クールタイム中のためスキップします');
        return;
      }
      
      pawButton._lastClickTime = now;
      
      // speechManagerの存在確認
      if (window.speechManager) {
        // グローバルスコープから取得したSpeechManagerでランダムセリフを再生
        try {
          const phrases = [
            { text: "おつかれさま〜…ぎゅってしてあげたい気分なの", emotion: "soft" },
            { text: "すごいよ…ちゃんと頑張ってるの、見てるからね", emotion: "gentle" },
            { text: "ふにゃ…今日はのんびりしよ？", emotion: "soft" },
            { text: "ねぇ、ちょっとだけ甘えてもいい…？", emotion: "happy" },
            { text: "ここにいるからね。ひとりじゃないよ", emotion: "normal" },
            { text: "お水飲んだ？小休憩しよっか", emotion: "gentle" },
            { text: "えらいえらい…よしよしっ", emotion: "happy" },
            { text: "もし疲れたら、ぎゅってするからね🐾", emotion: "soft" }
          ];
          
          const phrase = phrases[Math.floor(Math.random() * phrases.length)];
          window.speechManager.speak(phrase.text, phrase.emotion, 5000, null, 'random_speak');
          logDebug(`セリフ再生: "${phrase.text}"`);
        } catch (error) {
          logDebug(`セリフ再生エラー: ${error.message}`);
        }
      } else if (window.showRandomLine) {
        // バックアップ: 古い関数を使用
        window.showRandomLine();
      } else {
        logDebug('セリフ再生機能が利用できません');
      }
    }
    // バブリングを停止
    e.stopPropagation();
  });
  
  // ドラッグ開始処理
  pawButton.addEventListener('mousedown', (e) => {
    // 左クリックの場合のみドラッグ処理を行う
    if (e.button === 0) {
      isDragging = false;
      startPos = { x: e.clientX, y: e.clientY };
      
      // mousedownのバブリングを停止
      e.stopPropagation();
    }
  });
  
  // マウス移動時の処理
  document.addEventListener('mousemove', (e) => {
    // 左ボタンが押されている場合のみドラッグ判定
    if (e.buttons === 1 && startPos.x !== 0) {
      // 少し動いたらドラッグと判定
      const diffX = Math.abs(e.clientX - startPos.x);
      const diffY = Math.abs(e.clientY - startPos.y);
      
      // 5px以上動いたらドラッグと判定
      if (diffX > 5 || diffY > 5) {
        isDragging = true;
        // Electronにウィンドウドラッグの開始を通知
        if (window.electron && window.electron.ipcRenderer) {
          window.electron.ipcRenderer.send('start-window-drag');
        }
      }
    }
  });
  
  // マウスアップ時の処理
  document.addEventListener('mouseup', () => {
    isDragging = false;
    startPos = { x: 0, y: 0 };
  });
  
  // 右クリックで設定吹き出しを表示
  pawButton.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    logDebug('肉球が右クリックされました - 設定吹き出しを表示します');
    
    // SpeechManagerの設定UIを表示
    if (window.speechManager && window.speechManager.speakWithObject) {
      try {
        // 設定UIを含むセリフオブジェクトを作成
        const settingSpeech = {
          id: 'setting_ui',
          type: 'setting',
          text: '設定を変更しますか？',
          emotion: 'normal',
          uiPayload: {
            type: 'setting',
            title: '秘書たん設定',
            options: [
              {
                type: 'toggle',
                id: 'enableVoice',
                label: '音声を有効にする',
                value: true,
                onChange: (newValue) => {
                  logDebug(`音声設定が変更されました: ${newValue}`);
                  // 設定変更後のフィードバック
                  setTimeout(() => {
                    if (window.speechManager) {
                      window.speechManager.speak(
                        newValue ? '音声をオンにしました！' : '音声をオフにしました',
                        newValue ? 'happy' : 'normal'
                      );
                    }
                  }, 300);
                }
              },
              {
                type: 'slider',
                id: 'volume',
                label: '音量',
                min: 0,
                max: 100,
                value: 70,
                onChange: (newValue) => {
                  logDebug(`音量が変更されました: ${newValue}`);
                }
              }
            ]
          }
        };
        
        // 設定UIを表示
        window.speechManager.speakWithObject(settingSpeech);
      } catch (error) {
        logDebug(`設定UI表示エラー: ${error.message}`);
        // 新しい設定UI関数を使用
        showSettingsInBubble();
      }
    } else {
      // 新しい設定UI関数を使用
      showSettingsInBubble();
    }
  });
}

/**
 * 閉じるボタンのイベント設定
 */
function setupCloseButton() {
  const closeButton = document.getElementById('quit-button');
  if (!closeButton) {
    logDebug('閉じるボタンが見つかりません');
    return;
  }
  
  closeButton.addEventListener('click', () => {
    logDebug('閉じるボタンがクリックされました - アプリを終了します');
    // Electron IPCを使用して完全終了を要求
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.invoke('quit-app');
    }
  });
}

/**
 * 要素をドラッグ可能にする
 * @param {HTMLElement} element - ドラッグ可能にする要素
 */
function setupDraggable(element) {
  let isDragging = false;
  let startPos = { x: 0, y: 0 };
  let startOffset = { x: 0, y: 0 };
  
  // ドラッグ開始処理
  element.addEventListener('mousedown', (e) => {
    // 右クリックの場合はドラッグ処理をスキップ
    if (e.button === 2) return;
    
    isDragging = false;
    startPos = { x: e.clientX, y: e.clientY };
    
    // 現在のコンテナの位置を取得
    const computedStyle = window.getComputedStyle(element);
    startOffset = {
      x: parseInt(computedStyle.paddingLeft || '0'),
      y: parseInt(computedStyle.paddingTop || '0')
    };
  });
  
  // ドラッグ中の処理
  document.addEventListener('mousemove', (e) => {
    if (e.buttons !== 1 || startPos.x === 0) return;
    
    const diffX = Math.abs(e.clientX - startPos.x);
    const diffY = Math.abs(e.clientY - startPos.y);
    
    // 5px以上動いたらドラッグと判定
    if (diffX > 5 || diffY > 5) {
      isDragging = true;
      // ドラッグ中のスタイル適用
      element.classList.add('dragging');
      
      // Electronにウィンドウドラッグの開始を通知
      if (window.electron && window.electron.ipcRenderer) {
        window.electron.ipcRenderer.send('start-window-drag');
      }
    }
  });
  
  // ドラッグ終了処理
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      element.classList.remove('dragging');
    }
    startPos = { x: 0, y: 0 };
  });
}

/**
 * 一般的なマウストラッキング機能の設定
 */
function setupGeneralMouseTracking() {
  // マウスの動きを検出
  document.addEventListener('mousemove', function() {
    handleMouseActivity();
  });

  // マウスクリック時も同様に処理
  document.addEventListener('mousedown', function() {
    handleMouseActivity();
  });
}

/**
 * マウス活動を処理（タイムアウト付き）
 */
function handleMouseActivity() {
  // 自動透明化が有効な場合のみ適用
  if (window.currentSettings && window.currentSettings.autoHide === false) {
    return;
  }
  
  // マウスが動いたらbodyにmouse-activeクラスを追加
  document.body.classList.add('mouse-active');
  mouseActive = true;
  
  // 既存のタイマーをクリア
  clearTimeout(mouseTimer);
  
  // 3秒間動きがなければmouse-activeクラスを削除
  mouseTimer = setTimeout(function() {
    document.body.classList.remove('mouse-active');
    mouseActive = false;
  }, 3000);
}

/**
 * マウスアクティブ状態の取得
 * @returns {boolean} マウスがアクティブかどうか
 */
export function isMouseActive() {
  return mouseActive;
}

// ドラッグとマウスホバーの両立を可能にする処理
export function enableMouseEventsWithDebounce() {
  const debounceTime = 200;
  let debounceTimer;
  
  return () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      document.body.classList.add('mouse-active');
      mouseActive = true;
    }, debounceTime);
  };
}

// マウスの不活性化の遅延処理
export function disableMouseEventsWithDebounce() {
  const debounceTime = 300;
  let debounceTimer;
  
  return () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      // 自動透明化が有効な場合のみ適用
      if (window.currentSettings && window.currentSettings.autoHide !== false) {
        document.body.classList.remove('mouse-active');
        mouseActive = false;
      }
    }, debounceTime);
  };
} 