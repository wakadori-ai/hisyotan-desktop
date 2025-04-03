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
    ? `${process.env.VITE_DEV_SERVER_URL}` // 開発モード - Viteサーバー経由
    : path.join(app.getAppPath(), 'dist', 'index.html'); // 本番モード - ビルド済みindexを使用
  
  if (process.env.VITE_DEV_SERVER_URL) {
    pawWindow.loadURL(pawPath); // 開発サーバーのURLをロード
  } else {
    pawWindow.loadFile(pawPath); // ビルド済みファイルをロード
  }

  pawWindow.webContents.once('did-finish-load', () => {
    pawWindow.setIgnoreMouseEvents(false);
  });
  
  // @electron/remoteをウィンドウで有効化
  enable(pawWindow.webContents);
  
  return pawWindow;
}

module.exports = { createPawWindow }; 