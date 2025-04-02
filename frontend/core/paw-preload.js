const { contextBridge, ipcRenderer } = require('electron');

// レンダラープロセスにAPIを公開
contextBridge.exposeInMainWorld('electronAPI', {
  // メインウィンドウの表示・非表示を切り替える
  toggleMainWindow: () => ipcRenderer.send('toggle-main-window'),
  
  // メインウィンドウの表示状態を取得
  getMainWindowVisibility: () => ipcRenderer.invoke('get-main-window-visibility')
}); 