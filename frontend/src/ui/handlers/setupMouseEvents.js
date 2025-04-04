// setupMouseEvents.js
// マウスイベントのハンドリング

import { logDebug } from '@core/logger.js';
import { showRandomLine } from '@emotion/emotionHandler.js';
import { createTestSettingsUI } from '@ui/paw-context-menu.js';

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
      showRandomLine();
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
    createTestSettingsUI();
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