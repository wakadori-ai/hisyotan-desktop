/**
 * main.js - CommonJSエントリーポイント
 * これはElectronがrequire()で読み込むためのCommonJSファイルです。
 * このファイルは単純に本体のESモジュール（frontend/src/main/index.mjs）を読み込みます。
 */

const path = require('path');
const { app } = require('electron');
const { execSync, exec } = require('child_process');
const { ipcMain } = require('electron');
const fs = require('fs');

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

// 子プロセスのPIDを記録する変数
let backendPID = null;

// バックエンドプロセスのPIDを保存する関数
function saveBackendPID(pid) {
  // PIDファイルを作成・更新
  const pidFilePath = path.join(__dirname, 'backend_pid.txt');
  try {
    fs.writeFileSync(pidFilePath, pid.toString(), 'utf8');
    console.log(`✅ バックエンドプロセスのPID(${pid})を保存しました: ${pidFilePath}`);
    backendPID = pid;
    return true;
  } catch (error) {
    console.error('❌ バックエンドプロセスPIDの保存に失敗:', error);
    return false;
  }
}

// バックエンドプロセスのPIDを読み込む関数
function loadBackendPID() {
  const pidFilePath = path.join(__dirname, 'backend_pid.txt');
  try {
    if (fs.existsSync(pidFilePath)) {
      const pid = parseInt(fs.readFileSync(pidFilePath, 'utf8').trim(), 10);
      console.log(`📋 保存されたバックエンドプロセスPID: ${pid}`);
      backendPID = pid;
      return pid;
    }
  } catch (error) {
    console.error('❌ バックエンドプロセスPIDの読み込みに失敗:', error);
  }
  return null;
}

// ESモジュールへのブリッジ
try {
  // 実行環境のパスを解決
  const modulePath = path.join(__dirname, 'frontend', 'src', 'main', 'index.mjs');
  // Windows環境ではパスのバックスラッシュをスラッシュに変換
  const moduleUrl = `file://${modulePath.replace(/\\/g, '/')}`;
  
  console.log(`🔄 ESモジュールをロードします: ${moduleUrl}`);
  
  // PIDファイルがあれば読み込む
  loadBackendPID();
  
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

// バックエンドプロセスを強制終了する関数（PID指定）
function forceKillBackendProcess() {
  // 保存されたPIDを使用
  const pid = backendPID || loadBackendPID();
  
  if (!pid) {
    console.warn('⚠️ バックエンドプロセスのPIDが不明です。強制終了できません。');
    return false;
  }
  
  console.log(`🔥 バックエンドプロセス(PID: ${pid})を強制終了します...`);
  
  try {
    if (process.platform === 'win32') {
      // Windowsの場合はtaskkillコマンドを使用
      execSync(`taskkill /F /PID ${pid}`);
      console.log(`✅ バックエンドプロセス(PID: ${pid})の強制終了に成功しました`);
      return true;
    } else {
      // Linux/Macの場合はkillコマンドを使用
      execSync(`kill -9 ${pid}`);
      console.log(`✅ バックエンドプロセス(PID: ${pid})の強制終了に成功しました`);
      return true;
    }
  } catch (error) {
    console.error(`❌ バックエンドプロセス(PID: ${pid})の強制終了に失敗:`, error);
    return false;
  }
}

// 複数の方法でPythonプロセスを終了させる関数
async function killPythonProcesses() {
  console.log('🔄 複数の方法でPythonプロセスの終了を試みます...');
  
  // 1. 保存されたPIDを使用した強制終了
  forceKillBackendProcess();
  
  // 2. taskkillコマンドを使用してPythonプロセスを終了
  try {
    console.log('🔄 taskkillコマンドでPythonプロセスを終了します...');
    execSync('taskkill /F /IM python.exe', { stdio: 'ignore' });
    console.log('✅ taskkillコマンドでPythonプロセスを終了しました');
  } catch (error) {
    console.error('❌ taskkillコマンドでのPython終了に失敗:', error.message);
  }
  
  // 3. WMICコマンドを使用してPythonプロセスを終了（代替方法）
  try {
    console.log('🔄 WMICコマンドでPythonプロセスを終了します...');
    execSync('wmic process where name="python.exe" delete', { stdio: 'ignore' });
    console.log('✅ WMICコマンドでPythonプロセスを終了しました');
  } catch (error) {
    console.error('❌ WMICコマンドでのPython終了に失敗:', error.message);
  }
  
  // 4. PowerShellスクリプトで終了処理を実行
  try {
    const stopScriptPath = path.join(__dirname, 'tools', 'stop_hisyotan.ps1');
    if (fs.existsSync(stopScriptPath)) {
      console.log(`🔄 PowerShellスクリプトを実行: ${stopScriptPath}`);
      execSync(`powershell.exe -ExecutionPolicy Bypass -File "${stopScriptPath}"`, { stdio: 'ignore' });
      console.log('✅ PowerShellスクリプトでプロセス終了処理を実行しました');
    }
  } catch (error) {
    console.error('❌ PowerShellスクリプト実行に失敗:', error.message);
  }
  
  return true;
}

// IPCイベントハンドラを設定する関数
function setupIPCHandlers() {
  // バックエンドプロセスのPID登録用ハンドラ
  ipcMain.handle('register-backend-pid', (event, pid) => {
    console.log(`🔄 バックエンドプロセスPID登録リクエスト: ${pid}`);
    return saveBackendPID(pid);
  });
  
  // バックエンドを含めて完全に終了するハンドラ
  ipcMain.on('quit-app-with-backend', async (event) => {
    console.log('⚠️ バックエンドを含む完全終了を要求されました');
    
    try {
      // まずバックエンドのシャットダウンAPIを呼び出す
      await shutdownBackend(true);
      
      // 少し待機してからプロセス強制終了を試みる
      setTimeout(async () => {
        // バックエンドプロセスとその関連プロセスを確実に終了
        await killPythonProcesses();
        
        // 少し待機してからアプリを終了
        setTimeout(() => {
          app.exit(0);
        }, 1000);
      }, 2000);
    } catch (error) {
      console.error('終了処理中にエラーが発生しました:', error);
      app.exit(0);
    }
  });
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
    console.log(`🔌 シャットダウンAPI呼び出し結果: ${apiSuccess ? '成功' : '失敗'}`);
    
    // APIの呼び出しが成功しても失敗しても、完全にプロセスを終了させるための処理を実行
    console.log('🔄 バックエンドプロセス終了処理を開始します...');
    
    // 複数の方法でプロセス終了を試みる
    await killPythonProcesses();
    
    // VOICEVOXも終了
    try {
      console.log('🔄 VOICEVOXプロセスの終了を試みます...');
      execSync('taskkill /F /IM voicevox_engine.exe', { stdio: 'ignore' });
      console.log('✅ VOICEVOXプロセスを終了しました');
    } catch (error) {
      console.error('❌ VOICEVOXプロセス終了処理エラー:', error.message);
    }
    
    // 少し待ってからアプリを終了（バックエンドの終了処理が完了するのを待つ）
    console.log('⏱️ 3秒間待機してからアプリを終了します...');
    setTimeout(() => {
      console.log('👋 さようなら！アプリを終了します');
      app.exit(0);
    }, 3000);
  } catch (error) {
    console.error('終了処理中にエラーが発生しました:', error);
    // エラーが発生した場合も強制終了
    setTimeout(() => {
      app.exit(0);
    }, 1000);
  }
});