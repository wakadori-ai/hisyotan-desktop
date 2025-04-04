/**
 * main.js - CommonJSエントリーポイント
 * これはElectronがrequire()で読み込むためのCommonJSファイルです。
 * このファイルは単純に本体のESモジュール（frontend/src/main/index.mjs）を読み込みます。
 */

const path = require('path');
const { app } = require('electron');
const { execSync } = require('child_process');
const { ipcMain } = require('electron');

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

// バックエンドのシャットダウンAPIを呼び出す関数
async function shutdownBackend(force = false) {
  try {
    console.log(`🔌 バックエンドのシャットダウンAPIを呼び出します (force=${force})`);
    
    // fetch APIを使って、バックエンドのシャットダウンエンドポイントを呼び出す
    const { default: fetch } = await import('node-fetch');
    const response = await fetch('http://127.0.0.1:8000/api/shutdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
      timeout: 3000 // 3秒でタイムアウト
    }).catch(err => {
      console.error('❌ バックエンドシャットダウンAPI呼び出しエラー:', err);
      return null;
    });
    
    if (response && response.ok) {
      console.log('✅ バックエンドのシャットダウンAPIが正常に応答しました');
      return true;
    } else {
      console.warn('⚠️ バックエンドのシャットダウンAPIが正常に応答しませんでした');
      return false;
    }
  } catch (error) {
    console.error('❌ バックエンドシャットダウン処理エラー:', error);
    return false;
  }
}

// IPCイベントハンドラを設定する関数
function setupIPCHandlers() {
  // 既存のハンドラ...
  
  // バックエンドを含めて完全に終了するハンドラ
  ipcMain.on('quit-app-with-backend', async (event) => {
    console.log('⚠️ バックエンドを含む完全終了を要求されました');
    
    try {
      // まずバックエンドのシャットダウンAPIを呼び出す
      await shutdownBackend(true);
      
      // バックエンドプロセスを確実に終了
      const { exec } = require('child_process');
      
      // タスクキル処理を非同期的に実行する関数
      const killProcess = (processName, label, nextCallback) => {
        console.log(`🔄 ${label}のプロセス終了を試みます...`);
        exec(`taskkill /F /IM ${processName}`, (err) => {
          if (err) {
            console.error(`${label}プロセス終了エラー:`, err);
          } else {
            console.log(`✅ ${label}のプロセスを終了しました`);
          }
          if (nextCallback) nextCallback();
        });
      };
      
      // 優先度順に終了処理を実行
      killProcess('python.exe /FI "WINDOWTITLE eq uvicorn*"', 'uvicorn', () => {
        killProcess('python.exe', 'Python', () => {
          killProcess('voicevox_engine.exe', 'VOICEVOX', () => {
            console.log('🚪 すべてのプロセスを終了しました');
            
            // PowerShellスクリプトでさらに強制終了を試みる
            try {
              const path = require('path');
              const stopScriptPath = path.join(__dirname, 'tools', 'stop_hisyotan.ps1');
              console.log(`終了スクリプトを実行: ${stopScriptPath}`);
              
              exec(`powershell.exe -ExecutionPolicy Bypass -File "${stopScriptPath}"`, (error) => {
                if (error) console.error('終了スクリプトエラー:', error);
                
                // 最後にアプリを終了
                setTimeout(() => {
                  app.exit(0);
                }, 500);
              });
            } catch (error) {
              console.error('終了スクリプト実行エラー:', error);
              app.exit(0);
            }
          });
        });
      });
    } catch (error) {
      console.error('終了処理中にエラーが発生しました:', error);
      app.exit(0);
    }
  });
  
  // 他のハンドラ...
}

// アプリの初期化時にIPCハンドラを設定
app.whenReady().then(() => {
  console.log('🌸 Electronアプリの初期化完了');
  setupIPCHandlers();
  // 既存の初期化コード...
});

// アプリ終了時の処理
app.on('before-quit', async (event) => {
  console.log('🚪 アプリの終了が要求されました');
  
  // イベントをキャンセルして、バックエンドの終了処理を実行
  event.preventDefault();
  
  // バックエンドプロセスなどを確実に終了する処理を追加
  try {
    // バックエンドのシャットダウンAPIを呼び出す
    const apiSuccess = await shutdownBackend(false);
    
    // APIの呼び出しが失敗した場合は強制終了を試みる
    if (!apiSuccess) {
      const { exec } = require('child_process');
      
      // Pythonプロセスを強制終了
      exec('taskkill /F /IM python.exe', () => {
        console.log('Pythonプロセスを終了しました');
      });
      
      // VOICEVOXも終了
      exec('taskkill /F /IM voicevox_engine.exe', () => {
        console.log('VOICEVOXプロセスを終了しました');
      });
    }
    
    // 少し待ってからアプリを終了（バックエンドの終了処理が完了するのを待つ）
    setTimeout(() => {
      app.exit(0);
    }, 2000);
  } catch (error) {
    console.error('終了処理中にエラーが発生しました:', error);
    // エラーが発生した場合も強制終了
    setTimeout(() => {
      app.exit(0);
    }, 500);
  }
});