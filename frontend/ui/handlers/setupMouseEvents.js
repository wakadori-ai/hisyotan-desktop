// setupMouseEvents.js
// マウスイベントのハンドリング

import { logDebug } from '@core/logger.js';

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
    let isDragging = false;
    let startPos = { x: 0, y: 0 };
    let startOffset = { x: 0, y: 0 };
    
    // ドラッグ開始処理
    assistantContainer.addEventListener('mousedown', (e) => {
      // 右クリックの場合はドラッグ処理をスキップ
      if (e.button === 2) return;
      
      isDragging = true;
      startPos = { x: e.clientX, y: e.clientY };
      
      // 現在のコンテナの位置を取得
      const computedStyle = window.getComputedStyle(assistantContainer);
      startOffset = {
        x: parseInt(computedStyle.paddingLeft || '0'),
        y: parseInt(computedStyle.paddingTop || '0')
      };
      
      // ドラッグ中のスタイル適用
      assistantContainer.classList.add('dragging');
    });
    
    // ドラッグ中の処理
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startPos.x;
      const dy = e.clientY - startPos.y;
      
      // 新しい位置を計算
      assistantContainer.style.paddingLeft = `${startOffset.x + dx}px`;
      assistantContainer.style.paddingTop = `${startOffset.y + dy}px`;
    });
    
    // ドラッグ終了処理
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        assistantContainer.classList.remove('dragging');
      }
    });
  }
  
  setupGeneralMouseTracking();
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