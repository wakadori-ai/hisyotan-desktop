/**
 * 秘書たんアプリ - フロントエンド起動スクリプト
 * 
 * Viteフロントエンドを起動し、準備完了まで待機します ✨
 */

const { spawn } = require('child_process');
const { waitForEndpoint } = require('../utils/process-utils');
const { killProcessOnPort } = require('../utils/port-utils');

/**
 * Viteでフロントエンドを起動します
 * @param {Object} config 設定オブジェクト
 * @param {number} config.port 使用するポート
 * @param {Object} config.env 追加の環境変数
 * @returns {Promise<Object>} 起動したプロセスと成功状態を含むオブジェクト
 */
const startFrontend = async (config) => {
  const { port, env = {} } = config;
  
  console.log(`✨ フロントエンドを起動しています... (ポート: ${port})`);
  
  // 環境変数の設定
  const devServerUrl = `http://localhost:${port}/`;
  const frontendEnv = { 
    ...process.env, 
    ...env,
    FORCE_COLOR: "1", // カラー出力を強制
    VITE_DEV_SERVER_URL: devServerUrl 
  };
  
  // フロントエンド起動
  const frontendProcess = spawn('pnpm', ['run', 'dev:frontend'], {
    stdio: 'inherit',
    shell: true,
    env: frontendEnv
  });

  frontendProcess.on('close', (code) => {
    console.log(`💫 フロントエンドプロセスが終了しました (コード: ${code})`);
  });
  
  // エラーハンドリング
  frontendProcess.on('error', (err) => {
    console.error(`💦 フロントエンドプロセスの起動中にエラーが発生しました:`, err);
  });

  // Viteサーバーが応答するまで待機（最大30秒）
  console.log('⏳ Viteサーバーの起動を待機しています...');
  
  // 少し待機してからチェック開始（Viteの起動が少し遅い場合があるため）
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const frontendUrl = devServerUrl;
  let frontendReady = await waitForEndpoint(frontendUrl, 30);
  
  // Viteサーバーが応答しない場合、再起動を試みる
  if (!frontendReady) {
    console.log('🔄 Viteサーバーの再起動を試みます...');
    
    // 既存プロセスを終了
    if (frontendProcess && frontendProcess.pid) {
      try {
        process.kill(frontendProcess.pid);
        console.log('✅ 前回のViteプロセスを終了しました');
      } catch (err) {
        console.error('💦 Viteプロセス終了中にエラー:', err);
      }
    }
    
    // ポートを強制的に解放
    await killProcessOnPort(port);
    
    // 少し待機してから再起動
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 再起動試行
    const restartedProcess = spawn('pnpm', ['run', 'dev:frontend'], {
      stdio: 'inherit',
      shell: true,
      env: frontendEnv
    });
    
    restartedProcess.on('close', (code) => {
      console.log(`💫 再起動したフロントエンドプロセスが終了しました (コード: ${code})`);
    });
    
    // 再度待機
    console.log('⏳ 再起動したViteサーバーの起動を待機しています...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    frontendReady = await waitForEndpoint(frontendUrl, 15);
    
    return {
      process: restartedProcess,
      ready: frontendReady
    };
  }
  
  return {
    process: frontendProcess,
    ready: frontendReady
  };
};

// 単体実行の場合のエントリーポイント
if (require.main === module) {
  const port = process.env.FRONTEND_PORT || 5173;
  
  // ポートを強制的に解放してから起動（単体実行時のみ）
  killProcessOnPort(port).then(() => {
    startFrontend({ port })
      .then(({ process, ready }) => {
        if (ready) {
          console.log(`✨ フロントエンドが起動しました (PID: ${process.pid})`);
        } else {
          console.warn('⚠️ フロントエンドの準備ができませんでした');
        }
      })
      .catch(err => {
        console.error('💔 フロントエンド起動中にエラーが発生しました:', err);
        process.exit(1);
      });
  });
}

module.exports = startFrontend; 