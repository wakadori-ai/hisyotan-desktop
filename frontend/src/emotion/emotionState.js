/**
 * emotionState.js
 * 秘書たんの感情状態を管理するモジュール
 */

import { logDebug } from '@core/logger.js';

// 感情の基本タイプ定義
export const EMOTION_TYPES = {
  HAPPY: 'happy',         // 嬉しい
  SAD: 'sad',             // 悲しい
  SURPRISED: 'surprised', // 驚き
  FEARFUL: 'fearful',     // 恐怖
  FUNYA: 'funya',         // ふにゃっとした
  WORRIED: 'worried',     // 心配
  NORMAL: 'normal',       // 通常
  SLEEPY: 'sleepy',       // 眠い
  EXCITED: 'excited',     // 興奮
  RELIEVED: 'relieved'    // 安堵
};

// 特殊な感情タイプ（音声とUIを統合）
export const VOICE_TONES = {
  SOFT: 'soft',           // 柔らかい
  GENTLE: 'gentle',       // 優しい
  WHISPER: 'whisper',     // ささやき
  CHEERFUL: 'cheerful',   // 明るい
  SERIOUS: 'serious'      // 真面目
};

// 感情の初期状態
const initialEmotionState = {
  // 基本感情値（-100〜100）
  values: {
    happiness: 0,    // 幸福度
    anxiety: 0,      // 不安度
    excitement: 0,   // 興奮度
    sleepiness: 0    // 眠気
  },
  
  // 現在の主要な感情タイプ
  currentEmotion: EMOTION_TYPES.NORMAL,
  
  // 最後に発動した感情イベント
  lastEmotionEvent: null,
  
  // 感情変化タイムスタンプ
  lastChangeTime: Date.now()
};

// 現在の感情状態
let emotionState = { ...initialEmotionState };

// 感情変化リスナーのリスト
const emotionChangeListeners = new Set();

/**
 * 感情状態を取得する
 * @returns {Object} 現在の感情状態オブジェクト
 */
export function getEmotionState() {
  return { ...emotionState };
}

/**
 * 感情値を設定する
 * @param {string} emotionType - 感情タイプ (例: 'happiness', 'anxiety')
 * @param {number} value - 設定値 (-100〜100)
 * @returns {Object} 更新後の感情状態
 */
export function setEmotionValue(emotionType, value) {
  // 値の範囲を制限
  const clampedValue = Math.max(-100, Math.min(100, value));
  
  // 前の値を保持
  const prevValue = emotionState.values[emotionType];
  
  if (emotionState.values.hasOwnProperty(emotionType)) {
    // 値を更新
    emotionState.values[emotionType] = clampedValue;
    
    // 更新時間を記録
    emotionState.lastChangeTime = Date.now();
    
    // 変化量が一定以上なら主要感情を更新
    if (Math.abs(clampedValue - prevValue) >= 20) {
      updateCurrentEmotion();
    }
    
    // 変更を通知
    notifyEmotionChange({
      type: 'valueChange',
      emotionType,
      previousValue: prevValue,
      newValue: clampedValue,
      state: getEmotionState()
    });
    
    logDebug(`感情値を更新: ${emotionType} = ${clampedValue} (前: ${prevValue})`);
  } else {
    logDebug(`未知の感情タイプ: ${emotionType}`);
  }
  
  return getEmotionState();
}

/**
 * 感情タイプを設定する
 * @param {string} emotion - 感情タイプ (例: 'happy', 'sad')
 * @param {string} eventType - 感情を引き起こしたイベントタイプ (オプション)
 * @returns {Object} 更新後の感情状態
 */
export function setEmotion(emotion, eventType = 'manual') {
  const prevEmotion = emotionState.currentEmotion;
  
  // 感情を更新
  emotionState.currentEmotion = emotion;
  emotionState.lastEmotionEvent = eventType;
  emotionState.lastChangeTime = Date.now();
  
  // 感情タイプに応じて基本感情値も調整
  adjustEmotionValues(emotion);
  
  // 変更を通知
  notifyEmotionChange({
    type: 'emotionChange',
    previousEmotion: prevEmotion,
    newEmotion: emotion,
    eventType,
    state: getEmotionState()
  });
  
  logDebug(`感情タイプを設定: ${emotion} (前: ${prevEmotion}, イベント: ${eventType})`);
  
  return getEmotionState();
}

/**
 * 現在の感情値から主要な感情タイプを更新する
 * @private
 */
function updateCurrentEmotion() {
  const { happiness, anxiety, excitement, sleepiness } = emotionState.values;
  
  // 最も強い感情を特定
  if (sleepiness > 50 && sleepiness > anxiety && sleepiness > excitement) {
    emotionState.currentEmotion = EMOTION_TYPES.SLEEPY;
  } else if (happiness > 50 && happiness > anxiety) {
    emotionState.currentEmotion = EMOTION_TYPES.HAPPY;
  } else if (anxiety > 50 && anxiety > happiness) {
    if (excitement > 50) {
      emotionState.currentEmotion = EMOTION_TYPES.FEARFUL;
    } else {
      emotionState.currentEmotion = EMOTION_TYPES.WORRIED;
    }
  } else if (excitement > 70) {
    emotionState.currentEmotion = EMOTION_TYPES.EXCITED;
  } else if (anxiety < -30 && happiness > 20) {
    emotionState.currentEmotion = EMOTION_TYPES.RELIEVED;
  } else if (anxiety < -50 && excitement < -30) {
    emotionState.currentEmotion = EMOTION_TYPES.FUNYA;
  } else {
    emotionState.currentEmotion = EMOTION_TYPES.NORMAL;
  }
}

/**
 * 感情タイプに基づいて感情値を調整する
 * @param {string} emotion - 感情タイプ
 * @private
 */
function adjustEmotionValues(emotion) {
  switch (emotion) {
    case EMOTION_TYPES.HAPPY:
      emotionState.values.happiness = 80;
      emotionState.values.anxiety = -50;
      break;
    case EMOTION_TYPES.SAD:
      emotionState.values.happiness = -60;
      emotionState.values.anxiety = 30;
      break;
    case EMOTION_TYPES.SURPRISED:
      emotionState.values.excitement = 70;
      break;
    case EMOTION_TYPES.FEARFUL:
      emotionState.values.anxiety = 80;
      emotionState.values.excitement = 60;
      break;
    case EMOTION_TYPES.FUNYA:
      emotionState.values.anxiety = -60;
      emotionState.values.excitement = -40;
      break;
    case EMOTION_TYPES.WORRIED:
      emotionState.values.anxiety = 60;
      emotionState.values.excitement = 20;
      break;
    case EMOTION_TYPES.SLEEPY:
      emotionState.values.sleepiness = 80;
      emotionState.values.excitement = -60;
      break;
    case EMOTION_TYPES.EXCITED:
      emotionState.values.excitement = 80;
      break;
    case EMOTION_TYPES.RELIEVED:
      emotionState.values.anxiety = -70;
      emotionState.values.happiness = 40;
      break;
    case EMOTION_TYPES.NORMAL:
    default:
      // 少しずつ通常状態に戻す
      emotionState.values = {
        happiness: emotionState.values.happiness * 0.8,
        anxiety: emotionState.values.anxiety * 0.8,
        excitement: emotionState.values.excitement * 0.8,
        sleepiness: emotionState.values.sleepiness * 0.8
      };
      break;
  }
}

/**
 * 感情変化リスナーを登録する
 * @param {Function} listener - 変更リスナー関数
 * @returns {Function} リスナー登録解除用の関数
 */
export function onEmotionChange(listener) {
  emotionChangeListeners.add(listener);
  
  // 登録解除用の関数を返す
  return () => {
    emotionChangeListeners.delete(listener);
  };
}

/**
 * 全ての感情変化リスナーに通知する
 * @param {Object} event - 変更イベントオブジェクト
 * @private
 */
function notifyEmotionChange(event) {
  emotionChangeListeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      logDebug(`感情変化リスナーでエラー: ${error.message}`);
    }
  });
}

/**
 * 感情を徐々に通常状態に戻すための時間経過処理
 * @param {number} deltaTime - 経過時間（ミリ秒）
 */
export function updateEmotionOverTime(deltaTime) {
  const decayFactor = 0.05 * (deltaTime / 1000); // 5%/秒の減衰
  
  // 各感情値を少しずつ0に近づける
  emotionState.values.happiness *= (1 - decayFactor);
  emotionState.values.anxiety *= (1 - decayFactor);
  emotionState.values.excitement *= (1 - decayFactor);
  emotionState.values.sleepiness *= (1 - decayFactor);
  
  // 値が十分小さくなったら0にする
  Object.keys(emotionState.values).forEach(key => {
    if (Math.abs(emotionState.values[key]) < 5) {
      emotionState.values[key] = 0;
    }
  });
  
  // 値の変化に応じて現在の感情を更新
  updateCurrentEmotion();
}

/**
 * 感情状態をリセットする
 * @returns {Object} リセット後の感情状態
 */
export function resetEmotionState() {
  emotionState = { ...initialEmotionState };
  
  // 変更を通知
  notifyEmotionChange({
    type: 'reset',
    state: getEmotionState()
  });
  
  logDebug('感情状態をリセットしました');
  
  return getEmotionState();
}

// グローバルスコープに公開（デバッグ・テスト用）
if (typeof window !== 'undefined') {
  window.emotionState = {
    get: getEmotionState,
    set: setEmotion,
    setValue: setEmotionValue,
    reset: resetEmotionState
  };
}

export default {
  getEmotionState,
  setEmotionValue,
  setEmotion,
  onEmotionChange,
  resetEmotionState,
  updateEmotionOverTime,
  EMOTION_TYPES,
  VOICE_TONES
}; 