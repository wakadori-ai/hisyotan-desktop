/**
 * ふにゃ秘書たんデスクトップアプリのメインプロセス
 * Electronの起動と統合UIの管理を行います
 */

// 日本語コンソール出力のために文字コードを設定
if (process.platform === 'win32') {
  process.env.CHCP = '65001'; // UTF-8に設定
  
  // コマンドプロンプトのコードページをUTF-8に設定
  try {
    // child_processをESM形式でインポート
    import('child_process').then(({ execSync }) => {
      execSync('chcp 65001');
      console.log('🌸 コンソール出力の文字コードをUTF-8に設定しました');
    }).catch(e => {
      console.error('❌ コードページの設定に失敗しました:', e);
    });
  } catch (e) {
    console.error('❌ 文字コード設定エラー:', e);
  }
}

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

// セキュリティポリシーの設定
const setContentSecurityPolicy = (win) => {
  // 開発モードと本番モードでCSPを分ける
  const csp = isDev ? 
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' http://localhost:* http://127.0.0.1:*; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:;" :
    "default-src 'self'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:;";
  
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });
  
  console.log(`🔒 Content-Security-Policyを設定しました (${isDev ? '開発モード' : '本番モード'})`);
};

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
let backendPID = null;

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
    // 既存のバックエンドプロセスを確認
    if (backendProcess !== null) {
      console.log('🔄 既存のバックエンドプロセスを終了します');
      try {
        backendProcess.kill('SIGTERM');
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (backendProcess.exitCode === null) {
          console.log('⚠️ プロセスが終了しないため、強制終了します');
          backendProcess.kill('SIGKILL');
        }
      } catch (error) {
        console.error('❌ プロセス終了エラー:', error);
      }
      backendProcess = null;
    }

    console.log('🚀 バックエンドサーバーを起動します...');
    
    // Pythonの実行パスを取得
    const pythonPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'python', 'python.exe')
      : 'python';
    
    // バックエンドのスクリプトパス
    const backendScript = fileURLToPath(new URL('../../../backend/main.py', import.meta.url));
    
    // バックエンドサーバーを起動
    backendProcess = spawn(pythonPath, [backendScript], {
      stdio: 'pipe',
      detached: false,
      windowsHide: true
    });
    
    // プロセスIDを記録
    backendPID = backendProcess.pid;
    console.log(`🆔 バックエンドプロセスID: ${backendPID}`);
    
    // 標準出力のリスニング
    backendProcess.stdout.on('data', (data) => {
      const output = iconv.decode(data, 'utf-8').trim();
      console.log(`📝 バックエンド出力: ${output}`);
    });
    
    // エラー出力のリスニング
    backendProcess.stderr.on('data', (data) => {
      const output = iconv.decode(data, 'utf-8').trim();
      console.error(`❌ バックエンドエラー: ${output}`);
    });
    
    // プロセス終了時の処理
    backendProcess.on('close', (code) => {
      console.log(`🛑 バックエンドサーバーが終了しました (コード: ${code})`);
      backendProcess = null;
      backendPID = null;
    });
    
    // バックエンドサーバーの起動を待機
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('✅ バックエンドサーバー起動待機完了');
    
    // バックエンドの接続確認
    const isConnected = await checkBackendConnection();
    if (!isConnected) {
      throw new Error('バックエンドサーバーへの接続に失敗しました');
    }
    
    return true;
  } catch (error) {
    console.error('❌ バックエンドサーバー起動エラー:', error);
    if (backendProcess) {
      backendProcess.kill('SIGKILL');
      backendProcess = null;
    }
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

// バックエンドプロセスのPIDを取得する関数
async function getBackendPID() {
  try {
    console.log('バックエンドプロセスのPIDを取得します...');
    
    // タイムアウト付きの接続確認
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/pid', {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log('バックエンドPID取得成功:', data);
        
        // PIDを保存
        if (data.pid) {
          backendPID = data.pid;
          console.log(`🆔 バックエンド実際のプロセスID: ${backendPID}`);
          
          // メインプロセスにPIDを登録
          try {
            // ESM環境からElectronのIPC呼び出し
            const { ipcRenderer } = await import('electron');
            const registered = await ipcRenderer.invoke('register-backend-pid', backendPID);
            console.log(`🔄 PID登録結果: ${registered ? '成功' : '失敗'}`);
          } catch (ipcError) {
            console.error('IPC呼び出しエラー:', ipcError);
            
            // 代替手段: fetchを使ってメインプロセスのAPIを呼び出す
            try {
              const port = process.env.ELECTRON_PORT || 3000;
              await fetch(`http://localhost:${port}/register-backend-pid?pid=${backendPID}`);
              console.log('代替手段でPID登録成功');
            } catch (fetchError) {
              console.error('代替手段でのPID登録失敗:', fetchError);
            }
          }
          
          return backendPID;
        }
        return null;
      } else {
        console.error('バックエンドPID取得エラー:', response.status);
        return null;
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('バックエンドPID取得エラー:', fetchError);
      return null;
    }
  } catch (error) {
    console.error('バックエンドPID取得エラー (外部):', error);
    return null;
  }
}

/**
 * IPC通信の設定
 * レンダラープロセスとの通信を処理
 */
function setupIPC() {
  console.log('🔌 IPC通信の設定を開始します');
  
  // バックエンドPIDの登録
  ipcMain.handle('register-backend-pid', async (event, pid) => {
    console.log(`🔄 バックエンドPID登録要求: ${pid}`);
    try {
      backendPID = pid;
      console.log(`✅ バックエンドPIDを登録しました: ${backendPID}`);
      return true;
    } catch (error) {
      console.error('❌ バックエンドPID登録エラー:', error);
      return false;
    }
  });
  
  // バックエンドPIDの取得
  ipcMain.handle('get-backend-pid', () => {
    console.log(`🔍 バックエンドPID取得要求: ${backendPID}`);
    return backendPID;
  });
  
  // アセットのパスを解決するハンドラ
  ipcMain.handle('resolve-asset-path', (event, relativePath) => {
    console.log(`🔍 アセットパス解決要求: ${relativePath}`);
    try {
      // パスの正規化: 先頭の'assets/'または'/assets/'を削除
      const normalizedPath = relativePath.replace(/^\/?(assets\/)/i, '');
      
      // 開発モードと本番モードでのパス解決を分ける
      let assetPath;
      if (isDev) {
        assetPath = path.join(process.cwd(), 'frontend/public/assets', normalizedPath);
      } else {
        assetPath = path.join(app.getAppPath(), 'frontend/public/assets', normalizedPath);
      }
      
      console.log(`✅ 解決されたパス: ${assetPath}`);
      return assetPath;
    } catch (error) {
      console.error('❌ アセットパス解決エラー:', error);
      return relativePath; // エラー時は元のパスをそのまま返す
    }
  });
  
  // アプリケーション終了ハンドラ
  ipcMain.handle('quit-app', () => {
    console.log('🚪 アプリケーション終了要求を受信しました');
    try {
      app.quit();
      return true;
    } catch (error) {
      console.error('❌ アプリケーション終了エラー:', error);
      return false;
    }
  });
  
  // app:quit イベントリスナー（既存の互換性のため）
  ipcMain.on('app:quit', () => {
    console.log('🚪 app:quit イベントを受信しました');
    try {
      app.quit();
    } catch (error) {
      console.error('❌ app:quit イベント処理エラー:', error);
    }
  });
  
  // quit-app イベントリスナー（invoke以外の方法でも受け付けるため）
  ipcMain.on('quit-app', () => {
    console.log('🚪 quit-app イベントを受信しました');
    try {
      app.quit();
    } catch (error) {
      console.error('❌ quit-app イベント処理エラー:', error);
    }
  });
  
  console.log('✨ IPC通信の設定が完了しました');
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
  console.log('🪟 メインウィンドウを作成します');
  
  // CSP設定
  setContentSecurityPolicy(mainWindow);
  
  // メインウィンドウの設定
  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload/preload.js'),
      webSecurity: true
    },
    frame: false,
    transparent: true,
    backgroundColor: '#26ffffff', // 白色の透明度15%（HEX表記）
    hasShadow: false,
    resizable: false,
    alwaysOnTop: true,
    icon: path.join(__dirname, '../frontend/public/assets/icon.ico')
  });
  
  // 開発モードでの設定
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  
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
    
    // DOMContentLoadedイベントを待ってからUI初期化
    mainWindow.webContents.on('dom-ready', () => {
      console.log('🌸 DOMの読み込みが完了しました');
      // UI初期化処理をここに移動
      mainWindow.webContents.executeJavaScript(`
        document.addEventListener('DOMContentLoaded', () => {
          console.log('🎨 UI初期化を開始します');
          // UI要素の初期化処理
          const initUI = () => {
            const speechBubble = document.getElementById('speechBubble');
            const speechText = document.getElementById('speechText');
            const errorBubble = document.getElementById('errorBubble');
            const errorText = document.getElementById('errorText');
            const statusIndicator = document.getElementById('statusIndicator');
            const speechSettingUI = document.getElementById('speechSettingUI');
            
            if (!speechBubble) console.warn('❌ speechBubble要素が見つかりません');
            if (!speechText) console.warn('❌ speechText要素が見つかりません');
            if (!errorBubble) console.warn('❌ errorBubble要素が見つかりません');
            if (!errorText) console.warn('❌ errorText要素が見つかりません');
            if (!statusIndicator) console.warn('❌ statusIndicator要素が見つかりません');
            if (!speechSettingUI) console.warn('❌ speechSettingUI要素が作成できません');
            
            // 要素が存在する場合のみ初期化を続行
            if (speechBubble && speechText && errorBubble && errorText && statusIndicator && speechSettingUI) {
              console.log('✨ UI要素の初期化が完了しました');
              // ここでUIの初期化処理を続行
            }
          };
          
          // 初期化を実行
          initUI();
        });
      `);
    });
    
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
  console.log('🛑 アプリケーション終了処理を開始します...');
  
  if (backendProcess) {
    console.log('🔄 バックエンドサーバーを終了しています...');
    try {
      // まずは正常終了を試みる
      backendProcess.kill('SIGTERM');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // プロセスがまだ生きている場合は強制終了
      if (backendProcess.exitCode === null) {
        console.log('⚠️ プロセスが終了しないため、強制終了します');
        backendProcess.kill('SIGKILL');
      }
    } catch (error) {
      console.error('❌ バックエンド終了エラー:', error);
    }
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