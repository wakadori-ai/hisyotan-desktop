// logger.js
// デバッグログ出力用のモジュール

// electron-logのインポートを試みる
let log;
try {
  // Electronで動作している場合（windowにelectronAPIがある場合）
  if (typeof window !== 'undefined' && window.electronAPI) {
    // preload.jsで設定されたElectron用ロガーを使用
    log = console; // 単純化するためにconsoleを使用
    
    // ログフォーマットを設定
    if (log.transports && log.transports.file) {
      log.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}.{ms} [{level}] {text}';
      log.transports.file.encoding = 'utf8';
    }
  } else {
    // ブラウザ環境ではconsoleにフォールバック
    log = console;
  }
} catch (error) {
  // エラーが発生した場合はconsoleをフォールバックとして使用
  console.warn('electron-logが見つからないためconsoleを使用します:', error);
  log = console;
}

// zombie_warning用に特別なマーカーを追加する関数
export function logZombieWarning(message) {
  console.warn(`%c★★★ ZOMBIE_WARNING ★★★ ${message}`, 'color: red; font-weight: bold;');
  
  // Electronのログ機能があれば使用
  if (window.api && window.api.log) {
    try {
      window.api.log('warning', `★★★ ZOMBIE_WARNING ★★★ ${message}`);
    } catch (e) {
      console.warn('IPC通信エラー:', e.message);
    }
  }
}

// loggerモジュールでエラーオブジェクトを安全に変換する関数を追加
function sanitizeErrorForIPC(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      isError: true
    };
  }
  return error;
}

/**
 * ログ書き込み（レベル：info）
 * @param {string} message - ログメッセージ
 */
export function logInfo(message) {
  console.info(`[INFO] ${message}`);
  
  // Electronのログ機能があれば使用
  if (window.api && window.api.log) {
    try {
      window.api.log('info', message);
    } catch (e) {
      console.warn('IPC通信エラー:', e.message);
    }
  }
}

/**
 * ログ書き込み（レベル：error）
 * @param {string} message - ログメッセージ
 * @param {Error} [error] - エラーオブジェクト（オプション）
 */
export function logError(message, error = null) {
  console.error(`❌ ${message}`);
  
  // IPC通信のためにエラーオブジェクトを変換
  const safeError = error ? sanitizeErrorForIPC(error) : null;
  
  if (window.api && window.api.log) {
    try {
      window.api.log('error', message, safeError);
    } catch (e) {
      console.error('IPC通信エラー:', e.message);
    }
  }
}

/**
 * デバッグログをコンソールとファイルに出力する
 * @param {string} message - ログメッセージ
 */
export function logDebug(message) {
  console.log(`[DEBUG] ${message}`);
  
  // Electronのログ機能があれば使用
  if (window.api && window.api.log) {
    try {
      window.api.log('debug', message);
    } catch (e) {
      console.warn('IPC通信エラー:', e.message);
    }
  }
}

/**
 * 警告ログをコンソールとファイルに出力する
 * @param {string} message - ログメッセージ
 */
export function logWarn(message) {
  console.warn(`[WARN] ${message}`);
  
  // Electronのログ機能があれば使用
  if (window.api && window.api.log) {
    try {
      window.api.log('warn', message);
    } catch (e) {
      console.warn('IPC通信エラー:', e.message);
    }
  }
}

/**
 * エラーログをファイルに保存する
 * @param {Error} error - エラーオブジェクト
 */
export function saveErrorLog(error) {
  try {
    if (window.api && window.api.saveErrorLog) {
      const errorLog = {
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack,
        name: error.name
      };
      
      window.api.saveErrorLog(errorLog)
        .then(success => {
          if (!success) {
            console.error('エラーログの保存に失敗しました');
          }
        })
        .catch(saveError => {
          console.error('エラーログ保存中に例外が発生しました:', saveError);
        });
    } else {
      console.warn('api.saveErrorLogが利用できないため、エラーログをファイルに保存できません');
      console.error('エラー詳細:', error);
    }
  } catch (e) {
    console.error('エラーログ処理中にエラーが発生しました:', e);
  }
}

/**
 * ログファイルのパスを取得する
 * @returns {string} ログファイルのパス
 */
export function getLogPath() {
  try {
    if (window.api && window.api.getLogPath) {
      return window.api.getLogPath();
    }
    return 'ログシステムが初期化されていません';
  } catch (e) {
    console.error('ログパス取得エラー:', e);
    return 'エラー: ' + e.message;
  }
}

/**
 * ログレベルを設定する
 * @param {string} level - ログレベル ('error', 'warn', 'info', 'debug', etc.)
 */
export function setLogLevel(level) {
  if (window.api && window.api.setLogLevel) {
    try {
      window.api.setLogLevel(level);
      console.log(`ログレベルを${level}に設定しました`);
    } catch (e) {
      console.warn('ログレベル設定エラー:', e.message);
    }
  } else if (log.transports && log.transports.file) {
    log.transports.file.level = level;
    console.log(`ログレベルを${level}に設定しました`);
  }
}

// electron-logまたはconsoleオブジェクトをエクスポート
export { log }; 