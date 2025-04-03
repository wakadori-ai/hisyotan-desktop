import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールでの__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📝 preloadスクリプトをdistフォルダにコピーします...');

// コピー元のパス
const preloadPath = path.join(__dirname, 'frontend', 'src', 'main', 'preload', 'preload.js');
const pawPreloadPath = path.join(__dirname, 'frontend', 'src', 'main', 'preload', 'paw-preload.js');

// コピー先のパス
const distPreloadPath = path.join(__dirname, 'dist', 'preload.js');
const distPawPreloadPath = path.join(__dirname, 'dist', 'paw-preload.js');

// preload.jsのコピー
try {
  fs.copyFileSync(preloadPath, distPreloadPath);
  console.log('✅ preload.js をコピーしました');
} catch (error) {
  console.error('❌ preload.js のコピーに失敗しました:', error);
}

// paw-preload.jsのコピー
try {
  fs.copyFileSync(pawPreloadPath, distPawPreloadPath);
  console.log('✅ paw-preload.js をコピーしました');
} catch (error) {
  console.error('❌ paw-preload.js のコピーに失敗しました:', error);
}

console.log('🎉 コピー完了！'); 