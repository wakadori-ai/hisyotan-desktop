const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * VOICEVOXで音声合成を行う関数
 * @param {Object} app - Electronのappオブジェクト
 * @param {Object} config - アプリケーション設定
 * @param {string} text - 合成するテキスト
 * @param {string} emotionState - 感情状態（normal, happy, sad等）
 * @returns {Promise<void>} - 音声再生完了時に解決するPromise
 */
async function speakWithVoicevox(app, config, text, emotionState = 'normal') {
  try {
    // 秘書たんの声設定を取得
    const speakerId = config.voicevox.speaker_id;
    const voiceParams = config.voice.secretary_voice_params[emotionState] || config.voice.secretary_voice_params.normal;
    
    // 音声合成クエリ作成
    const query = await axios.post(
      `${config.voicevox.host}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
      {}
    );
    
    // パラメータ調整
    query.data.speedScale = voiceParams.speed_scale;
    query.data.pitchScale = voiceParams.pitch_scale;
    query.data.intonationScale = voiceParams.intonation_scale;
    query.data.volumeScale = voiceParams.volume_scale;
    
    // 音声合成
    const response = await axios.post(
      `${config.voicevox.host}/synthesis?speaker=${speakerId}`,
      query.data,
      { responseType: 'arraybuffer' }
    );
    
    // 一時ファイルに保存
    const tmpFile = path.join(app.getPath('temp'), 'secretary_voice.wav');
    fs.writeFileSync(tmpFile, Buffer.from(response.data));
    
    // 音声再生（プラットフォームに応じて適切なコマンドを使用）
    let player;
    if (process.platform === 'win32') {
      player = spawn('powershell', ['-c', `(New-Object System.Media.SoundPlayer "${tmpFile}").PlaySync()`]);
    } else if (process.platform === 'darwin') {
      player = spawn('afplay', [tmpFile]);
    } else {
      player = spawn('aplay', [tmpFile]);
    }
    
    return new Promise((resolve, reject) => {
      player.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`音声再生プロセスが終了コード ${code} で終了しました`));
        }
      });
      
      player.on('error', (err) => {
        reject(new Error(`音声再生中にエラーが発生しました: ${err.message}`));
      });
    });
  } catch (error) {
    console.error('音声合成処理エラー:', error);
    throw error;
  }
}

/**
 * VOICEVOXの状態確認
 * @param {Object} config - アプリケーション設定
 * @returns {Promise<boolean>} - VOICEVOXが利用可能な場合はtrue
 */
async function checkVoicevoxStatus(config) {
  try {
    // VOICEVOXのバージョン情報を取得
    const voicevoxResponse = await axios.get(`${config.voicevox.host}/version`);
    console.log(`VOICEVOX APIが利用可能です (バージョン: ${voicevoxResponse.data})`);
    return true;
  } catch (error) {
    console.error('VOICEVOX APIに接続できません:', error.message);
    return false;
  }
}

module.exports = {
  speakWithVoicevox,
  checkVoicevoxStatus
}; 