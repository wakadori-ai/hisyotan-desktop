// expressionManager.js
// 表情変更・アニメーション制御用のモジュール

import { logDebug } from '../core/logger.js';

// DOM要素
let assistantImage;
let isTalking = false; // 会話中フラグ
let currentExpression = 'normal'; // 現在の表情

/**
 * DOM要素を初期化する
 */
export function initExpressionElements() {
  assistantImage = document.getElementById('assistantImage');
  logDebug('表情制御要素初期化完了');
}

/**
 * 表情を変更する
 * @param {string} expression - 表情名（normal, happy, surprised, serious, sleepy, relieved, smile）
 * @returns {boolean} 成功したかどうか
 */
export function setExpression(expression) {
  try {
    logDebug(`表情を変更: ${currentExpression} -> ${expression}`);
    
    // 画像が見つからない場合はnormalに戻す
    if (!['normal', 'happy', 'surprised', 'serious', 'sleepy', 'relieved', 'smile'].includes(expression)) {
      logDebug(`未定義の表情「${expression}」が指定されました。normalを使用します。`);
      expression = 'normal';
    }
    
    currentExpression = expression;
    
    try {
      // 画像パスを設定（デバッグ向けに複数のパスを用意）
      const timestamp = new Date().getTime();
      
      // Electronの場合は直接アプリの絶対パスを使う
      if (window.electronAPI) {
        logDebug('Electron APIを使用して画像を読み込みます');
        
        // assistantImageが見つかるか確認
        if (!assistantImage) {
          assistantImage = document.getElementById('assistantImage');
          logDebug('assistantImageを再取得しました');
        }
        
        // Electronの場合は絶対パスを使う
        if (window.electronAPI.getAssetPath) {
          try {
            const assetPath = `assets/images/secretary_${expression}.png`;
            window.electronAPI.getAssetPath(assetPath)
              .then(path => {
                logDebug(`画像の絶対パスを取得: ${path}`);
                assistantImage.src = path;
              })
              .catch(err => {
                // 絶対パスが取得できない場合はエラーハンドリング
                logDebug(`絶対パス取得エラー: ${err.message}`);
                
                // フォールバックとして直接パスを指定
                const directPath = `file:///C:/Users/wakad/hisyotan-desktop/frontend/ui/public/assets/images/secretary_${expression}.png?t=${timestamp}`;
                logDebug(`直接絶対パスを使用: ${directPath}`);
                assistantImage.src = directPath;
              });
          } catch (err) {
            logDebug(`getAssetPath実行エラー: ${err.message}`);
            
            // エラー時は直接絶対パスを設定
            const directPath = `file:///C:/Users/wakad/hisyotan-desktop/frontend/ui/public/assets/images/secretary_${expression}.png?t=${timestamp}`;
            logDebug(`直接絶対パスを使用: ${directPath}`);
            assistantImage.src = directPath;
          }
        } else {
          // getAssetPathがない場合は直接絶対パスを設定
          const directPath = `file:///C:/Users/wakad/hisyotan-desktop/frontend/ui/public/assets/images/secretary_${expression}.png?t=${timestamp}`;
          logDebug(`直接絶対パスを使用: ${directPath}`);
          assistantImage.src = directPath;
        }
      } else {
        // 非Electron環境（ブラウザなど）
        const imagePath = `/assets/images/secretary_${expression}.png?t=${timestamp}`;
        logDebug(`非Electron環境用画像パス: ${imagePath}`);
        assistantImage.src = imagePath;
      }
      
      // 代替テキストを設定
      assistantImage.alt = `秘書たん（${expression}）`;
      
    } catch (error) {
      console.error(`画像設定エラー: ${error.message}`);
      logDebug(`画像設定処理でエラー: ${error.message}`);
      
      // エラー発生時の最終手段として直接絶対パスを設定
      try {
        const directPath = `file:///C:/Users/wakad/hisyotan-desktop/frontend/ui/public/assets/images/secretary_${expression}.png`;
        assistantImage.src = directPath;
        logDebug(`エラー発生後の直接パス設定: ${directPath}`);
      } catch (e) {
        console.error(`最終的な画像設定も失敗: ${e.message}`);
      }
    }
    
    logDebug(`表情変更完了: ${expression}`);
    return true;
  } catch (error) {
    console.error(`表情変更エラー (${expression}):`, error);
    logDebug(`表情変更エラー (${expression}): ${error.message}`);
    return false;
  }
}

/**
 * 現在の表情を取得する
 * @returns {string} 現在の表情
 */
export function getCurrentExpression() {
  return currentExpression;
}

/**
 * 口パクアニメーション開始
 */
export function startTalking() {
  if (!isTalking && assistantImage) {
    isTalking = true;
    assistantImage.classList.add('talking');
    logDebug('口パク開始');
  }
}

/**
 * 口パクアニメーション停止
 */
export function stopTalking() {
  if (isTalking && assistantImage) {
    isTalking = false;
    assistantImage.classList.remove('talking');
    logDebug('口パク停止');
  }
}

/**
 * 震えるアニメーション開始
 */
export function startTrembling() {
  try {
    logDebug('震えるアニメーション開始');
    assistantImage.classList.add('trembling');
  } catch (error) {
    console.error('震えるアニメーション開始エラー:', error);
    logDebug(`震えるアニメーション開始エラー: ${error.message}`);
  }
}

/**
 * 震えるアニメーション停止
 */
export function stopTrembling() {
  try {
    logDebug('震えるアニメーション停止');
    assistantImage.classList.remove('trembling');
  } catch (error) {
    console.error('震えるアニメーション停止エラー:', error);
    logDebug(`震えるアニメーション停止エラー: ${error.message}`);
  }
}

/**
 * 軽くぴょこっと跳ねるアニメーション開始
 */
export function startLightBounce() {
  logDebug('軽いバウンスアニメーション開始処理');
  
  // アニメーション対象の要素を確認
  if (!assistantImage) {
    logDebug('警告: assistantImageが見つかりません');
    return;
  }
  
  // assistantImageにアニメーションクラスを追加
  assistantImage.classList.add('light-bounce');
  logDebug('assistantImageにlight-bounceクラスを追加しました');
}

/**
 * 軽くぴょこっと跳ねるアニメーション停止
 */
export function stopLightBounce() {
  logDebug('軽いバウンスアニメーション停止処理');
  
  // assistantImageからアニメーションクラスを削除
  if (assistantImage) {
    assistantImage.classList.remove('light-bounce');
    logDebug('assistantImageからlight-bounceクラスを削除しました');
  } else {
    logDebug('警告: assistantImageが見つかりません');
  }
}

/**
 * 不安げな震えアニメーション開始
 */
export function startNervousShake() {
  try {
    logDebug('不安げな震えアニメーション開始');
    assistantImage.classList.add('nervous-shake');
  } catch (error) {
    console.error('不安げな震えアニメーション開始エラー:', error);
    logDebug(`不安げな震えアニメーション開始エラー: ${error.message}`);
  }
}

/**
 * 不安げな震えアニメーション停止
 */
export function stopNervousShake() {
  try {
    logDebug('不安げな震えアニメーション停止');
    assistantImage.classList.remove('nervous-shake');
  } catch (error) {
    console.error('不安げな震えアニメーション停止エラー:', error);
    logDebug(`不安げな震えアニメーション停止エラー: ${error.message}`);
  }
}

/**
 * 表情を元に戻す
 */
export function resetExpression() {
  setExpression('normal');
}

/**
 * 話しているかどうかを取得する
 * @returns {boolean} 話しているかどうか
 */
export function isTalkingNow() {
  return isTalking;
} 