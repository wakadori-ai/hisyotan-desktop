/**
 * hordeModeToggle.js
 * ホード夜モード切り替え用のUI処理を提供するモジュール
 */

import { logDebug, logError } from '@core/logger.js';
import { initUIElements } from '../../ui/uiHelper.js';

// ホード夜モードの状態
let isHordeModeEnabled = false;

/**
 * ホード夜モードの切り替え設定UIを表示する
 * @param {boolean} currentState - 現在のホード夜モードの状態
 * @param {Function} onChangeCallback - 状態変更時のコールバック関数（オプション）
 * @param {Function} speakWithObject - セリフオブジェクトを表示する関数
 * @param {Function} speak - 通常の発話処理を行う関数
 * @returns {Promise<boolean>} 非同期処理の結果
 */
export async function showHordeModeToggle(currentState, onChangeCallback, speakWithObject, speak) {
  try {
    // 現在の状態を設定
    isHordeModeEnabled = currentState;
    
    // UI要素を初期化（呼び出されたHTMLコンテキストに応じて）
    const speechBubble = document.getElementById('speechBubble');
    const speechText = document.getElementById('speechText');
    
    // 要素が見つからない場合はUIElementを再初期化
    if (!speechBubble || !speechText) {
      logDebug('吹き出し要素が見つからないためUIを再初期化します');
      initUIElements();
    }
    
    // ホード夜モード設定用のセリフオブジェクトを作成
    const hordeToggleSpeech = {
      id: "setting_horde_mode",
      type: "setting",
      text: "今夜はホード夜モードにする…？",
      emotion: "gentle", // またはnormal
      autoClose: false, // 自動で閉じないようにする
      uiPayload: {
        type: "toggle",
        label: "ホード夜モード",
        value: currentState,
        onChange: (newValue) => {
          // 状態を更新
          isHordeModeEnabled = newValue;
          logDebug(`ホード夜モードが${newValue ? 'オン' : 'オフ'}に変更されました`);
          
          // カスタムコールバックが指定されていれば実行
          if (typeof onChangeCallback === 'function') {
            onChangeCallback(newValue);
          }
          
          // 変更後のフィードバックセリフ
          const feedbackMessage = newValue 
            ? "ホード夜モードをオンにしたよ。怖いけど一緒に頑張ろうね…" 
            : "ホード夜モードをオフにしたよ。ほっとした～";
          
          const feedbackEmotion = newValue ? "serious" : "relieved";
          
          // 少し遅延させてフィードバックを表示
          setTimeout(() => {
            speak(
              feedbackMessage,
              feedbackEmotion,
              5000,
              null,
              "horde_mode_feedback"
            );
          }, 500);
        }
      }
    };
    
    // セリフオブジェクトを表示
    speakWithObject(hordeToggleSpeech);
    
    return true;
  } catch (err) {
    logError(`ホード夜モードトグル表示エラー: ${err.message}`);
    return false;
  }
}

/**
 * 現在のホード夜モードの状態を取得する
 * @returns {boolean} ホード夜モードが有効ならtrue
 */
export function getHordeModeState() {
  return isHordeModeEnabled;
}

/**
 * ホード夜モードの状態を直接設定する
 * @param {boolean} enabled - 設定する状態
 * @returns {boolean} 設定後の状態
 */
export function setHordeModeState(enabled) {
  isHordeModeEnabled = !!enabled;
  logDebug(`ホード夜モードを直接${isHordeModeEnabled ? 'オン' : 'オフ'}に設定しました`);
  return isHordeModeEnabled;
}

export default {
  showHordeModeToggle,
  getHordeModeState,
  setHordeModeState
}; 