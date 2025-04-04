/**
 * ESモジュールローダー - CommonJSからESモジュールを読み込むためのブリッジファイル
 * 
 * このファイルはCommonJS形式で書かれ、Electronのメインエントリポイントとして機能します。
 * ESモジュール形式で書かれたindex.mjsを動的importで読み込みます。
 */

const path = require('path');

// 日本語コンソール出力のために文字コードを設定
if (process.platform === 'win32') {
  process.env.CHCP = '65001'; // UTF-8に設定
  try {
    // Windows環境の場合、コマンドプロンプトのコードページをUTF-8に設定
    require('child_process').execSync('chcp 65001');
  } catch (e) {
    console.error('コードページの設定に失敗しました:', e);
  }
}

console.log('🌸 ESモジュールローダーを起動しています...');

// 絶対パスでindex.mjsをインポートする必要があります
const modulePath = path.resolve(__dirname, 'index.mjs');
// Windows環境ではパスのバックスラッシュをスラッシュに変換
const moduleUrl = `file://${modulePath.replace(/\\/g, '/')}`;

// 動的importでESモジュールを読み込みます
console.log(`🔄 ESモジュールを読み込みます: ${moduleUrl}`);

// メインモジュールをインポート
import(moduleUrl).catch(err => {
  console.error('❌ ESモジュール読み込みエラー:', err);
  process.exit(1);
}); 