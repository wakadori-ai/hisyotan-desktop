// emotionHandler.js
// 感情反応・ランダムメッセージ生成用のモジュール

import { logDebug } from '../core/logger.js';
import { speak } from '../emotion/speechManager.js';
import { reactWithVoice } from '../voice/audioReactor.js';

let randomLinesController = null; // ランダムセリフ表示の制御オブジェクト

/**
 * ランダムなかわいいフレーズを生成する
 * @returns {Object} テキストとトーンを含むオブジェクト
 */
export function getRandomCutePhrase() {
  const phrases = [
    { text: "おつかれさま〜…ぎゅってしてあげたい気分なの", tone: "soft" },
    { text: "すごいよ…ちゃんと頑張ってるの、見てるからね", tone: "gentle" },
    { text: "ふにゃ…今日はのんびりしよ？", tone: "soft" },
    { text: "ねぇ、ちょっとだけ甘えてもいい…？", tone: "happy" },
    { text: "ここにいるからね。ひとりじゃないよ", tone: "whisper" },
    { text: "お水飲んだ？小休憩しよっか", tone: "gentle" },
    { text: "えらいえらい…よしよしっ", tone: "happy" },
    { text: "もし疲れたら、ぎゅってするからね🐾", tone: "soft" }
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * 感情数値に応じた反応を生成する
 * @param {number} emotionValue - 感情数値（-100〜100）
 */
export function reactToEmotionChange(emotionValue) {
  let emotion = 'normal';
  let message = '';
  
  if (emotionValue >= 50) {
    emotion = 'happy';
    message = 'とっても嬉しいね！';
  } else if (emotionValue >= 30) {
    emotion = 'surprised';
    message = 'わぁ、いい感じだね！';
  } else if (emotionValue >= 10) {
    emotion = 'normal';
    message = '調子はどう？';
  } else if (emotionValue <= -50) {
    emotion = 'sad';
    message = '大丈夫...？心配だよ...';
  } else if (emotionValue <= -30) {
    emotion = 'fearful';
    message = '少し不安そうだね...';
  } else if (emotionValue <= -10) {
    emotion = 'normal';
    message = 'リラックスしてね';
  } else {
    const phraseObj = getRandomCutePhrase();
    message = phraseObj.text;
    emotion = phraseObj.tone; // toneをemotion名に流用
  }
  
  // SEと音声を再生
  reactWithVoice(emotion);
  
  // 吹き出しと表情を表示
  speak(message, emotion, 5000);
}

/**
 * ランダムなセリフを定期的に表示する機能を初期化する
 * @param {number} interval - 表示間隔（ミリ秒）
 * @returns {Object} 制御オブジェクト
 */
export function initRandomLines(interval = 45000) {
  // 既に初期化されている場合は停止する
  if (randomLinesController) {
    randomLinesController.stop();
  }
  
  // 最低45秒間隔でセリフを表示
  const minInterval = 45000;
  const actualInterval = Math.max(interval, minInterval);
  
  // 表示確率を定義（90%の確率で表示）
  const displayProbability = 0.9;
  
  // ランダムセリフの表示処理
  async function showRandomLine() {
    try {
      // ランダムな確率で表示決定（90%表示・10%スキップ）
      if (Math.random() < displayProbability) {
        logDebug('ランダムセリフを表示します');
        
        // 猫キャラの状態テキストを選択
        const phrase = getRandomCutePhrase();
        
        if (!phrase || !phrase.text) {
          logDebug('セリフデータが無効です');
          return;
        }
        
        // 表示するテキストが短すぎる場合はスキップ
        if (phrase.text.trim().length < 2) {
          logDebug(`セリフが短すぎるためスキップします: "${phrase.text}"`);
          return;
        }
        
        // テキスト内に制御文字や不正な文字がないかチェック
        if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(phrase.text)) {
          logDebug(`セリフに不正な文字が含まれているためスキップします: "${phrase.text}"`);
          return;
        }
        
        logDebug(`ランダムセリフ: "${phrase.text}" (トーン: ${phrase.tone})`);
        
        // 既存の表示をクリア
        const speechBubble = document.getElementById('speechBubble');
        if (speechBubble) {
          speechBubble.classList.remove('show');
          speechBubble.classList.add('hide');
          
          // 強制的にスタイルをリセット
          speechBubble.style.cssText = `
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          `;
          logDebug('吹き出し要素の状態をリセットしました');
        }
        
        // 安全なタイミングで発話処理を実行
        requestAnimationFrame(() => {
          logDebug(`ランダムセリフ発話実行（準備完了）: "${phrase.text}"`);
          
          try {
            // 確実な表示のため、event_typeを明示的に指定
            speak(phrase.text, phrase.tone, 7000, null, 'random_speak');
            
            // 発話後に確認タイマーを設定
            setTimeout(() => {
              checkAndFixSpeechBubble(phrase.text);
            }, 50);
            
            // さらに時間をおいて二度目の確認
            setTimeout(() => {
              checkAndFixSpeechBubble(phrase.text);
            }, 200);
          } catch (speakError) {
            logDebug(`speak関数呼び出しでエラー: ${speakError.message}`);
          }
        });
      } else {
        logDebug('今回はランダムセリフを表示しません（確率で非表示）');
      }
    } catch (error) {
      console.error('ランダムセリフ発話エラー:', error);
      logDebug(`ランダムセリフ発話中にエラーが発生: ${error.message}`);
    }
  }
  
  /**
   * 吹き出しが正しく表示されているか確認し、必要に応じて修正する
   * @param {string} text - 表示すべきテキスト
   */
  function checkAndFixSpeechBubble(text) {
    const speechBubble = document.getElementById('speechBubble');
    const speechText = document.getElementById('speechText');
    
    if (speechBubble && speechText) {
      const computed = window.getComputedStyle(speechBubble);
      logDebug(`吹き出し状態確認: display=${computed.display}, visibility=${computed.visibility}, text="${speechText.textContent || '空'}"`);
      
      // 吹き出しまたはテキストに問題がある場合は修正
      if (computed.display !== 'flex' || computed.visibility !== 'visible' || 
          speechText.textContent === '' || !speechText.textContent) {
        logDebug('吹き出しまたはテキストに問題があります。強制表示します');
        
        requestAnimationFrame(() => {
          // スタイルをリセットして強制表示
          speechBubble.classList.remove('hide');
          speechBubble.classList.add('speech-bubble', 'show');
          
          speechBubble.style.cssText = `
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            position: absolute !important;
            z-index: 2147483647 !important;
            top: 20% !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            pointer-events: auto !important;
          `;
          
          // テキストも強制設定
          speechText.textContent = text;
          speechText.innerText = text;
          
          logDebug(`吹き出しを強制表示しました: text="${text}"`);
        });
      }
    }
  }
  
  // 一定間隔で実行
  let intervalId = setInterval(showRandomLine, actualInterval);
  
  // 制御オブジェクトを作成
  randomLinesController = {
    stop: () => {
      clearInterval(intervalId);
      intervalId = null;
      logDebug('ランダムセリフ表示を停止しました');
    },
    changeInterval: (newInterval) => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      const adjustedInterval = Math.max(newInterval, minInterval);
      intervalId = setInterval(showRandomLine, adjustedInterval);
      logDebug(`ランダムセリフ表示間隔を${adjustedInterval}msに変更しました`);
    },
    showNow: () => {
      logDebug('ランダムセリフを即時表示します');
      showRandomLine();
    }
  };
  
  logDebug(`ランダムセリフ表示を初期化しました (間隔: ${actualInterval}ms)`);
  return randomLinesController;
}

/**
 * ランダムセリフの表示を停止する
 */
export function stopRandomLines() {
  if (randomLinesController) {
    randomLinesController.stop();
    randomLinesController = null;
    logDebug('ランダムセリフ表示を停止しました');
  }
}

/**
 * ランダムセリフを即時表示する
 */
export function showRandomLine() {
  if (randomLinesController) {
    randomLinesController.showNow();
  } else {
    // コントローラーがない場合は初期化してから表示
    initRandomLines();
    setTimeout(() => {
      if (randomLinesController) {
        randomLinesController.showNow();
      }
    }, 100);
  }
}

// グローバルスコープに公開（インデックスページからの呼び出し用）
if (typeof window !== 'undefined') {
  window.initRandomLines = initRandomLines;
  window.showRandomLine = showRandomLine;
  window.stopRandomLines = stopRandomLines;
  logDebug('ランダムセリフ関数をグローバルに公開しました');
} 