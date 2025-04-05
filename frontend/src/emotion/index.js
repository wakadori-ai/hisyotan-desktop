/**
 * emotion/index.js
 * 秘書たんの感情表現モジュール全体のエントリーポイント
 * このファイルから一括で感情関連機能をエクスポートします
 */

// 感情状態管理
import emotionState, {
  getEmotionState,
  setEmotion,
  setEmotionValue,
  onEmotionChange,
  resetEmotionState,
  updateEmotionOverTime,
  EMOTION_TYPES,
  VOICE_TONES
} from './emotionState.js';

// 音声リアクション
import {
  reactWithVoice,
  playPresetSound,
  playSE,
  playVoice,
  stopCurrentPlayback,
  addCustomSEMapping,
  addCustomVoiceMapping,
  testAllReactions
} from './audioReactor.js';

// 発話管理
import { speak, speakWithPreset, isPlaying } from './SpeechManager/speakCore.js';
import { hideTimeoutMap } from './speechManager.js';

// 吹き出し表示
import {
  formatMessage,
  displayTextInBubble
} from './bubbleDisplay.js';

// 表情管理
import {
  setExpression,
  startTalking,
  stopTalking,
  startLightBounce,
  stopLightBounce,
  startTrembling,
  stopTrembling,
  startNervousShake,
  stopNervousShake
} from './expressionManager.js';

// ランダムセリフ生成
import {
  getRandomCutePhrase,
  reactToEmotionChange,
  initRandomLines,
  stopRandomLines,
  showRandomLine
} from './emotionHandler.js';

// シンプルなファサード関数をエクスポート
/**
 * 簡単に感情を表現するためのシンプルなファサード関数
 * 感情タイプを指定するだけで適切な表情、音声、セリフを表示します
 * 
 * @param {string} emotion - 感情タイプ（happy, sad, surprised, fearful, funya, normal など）
 * @param {string} message - 表示するメッセージ（指定しない場合は感情に合わせた自動生成）
 * @param {Object} options - 追加オプション
 * @returns {Promise<boolean>} 成功したかどうか
 */
export async function express(emotion, message = null, options = {}) {
  try {
    // 感情状態を更新
    setEmotion(emotion);
    
    // メッセージが指定されていない場合は感情に合わせて自動生成
    if (!message) {
      const emotionValue = emotion === 'happy' ? 70 : 
                         emotion === 'sad' ? -70 :
                         emotion === 'surprised' ? 30 :
                         emotion === 'fearful' ? -60 :
                         emotion === 'funya' ? 20 : 0;
      
      // emotionHandlerの関数を使って適切なメッセージを生成
      const phraseObj = emotionValue === 0 ? getRandomCutePhrase() : null;
      if (phraseObj) {
        message = phraseObj.text;
      } else {
        // 簡易的なデフォルトメッセージ
        message = emotion === 'happy' ? 'わぁ、嬉しいな！' :
                 emotion === 'sad' ? '少し悲しいよ...' :
                 emotion === 'surprised' ? 'えっ！？' :
                 emotion === 'fearful' ? 'こ、怖いよ...！' :
                 emotion === 'funya' ? 'ふにゃ〜' : 'どうしたの？';
      }
    }
    
    // 音声と表情でリアクション
    reactWithVoice(emotion);
    
    // 吹き出しと表情を表示
    return await speak(message, emotion, options.displayTime || 5000, options.animation);
  } catch (error) {
    console.error('感情表現エラー:', error);
    return false;
  }
}

// すべてのサブモジュールをエクスポート
export {
  // 感情状態
  emotionState,
  getEmotionState,
  setEmotion,
  setEmotionValue, 
  onEmotionChange,
  resetEmotionState,
  updateEmotionOverTime,
  EMOTION_TYPES,
  VOICE_TONES,
  
  // 音声リアクション
  reactWithVoice,
  playPresetSound,
  playSE,
  playVoice,
  stopCurrentPlayback,
  
  // 発話管理
  speak,
  speakWithPreset,
  isPlaying,
  hideTimeoutMap,
  
  // 吹き出し表示
  formatMessage,
  displayTextInBubble,
  
  // 表情管理
  setExpression,
  startTalking,
  stopTalking,
  startLightBounce,
  stopLightBounce,
  startTrembling,
  stopTrembling,
  startNervousShake,
  stopNervousShake,
  
  // ランダムセリフ生成
  getRandomCutePhrase,
  reactToEmotionChange,
  initRandomLines,
  stopRandomLines,
  showRandomLine
};

// デフォルトエクスポート
export default {
  express,
  emotionState,
  speak,
  reactWithVoice,
  setExpression
}; 