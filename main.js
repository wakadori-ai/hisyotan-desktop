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
    
    // バックエンドのスクリプトパス
    const backendScript = path.join(__dirname, 'backend', 'main.py');
    
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
      fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(config, null, 2), 'utf8');
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
    try {
      // パス区切り文字を統一（\を/に変換）
      const normalizedPath = relativePath.replace(/\\/g, '/');
      
      // 開発環境と本番環境でのパス解決
      let resolvedPath;
      if (isDev) {
        resolvedPath = path.join(__dirname, normalizedPath);
      } else {
        resolvedPath = path.join(process.resourcesPath, 'app', normalizedPath);
      }
      
      console.log(`アセットパス解決: ${relativePath} => ${resolvedPath}`);
      return resolvedPath;
    } catch (error) {
      console.error('アセットパス解決エラー:', error);
      return relativePath;
    }
  });
  
  // 秘書たんの表情変更
  ipcMain.handle('change-secretary-expression', (event, emotion) => {
    // 感情に応じて内部状態を更新
    switch (emotion) {
      case 'happy':
        currentEmotion = 50;
        break;
      case 'sad':
        currentEmotion = -50;
        break;
      case 'surprised':
        currentEmotion = 30;
        break;
      case 'fearful':
        currentEmotion = -70;
        break;
      case 'relieved':
        currentEmotion = 20;
        break;
      case 'serious':
        currentEmotion = -20;
        break;
      case 'normal':
      default:
        currentEmotion = 0;
        break;
    }
    
    return { success: true, emotion: emotion, value: currentEmotion };
  });
  
  // 設定UIを表示する
  ipcMain.handle('show-settings-ui', async () => {
    if (mainWindow) {
      console.log('設定UIの表示をリクエストします');
      mainWindow.webContents.send('display-settings-bubble');
      return true;
    }
    return false;
  });
  
  // SpeechManager関連のIPCハンドラ
  // これらのハンドラはmainプロセスからrendererプロセスにメッセージを転送します
  
  // speakWithObject機能
  ipcMain.handle('speech-manager-speak-with-object', async (event, speechObj) => {
    if (mainWindow) {
      console.log('SpeechManager: speakWithObject呼び出し転送');
      mainWindow.webContents.send('speech-manager-operation', {
        method: 'speakWithObject',
        args: [speechObj]
      });
      return true;
    }
    return false;
  });
  
  // speak機能
  ipcMain.handle('speech-manager-speak', async (event, message, emotion, displayTime, animation, eventType, presetSound) => {
    if (mainWindow) {
      console.log('SpeechManager: speak呼び出し転送');
      mainWindow.webContents.send('speech-manager-operation', {
        method: 'speak',
        args: [message, emotion, displayTime, animation, eventType, presetSound]
      });
      return true;
    }
    return false;
  });
  
  // getHordeModeState機能
  ipcMain.handle('speech-manager-get-horde-mode', async () => {
    if (mainWindow) {
      console.log('SpeechManager: getHordeModeState呼び出し転送');
      // 注意: 本来はIPC経由で結果を取得する必要がありますが、簡略化のためfalseを返します
      // 実際の実装では結果を待機する仕組みが必要です
      return false;
    }
    return false;
  });
  
  // setHordeModeState機能
  ipcMain.handle('speech-manager-set-horde-mode', async (event, enabled) => {
    if (mainWindow) {
      console.log('SpeechManager: setHordeModeState呼び出し転送');
      mainWindow.webContents.send('speech-manager-operation', {
        method: 'setHordeModeState',
        args: [enabled]
      });
      return true;
    }
    return false;
  });
}

// グローバルショートカットの登録
function registerGlobalShortcuts() {
  // ショートカットキーの登録処理
  console.log('📝 グローバルショートカットを登録します');
  // 実装はあとで追加
}

// アプリケーションの初期化後に実行
app.whenReady().then(async () => {
  console.log('🌸 Electronアプリケーションが初期化されました');
  
  // 開発モード用のCSP設定
  setupDevCSP();
  
  // 文字化け対策の設定を追加
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  
  // コンテンツセキュリティポリシーの警告を無効化
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  
  // メインウィンドウの作成
  createWindow();
  
  // IPC通信の設定
  setupIPC();
  
  // バックエンドサーバーを起動
  try {
    await startBackendServer();
  } catch (error) {
    console.error('バックエンドサーバー起動エラー:', error);
  }
  
  // グローバルショートカットの登録
  registerGlobalShortcuts();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
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

// すべてのウィンドウが閉じられたときの処理
app.on('window-all-closed', () => {
  console.log('🌸 すべてのウィンドウが閉じられました');
  
  // stop_hisyotan.ps1を実行して全プロセスを確実に終了させる
  try {
    console.log('🛑 すべてのウィンドウ終了時にstop_hisyotan.ps1スクリプトを実行します');
    const scriptPath = path.resolve(__dirname, 'tools', 'stop_hisyotan.ps1');
    
    // PowerShellスクリプトを実行
    exec(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`⚠️ 停止スクリプトエラー: ${error.message}`);
      } else {
        console.log(`✅ 停止スクリプト出力:\n${stdout}`);
      }
    });
  } catch (stopScriptError) {
    console.error('stop_hisyotan.ps1実行エラー:', stopScriptError);
  }
  
  // macOS以外ではアプリケーションを終了する
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function createWindow() {
  // デバッグ用の別ウィンドウ設定
  const isDebugging = process.argv.includes('--debug');
  
  mainWindow = new BrowserWindow({
    width: config.window.width || 400,
    height: config.window.height || 600,
    transparent: isDebugging ? false : (config.window.transparent !== false),
    frame: isDebugging ? true : (config.window.frame !== false),
    alwaysOnTop: config.window.alwaysOnTop !== false,
    backgroundColor: isDebugging ? '#FFFFFF' : (config.window.backgroundColor || '#00000000'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: preloadPathFromEnv ? path.resolve(__dirname, preloadPathFromEnv) : path.join(__dirname, 'preload.js'),
      webSecurity: false
    }
  });

  // CSPヘッダーを設定
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    // 開発モードでCSP無効化が指定されている場合は、制限を緩和する
    if (isDevCSP) {
      // 開発モード用に緩和されたCSP
      const devCsp = [
        "default-src 'self' 'unsafe-inline' 'unsafe-eval';",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval';",
        "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*;",
        "style-src 'self' 'unsafe-inline';",
        "img-src 'self' data: blob:;",
        "media-src 'self' data: blob:;"
      ].join(' ');
      
      console.log("🔓 開発モード: 緩和されたCSPを適用します");
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [devCsp]
        }
      });
      return;
    }
    
    // 通常モード: 環境変数からCSPを取得
    const cspFromEnv = process.env.ELECTRON_CSP;
    
    // 環境変数からCSPを取得できなかった場合の初期値を設定
    const csp = cspFromEnv || [
      "default-src 'self';",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
      "connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 ws://localhost:8000 ws://127.0.0.1:8000;",
      "style-src 'self' 'unsafe-inline';",
      "img-src 'self' data:;"
    ].join(' ');
    
    console.log("🔒 適用するCSP:", csp);
    
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  // 開発モードの場合
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173/');
    
    // デバッグフラグがある場合は別ウィンドウでDevToolsを開く
    if (isDebugging) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    // 本番モードの場合、ファイルプロトコルでロードする前に少し待機して
    // レンダリングプロセスが準備できるようにする
    // これにより、CSSやその他のリソースが確実に読み込まれる
    setTimeout(() => {
      // loadFileの代わりにloadURLを使用してfile:プロトコルを明示的に指定
      const indexHtmlPath = path.join(__dirname, 'dist/index.html');
      const fileUrl = `file://${indexHtmlPath}`;
      mainWindow.loadURL(fileUrl);
      
      // CSSが適用されない問題をデバッグするために、条件付きでDevToolsを開く
      if (isDebugging) {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
      
      // ロード完了時の処理を追加
      mainWindow.webContents.on('did-finish-load', () => {
        console.log('✅ メインウィンドウのロードが完了しました');
        
        // CSSインジェクションを試行（もしCSSが正しく読み込まれない場合のバックアップ）
        const cssPath = path.join(__dirname, 'dist', 'assets');
        // CSSファイル名が動的に生成される場合は、ディレクトリから探す
        fs.readdir(cssPath, (err, files) => {
          if (err) {
            console.error('CSSディレクトリ読み取りエラー:', err);
            return;
          }
          
          const cssFile = files.find(file => file.endsWith('.css'));
          if (cssFile) {
            const fullCssPath = path.join(cssPath, cssFile);
            fs.readFile(fullCssPath, 'utf8', (err, data) => {
              if (err) {
                console.error('CSSファイル読み取りエラー:', err);
                return;
              }
              
              // CSSを直接インジェクト
              mainWindow.webContents.insertCSS(data).catch(err => {
                console.error('CSSインジェクトエラー:', err);
              });
            });
          }
        });
      });
    }, 500);
  }

  // ウィンドウが閉じられる前に実行
  mainWindow.on('close', (event) => {
    console.log('🛑 メインウィンドウが閉じられます');
    
    // stop_hisyotan.ps1を実行して全プロセスを確実に終了させる
    try {
      console.log('🛑 ウィンドウ終了時にstop_hisyotan.ps1スクリプトを実行します');
      const scriptPath = path.resolve(__dirname, 'tools', 'stop_hisyotan.ps1');
      
      // PowerShellスクリプトを実行
      exec(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`⚠️ 停止スクリプトエラー: ${error.message}`);
        } else {
          console.log(`✅ 停止スクリプト出力:\n${stdout}`);
        }
      });
    } catch (error) {
      console.error('stop_hisyotan.ps1実行エラー:', error);
    }
  });
}