// ESモジュールの代わりにCommonJSを使用
const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const url = require('url');

// デバッグログを追加
console.log('🔍 preload.js が読み込まれました');
console.log(`🔧 実行環境: ${process.env.NODE_ENV || 'production'}`);
console.log(`📁 現在の作業ディレクトリ: ${process.cwd()}`);

// ESモジュール互換の__dirname定義
const __dirname = process.env.NODE_ENV === 'development' 
  ? path.resolve(process.cwd())
  : path.dirname(process.execPath);

console.log(`📂 __dirnameの値: ${__dirname}`);

// Electronの機能をブラウザウィンドウで使えるようにする
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    on: (channel, func) => {
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    once: (channel, func) => {
      ipcRenderer.once(channel, (event, ...args) => func(...args));
    }
  },
  // ファイル操作はメインプロセス経由で実行するように修正
  fs: {
    readFile: (path) => ipcRenderer.invoke('fs-read-file', path),
    writeFile: (path, data) => ipcRenderer.invoke('fs-write-file', path, data),
    exists: (path) => ipcRenderer.invoke('fs-exists', path)
  },
  path: {
    join: (...args) => ipcRenderer.invoke('path-join', ...args),
    dirname: (p) => ipcRenderer.invoke('path-dirname', p),
    basename: (p) => ipcRenderer.invoke('path-basename', p)
  },
  platform: process.platform,
  showYesNoDialog: (message) => ipcRenderer.invoke('show-yes-no-dialog', message),
  showTextInputDialog: (message, defaultValue) => ipcRenderer.invoke('show-text-input-dialog', message, defaultValue),
  playSound: (name) => ipcRenderer.invoke('play-sound', name),
  
  // 必要なIPC通信メソッドを追加
  getAssetPath: (relativePath) => ipcRenderer.invoke('resolve-asset-path', relativePath),
  
  // API接続先の設定（環境変数から取得、デフォルトは127.0.0.1）
  apiHost: process.env.API_HOST || '127.0.0.1',
  
  // バックエンド接続確認
  checkBackendConnection: async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      return response.ok;
    } catch (err) {
      console.error('バックエンド接続エラー:', err);
      return false;
    }
  },
  
  // 他のIPC通信関数をここに追加していく
  speakText: (text, emotion) => ipcRenderer.invoke('speak-text', text, emotion),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // クリックスルーとアニメーション準備のイベントハンドラを追加
  onClickThroughChanged: (callback) => ipcRenderer.on('click-through-changed', callback),
  onPrepareShowAnimation: (callback) => ipcRenderer.on('prepare-show-animation', callback)
}); 