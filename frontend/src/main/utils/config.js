const fs = require('fs');
const path = require('path');

/**
 * 設定を読み込む関数
 * @param {Object} app - Electronのappオブジェクト
 * @returns {Object} 読み込まれた設定オブジェクト
 */
function loadConfig(app) {
  let config = {};
  try {
    const configPath = path.join(app.getAppPath(), 'config', 'config.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('設定ファイルを読み込みました:', configPath);
  } catch (error) {
    console.error('設定ファイルの読み込みに失敗しました:', error);
    config = {
      app: { name: 'ふにゃ秘書たん', version: '1.0.0' },
      window: { width: 400, height: 600, transparent: true, frame: false, alwaysOnTop: true },
      voicevox: { host: 'http://127.0.0.1:50021', speaker_id: 8 }
    };
  }
  return config;
}

/**
 * 設定を保存する関数
 * @param {Object} app - Electronのappオブジェクト
 * @param {Object} config - 保存する設定オブジェクト
 * @returns {boolean} 保存成功時はtrue
 */
function saveConfig(app, config) {
  const configPath = path.join(app.getAppPath(), 'config', 'config.json');
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    console.log('設定ファイルを保存しました:', configPath);
    return true;
  } catch (error) {
    console.error('設定ファイルの保存に失敗しました:', error);
    return false;
  }
}

module.exports = {
  loadConfig,
  saveConfig
}; 