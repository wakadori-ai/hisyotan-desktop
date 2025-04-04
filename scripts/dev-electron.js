/**
 * 秘書たんアプリ開発環境統合スクリプト
 * 
 * 機能: バックエンド、フロントエンド、Electronを一括起動し、
 * Ctrl+Cで全プロセスを安全に終了します ✨
 */

const { spawn } = require('child_process');
const treeKill = require('tree-kill');
const path = require('path');

// 実行中のプロセス一覧
const processes = {
  backend: null,
  frontend: null,
  electron: null
};

// 全プロセスを終了する関数
function killAllProcesses() {
  console.log('🌸 全プロセスを終了しています...');
  
  Object.entries(processes).forEach(([name, proc]) => {
    if (proc && proc.pid) {
      console.log(`✨ ${name} プロセス (PID: ${proc.pid}) を終了します`);
      try {
        treeKill(proc.pid);
      } catch (err) {
        console.error(`💦 ${name} プロセス終了中にエラーが発生しました:`, err);
      }
    }
  });
}

// 終了イベントハンドラー
process.on('SIGINT', () => {
  console.log('\n🎀 Ctrl+Cが押されました');
  killAllProcesses();
});

process.on('exit', () => {
  killAllProcesses();
});

// エラーハンドリング
process.on('uncaughtException', (err) => {
  console.error('💔 予期しないエラーが発生しました:', err);
  killAllProcesses();
  process.exit(1);
});

// バックエンド起動
console.log('🐈 Pythonバックエンドを起動しています...');
processes.backend = spawn('python', [
  '-m', 'uvicorn', 'backend.main:app', '--port', '8000'
], {
  stdio: 'inherit',
  shell: true
});

processes.backend.on('close', (code) => {
  console.log(`💫 バックエンドプロセスが終了しました (コード: ${code})`);
});

// バックエンドの起動を少し待ってからフロントエンドを起動
setTimeout(() => {
  // フロントエンド起動
  console.log('✨ フロントエンドを起動しています...');
  processes.frontend = spawn('pnpm', ['run', 'dev:frontend'], {
    stdio: 'inherit',
    shell: true
  });

  processes.frontend.on('close', (code) => {
    console.log(`💫 フロントエンドプロセスが終了しました (コード: ${code})`);
  });

  // フロントエンドの起動を少し待ってからElectronを起動
  setTimeout(() => {
    // Electron起動
    console.log('🐾 Electronを起動しています...');
    const electronEnv = {
      ...process.env,
      VITE_DEV_SERVER_URL: 'http://localhost:5173/',
      ELECTRON_CSP_DEV: 'true'
    };

    // copy-preload.mjsを実行してからElectronを起動
    const copyPreloadProcess = spawn('node', ['copy-preload.mjs'], {
      stdio: 'inherit',
      shell: true
    });

    copyPreloadProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`💦 preloadコピー処理がエラーで終了しました (コード: ${code})`);
      }

      processes.electron = spawn('electron', ['.'], {
        stdio: 'inherit',
        env: electronEnv,
        shell: true
      });

      processes.electron.on('close', (code) => {
        console.log(`💫 Electronプロセスが終了しました (コード: ${code})`);
        killAllProcesses();
        process.exit(0);
      });
    });
  }, 2000); // 2秒待機
}, 2000); // 2秒待機

console.log('🎀 統合開発環境を起動しました！Ctrl+Cで全プロセスを終了できます'); 