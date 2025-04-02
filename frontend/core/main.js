const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const iconv = require('iconv-lite');

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

// メインウィンドウ
let mainWindow = null;

// 感情管理
let currentEmotion = 0; // -100〜100の範囲で感情を管理

// バックエンドプロセス
let backendProcess = null;

// アプリケーションの初期化
app.whenReady().then(async () => {
  // バックエンドサーバーを自動起動
  await startBackendProcess();
  
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

// ウィンドウ作成関数
function createWindow() {
  // screen モジュールを取得して画面サイズを取得
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  mainWindow = new BrowserWindow({
    width: width,  // 画面幅いっぱいに設定
    height: height, // 画面高さいっぱいに設定
    x: 0,  // 画面左端から表示
    y: 0,  // 画面上端から表示
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    skipTaskbar: true, // タスクバーに表示しない
    fullscreen: true, // 全画面表示
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // CORS制限を回避するため無効化 (開発環境向け)
      allowRunningInsecureContent: true,
      autoplayPolicy: 'no-user-gesture-required' // 自動再生を許可
    }
  });

  // セキュリティ関連の設定（CORS対策）
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET, POST, OPTIONS'],
        'Access-Control-Allow-Headers': ['Content-Type, Authorization']
      }
    });
  });
  
  // マウスイベントを透過するように設定（キャラの上からゲーム操作可能に）
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  
  // 特定の領域だけマウスイベントを受け取れるようにする
  // これにより吹き出しやボタンだけクリック可能になる
  ipcMain.on('enable-mouse-events', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.setIgnoreMouseEvents(false);
        console.log('マウスイベントを有効化しました');
      } catch (error) {
        console.error('マウスイベント有効化エラー:', error);
      }
    }
  });
  
  ipcMain.on('disable-mouse-events', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        mainWindow.setIgnoreMouseEvents(true, { forward: true });
        console.log('マウスイベントを無効化しました（クリック透過）');
      } catch (error) {
        console.error('マウスイベント無効化エラー:', error);
      }
    }
  });
  
  // 常に全面表示を確実にする（最大の優先度で）
  mainWindow.setAlwaysOnTop(true, 'screen-saver'); // screen-saverは最も高い優先度
  
  // 開発者ツールを開く（デバッグ用）
  // mainWindow.webContents.openDevTools();

  mainWindow.focus();
  // メインページ読み込み - 正しいパスを指定
  const indexPath = path.join(__dirname, '..', 'ui', 'index.html');
  console.log('index.htmlのパス:', indexPath);
  console.log('アプリケーションのパス:', app.getAppPath());
  mainWindow.loadFile(indexPath);
  
  // ウィンドウが閉じられたときの処理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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

// 開発者ツールを開くためのIPCハンドラー
ipcMain.on('open-dev-tools', (event, options) => {
  if (mainWindow) {
    // 常に別ウィンドウで開くよう強制
    const devToolsOptions = { mode: 'detach' };
    mainWindow.webContents.openDevTools(devToolsOptions);
    console.log('開発者ツールを別ウィンドウで開きました');
  }
});

ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('close-window', () => {
  shutdownBackend().then(() => {
    app.quit();
  }).catch(error => {
    console.error('バックエンド終了処理に失敗しました:', error);
    app.quit(); // エラーが発生しても強制終了
  });
});

ipcMain.on('toggle-always-on-top', () => {
  if (mainWindow) {
    const isAlwaysOnTop = mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(!isAlwaysOnTop);
    // 設定も更新
    config.window.alwaysOnTop = !isAlwaysOnTop;
    saveConfig();
  }
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
          resolve(true);
        } else {
          reject(new Error(`音声再生に失敗しました（コード: ${code}）`));
        }
      });
      
      player.on('error', (err) => {
        reject(err);
      });
    });
    
  } catch (error) {
    console.error('VOICEVOX連携エラー:', error);
    throw error;
  }
}

// 感情を更新する関数
function updateEmotion(changeValue) {
  // 現在の感情値を更新（-100〜100の範囲内に収める）
  currentEmotion = Math.max(-100, Math.min(100, currentEmotion + changeValue));
  
  // 感情状態を取得
  const emotionState = getEmotionState(currentEmotion);
  
  // レンダラープロセスに通知
  if (mainWindow) {
    mainWindow.webContents.send('emotion-change', currentEmotion);
  }
  
  return emotionState;
}

// 感情値から感情状態を取得
function getEmotionState(value) {
  // config.emotions.statesから適切な感情状態を探す
  let selectedState = config.emotions.states.find(state => state.name === 'normal');
  
  for (const state of config.emotions.states) {
    if (value >= state.threshold && 
        (selectedState.threshold <= state.threshold || selectedState.name === 'normal')) {
      selectedState = state;
    }
  }
  
  return selectedState;
}

// 感情の自然減衰処理
setInterval(() => {
  if (currentEmotion !== 0) {
    // 現在の感情に応じた減衰率を取得
    const state = getEmotionState(currentEmotion);
    const decayRate = state.decay_rate || 0.5;
    
    // 0に向かって減衰
    if (currentEmotion > 0) {
      currentEmotion = Math.max(0, currentEmotion - decayRate);
    } else {
      currentEmotion = Math.min(0, currentEmotion + decayRate);
    }
    
    // 小さな変化は通知しない（パフォーマンス考慮）
    if (Math.abs(currentEmotion) < 1) {
      currentEmotion = 0;
    }
  }
}, 10000); // 10秒ごとに減衰

// エレクトロン起動時のコンソールクリア
console.clear();
console.log('7DTD秘書たんデスクトップアプリ起動...');

// アプリケーションのパス確認
console.log(`アプリケーションパス: ${app.getAppPath()}`);
console.log(`作業ディレクトリ: ${process.cwd()}`);

// アセットパスの確認
const assetsPath = path.join(app.getAppPath(), 'assets');
console.log(`アセットパス: ${assetsPath}`);
const imagesPath = path.join(assetsPath, 'images');
console.log(`画像パス: ${imagesPath}`);

// 画像ファイル一覧の表示（デバッグ用）
try {
  if (fs.existsSync(imagesPath)) {
    console.log('画像ディレクトリの内容:');
    const files = fs.readdirSync(imagesPath);
    files.forEach(file => {
      console.log(`- ${file}`);
    });
  } else {
    console.error(`画像ディレクトリが存在しません: ${imagesPath}`);
  }
} catch (err) {
  console.error('画像ディレクトリの読み取りエラー:', err);
}

// アセットパスの取得処理を追加
ipcMain.handle('get-asset-path', (event, assetFile) => {
  try {
    // アプリケーションのルートディレクトリからのパスを構築
    const assetPath = path.join(app.getAppPath(), 'assets', assetFile);
    
    // 標準的なパスを試す
    if (fs.existsSync(assetPath)) {
      console.log(`アセットパス (標準): ${assetPath}`);
      return assetPath;
    }
    
    // 開発環境向けパスを試す
    const devPath = path.join(process.cwd(), 'assets', assetFile);
    if (fs.existsSync(devPath)) {
      console.log(`アセットパス (開発): ${devPath}`);
      return devPath;
    }
    
    // 代替パスを試す
    const altPath = path.join(__dirname, '..', '..', 'assets', assetFile);
    if (fs.existsSync(altPath)) {
      console.log(`アセットパス (代替): ${altPath}`);
      return altPath;
    }
    
    // 見つからない場合
    console.error(`アセットが見つかりません: ${assetFile}`);
    return null;
  } catch (error) {
    console.error(`アセットパス取得エラー: ${error}`);
    return null;
  }
});

// 画像ファイルの存在確認
ipcMain.handle('check-image-exists', (event, imagePath) => {
  try {
    // 相対パスを絶対パスに変換
    const fullPath = path.resolve(process.cwd(), imagePath);
    const exists = fs.existsSync(fullPath);
    console.log(`画像ファイル存在確認: ${imagePath} -> ${fullPath} (${exists ? '存在' : '存在しない'})`);
    return exists;
  } catch (err) {
    console.error(`画像ファイル確認エラー: ${err}`);
    return false;
  }
});

// ロガーの取得
ipcMain.handle('get-logger', () => {
  return log;
});

// エラーログの保存
ipcMain.handle('save-error-log', (event, errorLog) => {
  try {
    // logsディレクトリが存在しない場合は作成
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logPath = path.join(logDir, 'errors.json');
    
    // 既存のログを読み込み、新しいエラーを追加
    let existingLogs = [];
    if (fs.existsSync(logPath)) {
      try {
        existingLogs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      } catch (e) {
        console.error('エラーログファイルの読み込みに失敗しました:', e);
      }
    }
    
    // 配列でない場合は初期化
    if (!Array.isArray(existingLogs)) {
      existingLogs = [];
    }
    
    // 新しいエラーを追加
    existingLogs.push(errorLog);
    
    // 最大100件までに制限
    while (existingLogs.length > 100) {
      existingLogs.shift();
    }
    
    // 保存
    fs.writeFileSync(logPath, JSON.stringify(existingLogs, null, 2), 'utf8');
    
    return true;
  } catch (error) {
    console.error('エラーログの保存に失敗しました:', error);
    return false;
  }
});

// アプリケーションパスの取得
ipcMain.handle('get-app-path', () => {
  try {
    return app.getPath('userData');
  } catch (error) {
    console.error('アプリケーションパスの取得に失敗しました:', error);
    return '';
  }
});

// デバッグモードの切り替え
ipcMain.handle('toggle-debug-mode', () => {
  if (mainWindow) {
    // 開発者ツールの切り替え
    if (mainWindow.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools();
      return false;
    } else {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
      return true;
    }
  }
  return false;
});

// グローバルショートカットの登録
function registerGlobalShortcuts() {
  // Ctrl+F11 でオーバーレイメニューを表示
  const overlayShortcutRegistered = globalShortcut.register('CommandOrControl+F11', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.executeJavaScript('if (typeof toggleOverlayMenu === "function") toggleOverlayMenu();');
      // マウスイベントを有効化
      mainWindow.setIgnoreMouseEvents(false);
      // ウィンドウをフォーカス
      mainWindow.focus();
    }
  });
  
  if (!overlayShortcutRegistered) {
    console.error('オーバーレイショートカットの登録に失敗しました');
  } else {
    console.log('オーバーレイショートカット (Ctrl+F11) を登録しました');
  }
}

// アプリケーション終了時のショートカット解除
app.on('will-quit', () => {
  // すべてのグローバルショートカットを解除
  globalShortcut.unregisterAll();
  
  // バックエンドプロセスを終了
  if (backendProcess && !backendProcess.killed) {
    console.log('アプリケーション終了時にバックエンドプロセスを終了します');
    backendProcess.kill('SIGINT');
  }
});

// バックエンドプロセスを起動する関数
async function startBackendProcess() {
  // すでにバックエンドが実行中の場合は何もしない
  if (backendProcess !== null) {
    console.log('バックエンドサーバーはすでに起動しています');
    return;
  }
  
  console.log('バックエンドサーバーを起動します...');
  
  try {
    // アプリケーションのルートディレクトリを取得
    const appRootDir = app.getAppPath();
    console.log(`アプリケーションルートディレクトリ: ${appRootDir}`);
    
    // バックエンドのディレクトリパス
    const backendDir = path.join(appRootDir, 'backend');
    const backendScript = path.join(backendDir, 'main.py');
    
    // バックエンドディレクトリが存在するか確認
    if (!fs.existsSync(backendDir)) {
      console.error(`バックエンドディレクトリが見つかりません: ${backendDir}`);
      throw new Error(`バックエンドディレクトリが見つかりません: ${backendDir}`);
    }
    
    // スクリプトファイルが存在するか確認
    if (!fs.existsSync(backendScript)) {
      console.error(`バックエンドスクリプトが見つかりません: ${backendScript}`);
      throw new Error(`バックエンドスクリプトが見つかりません: ${backendScript}`);
    }
    
    // Pythonパスを複数の場所から探す（優先順位順）
    let pythonPath = null;
    const possiblePythonPaths = [
      // 仮想環境内のPython
      path.join(backendDir, '.venv', 'Scripts', 'python.exe'),
      // システムのPython
      'python',
      'python3'
    ];
    
    // 最初に見つかったPythonを使用
    for (const pp of possiblePythonPaths) {
      if (pp === 'python' || pp === 'python3') {
        pythonPath = pp;
        console.log(`システムの${pp}を使用します`);
        break;
      } else if (fs.existsSync(pp)) {
        pythonPath = pp;
        console.log(`仮想環境のPythonを使用します: ${pp}`);
        break;
      }
    }
    
    if (!pythonPath) {
      throw new Error('Pythonの実行ファイルが見つかりませんでした');
    }
    
    console.log(`Pythonパス: ${pythonPath}`);
    console.log(`バックエンドスクリプト: ${backendScript}`);
    
    // Windows環境の場合、cmd.exeを使ってPythonを実行
    if (process.platform === 'win32') {
      // ゾンビ検出フラグを追加
      const args = [backendScript, '--enable-monitoring', '--zombie-detection'];
      
      // Windowsでは、バッチファイル経由で実行（仮想環境があればアクティベートする）
      const venvPath = path.join(backendDir, '.venv');
      let cmd;
      let cmdArgs;
      
      if (fs.existsSync(venvPath)) {
        // 仮想環境を使用してPythonを実行
        cmd = 'cmd.exe';
        cmdArgs = [
          '/c',
          `cd ${backendDir} && .venv\\Scripts\\activate && python main.py --enable-monitoring --zombie-detection`
        ];
        console.log('仮想環境を使用してバックエンドを起動します...');
      } else {
        // 仮想環境なしでPythonを実行
        cmd = pythonPath;
        cmdArgs = args;
        console.log('システムPythonを使用してバックエンドを起動します...');
      }
      
      // バックエンドサーバーをサブプロセスとして起動
      backendProcess = spawn(cmd, cmdArgs, {
        stdio: 'pipe', // 標準出力とエラー出力を親プロセスにパイプ
        detached: false, // 親プロセスが終了した場合に子プロセスも終了させる
        windowsHide: true, // Windowsでコマンドウィンドウを表示しない
        cwd: backendDir, // 作業ディレクトリをバックエンドディレクトリに設定
        shell: true // シェル経由で実行
      });
    } else {
      // Mac/Linux環境の場合
      // ゾンビ検出フラグを追加
      const args = [backendScript, '--enable-monitoring', '--zombie-detection'];
      
      // バックエンドサーバーをサブプロセスとして起動
      backendProcess = spawn(pythonPath, args, {
        stdio: 'pipe', // 標準出力とエラー出力を親プロセスにパイプ
        detached: false, // 親プロセスが終了した場合に子プロセスも終了させる
        cwd: backendDir, // 作業ディレクトリをバックエンドディレクトリに設定
      });
    }
    
    // 標準出力のリスニング
    backendProcess.stdout.on('data', (data) => {
      // Python側がUTF-8で出力するようになったのでUTF-8でデコード
      const output = iconv.decode(data, 'utf-8').trim();
      console.log(`📦 Backend: ${output}`);
    });
    
    // エラー出力のリスニング
    backendProcess.stderr.on('data', (data) => {
      // Python側がUTF-8で出力するようになったのでUTF-8でデコード
      const output = iconv.decode(data, 'utf-8').trim();
      console.error(`🐍 Backend: ${output}`);
    });
    
    // プロセス終了時の処理
    backendProcess.on('close', (code) => {
      console.log(`🔌 Backend: サーバーが終了しました (コード: ${code})`);
      backendProcess = null;
    });
    
    // エラー処理を追加
    backendProcess.on('error', (err) => {
      console.error(`⚠️ Backend: プロセス起動エラー: ${err.message}`);
      backendProcess = null;
    });
    
    // バックエンドサーバーの起動を待機（5秒）
    console.log('🕒 Backend: サーバー起動待機中...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('✅ Backend: サーバー起動待機完了');
    
    // バックエンド接続確認
    try {
      const response = await fetch('http://127.0.0.1:8000/health', { timeout: 3000 });
      if (response.ok) {
        console.log('🎉 Backend: サーバーが正常に応答しています');
      } else {
        console.warn('⚠️ Backend: サーバーからの応答がありますが、ステータスが異常です');
      }
    } catch (error) {
      console.warn('⚠️ Backend: サーバーへの接続確認に失敗しました:', error.message);
      console.log('🔄 Backend: サーバーが起動中の可能性があります。少し待ってみてください...');
    }
    
    return true;
  } catch (error) {
    console.error('バックエンドサーバー起動エラー:', error);
    return false;
  }
}

// バックエンドプロセスを安全に終了する関数
async function shutdownBackend() {
  console.log('🔌 Backend: プロセスを終了しています...');
  
  try {
    // バックエンドAPIのシャットダウンエンドポイントを呼び出す
    const backendHost = config.backend?.host || 'http://127.0.0.1:8000';
    const response = await axios.post(`${backendHost}/shutdown`, {
      force: true
    }, {
      timeout: 5000 // 5秒でタイムアウト
    });
    
    console.log('✅ Backend: 終了リクエスト成功:', response.data);
    
    // バックエンドプロセスを直接終了
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill('SIGINT');
    }
    
    // 少し待ってからプロセスが確実に終了するようにする
    return new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.error('⚠️ Backend: 終了APIの呼び出しに失敗:', error.message);
    
    // APIが失敗した場合でも、直接プロセスを終了する
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill('SIGINT');
    }
    
    // APIが失敗した場合は、プロセスを強制終了しようとする（Windowsのみ）
    if (process.platform === 'win32') {
      try {
        // タスクキルコマンドを使ってPythonプロセスを終了
        const killProcess = spawn('taskkill', ['/F', '/IM', 'python.exe']);
        return new Promise((resolve, reject) => {
          killProcess.on('close', (code) => {
            if (code === 0) {
              console.log('🔄 Backend: Python プロセスを強制終了しました');
              resolve();
            } else {
              reject(new Error('Python プロセスの強制終了に失敗しました'));
            }
          });
        });
      } catch (killError) {
        console.error('⚠️ Backend: Python プロセスの強制終了に失敗しました:', killError);
      }
    }
    
    // エラーでもアプリは終了させる
    return Promise.resolve();
  }
}

// クリックスルー関連のIPCハンドラー
ipcMain.handle('enable-click-through', () => {
  if (mainWindow) {
    // マウスイベントを有効化（クリックスルー無効）
    mainWindow.setIgnoreMouseEvents(false);
    console.log('クリックスルーを無効化しました（すべての要素がクリック可能）');
    return true;
  }
  return false;
});

ipcMain.handle('disable-click-through', () => {
  if (mainWindow) {
    // マウスイベントを無視（クリックスルー有効）
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    console.log('クリックスルーを有効化しました（クリック透過）');
    return true;
  }
  return false;
});

let isClickThroughEnabled = true; // 初期状態はクリックスルー有効

ipcMain.handle('toggle-click-through', () => {
  if (mainWindow) {
    isClickThroughEnabled = !isClickThroughEnabled;
    
    if (isClickThroughEnabled) {
      // クリックスルーを有効化
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
      console.log('クリックスルーを有効化しました（クリック透過）');
    } else {
      // クリックスルーを無効化
      mainWindow.setIgnoreMouseEvents(false);
      console.log('クリックスルーを無効化しました（すべての要素がクリック可能）');
    }
    
    // レンダラープロセスに状態変更を通知
    mainWindow.webContents.send('click-through-changed', isClickThroughEnabled);
    return !isClickThroughEnabled; // 現在のクリックスルー状態を返す（trueならクリック透過中）
  }
  return isClickThroughEnabled;
});

/**
 * アプリケーションの初期化処理
 */
function initApp() {
  // 既存の処理...
  
  // MutationObserverのエラーハンドリング（万が一の場合に備えて）
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('MutationObserver')) {
      console.error('MutationObserverでエラーが発生:', event.error);
      // MutationObserverが原因のエラーをリセット
      window._speechTextObserverAttached = false;
      
      // 吹き出し要素が存在するか確認
      const speechBubble = document.getElementById('speechBubble');
      const speechText = document.getElementById('speechText');
      
      if (speechBubble && speechText) {
        // 強制的に表示状態を保証
        speechBubble.className = 'speech-bubble show';
        speechBubble.style.cssText = `
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: absolute !important;
          top: 20% !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 2147483647 !important;
          pointer-events: auto !important;
        `;
        
        if (!speechText.textContent || speechText.textContent.trim() === '') {
          speechText.textContent = '「システムを回復中...」';
        }
      }
    }
  });
  
  // Alt+Cでクリックスルーの切り替え
  document.addEventListener('keydown', (e) => {
    // Alt+C
    if (e.altKey && e.key === 'c') {
      togglePointerEvents();
    }
  });
  
  // 既存の処理...
}

// バックエンド接続初期化
async function initBackendConnection() {
  try {
    const apiBaseUrl = 'http://127.0.0.1:8000';
    
    // バックエンド接続確認
    logDebug('バックエンド接続確認を開始します...');
    const response = await fetch(`${apiBaseUrl}/api/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // タイムアウト対策としてシグナルを使用
      signal: AbortSignal.timeout(5000) // 5秒でタイムアウト
    });
    
    if (!response.ok) {
      throw new Error(`バックエンドステータス確認エラー: ${response.status}`);
    }
    
    const data = await response.json();
    logDebug(`バックエンド接続成功: ${JSON.stringify(data)}`);
    
    // 接続成功のため、ステータステキストを更新
    updateBackendStatusText('接続済み', '#4CAF50');
    return true;
  } catch (error) {
    logError(`バックエンド接続エラー: ${error.message}`);
    
    // エラーメッセージを表示
    showError('バックエンド接続中にエラーが発生しました');
    
    // バックエンドサーバーが起動していない可能性を通知
    speak('バックエンドサーバーに接続できません。サーバーが起動しているか確認してください。', 'serious', 10000);
    
    // 再試行ボタンを表示
    setTimeout(() => {
      // すでにボタンが表示されている場合は作成しない
      if (!document.getElementById('retry-backend-container')) {
        showRetryBackendButton();
      }
      // ステータステキストを更新
      updateBackendStatusText('未接続', '#FF0000');
    }, 100);
    
    return false;
  }
}

/**
 * バックエンド接続状態テキストを更新
 * @param {string} text - 表示テキスト
 * @param {string} color - テキスト色
 */
function updateBackendStatusText(text, color) {
  const statusText = document.getElementById('backend-status-text');
  if (statusText) {
    statusText.innerText = `バックエンド: ${text}`;
    statusText.style.color = color;
  }
}

// アプリケーション初期化
async function initApplication() {
  try {
    logDebug('アプリケーション初期化開始...');
    
    // 設定読み込み
    loadConfig();
    
    // バックエンド接続確認
    const backendConnected = await initBackendConnection();
    if (!backendConnected) {
      logWarning('バックエンド接続に失敗しましたが、アプリケーションは継続します');
    }
    
    // VOICEVOX接続確認
    const voicevoxConnected = await checkVoicevoxConnection();
    
    // 接続状態に応じたメッセージ表示
    if (voicevoxConnected) {
      logDebug('VOICEVOX接続成功');
      speak('音声合成エンジンの準備ができました', 'happy', 5000);
    } else {
      logWarning('VOICEVOX接続に失敗しました');
      speak('音声合成エンジンに接続できませんでした。VOICEVOXが起動しているか確認してください。', 'serious', 10000);
    }
    
    // WebSocket接続初期化
    initWebSocketConnection();
    
    // ゲーム監視初期化
    initGameMonitoring();
    
    logDebug('アプリケーション初期化完了');
  } catch (error) {
    logError(`アプリケーション初期化エラー: ${error.message}`);
    showError(`初期化中にエラーが発生しました: ${error.message}`);
  }
}

/**
 * バックエンド接続を再試行するボタンを表示
 */
function showRetryBackendButton() {
  try {
    const retryContainer = document.createElement('div');
    retryContainer.id = 'retry-backend-container';
    retryContainer.style.cssText = `
      position: absolute;
      bottom: 10px;
      right: 10px;
      background-color: rgba(255, 255, 255, 0.9);
      border-radius: 8px;
      padding: 10px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      align-items: center;
      z-index: 1000;
    `;
    
    const retryButton = document.createElement('button');
    retryButton.id = 'retry-backend-button';
    retryButton.innerText = 'バックエンド再接続';
    retryButton.style.cssText = `
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 8px 16px;
      text-align: center;
      text-decoration: none;
      display: inline-block;
      font-size: 14px;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 5px;
      transition: background-color 0.3s;
    `;
    retryButton.addEventListener('mouseenter', () => {
      retryButton.style.backgroundColor = '#45a049';
    });
    retryButton.addEventListener('mouseleave', () => {
      retryButton.style.backgroundColor = '#4CAF50';
    });
    retryButton.addEventListener('click', async () => {
      retryButton.disabled = true;
      retryButton.innerText = '接続中...';
      
      try {
        const connected = await initBackendConnection();
        if (connected) {
          speak('バックエンド接続に成功しました', 'happy', 5000);
          // 成功したら再試行ボタンを削除
          if (document.getElementById('retry-backend-container')) {
            document.getElementById('retry-backend-container').remove();
          }
        } else {
          retryButton.disabled = false;
          retryButton.innerText = 'バックエンド再接続';
          speak('バックエンド接続に失敗しました', 'serious', 5000);
        }
      } catch (error) {
        retryButton.disabled = false;
        retryButton.innerText = 'バックエンド再接続';
        logDebug(`再接続エラー: ${error.message}`);
      }
    });
    
    const statusText = document.createElement('div');
    statusText.id = 'backend-status-text';
    statusText.innerText = 'バックエンド未接続';
    statusText.style.cssText = `
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    `;
    
    retryContainer.appendChild(retryButton);
    retryContainer.appendChild(statusText);
    document.body.appendChild(retryContainer);
  } catch (error) {
    logDebug(`再接続ボタン表示エラー: ${error.message}`);
  }
} 