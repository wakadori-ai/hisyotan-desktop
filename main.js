const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const fetch = require('node-fetch');

// 設定読み込み
let config = {};
try {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
} catch (error) {
  console.error('設定ファイルの読み込みに失敗しました:', error);
  config = {
    app: { name: 'ふにゃ秘書たん', version: '1.0.0' },
    window: { width: 400, height: 600, transparent: true, frame: false, alwaysOnTop: true },
    voicevox: { host: 'http://127.0.0.1:50021', speaker_id: 8 }
  };
}

// メインウィンドウ
let mainWindow = null;

// 感情管理
let currentEmotion = 0; // -100〜100の範囲で感情を管理

// バックエンドサーバー起動管理
let backendProcess = null;
let isBackendInitialized = false;

// バックエンドサーバーの起動
async function startBackendServer() {
  try {
    // すでにバックエンドが実行中の場合は何もしない
    if (backendProcess !== null) {
      console.log('バックエンドサーバーはすでに起動しています');
      return;
    }
    
    console.log('バックエンドサーバーを起動します...');
    
    // Pythonの実行パスを取得（開発環境と本番環境で異なる可能性がある）
    let pythonPath;
    const isPackaged = app.isPackaged;
    
    if (isPackaged) {
      // 本番環境（パッケージ化済み）の場合はリソースディレクトリ内のPythonを使用
      pythonPath = path.join(process.resourcesPath, 'python', 'python.exe');
    } else {
      // 開発環境の場合はシステムPythonを使用
      pythonPath = 'python';
    }
    
    // バックエンドのスクリプトパス
    const backendScript = path.join(__dirname, 'backend', 'main.py');
    
    // バックエンドサーバーをサブプロセスとして起動
    backendProcess = spawn(pythonPath, [backendScript], {
      stdio: 'pipe', // 標準出力とエラー出力を親プロセスにパイプ
      detached: false // 親プロセスが終了した場合に子プロセスも終了させる
    });
    
    // 標準出力のリスニング
    backendProcess.stdout.on('data', (data) => {
      console.log(`バックエンド出力: ${data.toString().trim()}`);
    });
    
    // エラー出力のリスニング
    backendProcess.stderr.on('data', (data) => {
      console.error(`バックエンドエラー: ${data.toString().trim()}`);
    });
    
    // プロセス終了時の処理
    backendProcess.on('close', (code) => {
      console.log(`バックエンドサーバーが終了しました (コード: ${code})`);
      backendProcess = null;
    });
    
    // バックエンドサーバーの起動を待機
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('バックエンドサーバー起動待機完了');
    
    // バックエンドの接続確認
    await checkBackendConnection();
    
    return true;
  } catch (error) {
    console.error('バックエンドサーバー起動エラー:', error);
    return false;
  }
}

// バックエンド接続確認
async function checkBackendConnection() {
  try {
    console.log('バックエンド接続確認中...');
    
    // タイムアウト付きの接続確認
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch('http://127.0.0.1:8000/api/status', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log('バックエンド接続成功:', data);
      isBackendInitialized = true;
      return true;
    } else {
      console.error('バックエンド接続エラー:', response.status);
      isBackendInitialized = false;
      return false;
    }
  } catch (error) {
    console.error('バックエンド接続確認エラー:', error);
    isBackendInitialized = false;
    return false;
  }
}

// アプリケーションの初期化
app.whenReady().then(async () => {
  // バックエンドサーバーを起動
  await startBackendServer();
  
  // メインウィンドウ作成
  createWindow();
  
  // グローバルショートカットの登録
  registerGlobalShortcuts();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  
  // クラッシュレポート機能
  app.on('render-process-gone', (event, webContents, details) => {
    console.error('レンダラープロセスがクラッシュしました:', details.reason);
    // レンダラープロセスが異常終了した場合の再起動処理
    if (details.reason !== 'clean-exit') {
      console.log('アプリケーションを再起動します...');
      app.relaunch();
      app.exit(0);
    }
  });

  // 未処理の例外をキャッチ
  process.on('uncaughtException', (error) => {
    console.error('未処理の例外が発生しました:', error);
    // エラーをユーザーに通知する処理も追加可能
  });
});

function createWindow() {
  // ウィンドウ作成
  mainWindow = new BrowserWindow({
    width: config.window.width || 400,
    height: config.window.height || 600,
    transparent: config.window.transparent !== false,
    frame: config.window.frame !== false,
    alwaysOnTop: config.window.alwaysOnTop !== false,
    backgroundColor: config.window.backgroundColor || '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // ローカル開発用にwebSecurityを無効化
    }
  });

  // ... existing code ...
}

// IPC通信ハンドラ（音声キャッシュ関連）
// ファイルの存在確認
ipcMain.handle('check-file-exists', async (event, filePath) => {
  try {
    // 相対パスを絶対パスに変換
    const absolutePath = path.resolve(__dirname, filePath);
    return fs.existsSync(absolutePath);
  } catch (error) {
    console.error('ファイル存在確認エラー:', error);
    return false;
  }
});

// ファイル保存
ipcMain.handle('save-voice-file', async (event, filePath, uint8Array) => {
  try {
    // 相対パスを絶対パスに変換
    const absolutePath = path.resolve(__dirname, filePath);
    
    // ディレクトリが存在しない場合は作成
    const dirPath = path.dirname(absolutePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Uint8Arrayをバッファに変換してファイルに書き込み
    fs.writeFileSync(absolutePath, Buffer.from(uint8Array));
    console.log(`🎵 音声ファイル保存成功: ${filePath}`);
    return true;
  } catch (error) {
    console.error('ファイル保存エラー:', error);
    return false;
  }
});

// JSONファイル読み込み
ipcMain.handle('read-json-file', async (event, filePath) => {
  try {
    // 相対パスを絶対パスに変換
    const absolutePath = path.resolve(__dirname, filePath);
    
    // ファイルが存在しない場合は空のオブジェクトを返す
    if (!fs.existsSync(absolutePath)) {
      return {};
    }
    
    // ファイルを読み込んでJSONとしてパース
    const data = fs.readFileSync(absolutePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('JSONファイル読み込みエラー:', error);
    return {};
  }
});

// JSONファイル書き込み
ipcMain.handle('write-json-file', async (event, filePath, jsonData) => {
  try {
    // 相対パスを絶対パスに変換
    const absolutePath = path.resolve(__dirname, filePath);
    
    // ディレクトリが存在しない場合は作成
    const dirPath = path.dirname(absolutePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // JSONデータを文字列に変換して書き込み
    fs.writeFileSync(absolutePath, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log(`📝 JSONファイル保存成功: ${filePath}`);
    return true;
  } catch (error) {
    console.error('JSONファイル書き込みエラー:', error);
    return false;
  }
}); 