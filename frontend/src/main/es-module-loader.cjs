/**
 * ESモジュールローダー - CommonJSからESモジュールを読み込むためのブリッジファイル
 * 
 * このファイルはCommonJS形式で書かれ、Electronのメインエントリポイントとして機能します。
 * ESモジュール形式で書かれたindex.mjsを動的importで読み込みます。
 */

const path = require('path');

console.log('ESモジュールローダーを起動しています...');

// 絶対パスでindex.mjsをインポートする必要があります
const modulePath = path.resolve(__dirname, 'index.mjs');
// Windows環境ではパスのバックスラッシュをスラッシュに変換
const moduleUrl = `file://${modulePath.replace(/\\/g, '/')}`;

// 動的importでESモジュールを読み込みます
console.log(`ESモジュールを読み込みます: ${moduleUrl}`);

// メインモジュールをインポート
import(moduleUrl).catch(err => {
  console.error('ESモジュール読み込みエラー:', err);
  process.exit(1);
}); 