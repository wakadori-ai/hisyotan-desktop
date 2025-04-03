const { contextBridge, ipcRenderer } = require('electron');
// pathとremoteを直接requireするのではなく、必要な機能はipcRendererを介して取得します

// アセットのパスを解決する関数
async function resolveAssetPath(relativePath) {
  try {
    // メインプロセス経由でパスを解決する（安全な方法）
    return await ipcRenderer.invoke('resolve-asset-path', relativePath);
  } catch (error) {
    console.error('アセットパス解決エラー:', error);
    // エラーが発生した場合は相対パスをそのまま返す
    return relativePath;
  }
}

// レンダラープロセスにAPIを公開
contextBridge.exposeInMainWorld('electron', {
  // 必要な機能を公開
  ipcRenderer: {
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    on: (channel, func) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
  }
  // Note: path関連の機能はmain.js側に移動しました
});

contextBridge.exposeInMainWorld('electronAPI', {
  // メインウィンドウの表示・非表示を切り替える
  toggleMainWindow: () => ipcRenderer.send('toggle-main-window'),
  
  // メインウィンドウの表示状態を取得
  getMainWindowVisibility: () => ipcRenderer.invoke('get-main-window-visibility'),
  
  // 肉球ウィンドウを移動する
  moveWindow: (deltaX, deltaY) => ipcRenderer.send('move-paw-window', { deltaX, deltaY }),
  
  // 肉球ウィンドウの現在位置を取得する
  getWindowPosition: () => ipcRenderer.invoke('get-paw-window-position'),
  
  // 肉球ウィンドウの位置を設定する
  setWindowPosition: (x, y) => ipcRenderer.send('set-paw-window-position', { x, y }),
  
  // アプリケーションを終了する
  quitApp: () => ipcRenderer.send('app:quit'),
  
  // 秘書たんにテキストを喋らせる
  speakText: (text, emotion = 'normal') => ipcRenderer.invoke('speak-text', text, emotion),
  
  // 秘書たんの表情を変更する
  changeSecretaryExpression: (expression) => ipcRenderer.send('change-secretary-expression', expression),
  
  // アセットのパスを解決する - 非同期関数に変更
  resolveAssetPath: (relativePath) => ipcRenderer.invoke('resolve-asset-path', relativePath),
  
  // 画像ファイルの存在確認
  checkImageExists: (imagePath) => ipcRenderer.invoke('check-image-exists', imagePath),
  
  // 設定UIを表示する
  showSettingsUI: () => ipcRenderer.invoke('show-settings-ui'),
  
  // 設定を取得する
  getSettings: () => ipcRenderer.invoke('get-settings'),
  
  // 設定を保存する
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings)
});

// speechManagerへのアクセスを提供する
// メインプロセス経由でspeechManagerの機能を利用できるようにする
contextBridge.exposeInMainWorld('speechManagerProxy', {
  speakWithObject: (speechObj) => ipcRenderer.invoke('speech-manager-speak-with-object', speechObj),
  speak: (message, emotion, displayTime, animation, eventType, presetSound) => 
    ipcRenderer.invoke('speech-manager-speak', message, emotion, displayTime, animation, eventType, presetSound),
  getHordeModeState: () => ipcRenderer.invoke('speech-manager-get-horde-mode'),
  setHordeModeState: (enabled) => ipcRenderer.invoke('speech-manager-set-horde-mode', enabled)
}); 