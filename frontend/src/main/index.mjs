/**
 * ふにゃ秘書たんデスクトップアプリのメインプロセス
 * Electronの起動と統合UIの管理を行います
 */
import { app, BrowserWindow, ipcMain, shell, session } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, exec } from 'child_process';
import fetch from 'node-fetch';
import iconv from 'iconv-lite';

// ESモジュールでの__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 開発モードかどうかを判定
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const isDevCSP = process.env.ELECTRON_CSP_DEV === 'true';

// 環境変数からアプリ名を取得
const appNameFromEnv = process.env.HISYOTAN_APP_NAME || null;
if (appNameFromEnv) {
  console.log(`アプリ名を環境変数から取得: ${appNameFromEnv}`);
}

// 環境変数からpreloadPathを取得
const preloadPathFromEnv = process.env.HISYOTAN_PRELOAD_PATH || null;
if (preloadPathFromEnv) {
  console.log(`preloadパスを環境変数から取得: ${preloadPathFromEnv}`);
}

// 設定読み込み
let config = {};
try {
  // ESMでのパス解決を使用
  const configPath = fileURLToPath(new URL('../../../config.json', import.meta.url));
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
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

// CSP設定を開発モードで無効化する処理（開発時のみ）
function setupDevCSP() {
  if (isDevCSP) {
    console.log('🔓 開発モード: CSP制限を一時的に緩和します');
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      delete details.responseHeaders['content-security-policy'];
      callback({ 
        cancel: false, 
        responseHeaders: details.responseHeaders 
      });
    });
  }
}

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
    
    // バックエンドのスクリプトパス - ESMパス解決を使用
    const backendScript = fileURLToPath(new URL('../../../backend/main.py', import.meta.url));
    
    // バックエンドサーバーをサブプロセスとして起動
    backendProcess = spawn(pythonPath, [backendScript], {
      stdio: 'pipe', // 標準出力とエラー出力を親プロセスにパイプ
      detached: false // 親プロセスが終了した場合に子プロセスも終了させる
    });
    
    // 標準出力のリスニング
    backendProcess.stdout.on('data', (data) => {
      // Python側がUTF-8で出力するようになったのでUTF-8でデコード
      const output = iconv.decode(data, 'utf-8').trim();
      console.log(`バックエンド出力: ${output}`);
    });
    
    // エラー出力のリスニング
    backendProcess.stderr.on('data', (data) => {
      // Python側がUTF-8で出力するようになったのでUTF-8でデコード
      const output = iconv.decode(data, 'utf-8').trim();
      console.error(`バックエンドエラー: ${output}`);
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
    
    try {
      const response = await fetch('http://127.0.0.1:8000/', {
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
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('バックエンド接続確認エラー:', fetchError);
      console.log('バックエンドが起動していない可能性があります。再試行するか、別途バックエンドを起動してください。');
      isBackendInitialized = false;
      return false;
    }
  } catch (error) {
    console.error('バックエンド接続確認エラー (外部):', error);
    isBackendInitialized = false;
    return false;
  }
}

/**
 * IPC通信の設定
 * レンダラープロセスとの通信を処理
 */
function setupIPC() {
  // 設定情報取得
  ipcMain.handle('get-settings', async () => {
    return config;
  });
  
  // 設定情報保存
  ipcMain.handle('save-settings', async (event, newSettings) => {
    try {
      config = { ...config, ...newSettings };
      const configPath = fileURLToPath(new URL('../../../config.json', import.meta.url));
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      return { success: true };
    } catch (error) {
      console.error('設定保存エラー:', error);
      return { success: false, error: error.message };
    }
  });

  // ウィンドウ位置設定
  ipcMain.handle('set-window-position', (event, x, y) => {
    if (mainWindow) {
      mainWindow.setPosition(x, y);
      return { success: true };
    }
    return { success: false, error: 'ウィンドウが存在しません' };
  });

  // ウィンドウ位置取得
  ipcMain.handle('get-window-position', () => {
    if (mainWindow) {
      return { x: mainWindow.getPosition()[0], y: mainWindow.getPosition()[1] };
    }
    return { x: 0, y: 0 };
  });

  // 音声合成リクエスト
  ipcMain.handle('speak-text', async (event, text, emotion) => {
    try {
      // バックエンドAPIを呼び出して音声合成を実行
      const response = await fetch('http://127.0.0.1:8000/api/voice/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          emotion: emotion || 'normal',
          speaker_id: config.voicevox?.speaker_id || 8
        })
      });
      
      if (!response.ok) {
        throw new Error(`音声合成エラー: ${response.status}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('音声合成リクエストエラー:', error);
      return { success: false, error: error.message };
    }
  });
  
  // アプリ終了
  ipcMain.handle('quit-app', () => {
    app.quit();
  });
  
  // 画像パス解決
  ipcMain.handle('resolve-asset-path', (event, relativePath) => {
    // 開発環境と本番環境でのパス解決 - ESMパス解決を使用
    if (isDev) {
      return fileURLToPath(new URL(`../../../${relativePath}`, import.meta.url));
    } else {
      return path.join(process.resourcesPath, 'app', relativePath);
    }
  });
  
  // 外部リンクを既定のブラウザで開く
  ipcMain.handle('open-external-link', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('外部リンクを開く際にエラーが発生しました:', error);
      return { success: false, error: error.message };
    }
  });
  
  // バックエンド状態確認
  ipcMain.handle('check-backend-status', async () => {
    try {
      const isConnected = await checkBackendConnection();
      return { 
        success: true, 
        isRunning: backendProcess !== null,
        isConnected: isConnected,
        initialized: isBackendInitialized 
      };
    } catch (error) {
      console.error('バックエンド状態確認エラー:', error);
      return { 
        success: false, 
        isRunning: backendProcess !== null,
        isConnected: false,
        initialized: isBackendInitialized,
        error: error.message 
      };
    }
  });
  
  // バックエンドを再起動
  ipcMain.handle('restart-backend', async () => {
    try {
      // 既存のバックエンドプロセスを終了
      if (backendProcess !== null) {
        console.log('既存のバックエンドサーバーを終了します...');
        backendProcess.kill();
        backendProcess = null;
        
        // プロセスが確実に終了するまで少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // バックエンドサーバーを再起動
      console.log('バックエンドサーバーを再起動します...');
      const result = await startBackendServer();
      return { success: result };
    } catch (error) {
      console.error('バックエンド再起動エラー:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 感情値の取得
  ipcMain.handle('get-emotion', () => {
    return { 
      value: currentEmotion,
      label: getEmotionLabel(currentEmotion) 
    };
  });
  
  // 感情値の設定
  ipcMain.handle('set-emotion', (event, value) => {
    try {
      // 値を-100〜100の範囲に制限
      currentEmotion = Math.max(-100, Math.min(100, value));
      return { 
        success: true, 
        value: currentEmotion,
        label: getEmotionLabel(currentEmotion)
      };
    } catch (error) {
      console.error('感情設定エラー:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 感情値の更新（増減）
  ipcMain.handle('update-emotion', (event, delta) => {
    try {
      // 現在の値に増減を適用し、-100〜100の範囲に制限
      currentEmotion = Math.max(-100, Math.min(100, currentEmotion + delta));
      return { 
        success: true, 
        value: currentEmotion,
        label: getEmotionLabel(currentEmotion)
      };
    } catch (error) {
      console.error('感情更新エラー:', error);
      return { success: false, error: error.message };
    }
  });
}

// 感情ラベルを取得
function getEmotionLabel(value) {
  if (value >= 80) return 'very_happy';
  if (value >= 40) return 'happy';
  if (value >= 15) return 'slightly_happy';
  if (value <= -80) return 'very_angry';
  if (value <= -40) return 'angry';
  if (value <= -15) return 'slightly_angry';
  return 'normal';
}

// グローバルショートカットの登録
function registerGlobalShortcuts() {
  // TODO: グローバルショートカットの登録処理を実装
  console.log('グローバルショートカットの登録は未実装です');
}

/**
 * メインウィンドウの作成
 */
function createWindow() {
  // 開発モードでのCSP制限の緩和
  setupDevCSP();
  
  // アプリケーション名の設定
  const appName = appNameFromEnv || config.app?.name || 'ふにゃ秘書たん';
  app.setName(appName);
  
  // ウィンドウ設定のデフォルト値
  const defaultWidth = 400;
  const defaultHeight = 600;
  
  // 設定から透明度と枠の有無を取得（デフォルトは透明・枠なし）
  const isTransparent = config.window?.transparent !== false;
  const hasFrame = config.window?.frame === true;
  const isAlwaysOnTop = config.window?.alwaysOnTop !== false;
  
  // ウィンドウサイズを設定から取得、もしくはデフォルト値を使用
  const windowWidth = config.window?.width || defaultWidth;
  const windowHeight = config.window?.height || defaultHeight;
  
  // 開発モードでViteデベロップサーバーのURLを取得
  const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL;
  
  // preloadスクリプトのパスを解決
  // ESモジュールパスを使用
  const preloadPath = preloadPathFromEnv || fileURLToPath(new URL('../../../preload.js', import.meta.url));
  
  console.log(`プリロードスクリプトパス: ${preloadPath}`);
  console.log(`開発モード: ${isDev}, Vite URL: ${viteDevServerUrl || 'なし'}`);
  
  // メインウィンドウを作成
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    transparent: isTransparent,
    frame: hasFrame,
    alwaysOnTop: isAlwaysOnTop,
    webPreferences: {
      nodeIntegration: false, // 安全のためにノード統合を無効化
      contextIsolation: true, // コンテキスト分離を有効化
      preload: preloadPath // プリロードスクリプトを指定
    }
  });
  
  // 開発モードの場合はViteデベロップサーバーを使用
  if (viteDevServerUrl) {
    console.log(`開発サーバーURL: ${viteDevServerUrl}`);
    mainWindow.loadURL(viteDevServerUrl);
    
    // 開発ツールを自動的に開く
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // 本番環境の場合はビルドされたHTMLファイルを読み込む
    const indexHtmlPath = fileURLToPath(new URL('../../../frontend/dist/index.html', import.meta.url));
    console.log(`本番環境のHTML: ${indexHtmlPath}`);
    mainWindow.loadFile(indexHtmlPath);
  }
  
  // ウィンドウが閉じられたときにnullに設定
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  return mainWindow;
}

/**
 * アプリケーションの初期化
 */
app.whenReady().then(async () => {
  console.log('Electronアプリケーションの初期化を開始しています...');
  
  try {
    // メインウィンドウを作成
    mainWindow = createWindow();
    
    // IPC通信を設定
    setupIPC();
    
    // グローバルショートカットを登録
    registerGlobalShortcuts();
    
    // バックエンドサーバーを起動
    await startBackendServer();
    
    // 開発モードでの追加処理
    if (isDev) {
      console.log('開発モードで実行中...');
      // 必要に応じて開発モード固有の処理を追加
    }
    
    // macOSでの対応
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
      }
    });
  } catch (error) {
    console.error('アプリケーション初期化エラー:', error);
  }
});

/**
 * すべてのウィンドウが閉じられたときの処理
 */
app.on('window-all-closed', () => {
  // macOS以外の場合はアプリケーションを終了
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * アプリケーション終了時の処理
 */
app.on('before-quit', async () => {
  console.log('アプリケーション終了処理を開始します...');
  
  // バックエンドサーバーを終了
  if (backendProcess !== null) {
    console.log('バックエンドサーバーを終了しています...');
    backendProcess.kill();
    backendProcess = null;
  }
});

/**
 * プロセス終了時の処理
 */
process.on('exit', () => {
  console.log('プロセス終了: アプリケーションのクリーンアップを行います');
  
  // バックエンドサーバーを確実に終了
  if (backendProcess !== null) {
    console.log('プロセス終了時にバックエンドサーバーを強制終了します');
    backendProcess.kill('SIGKILL');
    backendProcess = null;
  }
}); 