const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

// バックエンドプロセスを保持する変数
let backendProcess = null;

/**
 * バックエンドプロセスの起動
 * @param {Object} app - Electronのappオブジェクト
 * @param {Object} config - アプリケーション設定
 * @param {Function} checkVoicevoxStatus - VOICEVOXの状態確認関数
 * @returns {Promise<boolean>} - 起動成功時はtrue
 */
async function startBackendProcess(app, config, checkVoicevoxStatus) {
  // バックエンドの起動が設定で無効化されている場合
  if (config.backend?.disabled) {
    console.log('バックエンドの自動起動が無効化されています');
    return false;
  }
  
  try {
    console.log('バックエンドサーバーの起動を開始...');
    
    // スクリプトのパスを設定
    const scriptPath = path.resolve(path.dirname(app.getAppPath()), 'start.ps1');
    
    // バックエンドプロセスの起動
    backendProcess = spawn('powershell.exe', [
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
      '-BackendOnly'
    ], {
      stdio: 'pipe',
      shell: true,
      windowsHide: true
    });
    
    // 標準出力のエンコード設定
    backendProcess.stdout.setEncoding('utf8');
    
    // 出力のリスニング
    backendProcess.stdout.on('data', (data) => {
      const decodedData = iconv.decode(Buffer.from(data), 'utf8');
      console.log(`バックエンド出力: ${decodedData}`);
    });
    
    // エラー出力のリスニング
    backendProcess.stderr.on('data', (data) => {
      const decodedData = iconv.decode(Buffer.from(data), 'utf8');
      console.error(`バックエンドエラー: ${decodedData}`);
    });
    
    // プロセス終了のリスニング
    backendProcess.on('close', (code) => {
      console.log(`バックエンドプロセスが終了コード ${code} で終了しました`);
      backendProcess = null;
    });
    
    // プロセスエラーのリスニング
    backendProcess.on('error', (err) => {
      console.error(`バックエンドプロセス起動エラー: ${err.message}`);
      backendProcess = null;
    });
    
    console.log('バックエンドプロセスを起動しました');
    
    // バックエンドサーバーが起動するまで少し待機
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // VOICEVOXの初期化をチェック
    if (checkVoicevoxStatus) {
      await checkVoicevoxStatus(config);
    }
    
    return true;
  } catch (error) {
    console.error('バックエンドプロセスの起動に失敗しました:', error);
    throw error;
  }
}

/**
 * バックエンドの終了処理
 * @param {Object} app - Electronのappオブジェクト
 * @returns {Promise<boolean>} - 終了処理成功時はtrue
 */
async function shutdownBackend(app) {
  try {
    console.log('バックエンドプロセスを終了しています...');
    
    // stop_hisyotan.ps1を実行して全プロセスを確実に終了させる
    try {
      console.log('🛑 stop_hisyotan.ps1スクリプトを実行して秘書たん関連プロセスを終了します');
      const scriptPath = path.resolve(path.dirname(app.getAppPath()), 'tools', 'stop_hisyotan.ps1');
      
      // PowerShellスクリプトを実行（UTF-8エンコーディングを明示的に指定）
      const stopProcess = spawn('powershell.exe', [
        '-ExecutionPolicy', 'Bypass',
        '-File', scriptPath
      ], {
        cwd: path.dirname(scriptPath),
        stdio: 'pipe'
      });
      
      stopProcess.stdout.on('data', (data) => {
        const output = data.toString('utf8');
        console.log(`✅ 停止スクリプト出力:\n${output}`);
      });
      
      stopProcess.stderr.on('data', (data) => {
        const output = data.toString('utf8');
        console.error(`⚠️ 停止スクリプトエラー:\n${output}`);
      });
      
      // プロセス終了を待つ
      await new Promise(resolve => {
        stopProcess.on('close', (code) => {
          console.log(`停止スクリプトが終了コード ${code} で完了しました`);
          resolve();
        });
      });
    } catch (stopScriptError) {
      console.error('stop_hisyotan.ps1実行エラー:', stopScriptError);
    }
    
    // 直接起動したバックエンドプロセスの終了
    if (backendProcess && !backendProcess.killed) {
      try {
        // Windowsの場合はtaskkillを使用
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
        } else {
          // Unix系OSの場合
          backendProcess.kill('SIGTERM');
        }
      } catch (error) {
        console.error('バックエンドプロセス終了エラー:', error);
      }
    }
    
    // 開発モードで起動したプロセスも考慮して、関連プロセスをすべて終了
    if (process.platform === 'win32') {
      // 秘書たん関連のPythonプロセス（uvicorn, FastAPI）を特定して終了
      spawn('powershell', [
        '-Command',
        'Get-Process -Name python | Where-Object {$_.CommandLine -like "*uvicorn*" -or $_.CommandLine -like "*backend.main*"} | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }'
      ]);
      
      // Viteサーバー（開発モード時）
      spawn('powershell', [
        '-Command',
        'Get-Process -Name node | Where-Object {$_.CommandLine -like "*vite*"} | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }'
      ]);
    } else {
      // Unix系OS向けの処理（pkill等を使用）
      spawn('pkill', ['-f', 'uvicorn']);
      spawn('pkill', ['-f', 'vite']);
    }
    
    // 終了を待機
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('バックエンドプロセスの終了処理が完了しました');
    return true;
  } catch (error) {
    console.error('バックエンド終了処理中にエラーが発生しました:', error);
    return false;
  } finally {
    backendProcess = null;
  }
}

module.exports = {
  startBackendProcess,
  shutdownBackend
}; 