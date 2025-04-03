import { contextBridge, ipcRenderer } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールでの__dirnameの代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CSSをメインプロセスに注入する関数（必要な場合に使用）
 */
function injectCSS() {
  try {
    const distPath = path.join(__dirname, 'dist');
    const assetsPath = path.join(distPath, 'assets');
    
    // assetsディレクトリが存在するか確認
    if (fs.existsSync(assetsPath)) {
      // CSSファイルを検索
      const files = fs.readdirSync(assetsPath);
      const cssFile = files.find(file => file.endsWith('.css'));
      
      if (cssFile) {
        console.log(`🎨 CSSファイルを発見: ${cssFile}`);
        const cssContent = fs.readFileSync(path.join(assetsPath, cssFile), 'utf8');
        
        // レンダラープロセスに後からCSSを注入するための準備
        contextBridge.exposeInMainWorld('cssInjector', {
          getCssContent: () => cssContent
        });
        
        return true;
      }
    }
    
    console.log('❌ CSSファイルが見つかりませんでした');
    return false;
  } catch (error) {
    console.error('CSS注入エラー:', error);
    return false;
  }
}

// CSS注入処理を実行
injectCSS();

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
  fs: {
    readFile: (path) => fs.readFileSync(path, 'utf8'),
    writeFile: (path, data) => fs.writeFileSync(path, data, 'utf8'),
    exists: (path) => fs.existsSync(path)
  },
  path: {
    join: (...args) => path.join(...args),
    dirname: (p) => path.dirname(p),
    basename: (p) => path.basename(p)
  },
  platform: process.platform,
  showYesNoDialog: (message) => ipcRenderer.invoke('show-yes-no-dialog', message),
  showTextInputDialog: (message, defaultValue) => ipcRenderer.invoke('show-text-input-dialog', message, defaultValue),
  playSound: (name) => ipcRenderer.invoke('play-sound', name),
  
  // 必要なIPC通信メソッドを追加
  getAssetPath: (relativePath) => ipcRenderer.invoke('resolve-asset-path', relativePath),
  
  // API接続先の設定（環境変数から取得、デフォルトは127.0.0.1）
  apiHost: process.env.API_HOST || '127.0.0.1',
  
  // 他のIPC通信関数をここに追加していく
  speakText: (text, emotion) => ipcRenderer.invoke('speak-text', text, emotion),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  
  // クリックスルーとアニメーション準備のイベントハンドラを追加
  onClickThroughChanged: (callback) => ipcRenderer.on('click-through-changed', callback),
  onPrepareShowAnimation: (callback) => ipcRenderer.on('prepare-show-animation', callback)
}); 