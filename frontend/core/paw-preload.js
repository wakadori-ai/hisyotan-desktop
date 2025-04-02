const { contextBridge, ipcRenderer } = require('electron');

// レンダラープロセスにAPIを公開
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
  quitApp: () => ipcRenderer.send('app:quit')
}); 