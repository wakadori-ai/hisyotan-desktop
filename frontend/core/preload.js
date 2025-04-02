const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// レンダラープロセスにAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
  // 秘書たんに話させる
  speakText: (text, emotion) => ipcRenderer.invoke('speak-text', text, emotion),
  
  // アプリケーションの終了
  quitApp: () => ipcRenderer.send('app:quit'),
  
  // 設定関連
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings),
  
  // 肉球ウィンドウ位置関連
  getWindowPosition: () => ipcRenderer.invoke('get-paw-window-position'),
  setWindowPosition: (x, y) => ipcRenderer.send('set-paw-window-position', { x, y }),
  
  // アセットパスの取得
  getAssetPath: (assetFile) => ipcRenderer.invoke('get-asset-path', assetFile)
});

contextBridge.exposeInMainWorld('electronLogger', {
  logToFile: (message) => ipcRenderer.invoke('log-to-file', message)
}); 