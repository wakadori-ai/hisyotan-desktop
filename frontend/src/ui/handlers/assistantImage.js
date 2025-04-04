// assistantImage.js
// アシスタント画像の管理

import { logDebug, logError } from '@core/logger.js';

/**
 * アシスタント画像の設定
 */
export function setupAssistantImage() {
  logDebug('アシスタント画像をセットアップしています');
  
  // 画像要素の取得
  const assistantImage = document.getElementById('assistantImage');
  if (!assistantImage) {
    logError('アシスタント画像要素が見つかりません');
    return;
  }
  
  // 画像パスの解決とグローバル関数の設定
  loadSecretaryImage('normal')
    .then(imagePath => {
      // 画像のパスを設定
      assistantImage.src = imagePath;
      
      // グローバル関数として公開（既存コードとの互換性のため）
      if (typeof window !== 'undefined') {
        window.loadSecretaryImage = loadSecretaryImage;
        logDebug('loadSecretaryImage関数をグローバルに公開しました');
      }
    })
    .catch(error => {
      logError(`画像の読み込みに失敗しました: ${error.message}`);
    });
}

/**
 * 画像パスを解決
 * @param {string} relativePath - 相対パス
 * @returns {Promise<string>} HTTP URL
 */
export async function resolveImagePath(relativePath) {
  try {
    // パスの正規化: 先頭の'/'を追加（なければ）
    const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    
    // HTTP経由でアクセスするためのURLを生成
    const imageUrl = new URL(normalizedPath, window.location.origin).href;
    logDebug(`画像URLを生成しました: ${imageUrl}`);
    
    return imageUrl;
  } catch (error) {
    logError(`画像パス解決エラー: ${error.message}`);
    // エラー時でもURLオブジェクトを使用して適切なパスを返す
    return new URL(relativePath, window.location.origin).href;
  }
}

/**
 * 秘書画像を読み込む
 * @param {string} emotion - 感情名（normal, happy, sad等）
 * @returns {Promise<string>} 画像URL
 */
export async function loadSecretaryImage(emotion = 'normal') {
  // 画像のベースパス（Viteの公開フォルダを基準）
  const imageBasePath = '/assets/images/secretary';
  
  try {
    // 設定に基づいて画像名を決定
    const settings = window.currentSettings || {};
    const characterName = settings.character || 'maki';
    
    // アニメーション対応かどうかを確認
    const supportsAnimation = settings.animation !== false;
    
    // 感情名からファイル名を生成
    const fileExtension = supportsAnimation ? 'webp' : 'png';
    const imagePath = `${imageBasePath}/${characterName}_${emotion}.${fileExtension}`;
    
    // HTTPパスに解決
    const resolvedPath = await resolveImagePath(imagePath);
    logDebug(`画像パスを解決しました: ${emotion} → ${resolvedPath}`);
    
    // 画像プリロードを行い、存在確認
    await preloadImage(resolvedPath);
    
    return resolvedPath;
  } catch (error) {
    // エラー時はデフォルト画像にフォールバック
    logError(`画像読み込みエラー: ${error.message}`);
    
    try {
      // フォールバック画像パスを解決
      const fallbackPath = `${imageBasePath}/maki_normal.png`;
      const resolvedFallbackPath = await resolveImagePath(fallbackPath);
      
      // フォールバック画像をプリロード
      await preloadImage(resolvedFallbackPath);
      
      logDebug(`フォールバック画像を使用します: ${resolvedFallbackPath}`);
      return resolvedFallbackPath;
    } catch (fallbackError) {
      logError(`フォールバック画像も読み込めませんでした: ${fallbackError.message}`);
      // 最終手段として絶対パスのURLを返す
      return new URL('/assets/images/secretary/maki_normal.png', window.location.origin).href;
    }
  }
}

/**
 * 画像のプリロード
 * @param {string} src - 画像のソースパス
 * @returns {Promise<HTMLImageElement>} 読み込まれた画像要素
 */
function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`画像の読み込みに失敗しました: ${src}`));
    
    img.src = src;
  });
} 