/**
 * 秘書たんアプリ - ポート関連ユーティリティ
 * 
 * ポートの使用状況確認と競合プロセスの終了処理を提供します 🔍
 */

const net = require('net');
const { exec } = require('child_process');
const treeKill = require('tree-kill');

/**
 * 指定されたポートが使用中かどうかを確認します
 * @param {number} port 確認するポート番号
 * @returns {Promise<boolean>} ポートが使用中の場合はtrue、それ以外はfalse
 */
const isPortInUse = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => {
        // エラーが発生した場合は使用中と判断
        resolve(true);
      })
      .once('listening', () => {
        // リッスンできた場合は使用可能
        server.close();
        resolve(false);
      })
      .listen(port);
  });
};

/**
 * 指定したポートを使用しているプロセスを終了します（クロスプラットフォーム対応）
 * @param {number} port 解放するポート番号
 * @returns {Promise<boolean>} 成功した場合はtrue、失敗した場合はfalse
 */
const killProcessOnPort = async (port) => {
  console.log(`🔄 ポート${port}を使用しているプロセスを検索しています...`);
  
  if (process.platform === 'win32') {
    // Windows環境での処理
    return new Promise((resolve) => {
      // netstatを使ってポートを使用しているプロセスのPIDを取得
      exec(`netstat -ano | findstr :${port} | findstr LISTENING`, (error, stdout) => {
        if (error || !stdout) {
          console.log(`⚠️ ポート${port}を使用しているプロセスが見つかりませんでした`);
          resolve(false);
          return;
        }

        // 出力からPIDを抽出
        const lines = stdout.split('\n');
        const pids = new Set();
        
        for (const line of lines) {
          const match = line.match(/\s+(\d+)$/);
          if (match && match[1]) {
            pids.add(match[1]);
          }
        }

        if (pids.size === 0) {
          console.log(`⚠️ ポート${port}を使用しているプロセスのPIDが見つかりませんでした`);
          resolve(false);
          return;
        }

        // 見つかったPIDのプロセスを終了
        let killedCount = 0;
        pids.forEach(pid => {
          console.log(`🛑 ポート${port}を使用しているプロセス(PID: ${pid})を終了します`);
          try {
            // 通常のkillだけでなく、taskkillも試してより強力に終了させる
            treeKill(pid, 'SIGKILL', (err) => {
              if (err) {
                console.log(`⚠️ treeKillでの終了に失敗、taskkillで強制終了します (PID: ${pid})`);
                try {
                  // Windows環境では強制終了するためにtaskkillを使用
                  exec(`taskkill /F /PID ${pid}`, (taskErr, stdout, stderr) => {
                    if (taskErr) {
                      console.error(`💦 プロセス強制終了に失敗 (PID: ${pid}):`, taskErr);
                    } else {
                      console.log(`✅ プロセスを強制終了しました (PID: ${pid})`);
                    }
                  });
                } catch (taskkillErr) {
                  console.error(`💦 taskkill実行中にエラー発生:`, taskkillErr);
                }
              }
            });
            killedCount++;
          } catch (err) {
            console.error(`💦 プロセス終了中にエラーが発生しました(PID: ${pid}):`, err);
          }
        });

        console.log(`✅ ${killedCount}個のプロセスの終了を試みました`);
        
        // 少し長めに待機してからポートが本当に解放されたか確認（2.5秒）
        setTimeout(async () => {
          const stillInUse = await isPortInUse(port);
          if (stillInUse) {
            console.warn(`⚠️ ポート${port}はまだ使用中です。手動でプロセスを終了する必要があるかもしれません。`);
          } else {
            console.log(`✅ ポート${port}が解放されました`);
          }
          resolve(!stillInUse);
        }, 2500);
      });
    });
  } else {
    // Unix系環境（Linux/macOS）での処理
    return new Promise((resolve) => {
      exec(`lsof -i:${port} -t`, (error, stdout) => {
        if (error || !stdout) {
          console.log(`⚠️ ポート${port}を使用しているプロセスが見つかりませんでした`);
          resolve(false);
          return;
        }

        const pids = stdout.trim().split('\n');
        let killedCount = 0;
        
        pids.forEach(pid => {
          console.log(`🛑 ポート${port}を使用しているプロセス(PID: ${pid})を終了します`);
          try {
            // SIGKILLでプロセスを強制終了
            treeKill(pid, 'SIGKILL', (err) => {
              if (err) {
                console.error(`💦 プロセス終了に失敗 (PID: ${pid}):`, err);
                // 代替としてkill -9を試す
                exec(`kill -9 ${pid}`, (killErr) => {
                  if (killErr) {
                    console.error(`💦 kill -9 実行に失敗 (PID: ${pid}):`, killErr);
                  } else {
                    console.log(`✅ プロセスを強制終了しました (PID: ${pid})`);
                  }
                });
              } else {
                console.log(`✅ プロセスを終了しました (PID: ${pid})`);
              }
            });
            killedCount++;
          } catch (err) {
            console.error(`💦 プロセス終了中にエラーが発生しました(PID: ${pid}):`, err);
          }
        });

        console.log(`✅ ${killedCount}個のプロセスの終了を試みました`);
        
        // ポートが解放されたか確認
        setTimeout(async () => {
          const stillInUse = await isPortInUse(port);
          if (stillInUse) {
            console.warn(`⚠️ ポート${port}はまだ使用中です。手動での終了が必要かもしれません。`);
          } else {
            console.log(`✅ ポート${port}が解放されました`);
          }
          resolve(!stillInUse);
        }, 2000);
      });
    });
  }
};

/**
 * 指定されたポート群をすべてクリーンアップします
 * @param {Object} ports ポート設定オブジェクト
 * @returns {Promise<boolean>} すべてのポートが解放されたらtrue
 */
const cleanupPorts = async (ports) => {
  console.log('🧹 開発環境の起動前にポートをクリーンアップしています...');
  
  const results = [];
  const portEntries = Object.entries(ports);
  
  // 各ポートを順番にチェック・クリーンアップ
  for (const [name, port] of portEntries) {
    if (await isPortInUse(port)) {
      console.log(`⚠️ ${name}ポート(${port})が既に使用されています`);
      const result = await killProcessOnPort(port);
      results.push(result);
    } else {
      console.log(`✅ ${name}ポート(${port})は使用可能です`);
      results.push(true);
    }
  }
  
  // 最終確認
  const allCleaned = results.every(r => r === true);
  
  if (!allCleaned) {
    console.warn('⚠️ 一部のポートがまだ使用中です。開発環境の起動に影響する可能性があります');
  } else {
    console.log('✅ すべてのポートがクリーンアップされました');
  }
  
  return allCleaned;
};

module.exports = {
  isPortInUse,
  killProcessOnPort,
  cleanupPorts
}; 