const { contextBridge, ipcRenderer } = require('electron');

// デバッグログを追加
console.log('🔍 preload.js が読み込まれました');
console.log(`🔧 実行環境: ${process.env.NODE_ENV || 'production'}`);
console.log(`📁 現在の作業ディレクトリ: ${process.cwd()}`);

// メインプロセスにアクセスするためのAPIを公開
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, ...args) => {
      console.log(`🔄 IPC send: ${channel}`, args);
      ipcRenderer.send(channel, ...args);
    },
    on: (channel, func) => {
      console.log(`🔄 IPC on: ${channel}`);
      const subscription = (event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);
      return () => ipcRenderer.removeListener(channel, subscription);
    },
    invoke: async (channel, ...args) => {
      console.log(`🔄 IPC invoke: ${channel}`, args);
      try {
        const result = await ipcRenderer.invoke(channel, ...args);
        console.log(`✅ IPC invoke成功: ${channel}`, result);
        return result;
      } catch (error) {
        console.error(`❌ IPC invokeエラー: ${channel}`, error);
        throw error;
      }
    }
  }
});

// アプリケーション固有の機能を公開
contextBridge.exposeInMainWorld('electronAPI', {
  // アプリケーションを終了する
  quitApp: () => {
    console.log('🚪 アプリケーション終了を要求');
    ipcRenderer.send('app:quit');
  },
  
  // 秘書たんにテキストを喋らせる
  speakText: async (text, emotion = 'normal') => {
    console.log(`🎤 発話要求: ${text} (感情: ${emotion})`);
    try {
      const result = await ipcRenderer.invoke('speak-text', text, emotion);
      console.log('✅ 発話成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 発話エラー:', error);
      throw error;
    }
  },
  
  // 秘書たんの表情を変更する
  changeSecretaryExpression: (expression) => {
    console.log(`😊 表情変更: ${expression}`);
    ipcRenderer.send('change-secretary-expression', expression);
  },
  
  // アセットのパスを解決する
  resolveAssetPath: async (relativePath) => {
    console.log(`📂 アセットパス解決: ${relativePath}`);
    try {
      const result = await ipcRenderer.invoke('resolve-asset-path', relativePath);
      console.log('✅ パス解決成功:', result);
      return result;
    } catch (error) {
      console.error('❌ パス解決エラー:', error);
      throw error;
    }
  },
  
  // 画像ファイルの存在確認
  checkImageExists: async (imagePath) => {
    console.log(`🖼️ 画像存在確認: ${imagePath}`);
    try {
      const result = await ipcRenderer.invoke('check-image-exists', imagePath);
      console.log('✅ 画像確認結果:', result);
      return result;
    } catch (error) {
      console.error('❌ 画像確認エラー:', error);
      throw error;
    }
  },
  
  // 設定関連
  getSettings: async () => {
    console.log('⚙️ 設定取得を要求');
    try {
      const result = await ipcRenderer.invoke('get-settings');
      console.log('✅ 設定取得成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 設定取得エラー:', error);
      throw error;
    }
  },
  
  updateSettings: async (settings) => {
    console.log('⚙️ 設定更新を要求:', settings);
    try {
      const result = await ipcRenderer.invoke('update-settings', settings);
      console.log('✅ 設定更新成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 設定更新エラー:', error);
      throw error;
    }
  },
  
  // 音声再生の制御
  playAudio: async (audioData, options = {}) => {
    console.log('🎵 音声再生を開始します');
    try {
      // 音声データがBase64形式の場合、デコード
      const audioBuffer = typeof audioData === 'string' 
        ? Buffer.from(audioData, 'base64')
        : audioData;
      
      // 音声再生の設定
      const audioContext = new AudioContext();
      const audioSource = audioContext.createBufferSource();
      
      // オーディオバッファをデコード
      const buffer = await audioContext.decodeAudioData(audioBuffer.buffer);
      audioSource.buffer = buffer;
      
      // 音量の設定
      const gainNode = audioContext.createGain();
      gainNode.gain.value = options.volume || 1.0;
      
      // ノードを接続
      audioSource.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 再生開始
      audioSource.start(0);
      
      // 再生完了時の処理
      audioSource.onended = () => {
        console.log('✅ 音声再生が完了しました');
        audioContext.close();
      };
      
      return true;
    } catch (error) {
      console.error('❌ 音声再生エラー:', error);
      return false;
    }
  },
  
  // 音声再生の停止
  stopAudio: () => {
    console.log('⏹️ 音声再生を停止します');
    try {
      // すべてのAudioContextを閉じる
      const contexts = window.audioContexts || [];
      contexts.forEach(context => {
        if (context.state !== 'closed') {
          context.close();
        }
      });
      window.audioContexts = [];
      return true;
    } catch (error) {
      console.error('❌ 音声停止エラー:', error);
      return false;
    }
  }
}); 