/**
 * main.js - CommonJSエントリーポイント
 * これはElectronがrequire()で読み込むためのCommonJSファイルです。
 * このファイルは単純に本体のESモジュール（frontend/src/main/index.mjs）を読み込みます。
 */

const path = require('path');
const { app } = require('electron');
const { execSync } = require('child_process');

// Windows環境での日本語コンソール出力のために文字コードを設定
if (process.platform === 'win32') {
  process.env.CHCP = '65001'; // UTF-8に設定
  try {
    // コマンドプロンプトのコードページをUTF-8に設定
    execSync('chcp 65001');
    console.log('🌸 コンソール出力の文字コードをUTF-8に設定しました');
  } catch (e) {
    console.error('❌ コードページの設定に失敗しました:', e);
  }
}

console.log('🌸 main.js: CommonJSエントリーポイントが読み込まれました');

// 開発モードかどうかを判定
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
console.log(`🔧 実行モード: ${isDev ? '開発' : '本番'}`);

// ESモジュールへのブリッジ
try {
  // 実行環境のパスを解決
  const modulePath = path.join(__dirname, 'frontend', 'src', 'main', 'index.mjs');
  // Windows環境ではパスのバックスラッシュをスラッシュに変換
  const moduleUrl = `file://${modulePath.replace(/\\/g, '/')}`;
  
  console.log(`🔄 ESモジュールをロードします: ${moduleUrl}`);
  
  // 動的importでESモジュールを読み込む
  import(moduleUrl).catch(err => {
    console.error('❌ ESモジュール読み込みエラー:', err);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ ブリッジ処理エラー:', error);
  process.exit(1);
}