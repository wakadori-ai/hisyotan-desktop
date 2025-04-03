// animationHandler.js
// ウィンドウアニメーションの処理

import { logDebug } from '@core/logger.js';

/**
 * ウィンドウアニメーションの設定
 */
export function setupWindowAnimations() {
  logDebug('ウィンドウアニメーションをセットアップしています');
  
  // アニメーション用クラスの追加
  document.body.classList.add('animate-ready');
  
  // 読み込み完了時のアニメーション
  setTimeout(() => {
    document.body.classList.add('animate-in');
  }, 100);
  
  // アプリ終了時のアニメーション設定
  setupCloseAnimation();
}

/**
 * アプリ終了時のアニメーション設定
 */
function setupCloseAnimation() {
  // Electron APIが利用可能か確認
  if (!window.electronAPI) return;
  
  // 終了前コールバックをセット
  if (window.electronAPI.onBeforeClose) {
    window.electronAPI.onBeforeClose(async () => {
      // アニメーション終了を待機する関数
      return new Promise(resolve => {
        // CSSアニメーションのクラスを削除
        document.body.classList.remove('animate-in');
        document.body.classList.add('animate-out');
        
        // アニメーション完了後にresolve
        setTimeout(() => {
          resolve();
        }, 500); // アニメーション時間に合わせる
      });
    });
  }
}

/**
 * 特定要素のフェードイン
 * @param {HTMLElement} element - フェードインする要素
 * @param {number} duration - フェードイン時間（ミリ秒）
 * @returns {Promise} アニメーション完了を示すPromise
 */
export function fadeIn(element, duration = 300) {
  return new Promise(resolve => {
    if (!element) {
      resolve();
      return;
    }
    
    // スタイルのリセット
    element.style.transition = `opacity ${duration}ms ease-in-out`;
    element.style.opacity = '0';
    element.style.display = 'block';
    
    // フレームを待機してからopacityを変更
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        element.style.opacity = '1';
      });
    });
    
    // アニメーション完了後にresolve
    setTimeout(resolve, duration);
  });
}

/**
 * 特定要素のフェードアウト
 * @param {HTMLElement} element - フェードアウトする要素
 * @param {number} duration - フェードアウト時間（ミリ秒）
 * @returns {Promise} アニメーション完了を示すPromise
 */
export function fadeOut(element, duration = 300) {
  return new Promise(resolve => {
    if (!element) {
      resolve();
      return;
    }
    
    // スタイルの設定
    element.style.transition = `opacity ${duration}ms ease-in-out`;
    element.style.opacity = '1';
    
    // opacityを0に変更
    requestAnimationFrame(() => {
      element.style.opacity = '0';
    });
    
    // アニメーション完了後に表示を非表示に
    setTimeout(() => {
      element.style.display = 'none';
      resolve();
    }, duration);
  });
}

/**
 * スケールインアニメーション
 * @param {HTMLElement} element - アニメーションする要素
 * @param {number} duration - アニメーション時間（ミリ秒）
 * @returns {Promise} アニメーション完了を示すPromise
 */
export function scaleIn(element, duration = 300) {
  return new Promise(resolve => {
    if (!element) {
      resolve();
      return;
    }
    
    // スタイルのリセット
    element.style.transition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;
    element.style.transform = 'scale(0.9)';
    element.style.opacity = '0';
    element.style.display = 'block';
    
    // フレームを待機してからスタイルを変更
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        element.style.transform = 'scale(1)';
        element.style.opacity = '1';
      });
    });
    
    // アニメーション完了後にresolve
    setTimeout(resolve, duration);
  });
}

/**
 * スケールアウトアニメーション
 * @param {HTMLElement} element - アニメーションする要素
 * @param {number} duration - アニメーション時間（ミリ秒）
 * @returns {Promise} アニメーション完了を示すPromise
 */
export function scaleOut(element, duration = 300) {
  return new Promise(resolve => {
    if (!element) {
      resolve();
      return;
    }
    
    // スタイルの設定
    element.style.transition = `transform ${duration}ms ease-in, opacity ${duration}ms ease-in`;
    element.style.transform = 'scale(1)';
    element.style.opacity = '1';
    
    // スタイルを変更
    requestAnimationFrame(() => {
      element.style.transform = 'scale(0.9)';
      element.style.opacity = '0';
    });
    
    // アニメーション完了後に表示を非表示に
    setTimeout(() => {
      element.style.display = 'none';
      resolve();
    }, duration);
  });
} 