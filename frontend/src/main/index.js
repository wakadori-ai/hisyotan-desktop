/**
 * ふにゃ秘書たんデスクトップアプリのメインプロセス
 * Electronの起動と統合UIの管理を行います
 */
const { app, ipcMain, globalShortcut, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { initialize } = require('@electron/remote/main');

// 自作モジュールのインポート
const { initLogger } = require('./utils/logger');
const { loadConfig, saveConfig } = require('./utils/config');
const { speakWithVoicevox, checkVoicevoxStatus } = require('./utils/voicevox');
const { startBackendProcess, shutdownBackend } = require('./utils/backend');
const { createPawWindow } = require('./windows/pawWindow');

// ロガーの初期化
const log = initLogger();

// グローバル変数
let config = {};
let pawWindow = null;
let currentEmotion = 0; // -100〜100の範囲で感情を管理

// アプリケーションの初期化
app.whenReady().then(async () => {
  // @electron/remoteの初期化
  initialize();
  
  // 設定の読み込み
  config = loadConfig(app);
  
  // バックエンドサーバーを自動起動
  await startBackendProcess(app, config, (config) => checkVoicevoxStatus(config));
  
  // 肉球ボタンウィンドウを作成
  pawWindow = createPawWindow(app);
  
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
  
  // ウィンドウが閉じられたときの処理
  pawWindow.on('closed', async () => {
    console.log('肉球ウィンドウが閉じられました');
    
    // stop_hisyotan.ps1を実行して全プロセスを確実に終了させる
    try {
      console.log('🛑 ウィンドウ終了時にstop_hisyotan.ps1スクリプトを実行します');
      const scriptPath = path.resolve(path.dirname(app.getAppPath()), 'tools', 'stop_hisyotan.ps1');
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
    
    pawWindow = null;
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      pawWindow = createPawWindow(app);
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
  
  // IPCハンドラー登録
  setupIPCHandlers();
});

// IPCハンドラー登録関数
function setupIPCHandlers() {
  // 音声合成
  ipcMain.handle('speak-text', async (event, text, emotion = 'normal') => {
    try {
      await speakWithVoicevox(app, config, text, emotion);
      return { success: true };
    } catch (error) {
      console.error('音声合成に失敗しました:', error);
      return { success: false, error: error.message };
    }
  });
  
  // 設定UIを表示するハンドラー
  ipcMain.handle('show-settings-ui', async (event) => {
    try {
      console.log('設定UI表示リクエストを受信しました');
      
      // 秘書たんに「設定モードだよ」と喋らせる
      if (pawWindow && !pawWindow.isDestroyed()) {
        pawWindow.webContents.send('display-settings-bubble', {
          text: '「設定モードだよ！何を変更する？」',
          emotion: 'happy'
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('設定UI表示に失敗しました:', error);
      return { success: false, error: error.message };
    }
  });
  
  // アプリケーション終了ハンドラ
  ipcMain.on('app:quit', () => {
    console.log('🌸 アプリケーションの終了を開始します...');
    cleanupAndQuit();
  });
  
  // 設定関連
  ipcMain.handle('get-settings', () => {
    return config;
  });
  
  ipcMain.handle('update-settings', (event, newSettings) => {
    // 深いマージは避けて単純な上書き
    config = { ...config, ...newSettings };
    saveConfig(app, config);
    return { success: true };
  });
  
  // 肉球ウィンドウから秘書たんの表情を変更
  ipcMain.on('change-secretary-expression', (event, expression) => {
    // 統合UIでは表情変更のメッセージをログに記録するだけ
    console.log(`秘書たんの表情を「${expression}」に変更しました`);
  });
  
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
}

// アプリケーションの終了処理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    cleanupAndQuit();
  }
});

// アプリケーション終了時の処理
app.on('will-quit', () => {
  console.log('🌸 アプリケーション終了イベント発生: will-quit');
  
  // stop_hisyotan.ps1を実行して全プロセスを確実に終了させる
  try {
    console.log('🛑 アプリケーション終了前にstop_hisyotan.ps1スクリプトを実行します');
    const scriptPath = path.resolve(path.dirname(app.getAppPath()), 'tools', 'stop_hisyotan.ps1');
    
    // PowerShellスクリプトを同期的に実行（UTF-8エンコーディングを明示的に指定）
    const { execSync } = require('child_process');
    const result = execSync(
      `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`, 
      { encoding: 'utf8' }
    );
    console.log(`✅ 停止スクリプト出力:\n${result}`);
  } catch (stopScriptError) {
    console.error('stop_hisyotan.ps1実行エラー:', stopScriptError);
  }
  
  // すべてのグローバルショートカットを解除
  globalShortcut.unregisterAll();
});

// アプリケーション起動完了通知
app.on('ready', () => {
  console.log('アプリケーションの準備が完了しました');
});

// 終了処理を行う関数
async function cleanupAndQuit() {
  // stop_hisyotan.ps1を実行して全プロセスを確実に終了させる
  try {
    console.log('🛑 アプリケーション終了時にstop_hisyotan.ps1スクリプトを実行します');
    const scriptPath = path.resolve(path.dirname(app.getAppPath()), 'tools', 'stop_hisyotan.ps1');
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
  await shutdownBackend(app).then(() => {
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
        const { spawn } = require('child_process');
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
} 