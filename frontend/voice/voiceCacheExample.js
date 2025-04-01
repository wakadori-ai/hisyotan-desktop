/**
 * voiceCacheManager の使用例
 */

import { getOrGenerateVoice, getVoiceInfo, getAllVoices } from './voiceCacheManager.js';

/**
 * 基本的な使用例：驚いた時のセリフを再生
 */
async function playSurprisedLine() {
  try {
    // 音声を取得（キャッシュがあればそれを使用、なければ生成）
    const path = await getOrGenerateVoice(
      "surprised_01",           // セリフID
      "や、やばいってば〜！",     // セリフ本文
      8,                        // 話者ID
      { emotion: "surprised" }  // メタデータ
    );
    
    // 音声を再生
    const voice = new Audio(path);
    voice.play();
    
    console.log(`再生中: ${path}`);
  } catch (error) {
    console.error('音声再生エラー:', error);
  }
}

/**
 * 複数のセリフを順番に再生する例
 * @param {Array<{id: string, text: string, emotion: string}>} lines - セリフのリスト
 */
async function playLinesSequentially(lines) {
  try {
    for (const line of lines) {
      const path = await getOrGenerateVoice(
        line.id,
        line.text,
        8,  // 話者ID
        { emotion: line.emotion }
      );
      
      // 音声を再生し、終了を待つ
      await new Promise((resolve) => {
        const voice = new Audio(path);
        voice.onended = resolve;
        voice.play();
      });
      
      // 次のセリフの前に少し間を空ける
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  } catch (error) {
    console.error('シーケンス再生エラー:', error);
  }
}

/**
 * インデックス情報の取得と表示
 */
async function showVoiceIndex() {
  // 特定のセリフの情報を取得
  const info = await getVoiceInfo('surprised_01');
  if (info) {
    console.log('セリフ情報:', info);
  } else {
    console.log('セリフが見つかりません');
  }
  
  // 全てのセリフを取得して表示
  const allVoices = await getAllVoices();
  console.log('登録済みセリフ一覧:', Object.keys(allVoices).length);
  
  // 感情ごとにグループ化して表示
  const groupedByEmotion = {};
  for (const [id, info] of Object.entries(allVoices)) {
    const emotion = info.emotion || 'unknown';
    if (!groupedByEmotion[emotion]) {
      groupedByEmotion[emotion] = [];
    }
    groupedByEmotion[emotion].push(info);
  }
  
  console.log('感情別セリフ数:', 
    Object.entries(groupedByEmotion).map(([emotion, items]) => 
      `${emotion}: ${items.length}件`
    ).join(', ')
  );
}

/**
 * 使用例
 */
async function examples() {
  // 例1: 単一のセリフを再生
  await playSurprisedLine();
  
  // 例2: 複数のセリフを順番に再生
  const lines = [
    { id: 'worried_01', text: 'ちょっと心配だよ...', emotion: 'worried' },
    { id: 'happy_01', text: 'やった！成功だね！', emotion: 'happy' },
    { id: 'gentle_01', text: 'お疲れさま、少し休憩する？', emotion: 'gentle' }
  ];
  
  await playLinesSequentially(lines);
  
  // 例3: インデックス情報の表示
  await showVoiceIndex();
}

// メイン実行部分（必要に応じて呼び出す）
// examples(); 