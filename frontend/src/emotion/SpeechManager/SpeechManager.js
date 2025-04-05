/**
 * SpeechManager.js
 * 秘書たんの発話・音声合成を管理するクラス
 */

import { logDebug, logError } from '@core/logger.js';
import { 
  showBubble, 
  hideBubble, 
  setText, 
  initUIElements, 
  renderSettingUI 
} from '@ui/uiHelper.js';
import { setExpression, stopTalking } from '../expressionManager.js';
import { 
  formatMessage, 
  forceShowBubble, 
  displayTextInBubble 
} from './bubbleDisplay.js';
import { 
  speak as speakCore, 
  speakWithPreset as speakWithPresetCore,
  isPlaying,
  stopPlaying
} from './speakCore.js';
import { 
  requestVoiceSynthesis, 
  checkVoicevoxConnection as checkVoicevoxConnectionAPI 
} from './voicevoxClient.js';
import {
  showHordeModeToggle as showHordeModeToggleUI,
  getHordeModeState,
  setHordeModeState
} from './hordeModeToggle.js';

/**
 * エラーメッセージを表示する (showErrorの代替関数)
 * @param {string} message - エラーメッセージ
 */
function displayError(message) {
  logError(`エラー: ${message}`);
  showBubble('error', message);
}

/**
 * エラーを表示すべきかどうかを判断する (shouldShowErrorの代替関数)
 * @returns {boolean} エラーを表示すべきかどうか
 */
function shouldDisplayError() {
  // 常にエラーを表示する
  return true;
}

/**
 * 秘書たんの発話・音声合成を管理するクラス
 */
export class SpeechManager {
  /**
   * コンストラクタ
   * @param {Object} config - 設定オブジェクト
   */
  constructor(config = null) {
    // 設定データ
    this.config = config;

    // 非表示タイマーをMapで管理（イベントタイプごとに異なるタイマーを持つ）
    this.hideTimeoutMap = new Map(); 
    this.messageDisplayTime = 5000; // デフォルトのメッセージ表示時間（ミリ秒）

    // 表示制御用フラグと現在のイベント状態管理
    this.currentSpeechEvent = null;
    this.hasAlreadyForced = false;
    this.lastForceTime = 0;

    // VOICEVOX接続状態管理変数
    this.voicevoxRetryCount = 0;
    this.MAX_VOICEVOX_RETRIES = 5;
    this.VOICEVOX_RETRY_INTERVAL = 3000; // 再確認間隔（ミリ秒）
    this.voicevoxConnectionErrorShown = false;

    // 現在表示中のセリフデータ
    this.currentSpeech = null;

    // 🌟 初期化処理
    this.init();

    logDebug('SpeechManagerクラスをインスタンス化しました');
  }

  /**
   * モジュール初期化処理
   */
  init() {
    // UI要素の初期化
    initUIElements();
    logDebug('SpeechManager: UI要素を初期化しました');
  }

  /**
   * 設定をセットする
   * @param {Object} configData - 設定データ
   */
  setConfig(configData) {
    this.config = configData;
    logDebug('音声合成設定をセットしました');
  }

  /**
   * 拡張された秘書たんセリフオブジェクト型を使用して発話させる
   * @param {Object} speechObj - セリフオブジェクト
   * @param {string} speechObj.id - セリフID
   * @param {string} speechObj.type - セリフの種類（'normal'|'system'|'setting'）
   * @param {string} speechObj.text - セリフテキスト
   * @param {string} [speechObj.emotion] - 感情タイプ
   * @param {number} [speechObj.duration] - 表示時間（ミリ秒）
   * @param {Object} [speechObj.uiPayload] - UI表示用のペイロード（typeが'setting'の場合）
   * @param {boolean} [speechObj.autoClose] - 自動で閉じるかどうか（デフォルトはtrue）
   */
  speakWithObject(speechObj) {
    try {
      if (!speechObj || !speechObj.text) {
        logError('セリフオブジェクトまたはテキストが指定されていません');
        return;
      }
      
      // デフォルト値の設定
      const type = speechObj.type || 'normal';
      const emotion = speechObj.emotion || 'normal';
      const duration = speechObj.duration || this.messageDisplayTime;
      const eventType = speechObj.id || 'default';
      const autoClose = speechObj.autoClose !== false; // 明示的にfalseでない限りtrue
      
      // 現在のセリフを保存
      this.currentSpeech = speechObj;
      
      logDebug(`拡張セリフ表示: タイプ=${type}, ID=${eventType}, テキスト="${speechObj.text}", 自動閉じる=${autoClose}`);
      
      // 設定UIタイプの場合は専用の処理
      if (type === 'setting' && speechObj.uiPayload) {
        showBubble(eventType);
        const formattedMessage = formatMessage(speechObj.text);
        
        // 通常のテキスト設定（uiPayloadとともに）
        setText(formattedMessage);
        
        // setText後のDOM状態をチェック
        console.log('🔍 setText()後の吹き出し状態:', {
          speechBubble: document.getElementById('speechBubble'),
          speechText: document.getElementById('speechText'),
          speechSettingUI: document.getElementById('speechSettingUI'),
          bubbleHTML: document.getElementById('speechBubble')?.innerHTML || '存在しません'
        });
        
        // 設定UI要素をレンダリング
        renderSettingUI(speechObj.uiPayload);
        
        // renderSettingUI後の最終状態確認
        console.log('🏁 renderSettingUI()後の最終状態:', {
          speechBubble: document.getElementById('speechBubble'),
          speechText: document.getElementById('speechText'),
          speechSettingUI: document.getElementById('speechSettingUI'),
          bubbleHTML: document.getElementById('speechBubble')?.innerHTML || '存在しません'
        });
        
        // 設定UIの場合やautoCloseがfalseの場合は自動非表示しない
        return;
      }
      
      // 通常の発話処理
      this.speak(
        speechObj.text, 
        emotion, 
        duration, 
        null, // アニメーションはemotionから自動設定
        eventType,
        null,  // プリセット音声
        autoClose // 自動クローズフラグを追加
      );
      
    } catch (err) {
      logError(`拡張セリフ表示処理でエラー: ${err.message}`);
    }
  }

  /**
   * 秘書たんにセリフを話させる
   * @param {string} message - セリフ
   * @param {string} emotion - 感情（normal, happy, surprised, serious, sleepy, relieved, smile）
   * @param {number} displayTime - 表示時間（ミリ秒）
   * @param {string} animation - アニメーション（bounce_light, trembling, nervous-shake, null）
   * @param {string} eventType - イベントタイプ（イベント識別用、デフォルトは'default'）
   * @param {string} presetSound - 先行再生するプリセット音声の名前（オプション）
   * @param {boolean} autoClose - 自動で閉じるかどうか（デフォルトはtrue）
   */
  async speak(message, emotion = 'normal', displayTime = null, animation = null, eventType = 'default', presetSound = null, autoClose = true) {
    try {
      // 基本的なセリフオブジェクトを作成（後方互換性のため）
      this.currentSpeech = {
        id: eventType,
        type: 'normal',
        text: message,
        emotion: emotion,
        duration: displayTime || this.messageDisplayTime,
        autoClose: autoClose
      };
      
      // コアの発話処理にオプションを渡して呼び出し
      const options = {
        hideTimeoutMap: this.hideTimeoutMap,
        messageDisplayTime: this.messageDisplayTime,
        config: this.config,
        onSpeechStart: (data) => {
          this.currentSpeechEvent = data.eventType;
          this.hasAlreadyForced = false;
          this.lastForceTime = Date.now();
        },
        onSpeechEnd: () => {
          // 発話終了時の処理
        }
      };
      
      return await speakCore(
        message, 
        emotion, 
        displayTime, 
        animation, 
        eventType, 
        presetSound, 
        autoClose, 
        options
      );
    } catch (error) {
      logError(`発話エラー: ${error.message}`);
      showBubble('error', `発話処理に失敗しました: ${error.message}`);
      return false;
    }
  }

  /**
   * VOICEVOXの接続確認
   * @returns {Promise<boolean>} 接続成功したかどうか
   */
  async checkVoicevoxConnection() {
    try {
      const connected = await checkVoicevoxConnectionAPI();
      
      if (connected) {
        // 接続成功時はリトライカウントをリセット
        this.voicevoxRetryCount = 0;
        this.voicevoxConnectionErrorShown = false;
        return true;
      } else {
        // 接続失敗だがリトライ可能
        throw new Error('VOICEVOX接続失敗: エンジンが起動していません');
      }
    } catch (error) {
      logDebug(`VOICEVOX接続エラー: ${error.message}`);
      
      // リトライ処理
      this.voicevoxRetryCount++;
      if (this.voicevoxRetryCount <= this.MAX_VOICEVOX_RETRIES) {
        logDebug(`VOICEVOX接続リトライ予定 (${this.voicevoxRetryCount}/${this.MAX_VOICEVOX_RETRIES}): ${this.VOICEVOX_RETRY_INTERVAL}ms後`);
        
        // 数秒後に再試行
        setTimeout(() => {
          this.checkVoicevoxConnection().catch(err => logDebug(`再試行時のエラー: ${err.message}`));
        }, this.VOICEVOX_RETRY_INTERVAL);
      } else if (shouldDisplayError() && !this.voicevoxConnectionErrorShown) {
        // 最大再試行回数を超えた場合のみエラー表示（猶予期間後）
        showBubble('error', 'VOICEVOXに接続できません。VOICEVOXが起動しているか確認してください。');
        this.voicevoxConnectionErrorShown = true;
      }
      
      return false;
    }
  }

  /**
   * メッセージの表示と音声合成を行う
   * @param {string} message - メッセージ
   * @param {string} emotion - 感情
   * @param {number} duration - 表示時間
   */
  sayMessage(message, emotion = 'normal', duration = 5000) {
    // テキストを吹き出しに表示
    displayTextInBubble(message);
    
    // 音声合成リクエスト処理（オプションなし）
    this.speak(message, emotion, duration, null, 'say_message');
  }

  /**
   * プリセット音声とセリフを組み合わせて発話させる
   * @param {string} presetSound - プリセット音声名
   * @param {string} message - セリフ
   * @param {string} emotion - 感情
   * @param {number} displayTime - 表示時間（ミリ秒）
   * @param {string} eventType - イベントタイプ
   */
  async speakWithPreset(presetSound, message, emotion = 'normal', displayTime = null, eventType = 'notification') {
    try {
      const options = {
        hideTimeoutMap: this.hideTimeoutMap,
        messageDisplayTime: this.messageDisplayTime,
        config: this.config
      };
      
      return await speakWithPresetCore(
        presetSound, 
        message, 
        emotion, 
        displayTime, 
        eventType, 
        options
      );
    } catch (err) {
      logError(`プリセット音声付き発話処理でエラー: ${err.message}`);
      return false;
    }
  }

  /**
   * ホード夜モードの切り替え設定UIを表示する
   * @param {boolean} currentState - 現在のホード夜モードの状態
   * @param {Function} onChangeCallback - 状態変更時のコールバック関数（オプション）
   * @returns {Promise<boolean>} 非同期処理の結果
   */
  async showHordeModeToggle(currentState = false, onChangeCallback) {
    return await showHordeModeToggleUI(
      currentState, 
      onChangeCallback, 
      this.speakWithObject.bind(this), 
      this.speak.bind(this)
    );
  }

  /**
   * 現在のホード夜モードの状態を取得する
   * @returns {boolean} ホード夜モードが有効ならtrue
   */
  getHordeModeState() {
    return getHordeModeState();
  }

  /**
   * ホード夜モードの状態を直接設定する
   * @param {boolean} enabled - 設定する状態
   */
  setHordeModeState(enabled) {
    return setHordeModeState(enabled);
  }
  
  /**
   * 音声再生中かどうかを確認する
   * @returns {boolean} 音声再生中ならtrue
   */
  isPlaying() {
    return isPlaying();
  }
  
  /**
   * フォーマット済みメッセージを取得する
   * @param {string} message - 元のメッセージ
   * @returns {string} フォーマット済みメッセージ
   */
  getFormattedMessage(message) {
    return formatMessage(message);
  }

  /**
   * 現在の音声再生をすべて停止する
   * @returns {boolean} 停止に成功したらtrue
   */
  stopAllSpeech() {
    try {
      logDebug('SpeechManager: すべての音声再生を停止します');
      
      // 1. すべての非表示タイマーをクリア
      if (this.hideTimeoutMap && this.hideTimeoutMap.size > 0) {
        logDebug(`${this.hideTimeoutMap.size}個の非表示タイマーを一括クリアします`);
        for (const [key, timerId] of this.hideTimeoutMap.entries()) {
          clearTimeout(timerId);
          logDebug(`タイマー ${key} をクリアしました`);
        }
        this.hideTimeoutMap.clear();
      }
      
      // 2. 音声再生を停止
      stopPlaying();
      
      // 3. 口パクや表情を通常に戻す
      stopTalking();
      setExpression('normal');
      
      // 4. 現在のセリフ状態をリセット
      this.currentSpeechEvent = null;
      this.hasAlreadyForced = false;
      
      return true;
    } catch (error) {
      logError(`音声停止エラー: ${error.message}`);
      return false;
    }
  }
}

// デフォルトのインスタンスを作成してエクスポート
export default new SpeechManager(); 