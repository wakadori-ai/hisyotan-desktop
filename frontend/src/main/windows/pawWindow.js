const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const { enable } = require('@electron/remote/main');

/**
 * 肉球ウィンドウを作成する関数
 * @param {Object} app - Electronのappオブジェクト
 * @returns {BrowserWindow} 作成された肉球ウィンドウオブジェクト
 */
function createPawWindow(app) {
  // screen モジュールを取得して画面サイズを取得
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  
  // 肉球ボタンウィンドウの作成
  const preloadPath = process.env.VITE_DEV_SERVER_URL 
    ? path.join(__dirname, '..', 'preload', 'paw-preload.js')
    : path.join(app.getAppPath(), 'dist', 'paw-preload.js');
  
  console.log('現在の__dirname:', __dirname);
  console.log('preloadスクリプトの絶対パス:', preloadPath);
  console.log('このファイルが存在するか:', fs.existsSync(preloadPath));
  
  // 画面の右から20%、下から5%の位置を計算
  const winWidth = 360;
  const winHeight = 640;
  
  const xPosition = Math.round(width * 0.90) - winWidth;
  const yPosition = Math.round(height * 0.98) - winHeight;
  
  const pawWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: xPosition,
    y: yPosition,
    transparent: true,
    backgroundColor: '#20FFFFFF',
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: true, // @electron/remoteを使用する場合
      sandbox: false,
      webSecurity: true,
    }
  });
  
  // Content Security Policyを設定
  pawWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:* ws://localhost:*;"
        ]
      }
    });
  });
  
  // 肉球ボタンウィンドウの設定
  pawWindow.setAlwaysOnTop(true, 'screen-saver'); // screen-saverは最も高い優先度
  
  // 肉球ボタンページの読み込み
  // 開発モードと本番モードでの読み込みパスを明確に分ける
  const isDev = !!process.env.VITE_DEV_SERVER_URL;
  console.log('開発モード:', isDev);
  
  if (isDev) {
    // 開発モード - Viteサーバー経由
    const devUrl = `${process.env.VITE_DEV_SERVER_URL}`;
    console.log('開発サーバーURL:', devUrl);
    pawWindow.loadURL(new URL('index.html', devUrl).toString());
  } else {
    // 本番モード - ビルド済みindexを使用
    const prodPath = path.join(app.getAppPath(), 'dist', 'index.html');
    console.log('本番モードindex.htmlパス:', prodPath);
    pawWindow.loadFile(prodPath);
  }

  // コンソールを開く（デバッグ用）
  if (isDev) {
    pawWindow.webContents.openDevTools({ mode: 'detach' });
  }

  pawWindow.webContents.once('did-finish-load', () => {
    pawWindow.setIgnoreMouseEvents(false);
    console.log('肉球ウィンドウのロードが完了しました');
  });
  
  // @electron/remoteをウィンドウで有効化
  enable(pawWindow.webContents);
  
  return pawWindow;
}

module.exports = { createPawWindow }; 