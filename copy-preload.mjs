import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールでの__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📝 preloadスクリプトをdistフォルダにコピーします...');
console.log(`📂 現在のディレクトリ: ${__dirname}`);

// コピー元のパス
const preloadPath = path.join(__dirname, 'frontend', 'src', 'main', 'preload', 'preload.js');
const pawPreloadPath = path.join(__dirname, 'frontend', 'src', 'main', 'preload', 'paw-preload.js');

// コピー先のパス
const distDir = path.join(__dirname, 'dist');
const distPreloadPath = path.join(distDir, 'preload.js');
const distPawPreloadPath = path.join(distDir, 'paw-preload.js');

console.log(`📄 コピー元のpreload.js: ${preloadPath}`);
console.log(`📄 コピー先のpreload.js: ${distPreloadPath}`);

// distディレクトリが存在するか確認し、なければ作成
if (!fs.existsSync(distDir)) {
  console.log('📁 distディレクトリが存在しないため作成します...');
  try {
    fs.mkdirSync(distDir, { recursive: true });
    console.log('✅ distディレクトリを作成しました');
  } catch (error) {
    console.error('❌ distディレクトリの作成に失敗しました:', error);
    process.exit(1);
  }
}

// ソースファイルの存在確認
if (!fs.existsSync(preloadPath)) {
  console.error(`❌ ソースファイルが見つかりません: ${preloadPath}`);
  process.exit(1);
}

if (!fs.existsSync(pawPreloadPath)) {
  console.error(`❌ ソースファイルが見つかりません: ${pawPreloadPath}`);
  process.exit(1);
}

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