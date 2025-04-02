const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const iconv = require('iconv-lite');
const { initialize, enable } = require('@electron/remote/main');
const { contextBridge } = require('electron');

// electron-logをtry-catchでインポート
let log;
try {
  log = require('electron-log');
  
  // electron-logの設定
  log.transports.file.level = 'debug';
  log.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}.{ms} [{level}] {text}';
  log.transports.file.encoding = 'utf8';
  console.log('メインプロセスのログファイルパス:', log.transports.file.getFile().path);

  // 既存のconsole.logをelectron-logに置き換え
  Object.assign(console, log.functions);
} catch (error) {
  console.error('electron-logの読み込みに失敗しました:', error);
  // ダミーのlogオブジェクトを作成
  log = {
    transports: {
      file: { level: 'debug', getFile: () => ({ path: 'logs/main.log' }) }
    },
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    log: console.log,
    functions: {
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
      log: console.log
    }
  };
}

// 設定読み込み
let config = {};
try {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config', 'config.json'), 'utf8'));
} catch (error) {
  console.error('設定ファイルの読み込みに失敗しました:', error);
  config = {
    app: { name: 'ふにゃ秘書たん', version: '1.0.0' },
    window: { width: 400, height: 600, transparent: true, frame: false, alwaysOnTop: true },
    voicevox: { host: 'http://127.0.0.1:50021', speaker_id: 8 }
  };
}

// 肉球ボタンウィンドウ
let pawWindow = null;

// 感情管理
let currentEmotion = 0; // -100〜100の範囲で感情を管理

// バックエンドプロセス
let backendProcess = null;

// アプリケーションの初期化
app.whenReady().then(async () => {
  // @electron/remoteの初期化
  initialize();
  
  // バックエンドサーバーを自動起動
  await startBackendProcess();
  
  createPawWindow(); // 肉球ボタンウィンドウを作成
  
  // 肉球ウィンドウ移動のIPCハンドラ
  ipcMain.on('move-paw-window', (event, { deltaX, deltaY }) => {
    if (pawWindow && !pawWindow.isDestroyed()) {
      const [x, y] = pawWindow.getPosition();
      pawWindow.setPosition(x + deltaX, y + deltaY);
    }
  });
  
  // 肉球ウィンドウの位置を取得するIPCハンドラ
  ipcMain.handle('get-paw-window-position', (event) => {
    if (pawWindow && !pawWindow.isDestroyed()) {
      const [x, y] = pawWindow.getPosition();
      return { x, y };
    }
    return { x: 0, y: 0 };
  });
  
  // 肉球ウィンドウの位置を直接設定するIPCハンドラ
  ipcMain.on('set-paw-window-position', (event, { x, y }) => {
    if (pawWindow && !pawWindow.isDestroyed()) {
      pawWindow.setPosition(Math.round(x), Math.round(y));
    }
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createPawWindow();
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
});

// 肉球ボタンウィンドウ作成関数
function createPawWindow() {
  // screen モジュールを取得して画面サイズを取得
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // 肉球ボタンウィンドウの作成
  const preloadPath = process.env.VITE_DEV_SERVER_URL 
    ? path.join(__dirname, 'paw-preload.js')
    : path.join(app.getAppPath(), 'dist', 'paw-preload.js');
  
  console.log('現在の__dirname:', __dirname);
  console.log('preloadスクリプトの絶対パス:', preloadPath);
  console.log('このファイルが存在するか:', fs.existsSync(preloadPath));
  
  pawWindow = new BrowserWindow({
    width: 240,
    height: 240,
    x: width - 260, // 画面右端から少し内側に配置
    y: height - 270, // 画面右下に配置
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: true // @electron/remoteを使用する場合
    }
  });
  
  // 肉球ボタンウィンドウの設定
  pawWindow.setAlwaysOnTop(true, 'screen-saver'); // screen-saverは最も高い優先度
  
  // 肉球ボタンページの読み込み
  const pawPath = process.env.VITE_DEV_SERVER_URL
    ? path.join(__dirname, '..', 'ui', 'paw.html') // 開発モード
    : path.join(app.getAppPath(), 'dist', 'paw.html'); // 本番モード
  
  pawWindow.loadFile(pawPath);
  
  // ウィンドウが閉じられたときの処理
  pawWindow.on('closed', () => {
    pawWindow = null;
  });

  // @electron/remoteをウィンドウで有効化
  enable(pawWindow.webContents);
}

// アプリケーションの終了処理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    shutdownBackend().then(() => {
      app.quit();
    }).catch(error => {
      console.error('バックエンド終了処理に失敗しました:', error);
      app.quit(); // エラーが発生しても強制終了
    });
  }
});

// IPCハンドラー登録
ipcMain.handle('speak-text', async (event, text, emotion = 'normal') => {
  try {
    await speakWithVoicevox(text, emotion);
    return { success: true };
  } catch (error) {
    console.error('音声合成に失敗しました:', error);
    return { success: false, error: error.message };
  }
});

// アプリケーション終了ハンドラ
ipcMain.on('app:quit', () => {
  console.log('🌸 アプリケーションの終了を開始します...');
  
  // 肉球ウィンドウを閉じる
  if (pawWindow && !pawWindow.isDestroyed()) {
    pawWindow.close();
    pawWindow = null;
  }
  
  // すべてのウィンドウを閉じる
  BrowserWindow.getAllWindows().forEach(window => {
    if (!window.isDestroyed()) {
      window.close();
    }
  });
  
  // バックエンドプロセスの終了処理
  shutdownBackend().then(() => {
    // 開発モードで起動したプロセスを強制終了（Windows）
    if (process.platform === 'win32') {
      try {
        // 秘書たん関連のプロセスを終了するバッチファイルを作成して実行
        const killScriptPath = path.join(app.getPath('temp'), 'kill_hisyotan_processes.bat');
        const killScript = `
@echo off
echo 秘書たん関連プロセスを終了しています...
taskkill /f /im python.exe /fi "WINDOWTITLE eq uvicorn*" 2>nul
taskkill /f /im python.exe /fi "COMMANDLINE eq *uvicorn*" 2>nul
taskkill /f /im node.exe /fi "COMMANDLINE eq *vite*" 2>nul
taskkill /f /im electron.exe /fi "COMMANDLINE eq *hisyotan*" 2>nul
echo 残りのElectronインスタンスを終了します...
taskkill /f /im electron.exe /fi "PID ne ${process.pid}" 2>nul
`;
        fs.writeFileSync(killScriptPath, killScript);
        
        // バッチファイルを非同期で実行（別プロセスで実行して現在のプロセスが終了しても動作するように）
        const cleanup = spawn('cmd.exe', ['/c', killScriptPath], {
          detached: true,
          stdio: 'ignore',
          shell: true
        });
        cleanup.unref(); // 親プロセスから切り離す
      } catch (error) {
        console.error('プロセス終了スクリプト作成エラー:', error);
      }
    }
    
    // 少し待機してからアプリを終了（プロセス終了の時間を確保）
    setTimeout(() => {
      console.log('さようなら、また会いましょう！💫');
      app.exit(0); // 強制終了（確実に終了するため）
    }, 500);
  }).catch(error => {
    console.error('バックエンド終了処理中にエラーが発生しました:', error);
    // エラーが発生しても強制終了
    setTimeout(() => app.exit(0), 300);
  });
});

ipcMain.handle('get-settings', () => {
  return config;
});

ipcMain.handle('update-settings', (event, newSettings) => {
  // 深いマージは避けて単純な上書き
  config = { ...config, ...newSettings };
  saveConfig();
  return { success: true };
});

// 肉球ウィンドウから秘書たんの表情を変更
ipcMain.on('change-secretary-expression', (event, expression) => {
  // 統合UIでは表情変更のメッセージをログに記録するだけ
  console.log(`秘書たんの表情を「${expression}」に変更しました`);
});

// 設定保存関数
function saveConfig() {
  const configPath = path.join(__dirname, '..', 'config', 'config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('設定ファイルを保存しました:', configPath);
  } catch (error) {
    console.error('設定ファイルの保存に失敗しました:', error);
  }
}

// 画像パス解決のIPCハンドラー
ipcMain.handle('resolve-image-path', (event, relativePath) => {
  try {
    // パスの正規化
    const cleanPath = relativePath.replace(/^(\.\/|\/)/g, '');
    
    // 開発環境と本番環境で異なるパスを返す
    if (process.env.VITE_DEV_SERVER_URL) {
      // 開発環境
      return path.join(app.getAppPath(), 'frontend', 'ui', 'public', cleanPath);
    } else {
      // 本番環境
      return path.join(app.getAppPath(), 'dist', cleanPath);
    }
  } catch (error) {
    console.error('画像パス解決エラー:', error);
    return relativePath;
  }
});

// 画像ファイルの存在確認用のIPCハンドラを追加
ipcMain.handle('check-image-exists', (event, imagePath) => {
  try {
    const fullPath = process.env.VITE_DEV_SERVER_URL 
      ? path.join(process.cwd(), 'frontend', 'ui', 'public', imagePath)
      : path.join(app.getAppPath(), 'dist', imagePath);
    
    console.log(`画像パスを確認: ${fullPath}`);
    return fs.existsSync(fullPath);
  } catch (error) {
    console.error('画像存在確認エラー:', error);
    return false;
  }
});

// アセットパス解決用のIPCハンドラを追加
ipcMain.handle('resolve-asset-path', (event, relativePath) => {
  try {
    const fullPath = process.env.VITE_DEV_SERVER_URL 
      ? path.join(process.cwd(), 'frontend', 'ui', 'public', relativePath)
      : path.join(app.getAppPath(), 'dist', relativePath);
    
    console.log(`アセットパス解決: ${relativePath} => ${fullPath}`);
    return fullPath;
  } catch (error) {
    console.error('アセットパス解決エラー:', error);
    return relativePath;
  }
});

// VOICEVOX連携関数
async function speakWithVoicevox(text, emotionState = 'normal') {
  try {
    // 秘書たんの声設定を取得
    const speakerId = config.voicevox.speaker_id;
    const voiceParams = config.voice.secretary_voice_params[emotionState] || config.voice.secretary_voice_params.normal;
    
    // 音声合成クエリ作成
    const query = await axios.post(
      `${config.voicevox.host}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
      {}
    );
    
    // パラメータ調整
    query.data.speedScale = voiceParams.speed_scale;
    query.data.pitchScale = voiceParams.pitch_scale;
    query.data.intonationScale = voiceParams.intonation_scale;
    query.data.volumeScale = voiceParams.volume_scale;
    
    // 音声合成
    const response = await axios.post(
      `${config.voicevox.host}/synthesis?speaker=${speakerId}`,
      query.data,
      { responseType: 'arraybuffer' }
    );
    
    // 一時ファイルに保存
    const tmpFile = path.join(app.getPath('temp'), 'secretary_voice.wav');
    fs.writeFileSync(tmpFile, Buffer.from(response.data));
    
    // 音声再生（プラットフォームに応じて適切なコマンドを使用）
    let player;
    if (process.platform === 'win32') {
      player = spawn('powershell', ['-c', `(New-Object System.Media.SoundPlayer "${tmpFile}").PlaySync()`]);
    } else if (process.platform === 'darwin') {
      player = spawn('afplay', [tmpFile]);
    } else {
      player = spawn('aplay', [tmpFile]);
    }
    
    return new Promise((resolve, reject) => {
      player.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`音声再生プロセスが終了コード ${code} で終了しました`));
        }
      });
      
      player.on('error', (err) => {
        reject(new Error(`音声再生中にエラーが発生しました: ${err.message}`));
      });
    });
  } catch (error) {
    console.error('音声合成処理エラー:', error);
    throw error;
  }
}

// バックエンドプロセスの起動
async function startBackendProcess() {
  // バックエンドの起動が設定で無効化されている場合
  if (config.backend?.disabled) {
    console.log('バックエンドの自動起動が無効化されています');
    return;
  }
  
  try {
    console.log('バックエンドサーバーの起動を開始...');
    
    // バックエンドのパスを設定
    const backendPath = process.env.VITE_DEV_SERVER_URL 
      ? path.join(__dirname, '..', '..', 'backend') // 開発モード
      : path.join(app.getAppPath(), 'backend'); // 本番モード
    
    // 実行コマンドの設定
    const backendCommand = path.join(backendPath, 'start_backend.bat');
    
    // バックエンドプロセスの起動
    backendProcess = spawn('cmd.exe', ['/c', backendCommand], {
      cwd: backendPath,
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    });
    
    // 標準出力のエンコード設定
    backendProcess.stdout.setEncoding('utf8');
    
    // 出力のリスニング
    backendProcess.stdout.on('data', (data) => {
      const decodedData = iconv.decode(Buffer.from(data), 'shiftjis');
      console.log(`バックエンド出力: ${decodedData}`);
    });
    
    // エラー出力のリスニング
    backendProcess.stderr.on('data', (data) => {
      const decodedData = iconv.decode(Buffer.from(data), 'shiftjis');
      console.error(`バックエンドエラー: ${decodedData}`);
    });
    
    // プロセス終了のリスニング
    backendProcess.on('close', (code) => {
      console.log(`バックエンドプロセスが終了コード ${code} で終了しました`);
      backendProcess = null;
    });
    
    // プロセスエラーのリスニング
    backendProcess.on('error', (err) => {
      console.error(`バックエンドプロセス起動エラー: ${err.message}`);
      backendProcess = null;
    });
    
    console.log('バックエンドプロセスを起動しました');
    
    // バックエンドサーバーが起動するまで少し待機
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // VOICEVOXの初期化をチェック
    await checkVoicevoxStatus();
    
    return true;
  } catch (error) {
    console.error('バックエンドプロセスの起動に失敗しました:', error);
    throw error;
  }
}

// バックエンドの終了処理
async function shutdownBackend() {
  try {
    console.log('バックエンドプロセスを終了しています...');
    
    // 直接起動したバックエンドプロセスの終了
    if (backendProcess && !backendProcess.killed) {
      try {
        // Windowsの場合はtaskkillを使用
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
        } else {
          // Unix系OSの場合
          backendProcess.kill('SIGTERM');
        }
      } catch (error) {
        console.error('バックエンドプロセス終了エラー:', error);
      }
    }
    
    // 開発モードで起動したプロセスも考慮して、関連プロセスをすべて終了
    if (process.platform === 'win32') {
      // 秘書たん関連のPythonプロセス（uvicorn, FastAPI）を特定して終了
      spawn('powershell', [
        '-Command',
        'Get-Process -Name python | Where-Object {$_.CommandLine -like "*uvicorn*" -or $_.CommandLine -like "*backend.main*"} | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }'
      ]);
      
      // Viteサーバー（開発モード時）
      spawn('powershell', [
        '-Command',
        'Get-Process -Name node | Where-Object {$_.CommandLine -like "*vite*"} | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }'
      ]);
    } else {
      // Unix系OS向けの処理（pkill等を使用）
      spawn('pkill', ['-f', 'uvicorn']);
      spawn('pkill', ['-f', 'vite']);
    }
    
    // 終了を待機
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('バックエンドプロセスの終了処理が完了しました');
    return true;
  } catch (error) {
    console.error('バックエンド終了処理中にエラーが発生しました:', error);
    return false;
  } finally {
    backendProcess = null;
  }
}

// VOICEVOXの状態確認
async function checkVoicevoxStatus() {
  try {
    // VOICEVOXのバージョン情報を取得
    const voicevoxResponse = await axios.get(`${config.voicevox.host}/version`);
    console.log(`VOICEVOX APIが利用可能です (バージョン: ${voicevoxResponse.data})`);
    return true;
  } catch (error) {
    console.error('VOICEVOX APIに接続できません:', error.message);
    return false;
  }
}

// アプリケーション起動完了通知
app.on('ready', () => {
  console.log('アプリケーションの準備が完了しました');
});

// アプリケーション終了時の処理
app.on('will-quit', () => {
  console.log('🌸 アプリケーション終了イベント発生: will-quit');
  
  // すべてのグローバルショートカットを解除
  globalShortcut.unregisterAll();
  
  // バックエンドプロセスを強制終了
  if (backendProcess && !backendProcess.killed) {
    try {
      console.log('アプリケーション終了時にバックエンドプロセスを終了します');
      // Windowsの場合
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
      } else {
        // Unix系OS
        backendProcess.kill('SIGKILL');
      }
    } catch (error) {
      console.error('バックエンドプロセス終了エラー:', error);
    }
  }
  
  // 開発モードで起動した関連プロセスも終了
  try {
    if (process.platform === 'win32') {
      // 別プロセスで実行してこの終了に依存しないようにする
      const killScriptPath = path.join(app.getPath('temp'), 'cleanup_hisyotan.bat');
      const killScriptContent = `
@echo off
echo 開発モードのプロセスをクリーンアップしています...
:: uvicornプロセスを終了
taskkill /f /im python.exe /fi "COMMANDLINE eq *uvicorn*" 2>nul
:: Viteサーバーを終了
taskkill /f /im node.exe /fi "COMMANDLINE eq *vite*" 2>nul
echo クリーンアップ完了
`;
      
      fs.writeFileSync(killScriptPath, killScriptContent);
      
      // バッチファイルを実行
      const cleanupProcess = spawn('cmd.exe', ['/c', killScriptPath], {
        detached: true,
        stdio: 'ignore',
        shell: true
      });
      cleanupProcess.unref();
    } else {
      // Unix系OS向け
      spawn('pkill', ['-f', 'uvicorn']);
      spawn('pkill', ['-f', 'vite']);
    }
  } catch (error) {
    console.error('クリーンアップスクリプト実行エラー:', error);
  }
}); 