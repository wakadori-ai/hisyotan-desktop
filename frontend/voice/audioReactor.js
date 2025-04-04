// audioReactor.js
// ゲームイベントに対する音声リアクション機能を提供するモジュール
// Author: hisyotan-desktop team

import { logDebug } from '@core/logger.js';

// 効果音（SE）と音声ファイルのマッピング定義
const presetMap = {
  surprised: "/assets/sounds/presets/kya.wav",      // 驚き
  worried: "/assets/sounds/presets/sigh.wav",       // 心配
  fearful: "/assets/sounds/presets/gasp.wav",       // 恐怖
  funya: "/assets/sounds/presets/funya.wav",        // ふにゃっとした感じ
  happy: "/assets/sounds/presets/nya.wav",          // 嬉しい
  sad: "/assets/sounds/presets/sigh_sad.wav"        // 悲しい
};

// プリセット音声ファイルの名前から実際のパスへのマッピング
const presetNameMap = {
  "altu": "/assets/sounds/presets/altu.wav",       // 小さく驚く
  "funya": "/assets/sounds/presets/funya.wav",     // ふにゃっと反応
  "gasp": "/assets/sounds/presets/gasp.wav",       // 息を飲む（緊張）
  "kya": "/assets/sounds/presets/kya.wav",         // 軽く叫ぶ（驚き）
  "scream": "/assets/sounds/presets/scream.wav",   // 大声（襲撃時）
  "sigh": "/assets/sounds/presets/sigh.wav",       // 安堵、落ち着いたとき
  "hmm": "/assets/sounds/presets/sigh.wav",        // うーん（考え中）- hmm.wavがないのでsigh.wavを代用
  "appear": "/assets/sounds/presets/appear.wav",   // 出現
  "disappear": "/assets/sounds/presets/disapper.wav" // 消失
};

// VOICEVOX生成音声ファイルのマッピング定義
const voiceMap = {
  surprised: "/assets/sounds/generated/surprised_01.wav",   // 驚き
  worried: "/assets/sounds/generated/worried_01.wav",       // 心配
  fearful: "/assets/sounds/generated/fearful_01.wav",       // 恐怖
  funya: "/assets/sounds/generated/funya_01.wav",           // ふにゃっとした感じ
  happy: "/assets/sounds/generated/happy_01.wav",           // 嬉しい
  sad: "/assets/sounds/generated/sad_01.wav"                // 悲しい
};

// 現在再生中のAudioオブジェクト
let currentSE = null;
let currentVoice = null;

/**
 * 感情に応じた音声リアクションを再生する関数
 * 
 * @param {string} emotion - 感情タイプ (surprised, worried, fearful, funya, happy, sad など)
 * @param {number} delay - SEとVOICEVOX音声の間の遅延時間（ミリ秒）
 * @return {boolean} - 再生開始に成功したかどうか
 */
export function reactWithVoice(emotion, delay = 500) {
  try {
    logDebug(`音声リアクション開始: 感情=${emotion}, 遅延=${delay}ms`);
    
    // 前の再生があれば停止
    stopCurrentPlayback();
    
    let playbackStarted = false;
    
    // SEの再生
    if (presetMap[emotion]) {
      currentSE = new Audio(presetMap[emotion]);
      currentSE.addEventListener('ended', () => {
        currentSE = null;
        logDebug(`SE再生完了: ${presetMap[emotion]}`);
      });
      
      // エラーハンドリング
      currentSE.addEventListener('error', (e) => {
        logDebug(`SE再生エラー: ${e.message || 'unknown error'}`);
        currentSE = null;
      });
      
      currentSE.play()
        .then(() => {
          logDebug(`SE再生開始: ${presetMap[emotion]}`);
          playbackStarted = true;
        })
        .catch(err => {
          logDebug(`SE再生失敗: ${err.message}`);
          currentSE = null;
        });
    }
    
    // VOICEVOX音声の遅延再生
    if (voiceMap[emotion]) {
      setTimeout(() => {
        if (!voiceMap[emotion]) return;
        
        currentVoice = new Audio(voiceMap[emotion]);
        currentVoice.addEventListener('ended', () => {
          currentVoice = null;
          logDebug(`音声再生完了: ${voiceMap[emotion]}`);
        });
        
        // エラーハンドリング
        currentVoice.addEventListener('error', (e) => {
          logDebug(`音声再生エラー: ${e.message || 'unknown error'}`);
          currentVoice = null;
        });
        
        currentVoice.play()
          .then(() => {
            logDebug(`音声再生開始: ${voiceMap[emotion]}`);
          })
          .catch(err => {
            logDebug(`音声再生失敗: ${err.message}`);
            currentVoice = null;
          });
      }, delay);
    }
    
    return playbackStarted;
  } catch (err) {
    logDebug(`音声リアクションエラー: ${err.message}`);
    return false;
  }
}

/**
 * 現在再生中の音声を停止する
 */
export function stopCurrentPlayback() {
  try {
    if (currentSE) {
      currentSE.pause();
      currentSE.currentTime = 0;
      currentSE = null;
      logDebug('SE再生を停止しました');
    }
    
    if (currentVoice) {
      currentVoice.pause();
      currentVoice.currentTime = 0;
      currentVoice = null;
      logDebug('音声再生を停止しました');
    }
  } catch (err) {
    logDebug(`音声停止エラー: ${err.message}`);
  }
}

/**
 * 指定した感情タイプのSEのみを再生する
 * 
 * @param {string} emotion - 感情タイプ
 * @return {boolean} - 再生開始に成功したかどうか
 */
export function playSE(emotion) {
  try {
    if (!presetMap[emotion]) {
      logDebug(`指定された感情タイプのSEがありません: ${emotion}`);
      return false;
    }
    
    // 前のSEがあれば停止
    if (currentSE) {
      currentSE.pause();
      currentSE.currentTime = 0;
      currentSE = null;
    }
    
    currentSE = new Audio(presetMap[emotion]);
    currentSE.addEventListener('ended', () => {
      currentSE = null;
      logDebug(`SE再生完了: ${presetMap[emotion]}`);
    });
    
    currentSE.play()
      .then(() => {
        logDebug(`SE再生開始: ${presetMap[emotion]}`);
      })
      .catch(err => {
        logDebug(`SE再生失敗: ${err.message}`);
        currentSE = null;
        return false;
      });
    
    return true;
  } catch (err) {
    logDebug(`SE再生エラー: ${err.message}`);
    return false;
  }
}

/**
 * 指定した感情タイプの音声のみを再生する
 * 
 * @param {string} emotion - 感情タイプ
 * @return {boolean} - 再生開始に成功したかどうか
 */
export function playVoice(emotion) {
  try {
    if (!voiceMap[emotion]) {
      logDebug(`指定された感情タイプの音声がありません: ${emotion}`);
      return false;
    }
    
    // 前の音声があれば停止
    if (currentVoice) {
      currentVoice.pause();
      currentVoice.currentTime = 0;
      currentVoice = null;
    }
    
    currentVoice = new Audio(voiceMap[emotion]);
    currentVoice.addEventListener('ended', () => {
      currentVoice = null;
      logDebug(`音声再生完了: ${voiceMap[emotion]}`);
    });
    
    currentVoice.play()
      .then(() => {
        logDebug(`音声再生開始: ${voiceMap[emotion]}`);
      })
      .catch(err => {
        logDebug(`音声再生失敗: ${err.message}`);
        currentVoice = null;
        return false;
      });
    
    return true;
  } catch (err) {
    logDebug(`音声再生エラー: ${err.message}`);
    return false;
  }
}

// カスタム音声マッピングを追加する機能
export function addCustomSEMapping(emotion, filePath) {
  presetMap[emotion] = filePath;
  logDebug(`カスタムSEマッピングを追加しました: ${emotion} => ${filePath}`);
}

export function addCustomVoiceMapping(emotion, filePath) {
  voiceMap[emotion] = filePath;
  logDebug(`カスタム音声マッピングを追加しました: ${emotion} => ${filePath}`);
}

/**
 * テスト用：感情別に順番に音声リアクションをテスト再生する
 * 
 * @param {number} interval - リアクション間の間隔（ミリ秒）
 */
export function testAllReactions(interval = 3000) {
  const emotions = Object.keys(presetMap);
  
  logDebug(`音声リアクションテスト開始: 全${emotions.length}種類、間隔=${interval}ms`);
  
  emotions.forEach((emotion, index) => {
    setTimeout(() => {
      logDebug(`テスト再生 ${index+1}/${emotions.length}: emotion=${emotion}`);
      reactWithVoice(emotion);
    }, index * interval);
  });
}

/**
 * 直接ゲームイベントに紐づけるための関数
 * 
 * @param {string} gameEvent - ゲームイベント名 ('zombie_near', 'item_found' など)
 */
export function reactToGameEvent(gameEvent) {
  // ゲームイベントを感情にマッピング
  const eventToEmotionMap = {
    'zombie_near': 'fearful',    // ゾンビが近くにいる
    'zombie_few': 'worried',     // 少数のゾンビが見える
    'zombie_horde': 'surprised', // ゾンビの群れが見える
    'item_found': 'happy',       // アイテム発見
    'player_hurt': 'sad',        // プレイヤーがダメージを受けた
    'player_heal': 'happy',      // プレイヤーが回復した
    'craft_success': 'funya'     // クラフト成功
  };
  
  const emotion = eventToEmotionMap[gameEvent] || 'normal';
  logDebug(`ゲームイベント検出: ${gameEvent} => 感情=${emotion}`);
  
  return reactWithVoice(emotion);
}

/**
 * 指定した名前のプリセット音声を再生する
 * 
 * @param {string} presetName - プリセット音声の名前 (altu, funya, gasp, kya, scream, sigh など)
 * @return {Promise<boolean>} - 再生開始に成功したかどうかを返すPromise
 */
export function playPresetSound(presetName) {
  return new Promise((resolve, reject) => {
    try {
      const soundPath = presetNameMap[presetName];
      
      if (!soundPath) {
        logDebug(`指定されたプリセット音声がありません: ${presetName}`);
        resolve(false);
        return;
      }
      
      logDebug(`プリセット音声再生開始: ${presetName} => ${soundPath}`);
      
      // 前のSEがあれば停止
      if (currentSE) {
        currentSE.pause();
        currentSE.currentTime = 0;
        currentSE = null;
      }
      
      currentSE = new Audio(soundPath);
      
      currentSE.addEventListener('ended', () => {
        currentSE = null;
        logDebug(`プリセット音声再生完了: ${presetName}`);
        resolve(true);
      });
      
      // エラーハンドリング
      currentSE.addEventListener('error', (e) => {
        logDebug(`プリセット音声再生エラー: ${e.message || 'unknown error'}`);
        currentSE = null;
        resolve(false);
      });
      
      currentSE.play()
        .then(() => {
          logDebug(`プリセット音声再生開始: ${presetName}`);
        })
        .catch(err => {
          logDebug(`プリセット音声再生失敗: ${err.message}`);
          currentSE = null;
          resolve(false);
        });
    } catch (err) {
      logDebug(`プリセット音声再生エラー: ${err.message}`);
      resolve(false);
    }
  });
} 