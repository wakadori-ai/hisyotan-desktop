const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// レンダラープロセスにAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
  // 秘書たんに話させる
  speakText: (text, emotion) => ipcRenderer.invoke('speak-text', text, emotion),
  
  // メッセージ受信
  onMessage: (callback) => ipcRenderer.on('message', (_, message, emotion) => callback(message, emotion)),
  
  // 感情状態変化通知
  onEmotionChange: (callback) => ipcRenderer.on('emotion-change', (_, value) => callback(value)),
  
  // ウィンドウ操作
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  toggleAlwaysOnTop: () => ipcRenderer.send('toggle-always-on-top'),
  
  // マウスイベント制御
  enableMouseEvents: () => ipcRenderer.send('enable-mouse-events'),
  disableMouseEvents: () => ipcRenderer.send('disable-mouse-events'),
  
  // 設定関連
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  
  // ゲーム連携
  getGameStatus: () => ipcRenderer.invoke('get-game-status'),
  connectToGame: () => ipcRenderer.invoke('connect-to-game'),
  
  // 音声キャッシュ関連
  checkFileExists: (filePath) => ipcRenderer.invoke('check-file-exists', filePath),
  saveVoiceFile: (filePath, uint8Array) => ipcRenderer.invoke('save-voice-file', filePath, uint8Array),
  readJsonFile: (filePath) => ipcRenderer.invoke('read-json-file', filePath),
  writeJsonFile: (filePath, jsonData) => ipcRenderer.invoke('write-json-file', filePath, jsonData),
  
  // ログを送信
  sendLog: (message) => ipcRenderer.invoke('log-message', message),
  
  // アセットパスの取得
  getAssetPath: (assetFile) => ipcRenderer.invoke('get-asset-path', assetFile),
  
  // デバッグモード切り替え
  toggleDebugMode: () => ipcRenderer.invoke('toggle-debug-mode'),
  
  // 開発者ツールを開く
  openDevTools: () => ipcRenderer.send('open-dev-tools'),
  
  // 画像ファイルの存在確認（メインプロセスに委譲）
  checkImageExists: (imagePath) => ipcRenderer.invoke('check-image-exists', imagePath),
  
  // クリックスルーを無効化（要素をクリック可能に）
  enableClickThrough: () => {
    return ipcRenderer.invoke('enable-click-through');
  },
  
  // クリックスルーを有効化（要素をクリック透過に）
  disableClickThrough: () => {
    return ipcRenderer.invoke('disable-click-through');
  },
  
  // クリックスルーの切り替え
  toggleClickThrough: () => {
    return ipcRenderer.invoke('toggle-click-through');
  },
  
  // クリックスルー状態が変更されたときのコールバック
  onClickThroughChanged: (callback) => {
    ipcRenderer.on('click-through-changed', (_, value) => callback(value));
  },
  
  // ロガーの取得機能をメインプロセス経由に変更
  getLogger: () => ipcRenderer.invoke('get-logger'),
  
  // エラーログを保存するAPI
  saveErrorLog: (errorLog) => ipcRenderer.invoke('save-error-log', errorLog),
  
  // アプリケーションのパスを取得
  getAppPath: () => ipcRenderer.invoke('get-app-path')
});

contextBridge.exposeInMainWorld('electronLogger', {
  logToFile: (message) => ipcRenderer.invoke('log-to-file', message)
});

// main.jsに追加
ipcMain.handle('log-to-file', async (event, message) => {
  const logFile = path.join(__dirname, 'debug-logs.txt');
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  fs.appendFileSync(logFile, logEntry);
  return true;
}); 