// expressionManager.js
// 表情変更・アニメーション制御用のモジュール

import { logDebug } from './logger.js';

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
    
    // 画像パスを設定（パスを修正）
    // タイムスタンプを追加してキャッシュを回避
    const timestamp = new Date().getTime();
    let imagePath = `http://127.0.0.1:8000/assets/secretary_${expression}.png?t=${timestamp}`;
    
    // 絶対パスを取得（Electron APIが利用可能な場合）
    if (window.electronAPI && window.electronAPI.getAssetPath) {
      window.electronAPI.getAssetPath(`images/secretary_${expression}.png`)
        .then(absolutePath => {
          logDebug(`絶対パスを取得: ${absolutePath}`);
          assistantImage.src = absolutePath;
        })
        .catch(err => {
          logDebug(`絶対パス取得エラー: ${err.message}、相対パスを使用します`);
          assistantImage.src = imagePath;
        });
    } else {
      // Electron APIが使用できない場合は相対パスを試す
      logDebug(`画像パスを設定: ${imagePath}`);
      assistantImage.src = imagePath;
    }
    
    assistantImage.alt = `秘書たん（${expression}）`;
    
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