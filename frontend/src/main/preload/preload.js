const { contextBridge, ipcRenderer } = require('electron');

// メインプロセスにアクセスするためのAPIを公開
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    on: (channel, func) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
  }
});

// アプリケーション固有の機能を公開
contextBridge.exposeInMainWorld('electronAPI', {
  // アプリケーションを終了する
  quitApp: () => ipcRenderer.send('app:quit'),
  
  // 秘書たんにテキストを喋らせる
  speakText: (text, emotion = 'normal') => ipcRenderer.invoke('speak-text', text, emotion),
  
  // 秘書たんの表情を変更する
  changeSecretaryExpression: (expression) => ipcRenderer.send('change-secretary-expression', expression),
  
  // アセットのパスを解決する
  resolveAssetPath: (relativePath) => ipcRenderer.invoke('resolve-asset-path', relativePath),
  
  // 画像ファイルの存在確認
  checkImageExists: (imagePath) => ipcRenderer.invoke('check-image-exists', imagePath),
  
  // 設定関連
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings)
}); 