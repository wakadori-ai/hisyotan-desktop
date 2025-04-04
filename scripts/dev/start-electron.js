/**
 * 秘書たんアプリ - Electron起動スクリプト
 * 
 * preloadファイルのコピーとElectronアプリの起動を行います 🐾
 */

const { spawn } = require('child_process');
const path = require('path');

/**
 * preloadファイルをコピーします
 * @param {Object} env 環境変数
 * @returns {Promise<boolean>} 成功した場合はtrue
 */
const copyPreloadFiles = async (env = {}) => {
  return new Promise((resolve) => {
    console.log('📝 preloadファイルをコピーしています...');
    
    const copyProcess = spawn('node', ['copy-preload.mjs'], {
      stdio: 'inherit',
      shell: true,
      env: env
    });

    copyProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`💦 preloadコピー処理がエラーで終了しました (コード: ${code})`);
        resolve(false);
      } else {
        console.log('✅ preloadファイルのコピーが完了しました');
        resolve(true);
      }
    });
  });
};

/**
 * Electronアプリを起動します
 * @param {Object} config 設定オブジェクト
 * @param {number} config.frontendPort フロントエンドのポート
 * @param {Object} config.env 追加の環境変数
 * @returns {Promise<Object>} 起動したプロセスと成功状態を含むオブジェクト
 */
const startElectron = async (config) => {
  const { frontendPort, env = {} } = config;
  
  console.log(`🐾 Electronを起動しています... (フロントエンドポート: ${frontendPort})`);
  
  // 環境変数設定
  const devServerUrl = `http://localhost:${frontendPort}/`;
  const electronEnv = {
    ...process.env,
    ...env,
    VITE_DEV_SERVER_URL: devServerUrl,
    ELECTRON_CSP_DEV: 'true'
  };
  
  // まずはpreloadファイルをコピー
  const copySuccess = await copyPreloadFiles(electronEnv);
  if (!copySuccess) {
    console.warn('⚠️ preloadファイルのコピーに失敗しましたが、処理を続行します');
  }
  
  // Electronの起動
  console.log('🚀 Electronアプリを起動しています...');
  console.log('🔍 環境変数: VITE_DEV_SERVER_URL =', electronEnv.VITE_DEV_SERVER_URL);
  
  const electronProcess = spawn('electron', ['.'], {
    stdio: 'inherit',
    shell: true,
    env: electronEnv
  });
  
  electronProcess.on('close', (code) => {
    console.log(`💫 Electronプロセスが終了しました (コード: ${code})`);
  });
  
  electronProcess.on('error', (err) => {
    console.error(`💦 Electronプロセスの起動中にエラーが発生しました:`, err);
  });
  
  return {
    process: electronProcess,
    ready: true // Electronは起動状態をHTTPで確認できないため、プロセス起動成功をreadyとみなす
  };
};

// 単体実行の場合のエントリーポイント
if (require.main === module) {
  const frontendPort = process.env.FRONTEND_PORT || 5173;
  
  startElectron({ frontendPort })
    .then(({ process }) => {
      console.log(`✨ Electronが起動しました (PID: ${process.pid})`);
    })
    .catch(err => {
      console.error('💔 Electron起動中にエラーが発生しました:', err);
      process.exit(1);
    });
}

module.exports = startElectron; 