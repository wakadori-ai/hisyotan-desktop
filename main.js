const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const fetch = require('node-fetch');
const iconv = require('iconv-lite');

// 開発モードかどうかを判定
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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
    // 開発環境と本番環境でのパス解決
    if (isDev) {
      return path.join(__dirname, relativePath);
    } else {
      return path.join(process.resourcesPath, 'app', relativePath);
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

// アプリケーションの初期化
app.whenReady().then(async () => {
  // 文字化け対策の設定を追加
  app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  app.commandLine.appendSwitch('force-color-profile', 'srgb');
  
  // バックエンドサーバーを起動
  await startBackendServer();
  
  // メインウィンドウ作成
  createWindow();
  
  // IPC通信の設定
  setupIPC();
  
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

// すべてのウィンドウが閉じられたときの処理
app.on('window-all-closed', () => {
  console.log('🌸 すべてのウィンドウが閉じられました');
  
  // stop_hisyotan.ps1を実行して全プロセスを確実に終了させる
  try {
    console.log('🛑 すべてのウィンドウ終了時にstop_hisyotan.ps1スクリプトを実行します');
    const scriptPath = path.resolve(__dirname, 'tools', 'stop_hisyotan.ps1');
    const { exec } = require('child_process');
    
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
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false
    }
  });

  // 開発モードの場合
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000/');
    
    // デバッグフラグがある場合は別ウィンドウでDevToolsを開く
    if (isDebugging) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // ウィンドウが閉じられる前に実行
  mainWindow.on('close', (event) => {
    console.log('🛑 メインウィンドウが閉じられます');
    
    // stop_hisyotan.ps1を実行して全プロセスを確実に終了させる
    try {
      console.log('🛑 ウィンドウ終了時にstop_hisyotan.ps1スクリプトを実行します');
      const scriptPath = path.resolve(__dirname, 'tools', 'stop_hisyotan.ps1');
      const { exec } = require('child_process');
      
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
  });
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

// アプリケーション終了ハンドラ
ipcMain.on('app:quit', () => {
  console.log('🌸 アプリケーションの終了を開始します...');
  
  // stop_hisyotan.ps1を実行して全プロセスを確実に終了させる
  try {
    console.log('🛑 アプリケーション終了時にstop_hisyotan.ps1スクリプトを実行します');
    const scriptPath = path.resolve(__dirname, 'tools', 'stop_hisyotan.ps1');
    const { exec } = require('child_process');
    
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
  
  // バックエンドサーバーの終了
  if (backendProcess) {
    console.log('バックエンドサーバーを終了します...');
    backendProcess.kill();
    backendProcess = null;
  }
  
  // その他起動している子プロセスを終了（もし存在すれば）
  
  // Electronアプリを終了
  console.log('さようなら、また会いましょう！');
  app.quit();
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

// アプリケーション終了直前の処理
app.on('will-quit', () => {
  console.log('🌸 アプリケーション終了直前: will-quit');
  
  // stop_hisyotan.ps1を実行して全プロセスを確実に終了させる（同期実行）
  try {
    console.log('🛑 アプリケーション終了直前にstop_hisyotan.ps1スクリプトを実行します');
    const scriptPath = path.resolve(__dirname, 'tools', 'stop_hisyotan.ps1');
    
    // PowerShellスクリプトを同期的に実行して確実に処理を完了させる
    const { execSync } = require('child_process');
    const result = execSync(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`);
    console.log(`✅ 停止スクリプト出力:\n${result.toString()}`);
  } catch (stopScriptError) {
    console.error('stop_hisyotan.ps1実行エラー:', stopScriptError);
  }
}); 