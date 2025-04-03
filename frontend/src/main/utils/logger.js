/**
 * ロガー設定モジュール
 * electron-logを使用してログ出力の設定を行います
 */

/**
 * ロガーを初期化する関数
 * @returns {Object} 設定済みのロガーオブジェクト
 */
function initLogger() {
  let log;
  try {
    log = require('electron-log');
    
    // electron-logの設定
    log.transports.file.level = 'debug';
    log.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s}.{ms} [{level}] {text}';
    log.transports.file.encoding = 'utf8';
    console.log('メインプロセスのログファイルパス:', log.transports.file.getFile().path);
    
    // 既存のconsole.logをelectron-logに置き換え
    Object.assign(console, log.functions);
  } catch (error) {
    console.error('electron-logの読み込みに失敗しました:', error);
    // ダミーのlogオブジェクトを作成
    log = {
      transports: {
        file: { level: 'debug', getFile: () => ({ path: 'logs/main.log' }) }
      },
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
      log: console.log,
      functions: {
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug,
        log: console.log
      }
    };
  }
  
  return log;
}

module.exports = {
  initLogger
}; 