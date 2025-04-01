// websocketHandler.js
// WebSocket接続管理用のモジュール

import { logDebug, logError, logZombieWarning } from '../core/logger.js';
import { showError, shouldShowError } from '../ui/uiHelper.js';
import { updateConnectionStatus } from '../ui/uiHelper.js';
import { speak, speakWithPreset } from '../emotion/speechManager.js';
import { hideTimeoutMap } from '../emotion/speechManager.js';
import { 
  startLightBounce, 
  stopLightBounce, 
  startTrembling, 
  stopTrembling,
  startNervousShake,
  stopNervousShake,
  setExpression
} from '../emotion/expressionManager.js';
import { playPresetSound } from '../voice/audioReactor.js';
import zombieOverlayManager from '../ui/overlayManager.js';

let websocket = null; // WebSocketオブジェクト
let isConnected = false; // 接続状態
let reconnectAttempts = 0; // 再接続試行回数
const MAX_RECONNECT_ATTEMPTS = 5; // 最大再接続試行回数
const RECONNECT_INTERVAL = 3000; // 再接続間隔（ミリ秒）
let config = null; // 設定データ
let connectionErrorShown = false; // エラーメッセージが表示されたかどうか

/**
 * 設定をセットする
 * @param {Object} configData - 設定データ
 */
export function setConfig(configData) {
  config = configData;
  logDebug('WebSocket設定をセットしました');
}

/**
 * WebSocketを初期化する
 */
export function initWebSocket() {
  try {
    const wsUrl = config?.backend?.ws_url || 'ws://127.0.0.1:8000/ws';
    logDebug(`WebSocket接続を開始します: ${wsUrl}`);
    
    websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      logDebug('WebSocket接続が確立されました');
      isConnected = true;
      reconnectAttempts = 0;
      connectionErrorShown = false;
      updateConnectionStatus('connected');
      
      // 接続確立時にハローメッセージを送信
      const helloMessage = {
        type: 'client_hello',
        client_info: {
          version: '1.0.0',
          timestamp: new Date().toISOString()
        }
      };
      websocket.send(JSON.stringify(helloMessage));
      
      // VOICEVOXの状態確認をリクエスト
      const checkMessage = {
        command: 'check_status',
        targets: ['voicevox']
      };
      websocket.send(JSON.stringify(checkMessage));
      
      // 🆕 自動的にゾンビ監視開始コマンドを送信
      setTimeout(() => {
        logDebug('ゾンビ監視の自動開始リクエストを送信');
        
        const startMonitoringMsg = {
          type: 'command',
          command: 'start_monitoring'
        };
        websocket.send(JSON.stringify(startMonitoringMsg));
      }, 2000); // 2秒後に実行（接続後の初期化が完了するのを待つ）
    };
    
    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        logError(`WebSocketメッセージのパース失敗: ${error.message}`, error);
        // エラー表示は起動猶予期間後のみ
        if (shouldShowError()) {
          showError('メッセージ処理中にエラーが発生しました');
        }
      }
    };
    
    websocket.onclose = (event) => {
      logDebug(`WebSocket接続が閉じられました。コード: ${event.code}, 理由: ${event.reason}`);
      isConnected = false;
      updateConnectionStatus('disconnected');
      
      // 再接続
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        updateConnectionStatus('reconnecting', reconnectAttempts, MAX_RECONNECT_ATTEMPTS);
        logDebug(`WebSocket再接続を試みます (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(initWebSocket, RECONNECT_INTERVAL);
      } else {
        updateConnectionStatus('failed');
        logError('WebSocket再接続の最大試行回数に達しました', new Error('再接続失敗'));
        
        // 起動猶予期間後かつ未表示の場合のみエラー表示
        if (shouldShowError() && !connectionErrorShown) {
          showError('バックエンドサーバーに接続できません。サーバーが起動しているか確認してください。');
          connectionErrorShown = true;
        }
      }
    };
    
    websocket.onerror = (error) => {
      logError(`WebSocketエラー発生`, error);
      updateConnectionStatus('error');
      
      // 起動猶予期間後かつ未表示の場合のみエラー表示
      if (shouldShowError() && !connectionErrorShown) {
        showError('バックエンド接続中にエラーが発生しました');
        connectionErrorShown = true;
      }
    };
  } catch (error) {
    logError(`WebSocket初期化エラー: ${error.message}`, error);
    updateConnectionStatus('error');
    
    // 起動猶予期間後かつ未表示の場合のみエラー表示
    if (shouldShowError() && !connectionErrorShown) {
      showError(`バックエンド接続エラー: ${error.message}`);
      connectionErrorShown = true;
    }
    
    // エラー発生時も再接続を試みる
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      setTimeout(initWebSocket, RECONNECT_INTERVAL);
    }
  }
}

/**
 * WebSocketメッセージを処理する
 * @param {Object} message - 受信したメッセージ
 */
function handleWebSocketMessage(message) {
  logDebug(`WebSocketメッセージを受信: ${JSON.stringify(message)}`);
  
  // 通知タイプのイベント処理を追加
  if (message.type === 'notification') {
    logZombieWarning(`💬 WebSocket通知受信: type=${message.type}, messageType=${message.data?.messageType}`);
    
    // データチェック
    if (!message.data) {
      logError('通知データが存在しません');
      return;
    }
    
    // 新しい通知フォーマットの処理（presetSound, speakText, emotion）
    if (message.data.presetSound || message.data.speakText) {
      logDebug(`新しい通知フォーマットを検出: presetSound=${message.data.presetSound}, emotion=${message.data.emotion}`);
      
      const presetSound = message.data.presetSound;
      const speakText = message.data.speakText;
      const emotion = message.data.emotion || 'normal';
      
      // プリセット音声と合成音声の両方が指定されている場合
      if (presetSound && speakText) {
        // 統合関数を使用
        speakWithPreset(presetSound, speakText, emotion, 5000, 'notification');
        return;
      }
      
      // プリセット音声のみの場合
      if (presetSound && !speakText) {
        // 表情を即座に変更
        if (emotion) {
          setExpression(emotion);
        }
        
        // プリセット音声を再生
        playPresetSound(presetSound)
          .then(success => {
            logDebug(`プリセット音声のみ再生結果: ${success ? '成功' : '失敗'}`);
          })
          .catch(err => {
            logError(`プリセット音声再生中にエラー: ${err}`);
          });
        return;
      }
      
      // 合成音声のみの場合
      if (speakText && !presetSound) {
        // ディスプレイ時間はデフォルトの5000ms
        const displayTime = 5000;
        
        // アニメーション指定
        let animation = null;
        if (emotion === 'surprised' || emotion === 'fearful') {
          animation = 'nervous_shake';
        } else if (emotion === 'serious') {
          animation = 'trembling';
        }
        
        // 発話を実行
        logDebug(`合成音声のみの発話リクエスト: "${speakText}", 感情=${emotion}`);
        speak(speakText, emotion, displayTime, animation, 'notification');
        return;
      }
      
      return;
    }
    
    const messageType = message.data.messageType;
    
    // messageTypeに基づいてハンドラを呼び出す
    if (messageType === 'fewZombiesAlert') {
      logZombieWarning('🧟 fewZombiesAlert を検知しました → handleZombieWarning を実行します');
      handleZombieWarning(message.data);
    } else if (messageType === 'zombieOverload') {
      logZombieWarning('🧟‍♀️ zombieOverload を検知しました → handleZombieOverload を実行します');
      handleZombieOverload(message.data);
    } else if (messageType === 'zombieFew') {
      logZombieWarning('🧟‍♂️ zombieFew を検知しました → handleZombieFew を実行します');
      handleZombieFew(message.data);
    } else {
      logDebug(`未知の通知タイプです: ${messageType}`);
    }
  } else if (message.type === 'voicevox_status') {
    if (message.status === 'available') {
      logDebug('VOICEVOX利用可能');
    } else {
      showError('VOICEVOXに接続できません。VOICEVOXが起動しているか確認してください。');
    }
  } else if (message.type === 'speak') {
    // デバッグ情報を追加
    logDebug(`発話メッセージを受信: ${message.text}, 感情: ${message.emotion}, 表示時間: ${message.display_time}`);
    
    // プリセット音声と合成音声の両方がある場合は統合関数を使用
    if (message.presetSound && message.text) {
      speakWithPreset(
        message.presetSound,
        message.text,
        message.emotion || 'normal',
        message.display_time || 5000,
        'speak'
      );
      return;
    }
    
    // プリセット音声の指定がある場合は先に再生
    if (message.presetSound) {
      logDebug(`発話メッセージにプリセット音声指定あり: ${message.presetSound}`);
      
      // 表情を即座に変更
      if (message.emotion) {
        setExpression(message.emotion);
      }
      
      // プリセット音声を再生
      playPresetSound(message.presetSound)
        .then(success => {
          logDebug(`プリセット音声再生結果: ${success ? '成功' : '失敗'}`);
        })
        .catch(err => {
          logError(`プリセット音声再生中にエラー: ${err}`);
        });
    }
    
    // アニメーション指定がある場合
    if (message.animation) {
      logDebug(`アニメーション指定あり: ${message.animation}`);
      
      if (message.animation === 'bounce_light') {
        startLightBounce();
        
        // 2秒後にアニメーション停止
        setTimeout(() => {
          stopLightBounce();
        }, 2000);
      } else if (message.animation === 'nervous_shake') {
        // 不安時の軽い震え
        startNervousShake();
        
        // 2秒後にアニメーション停止
        setTimeout(() => {
          stopNervousShake();
        }, 2000);
      }
    }
    
    // プリセット音声と統合処理済みの場合はここでリターン
    if (message.presetSound && message.text) {
      return;
    }
    
    speak(message.text, message.emotion, message.display_time, message.animation);
  } else if (message.type === 'status_update') {
    // ステータス更新の処理
    if (message.status === 'error') {
      showError(message.message);
    }
  } else if (message.type === 'zombie_overload') {
    // デバッグ情報を追加
    logDebug(`ゾンビ過多イベントを受信: ${JSON.stringify(message.data)}`);
    handleZombieOverload(message.data);
  } else if (message.type === 'zombie_few') {
    // デバッグ情報を追加
    logDebug(`少数ゾンビイベントを受信: ${JSON.stringify(message.data)}`);
    handleZombieFew(message.data);
  } else if (message.type === 'zombie_warning') {
    // 特別なログ関数を使用
    logZombieWarning(`ゾンビ警告イベントを受信: ${JSON.stringify(message.data)}`);
    
    // ★★★ データ構造確認のための追加デバッグ
    logZombieWarning(`ゾンビ警告データの構造: ${typeof message.data}, isArray: ${Array.isArray(message.data)}`);
    
    // データが存在しない場合にデフォルト値を使用
    if (!message.data) {
      message.data = { count: 3 };
      logZombieWarning(`データが存在しないため、デフォルト値を設定: ${JSON.stringify(message.data)}`);
    }
    
    // handleZombieWarning関数を呼び出す
    handleZombieWarning(message.data);
  } else if (message.type === 'detection') {
    logDebug(`検出データを受信: ${JSON.stringify(message.data)}`);
    
    // データ検証
    if (!message.data) {
      logError('検出データが存在しません');
      return;
    }
    
    // YOLOとResNetのデータを取得
    const yoloData = message.data.yolo || [];
    const resnetAlive = message.data.resnet_alive || false;
    
    // オーバーレイマネージャーを呼び出してデータを表示
    zombieOverlayManager.showDetection(yoloData, resnetAlive);
    
    logDebug(`ゾンビ検出データを表示: YOLO=${yoloData.length}個, ResNet=${resnetAlive}`);
  } else if (message.type === 'test_detection') {
    logDebug('テスト検出データを受信しました');
    
    // テストデータを取得
    const testData = message.data || {
      yolo: [
        {x1: 100, y1: 200, x2: 200, y2: 300, confidence: 0.92},
        {x1: 400, y1: 100, x2: 480, y2: 220, confidence: 0.55}
      ],
      resnet_alive: true
    };
    
    // オーバーレイマネージャーを呼び出してテストデータを表示
    zombieOverlayManager.showDetection(testData.yolo, testData.resnet_alive);
    
    logDebug('テスト検出データを表示しました');
  } else {
    // 未知のメッセージタイプ
    logDebug(`未知のメッセージタイプです: ${message.type}`);
  }
}

/**
 * ゾンビ過多イベントの処理
 * @param {Object} data - イベントデータ
 */
function handleZombieOverload(data) {
  const zombieCount = data?.count || '多数';
  logDebug(`ゾンビ過多イベント発生！ ${zombieCount}体のゾンビが検出されました`);
  
  // 驚き表情に変更して吹き出しを表示
  logDebug('驚き表情に変更します');
  setExpression('surprised');
  
  // 震えるアニメーションを開始
  logDebug('震えるアニメーションを開始します');
  startTrembling();
  
  // ※speak イベントが届かない場合に備えて、直接メッセージも表示する
  const messages = [
    "危険よ！ゾンビが大量に接近中！",
    "ゾンビの大群よ！早く安全な場所へ！",
    "大変！ゾンビがたくさんいるわ！急いで！",
    "周りがゾンビだらけよ！気をつけて！",
    "ゾンビの群れが迫ってきてる！"
  ];
  const message = messages[Math.floor(Math.random() * messages.length)];
  speak(message, 'surprised', 5000, 'trembling', 'zombie_overload');
  
  // 3秒後に震えるアニメーションを停止
  setTimeout(() => {
    logDebug('震えるアニメーションを停止します');
    stopTrembling();
  }, 3000);
}

/**
 * 少数ゾンビイベントの処理
 * @param {Object} data - イベントデータ
 */
function handleZombieFew(data) {
  const zombieCount = data?.count || 1;
  logDebug(`少数ゾンビイベント発生！ ${zombieCount}体のゾンビが検出されました`);
  
  // 通常表情のまま吹き出しを表示
  logDebug('通常表情で軽めの反応をします');
  setExpression('normal');
  
  // 吹き出しを表示する前に既存のタイマーをクリア
  if (hideTimeoutMap && typeof hideTimeoutMap.get === 'function') {
    // すべてのタイマーをクリア（zombie_warningと同様、優先度が高いため）
    for (const [key, timerId] of hideTimeoutMap.entries()) {
      clearTimeout(timerId);
      logDebug(`タイマー ${key} をクリアしました`);
    }
    hideTimeoutMap.clear();
    logDebug('すべての非表示タイマーをクリアしました');
  }
  
  // MutationObserverをリセット
  if (window._speechTextObserver) {
    window._speechTextObserver.disconnect();
    window._speechTextObserver = null;
    window._speechTextObserverAttached = false;
    logDebug('MutationObserverを完全にリセットしました');
  }
  
  // ※speak イベントが届かない場合に備えて、直接メッセージも表示する
  const messages = [
    "ゾンビを見つけたわ。注意して！",
    "ゾンビがいるわ！気をつけて！",
    "ちょっと、ゾンビが近くにいるわよ！",
    "あっ、ゾンビよ！気をつけて！"
  ];
  const message = messages[Math.floor(Math.random() * messages.length)];
  
  // タイムスタンプ付きのデバッグ情報
  const now = new Date();
  const timeStamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  logZombieWarning(`[${timeStamp}] zombie_few メッセージを表示: "${message}"`);
  
  // 確実に表示するためのイベントタイプ指定
  speak(message, 'normal', 5000, 'bounce_light', 'zombie_few');
  
  // 表示確認（冗長だが保険）
  setTimeout(() => {
    const speechBubble = document.getElementById('speechBubble');
    const speechText = document.getElementById('speechText');
    
    if (speechBubble && speechText) {
      const computed = window.getComputedStyle(speechBubble);
      logZombieWarning(`[${timeStamp}+100ms] 少数ゾンビ吹き出し確認: display=${computed.display}, visibility=${computed.visibility}, text="${speechText.textContent || '空'}"`);
      
      // 表示に問題がある場合、強制再表示
      if (computed.display !== 'flex' || computed.visibility !== 'visible' || !speechText.textContent.trim()) {
        logZombieWarning('[ZOMBIE_FEW] 吹き出し表示に問題があります。強制再表示します');
        
        // データバックアップ
        speechText.dataset.backupText = `「${message}」`;
        
        // 吹き出しを強制的に表示（スタイル直接指定）
        speechBubble.setAttribute('style', `
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: absolute !important;
          top: 20% !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 2147483647 !important;
          pointer-events: auto !important;
        `);
        speechBubble.className = 'speech-bubble show';
        
        // テキストが空の場合
        if (!speechText.textContent.trim()) {
          // フォーマットして設定
          const formattedText = message.startsWith('「') ? message : `「${message}」`;
          speechText.textContent = formattedText;
          speechText.innerText = formattedText;
        }
      }
    }
  }, 100);
}

/**
 * ゾンビ警告イベント（3-4体）の処理
 * @param {Object} data - イベントデータ
 */
function handleZombieWarning(data) {
  // デバッグに役立つ情報を詳細にログ出力
  const timestamp = new Date().toISOString();
  logZombieWarning(`🔍 handleZombieWarning が呼び出されました [時刻: ${timestamp}]`);
  logZombieWarning(`🔍 データ内容: ${JSON.stringify(data)}`);
  
  const zombieCount = data?.count || 3;
  logZombieWarning(`ゾンビ警告イベント発生！ ${zombieCount}体のゾンビが検出されました`);
  
  // 警戒表情に変更
  logZombieWarning('警戒表情に変更します');
  setExpression('serious');
  
  // 不安げな震えアニメーションを開始
  logZombieWarning('不安げな震えアニメーションを開始します');
  startTrembling();
  startNervousShake();
  
  // 吹き出しを表示する前に既存のタイマーをクリア
  if (hideTimeoutMap && typeof hideTimeoutMap.get === 'function') {
    // すべてのタイマーをクリア
    for (const [key, timerId] of hideTimeoutMap.entries()) {
      clearTimeout(timerId);
      logZombieWarning(`タイマー ${key} をクリアしました`);
    }
    hideTimeoutMap.clear();
    logZombieWarning('すべての非表示タイマーをクリアしました');
  }
  
  // MutationObserverをリセット
  if (window._speechTextObserver) {
    window._speechTextObserver.disconnect();
    window._speechTextObserver = null;
    window._speechTextObserverAttached = false;
    logZombieWarning('MutationObserverを完全にリセットしました');
  }
  
  // ※speak イベントが届かない場合に備えて、直接メッセージも表示する
  const messages = [
    "周辺にゾンビがいるみたい。気をつけて行動してね。",
    "ゾンビの気配を感じるわ。警戒したほうがいいかも？",
    "ゾンビが近くにいるかも。用心して行動してね。",
    "何か動くものを感知したわ。もしかしたらゾンビかも。"
  ];
  const message = messages[Math.floor(Math.random() * messages.length)];
  
  // 直接showBubbleと連携するためのデバッグログを追加
  logZombieWarning(`ゾンビ警告メッセージを表示します: "${message}"`);

  // ★★★ speak関数に渡す引数を明示的に指定し直す
  logZombieWarning(`speak関数呼び出し直前のデバッグ: メッセージ="${message}", 感情="serious", 時間=5000, アニメーション="trembling", イベントタイプ="zombie_warning"`);
  
  try {
    // 各引数の型も確認
    logZombieWarning(`引数の型確認: message=${typeof message}, emotion=${typeof 'serious'}, displayTime=${typeof 5000}, animation=${typeof 'trembling'}, eventType=${typeof 'zombie_warning'}`);
    
    // イベントタイプをzombie_warningとして指定し、アニメーション名も統一
    speak(message, 'serious', 5000, 'trembling', 'zombie_warning');
    logZombieWarning(`speak関数呼び出し成功`);
    
    // speak呼び出し後の吹き出し要素確認
    setTimeout(() => {
      const speechBubble = document.getElementById('speechBubble');
      const speechText = document.getElementById('speechText');
      if (speechBubble && speechText) {
        const style = window.getComputedStyle(speechBubble);
        logZombieWarning(`speak呼び出し直後の吹き出し状態: display=${style.display}, visibility=${style.visibility}, text="${speechText.textContent}"`);
      } else {
        logZombieWarning(`speak呼び出し直後の吹き出し要素が見つかりません: speechBubble=${!!speechBubble}, speechText=${!!speechText}`);
      }
    }, 10);
  } catch (error) {
    logZombieWarning(`speak関数呼び出し失敗: ${error.message}`);
    
    // エラー発生時のバックアップ表示処理
    try {
      // 直接DOMを操作して吹き出しを表示
      const speechBubble = document.getElementById('speechBubble');
      const speechText = document.getElementById('speechText');
      
      if (speechBubble && speechText) {
        logZombieWarning('バックアップ表示処理を実行します');
        
        // テキストを設定
        const formattedText = message.startsWith('「') ? message : `「${message}」`;
        speechText.textContent = formattedText;
        speechText.innerText = formattedText;
        
        // 吹き出しを表示
        speechBubble.style.cssText = `
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: absolute !important;
          top: 20% !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 2147483647 !important;
          pointer-events: auto !important;
          background-color: #fff0f0 !important;
          border: 3px solid #ff4500 !important;
          border-radius: 18px !important;
          padding: 14px 18px !important;
          max-width: 280px !important;
          min-height: 60px !important;
          min-width: 200px !important;
          box-shadow: 0 4px 15px rgba(255, 0, 0, 0.3) !important;
        `;
        speechBubble.className = 'speech-bubble show zombie-warning';
        
        logZombieWarning('バックアップ表示処理完了');
      }
    } catch (backupError) {
      logZombieWarning(`バックアップ表示処理も失敗: ${backupError.message}`);
    }
  }
  
  // 吹き出し表示の確認と強制表示の追加
  const checkAndForceBubble = () => {
    const speechBubble = document.getElementById('speechBubble');
    const speechText = document.getElementById('speechText');
    
    if (speechBubble && speechText) {
      // 計算済みスタイルを取得して確認
      const computedStyle = window.getComputedStyle(speechBubble);
      logZombieWarning(`ゾンビ警告吹き出し確認: display=${computedStyle.display}, visibility=${computedStyle.visibility}, opacity=${computedStyle.opacity}, text="${speechText.textContent || '空'}"`);
      
      // ゾンビ警告用の特別なスタイルを適用
      if (!speechBubble.classList.contains('zombie-warning')) {
        speechBubble.classList.add('zombie-warning');
        logZombieWarning('ゾンビ警告用の特別スタイルを適用しました');
      }
      
      // 表示に問題がある場合、強制的に表示
      if (computedStyle.display !== 'flex' || computedStyle.visibility !== 'visible' || parseFloat(computedStyle.opacity) < 0.5 || !speechText.textContent.trim()) {
        logZombieWarning('ゾンビ警告吹き出しが正しく表示されていません。強制表示を実行');
        
        // データバックアップ
        speechText.dataset.backupText = `「${message}」`;
        
        // 吹き出しを強制的に表示
        speechBubble.setAttribute('style', `
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: absolute !important;
          top: 20% !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 2147483647 !important;
          pointer-events: auto !important;
          background-color: #fff0f0 !important;
          border: 3px solid #ff4500 !important;
          border-radius: 18px !important;
          padding: 14px 18px !important;
          max-width: 280px !important;
          min-height: 60px !important;
          min-width: 200px !important;
          box-shadow: 0 4px 15px rgba(255, 0, 0, 0.3) !important;
        `);
        speechBubble.className = 'speech-bubble show zombie-warning';
        
        // メッセージが空の場合は、元のメッセージを設定
        if (!speechText.textContent.trim()) {
          // フォーマットして設定
          const formattedText = message.startsWith('「') ? message : `「${message}」`;
          speechText.textContent = formattedText;
          speechText.innerText = formattedText;
          logZombieWarning(`メッセージを再設定しました: "${formattedText}"`);
        }
      }
    } else {
      logZombieWarning('ゾンビ警告吹き出しの確認に失敗: 要素が見つかりません');
    }
  };
  
  // 少しずつ時間をおいて複数回確認と強制
  setTimeout(checkAndForceBubble, 100);
  setTimeout(checkAndForceBubble, 500);
  setTimeout(checkAndForceBubble, 1000);
  
  // 3秒後に震えるアニメーションを停止
  setTimeout(() => {
    logZombieWarning('不安げな震えアニメーションを停止します');
    stopTrembling();
    stopNervousShake();
  }, 3000);
}

/**
 * WebSocketメッセージを送信する
 * @param {Object} message - 送信するメッセージ
 * @returns {boolean} 送信に成功したかどうか
 */
export function sendMessage(message) {
  try {
    if (isConnected && websocket) {
      websocket.send(JSON.stringify(message));
      logDebug(`WebSocketメッセージを送信: ${JSON.stringify(message)}`);
      return true;
    } else {
      logDebug('WebSocketが接続されていないため、メッセージを送信できません');
      return false;
    }
  } catch (error) {
    logDebug(`WebSocketメッセージ送信エラー: ${error.message}`);
    return false;
  }
}

// グローバルに公開（デバッグ用）
if (typeof window !== 'undefined') {
  window.sendMessage = sendMessage;
  logDebug('sendMessage関数をwindowオブジェクトに公開しました（デバッグ用）');
}

/**
 * 接続状態を取得する
 * @returns {boolean} 接続されているかどうか
 */
export function isWebSocketConnected() {
  return isConnected;
} 