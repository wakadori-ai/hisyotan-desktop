/**
 * 秘書たんアプリ開発環境統合スクリプト
 * 
 * 機能: バックエンド、フロントエンド、Electronを一括起動し、
 * Ctrl+Cで全プロセスを安全に終了します ✨
 */

const path = require('path');
const { setupConsoleEncoding, setupProcessHandlers } = require('../utils/process-utils');
const { cleanupPorts } = require('../utils/port-utils');
const startBackend = require('./start-backend');
const startFrontend = require('./start-frontend');
const startElectron = require('./start-electron');

// 使用するポート設定
const PORTS = {
  backend: process.env.BACKEND_PORT || 8000,
  frontend: process.env.FRONTEND_PORT || 5173
};

// 実行中のプロセス一覧
const processes = {
  backend: null,
  frontend: null,
  electron: null
};

// メイン処理
const startProcesses = async () => {
  try {
    console.log('🎀 統合開発環境を起動しています...');
    
    // コンソールエンコーディング設定
    setupConsoleEncoding();
    
    // 起動前にポートをクリーンアップ
    await cleanupPorts(PORTS);
    
    // バックエンド起動
    const backendResult = await startBackend({ port: PORTS.backend });
    processes.backend = backendResult.process;
    
    if (!backendResult.ready) {
      console.warn('⚠️ バックエンドサーバーの準備ができませんでしたが、処理を続行します');
    }

    // フロントエンド起動
    const frontendResult = await startFrontend({
      port: PORTS.frontend,
      env: { VITE_DEV_SERVER_URL: `http://localhost:${PORTS.frontend}/` }
    });
    processes.frontend = frontendResult.process;
    
    if (!frontendResult.ready) {
      console.warn('⚠️ フロントエンドサーバーの準備ができませんでしたが、処理を続行します');
    }
    
    // Electron起動
    const electronResult = await startElectron({
      frontendPort: PORTS.frontend,
      env: { VITE_DEV_SERVER_URL: `http://localhost:${PORTS.frontend}/` }
    });
    processes.electron = electronResult.process;
    
    console.log('🎀 統合開発環境を起動しました！Ctrl+Cで全プロセスを終了できます');
    
    // Electronの終了を待機
    return new Promise((resolve) => {
      processes.electron.on('close', (code) => {
        console.log(`💫 Electronプロセスが終了しました (コード: ${code})`);
        // Electronが終了したら他のプロセスも終了させる（killAllProcesses関数は終了ハンドラーの中で使われる）
        resolve();
      });
    });
  } catch (error) {
    console.error('💔 開発環境の起動中にエラーが発生しました:', error);
    throw error;
  }
};

// 終了ハンドラーを設定
setupProcessHandlers(processes);

// メイン処理の実行
startProcesses()
  .then(() => {
    console.log('👋 統合開発環境が終了しました');
    process.exit(0);
  })
  .catch(err => {
    console.error('💔 致命的なエラーが発生しました:', err);
    process.exit(1);
  }); 