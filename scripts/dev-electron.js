/**
 * 秘書たんアプリ開発環境統合スクリプト
 * 
 * 機能: バックエンド、フロントエンド、Electronを一括起動し、
 * Ctrl+Cで全プロセスを安全に終了します ✨
 */

const { spawn } = require('child_process');
const treeKill = require('tree-kill');
const path = require('path');
const http = require('http');
const waitOn = require('wait-on');

// 文字化け対策としてコンソール出力のエンコーディングを設定
// Windows環境ではコマンドプロンプトとPowerShellのエンコーディングが異なるため
if (process.platform === 'win32') {
  try {
    // Windowsの場合、chcpコマンドでコードページを65001(UTF-8)に設定
    spawn('chcp', ['65001'], { stdio: 'inherit', shell: true });
    console.log('🌟 コンソール出力をUTF-8に設定しました');
  } catch (error) {
    console.warn('⚠️ エンコーディング設定に失敗しました:', error.message);
  }
}

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
  // SIGINTの場合は少し待ってから終了（プロセス終了の猶予時間）
  setTimeout(() => {
    process.exit(0);
  }, 1000);
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

// URLが応答するか確認する関数
const checkUrlReady = (url, maxRetries = 10, interval = 500) => {
  return new Promise((resolve, reject) => {
    let retries = 0;
    
    const checkUrl = () => {
      http.get(url, res => {
        if (res.statusCode === 200) {
          console.log(`✅ ${url} が応答しています`);
          resolve(true);
        } else {
          retry();
        }
      }).on('error', err => {
        retry();
      });
    };
    
    const retry = () => {
      retries++;
      if (retries >= maxRetries) {
        console.error(`❌ ${url} に接続できませんでした`);
        resolve(false);
      } else {
        setTimeout(checkUrl, interval);
      }
    };
    
    checkUrl();
  });
};

// メイン処理の非同期関数
const startProcesses = async () => {
  try {
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

    // バックエンドが応答するまで待機
    console.log('⏳ バックエンドサーバーの起動を待機しています...');
    await waitOn({
      resources: ['http://localhost:8000/'],
      timeout: 30000,
      interval: 100,
      verbose: true
    });
    console.log('✅ バックエンドサーバーの準備ができました！');

    // バックエンドの準備完了を確認
    try {
      await new Promise((resolve, reject) => {
        http.get('http://localhost:8000/', (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              console.log('🔍 バックエンド応答:', json);
              resolve(json);
            } catch (e) {
              console.warn('⚠️ バックエンドレスポンスのJSONパースに失敗:', e.message);
              resolve({});
            }
          });
        }).on('error', (err) => {
          console.warn('⚠️ バックエンドは起動していますが、応答確認に失敗しました:', err.message);
          resolve({});
        });
      });
    } catch (err) {
      console.warn('⚠️ バックエンド応答確認中にエラー:', err.message);
    }

    // フロントエンド起動
    console.log('✨ フロントエンドを起動しています...');
    
    // 環境変数にVITE_DEV_SERVER_URLを設定
    process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173/';
    
    processes.frontend = spawn('pnpm', ['run', 'dev:frontend'], {
      stdio: 'inherit',
      shell: true,
      env: { 
        ...process.env, 
        FORCE_COLOR: "1", // カラー出力を強制
        VITE_DEV_SERVER_URL: 'http://localhost:5173/' 
      }
    });

    processes.frontend.on('close', (code) => {
      console.log(`💫 フロントエンドプロセスが終了しました (コード: ${code})`);
    });

    // フロントエンドが応答するまで待機
    console.log('⏳ Viteサーバーの起動を待機しています...');
    
    // 最大30回、1秒間隔でViteサーバーの起動を確認（最大30秒待機）
    let viteReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        const viteCheckResult = await new Promise((resolve) => {
          console.log(`⏳ Viteサーバー接続試行中... ${i+1}/30`);
          http.get('http://localhost:5173/', (res) => {
            if (res.statusCode === 200) {
              console.log(`✓ Viteサーバー応答確認: ${res.statusCode}`);
              resolve(true);
            } else {
              console.log(`⏳ Viteサーバー応答待機中... (${res.statusCode})`);
              resolve(false);
            }
          }).on('error', (err) => {
            resolve(false);
          });
        });
        
        if (viteCheckResult) {
          viteReady = true;
          break;
        }
      } catch (err) {
        // エラーは無視、次の試行へ
      }
      
      // 1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (viteReady) {
      console.log('✅ Viteサーバーの準備ができました！');
    } else {
      console.warn('⚠️ Viteサーバーの確認がタイムアウトしましたが、処理を続行します。');
    }
    
    // Electron起動
    console.log('🐾 Electronを起動しています...');
    const electronEnv = {
      ...process.env,
      VITE_DEV_SERVER_URL: 'http://localhost:5173/',
      ELECTRON_CSP_DEV: 'true'
    };

    // コピー処理実行
    console.log('📝 preloadファイルをコピーしています...');
    const copyPreloadProcess = spawn('node', ['copy-preload.mjs'], {
      stdio: 'inherit',
      shell: true,
      env: electronEnv
    });

    // Electronを起動
    await new Promise((resolve, reject) => {
      copyPreloadProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`💦 preloadコピー処理がエラーで終了しました (コード: ${code})`);
        } else {
          console.log('✅ preloadファイルのコピーが完了しました');
        }

        console.log('🚀 Electronアプリを起動しています...');
        console.log('🔍 環境変数: VITE_DEV_SERVER_URL =', electronEnv.VITE_DEV_SERVER_URL);
        
        processes.electron = spawn('electron', ['.'], {
          stdio: 'inherit',
          env: electronEnv,
          shell: true
        });

        processes.electron.on('close', (code) => {
          console.log(`💫 Electronプロセスが終了しました (コード: ${code})`);
          killAllProcesses();
          resolve();
        });
      });
    });
  } catch (error) {
    console.error('💔 開発環境の起動中にエラーが発生しました:', error);
    killAllProcesses();
    process.exit(1);
  }
};

// メイン処理の実行
console.log('🎀 統合開発環境を起動しています...');
startProcesses().then(() => {
  console.log('👋 統合開発環境が終了しました');
  process.exit(0);
});

console.log('🎀 統合開発環境を起動しました！Ctrl+Cで全プロセスを終了できます'); 