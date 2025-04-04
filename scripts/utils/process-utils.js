/**
 * 秘書たんアプリ - プロセス管理ユーティリティ
 * 
 * プロセスの起動と終了を管理するユーティリティ関数を提供します 🌸
 */

const { spawn } = require('child_process');
const treeKill = require('tree-kill');
const http = require('http');
const waitOn = require('wait-on');
const path = require('path');

// 文字化け対策としてエンコーディング設定を行う関数
const setupConsoleEncoding = () => {
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
};

/**
 * 指定のURLにHTTPリクエストを行い、応答を確認します
 * @param {string} url 確認するURL
 * @param {number} timeout タイムアウト時間（ミリ秒）
 * @returns {Promise<boolean>} 成功した場合はtrue、タイムアウトした場合はfalse
 */
const checkHttpEndpoint = (url, timeout = 3000) => {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            // JSONレスポンスの場合はパースを試みる
            if (res.headers['content-type']?.includes('application/json')) {
              const jsonResponse = JSON.parse(data);
              console.log(`🔍 エンドポイント応答: ${url}`, jsonResponse);
            }
            resolve(true);
          } catch (e) {
            console.log(`✅ エンドポイント応答確認（JSONではない）: ${url}`);
            resolve(true);
          }
        });
      } else {
        console.log(`⏳ エンドポイント応答待機中 (${res.statusCode}): ${url}`);
        resolve(false);
      }
    });
    
    req.on('error', (err) => {
      console.log(`⏳ エンドポイント接続エラー: ${err.message}`);
      resolve(false);
    });
    
    req.setTimeout(timeout, () => {
      req.abort();
      console.log(`⏳ エンドポイント接続タイムアウト: ${url}`);
      resolve(false);
    });
  });
};

/**
 * URLが応答するまで一定回数リトライします
 * @param {string} url 確認するURL
 * @param {number} maxRetries 最大リトライ回数
 * @param {number} retryInterval リトライ間隔（ミリ秒）
 * @returns {Promise<boolean>} 成功した場合はtrue、リトライ上限に達した場合はfalse
 */
const waitForEndpoint = async (url, maxRetries = 30, retryInterval = 1000) => {
  console.log(`⏳ エンドポイントの起動を待機しています: ${url}`);
  
  // まず、サーバーが応答するのを待つ
  try {
    await waitOn({
      resources: [url],
      timeout: 60000,  // タイムアウトを60秒に延長
      interval: 1000,  // ポーリング間隔を1秒に
      window: 1000,    // 連続して成功するまでの時間
    });
    console.log(`✅ エンドポイントの応答を確認しました: ${url}`);
  } catch (err) {
    console.error(`⚠️ エンドポイント待機中にエラーが発生しました: ${err.message}`);
    return false;
  }
  
  // 実際にエンドポイントにアクセスして正常応答を確認
  let retries = 0;
  let success = false;
  
  while (!success && retries < maxRetries) {
    success = await checkHttpEndpoint(url, 3000);
    
    if (!success && retries < maxRetries - 1) {
      retries++;
      console.log(`⏳ エンドポイント確認リトライ中... ${retries}/${maxRetries}`);
      // 指定間隔だけ待機
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    } else {
      break;
    }
  }
  
  if (success) {
    console.log(`✅ エンドポイントの準備ができました: ${url}`);
    return true;
  } else {
    console.warn(`⚠️ エンドポイント確認のリトライが上限に達しました: ${url}`);
    return false;
  }
};

/**
 * 起動している全プロセスを終了します
 * @param {Object} processes プロセスオブジェクト
 */
const killAllProcesses = (processes) => {
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
};

// プロセス終了イベントハンドラーを設定する関数
const setupProcessHandlers = (processes) => {
  // SIGINTハンドラー（Ctrl+C）
  process.on('SIGINT', () => {
    console.log('\n🎀 Ctrl+Cが押されました');
    killAllProcesses(processes);
    // SIGINTの場合は少し待ってから終了（プロセス終了の猶予時間）
    setTimeout(() => {
      process.exit(0);
    }, 3000);
  });

  // 通常終了時
  process.on('exit', () => {
    killAllProcesses(processes);
  });

  // 予期しないエラー
  process.on('uncaughtException', (err) => {
    console.error('💔 予期しないエラーが発生しました:', err);
    killAllProcesses(processes);
    process.exit(1);
  });
};

module.exports = {
  setupConsoleEncoding,
  checkHttpEndpoint,
  waitForEndpoint,
  killAllProcesses,
  setupProcessHandlers
}; 