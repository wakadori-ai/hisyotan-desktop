// renderer.js
// 秘書たんのUI制御用エントリポイント

// スタイルシートをインポート
import '../styles.css';

import { logDebug, logError, logWarn, saveErrorLog } from '@core/logger.js';
import { loadConfig } from '@config/configLoader.js';
import { initUIElements, showError, shouldShowError } from '@ui/uiHelper.js';
import { initExpressionElements, setExpression } from '@emotion/expressionManager.js';
import { setConfig as setWebSocketConfig, initWebSocket, sendTestZombieWarning, sendTestDetection } from '@core/websocketHandler.js';
import { setConfig as setSpeechConfig, checkVoicevoxConnection } from '@emotion/speechManager.js';
import { initRandomLines } from '@emotion/emotionHandler.js';
import zombieOverlayManager from '@ui/overlayManager.js';

// 起動中フラグ
let isStartupInProgress = true;

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    logDebug('DOM読み込み完了、初期化を開始します');
    
    // UI要素の初期化
    initUIElements();
    initExpressionElements();
    
    // 初期表情設定
    setExpression('normal');
    
    // 設定読み込み
    const config = await loadConfig();
    
    // 各モジュールに設定を渡す
    setWebSocketConfig(config);
    setSpeechConfig(config);
    
    // ゾンビオーバーレイマネージャーを初期化
    zombieOverlayManager.initialize();
    
    // デバッグ用グローバル公開（開発者ツールからテストできるように）
    if (typeof window !== 'undefined') {
      window.zombieOverlayManager = zombieOverlayManager;
    }
    
    // バックエンドとの接続
    initWebSocket();
    
    // VOICEVOXの接続確認
    // 非同期で実行し、結果を待たない（リトライロジックはcheckVoicevoxConnection内で処理）
    checkVoicevoxConnection().catch(error => {
      logDebug(`VOICEVOX接続確認中のエラー: ${error.message}`);
      // エラー表示は機能内のリトライロジックに委ねる
    });
    
    // ランダムセリフの初期化
    try {
      logDebug('ランダムセリフ機能を初期化しています...');
      const randomController = initRandomLines(30000);
      
      // グローバルスコープにも保存（index.htmlから参照可能に）
      if (typeof window !== 'undefined') {
        window.randomLinesController = randomController;
        // ランダムセリフ関数も明示的にwindowに設定
        window.initRandomLines = initRandomLines;
        logDebug('ランダムセリフ機能をグローバルに公開しました');
      }
    } catch (error) {
      logDebug(`ランダムセリフ初期化エラー: ${error.message}`);
      saveErrorLog(error);
    }
    
    // 表示・非表示アニメーションのイベントリスナーを設定
    setupWindowAnimations();
    
    // マウスイベント処理の設定
    setupMouseEventHandling();
    
    // パフォーマンス最適化
    optimizePerformance();
    
    // 設定を読み込んで適用
    await loadAndApplySettings();
    
    setupAssistantImage();
    
    setupDebugPanel();
    
    // 右クリックイベントハンドラの設定
    setupContextMenuEvents();
    
    logDebug('すべての機能の初期化が完了しました');
    
    // 起動完了フラグを設定（10秒後に通常動作へ移行）
    setTimeout(() => {
      isStartupInProgress = false;
      logDebug('起動猶予期間が終了しました。通常動作モードに移行します。');
    }, 10000);
  } catch (error) {
    console.error('初期化エラー:', error);
    // 起動猶予期間後のみエラー表示
    if (shouldShowError()) {
      showError(`初期化中にエラーが発生しました: ${error.message}`);
    }
    saveErrorLog(error);
  }
});

// デバッグ用: 初期化が完了したことをコンソールに表示
console.log('renderer.js: すべての機能が初期化されました');

// マウス操作検出のための変数
let mouseTimer;
let mouseActive = false;

// マウスの動きを検出
document.addEventListener('mousemove', function() {
  // 自動透明化が有効な場合のみ適用
  if (window.currentSettings && window.currentSettings.autoHide === false) {
    return;
  }
  
  // マウスが動いたらbodyにmouse-activeクラスを追加
  document.body.classList.add('mouse-active');
  mouseActive = true;
  
  // 既存のタイマーをクリア
  clearTimeout(mouseTimer);
  
  // 3秒間動きがなければmouse-activeクラスを削除
  mouseTimer = setTimeout(function() {
    document.body.classList.remove('mouse-active');
    mouseActive = false;
  }, 3000);
});

// マウスクリック時も同様に処理
document.addEventListener('mousedown', function() {
  // 自動透明化が有効な場合のみ適用
  if (window.currentSettings && window.currentSettings.autoHide === false) {
    return;
  }
  
  document.body.classList.add('mouse-active');
  mouseActive = true;
  
  clearTimeout(mouseTimer);
  
  mouseTimer = setTimeout(function() {
    document.body.classList.remove('mouse-active');
    mouseActive = false;
  }, 3000);
});

// 保存された設定の読み込みと適用
async function loadAndApplySettings() {
  try {
    if (window.electronAPI && window.electronAPI.getSettings) {
      const config = await window.electronAPI.getSettings();
      
      // 設定があれば適用
      if (config && config.assistant) {
        window.currentSettings = config.assistant;
        
        // 透明度の適用
        if (typeof config.assistant.opacity === 'number') {
          const assistantImage = document.getElementById('assistantImage');
          if (assistantImage) {
            assistantImage.style.opacity = config.assistant.opacity / 100;
          }
          
          // UI要素にも値を反映
          const opacitySlider = document.getElementById('opacitySlider');
          const opacityValue = document.getElementById('opacityValue');
          if (opacitySlider && opacityValue) {
            opacitySlider.value = config.assistant.opacity;
            opacityValue.textContent = config.assistant.opacity;
          }
        }
        
        // サイズの適用
        if (typeof config.assistant.size === 'number') {
          const assistantImage = document.getElementById('assistantImage');
          if (assistantImage) {
            // まずサイズ制限を確認
            if (!assistantImage.style.maxWidth) {
              assistantImage.style.maxWidth = '35vw';
              assistantImage.style.maxHeight = '70vh';  
            }
            // 次にスケールを適用
            assistantImage.style.transform = `scale(${config.assistant.size / 100})`;
          }
          
          // UI要素にも値を反映
          const sizeSlider = document.getElementById('sizeSlider');
          const sizeValue = document.getElementById('sizeValue');
          if (sizeSlider && sizeValue) {
            sizeSlider.value = config.assistant.size;
            sizeValue.textContent = config.assistant.size;
          }
        }
        
        // 位置の適用
        if (config.assistant.position) {
          const container = document.querySelector('.assistant-container');
          if (container) {
            // 位置に応じてスタイルを変更
            switch (config.assistant.position) {
              case 'topLeft':
                container.style.alignItems = 'flex-start';
                container.style.justifyContent = 'flex-start';
                container.style.paddingRight = '0';
                container.style.paddingLeft = '30px';
                break;
              case 'topRight':
                container.style.alignItems = 'flex-end';
                container.style.justifyContent = 'flex-start';
                container.style.paddingRight = '30px';
                container.style.paddingLeft = '0';
                break;
              case 'bottomLeft':
                container.style.alignItems = 'flex-start';
                container.style.justifyContent = 'flex-end';
                container.style.paddingRight = '0';
                container.style.paddingLeft = '30px';
                break;
              case 'bottomRight':
              default:
                container.style.alignItems = 'flex-end';
                container.style.justifyContent = 'flex-end';
                container.style.paddingRight = '30px';
                container.style.paddingLeft = '0';
                break;
            }
          }
          
          // UI要素にも視覚的に反映（ボタンにアクティブクラスを追加する場合）
          const positionButtons = document.querySelectorAll('.position-buttons button');
          if (positionButtons && positionButtons.length === 4) {
            // 一度すべてのアクティブクラスを削除
            positionButtons.forEach(btn => btn.classList.remove('active'));
            
            // 現在の位置に応じてアクティブクラスを追加
            let activeIndex = 0;
            switch (config.assistant.position) {
              case 'topLeft': activeIndex = 0; break;
              case 'topRight': activeIndex = 1; break;
              case 'bottomLeft': activeIndex = 2; break;
              case 'bottomRight': activeIndex = 3; break;
            }
            positionButtons[activeIndex].classList.add('active');
          }
        }
        
        // 自動透明化の設定
        if (typeof config.assistant.autoHide === 'boolean') {
          const autoHideToggle = document.getElementById('autoHideToggle');
          if (autoHideToggle) {
            autoHideToggle.checked = config.assistant.autoHide;
          }
          
          if (!config.assistant.autoHide) {
            document.body.classList.remove('mouse-active');
          }
        }
        
        // 最前面表示の設定
        if (typeof config.assistant.alwaysOnTop === 'boolean') {
          const alwaysTopToggle = document.getElementById('alwaysTopToggle');
          if (alwaysTopToggle) {
            alwaysTopToggle.checked = config.assistant.alwaysOnTop;
          }
        }
        
        // クリック透過設定の適用
        if (typeof config.assistant.clickThroughDisabled === 'boolean') {
          // 設定値をUIに反映
          const clickThroughToggle = document.getElementById('clickThroughToggle');
          if (clickThroughToggle) {
            clickThroughToggle.checked = config.assistant.clickThroughDisabled;
          }
          
          // 設定に応じてクリック透過モードを切り替え
          if (config.assistant.clickThroughDisabled) {
            // クリック透過を無効化（クリック可能にする）
            if (window.electronAPI && window.electronAPI.enableClickThrough) {
              window.electronAPI.enableClickThrough();
              logDebug('設定からクリック透過を無効化しました（クリック可能）');
            }
          } else {
            // デバッグモードが有効でなければクリック透過を有効化
            if (!document.body.classList.contains('pointer-events-enabled')) {
              if (window.electronAPI && window.electronAPI.disableClickThrough) {
                window.electronAPI.disableClickThrough();
                logDebug('設定からクリック透過を有効化しました（クリック透過）');
              }
            }
          }
        } else {
          // 初期値がない場合はクリック可能をデフォルトに設定
          window.currentSettings.clickThroughDisabled = true;
          if (window.electronAPI && window.electronAPI.enableClickThrough) {
            window.electronAPI.enableClickThrough();
            logDebug('初期値：クリック透過を無効化しました（クリック可能）');
          }
        }
        
        logDebug('秘書たんの設定を適用しました');
      }
    }
  } catch (error) {
    logError('設定の読み込みと適用に失敗しました:', error);
  }
}

// マウスイベント処理の設定
function setupMouseEventHandling() {
  // マウスイベントを受け取る必要がある要素
  const interactiveElements = [
    document.getElementById('speechBubble'),
    document.getElementById('errorBubble'),
    document.getElementById('statusIndicator'),
    document.getElementById('settingsIcon'),
    document.getElementById('debugMenu'),
    document.getElementById('overlayMenu'),
    document.querySelector('.paw-button-wrapper'),
    document.getElementById('assistantImage')
  ].filter(element => element !== null);
  
  // electronAPIが利用可能かチェック
  if (window.electronAPI && window.electronAPI.enableMouseEvents && window.electronAPI.disableMouseEvents) {
    // デバウンス処理用の変数
    let mouseEventTimerId = null;
    const debounceTime = 300; // ミリ秒
    
    // マウスイベントの有効化（デバウンス処理付き）
    function enableMouseEventsWithDebounce() {
      clearTimeout(mouseEventTimerId);
      try {
        window.electronAPI.enableMouseEvents();
        logDebug('マウスイベントを有効化しました（デバウンス処理）');
      } catch (error) {
        logError('マウスイベント有効化エラー:', error);
        saveErrorLog(error);
      }
    }
    
    // マウスイベントの無効化（デバウンス処理付き）
    function disableMouseEventsWithDebounce() {
      clearTimeout(mouseEventTimerId);
      mouseEventTimerId = setTimeout(() => {
        try {
          // マウスがどのインタラクティブ要素の上にもない場合のみ無効化
          const isOverInteractive = interactiveElements.some(element => 
            element.matches(':hover')
          );
          
          // デバッグモードが有効、または設定でクリック透過が無効の場合は無効化しない
          const isDebugMode = document.body.classList.contains('pointer-events-enabled');
          const clickThroughDisabled = window.currentSettings?.clickThroughDisabled === true;
          
          if (!isOverInteractive && !isDebugMode && !clickThroughDisabled) {
            window.electronAPI.disableMouseEvents();
            logDebug('マウスイベントを無効化しました（デバウンス処理）');
          }
        } catch (error) {
          logError('マウスイベント無効化エラー:', error);
          saveErrorLog(error);
        }
      }, debounceTime);
    }
    
    // interactiveな要素にマウスが入ったらイベントを有効化
    interactiveElements.forEach(element => {
      element.addEventListener('mouseenter', enableMouseEventsWithDebounce);
      element.addEventListener('mouseleave', disableMouseEventsWithDebounce);
    });
    
    // 初期状態では有効化しておく（右クリックイベントが機能するように）
    window.electronAPI.enableMouseEvents();
    logDebug('初期状態：マウスイベントを有効化しました');
  } else {
    logDebug('electronAPIが利用できないため、マウスイベント処理を設定できません');
  }
}

// パフォーマンス最適化
function optimizePerformance() {
  try {
    logDebug('パフォーマンス最適化を適用しています...');
    
    // リサイズイベントの最適化（デバウンス処理）
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // リサイズ完了後の処理
        logDebug('ウィンドウリサイズを検出しました');
        // 必要なレイアウト調整があればここで実行
      }, 250);
    });
    
    // 低負荷モードの実装
    const lowPowerMode = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (lowPowerMode) {
      // アニメーション効果を減らす処理
      document.body.classList.add('reduce-motion');
      logDebug('低負荷モードを適用しました');
    }
    
    // 不要なアニメーションを無効化（オプション）
    if (window.currentSettings && window.currentSettings.reduceAnimations) {
      document.body.classList.add('reduce-animations');
      logDebug('アニメーション効果を削減しました');
    }
    
    logDebug('パフォーマンス最適化が完了しました');
  } catch (error) {
    logError('パフォーマンス最適化エラー:', error);
    saveErrorLog(error);
  }
}

// クリックスルー制御用のコード
document.addEventListener('keydown', (event) => {
  // Alt+C でクリックスルーの切り替え
  if (event.altKey && event.key === 'c') {
    console.log('Alt+C が押されました - クリックスルー切り替え');
    toggleClickThroughMode();
  }
});

// クリックスルーモードの切り替え関数（外部からも呼び出せるようにグローバル関数として定義）
window.toggleClickThroughMode = function() {
  // electronAPIが利用可能かチェック
  if (window.electronAPI && window.electronAPI.toggleClickThrough) {
    window.electronAPI.toggleClickThrough().then(isDisabled => {
      // 設定に保存（clickThroughDisabled = クリック透過が無効＝クリック可能）
      if (window.currentSettings) {
        window.currentSettings.clickThroughDisabled = isDisabled;
        
        // 設定を永続化
        if (window.electronAPI && window.electronAPI.saveSettings) {
          window.electronAPI.saveSettings({
            assistant: {
              ...window.currentSettings,
              clickThroughDisabled: isDisabled
            }
          }).catch(err => logError(`クリック透過設定保存エラー: ${err.message}`));
        }
      }
      
      // クリックスルーが無効（つまりクリック可能）ならデバッグモード表示
      if (isDisabled) {
        document.body.classList.add('pointer-events-enabled');
        logDebug('デバッグモード有効: クリック可能');
        
        // デバッグパネルを表示
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
          debugPanel.style.display = 'block';
        }
        
        // 操作可能状態を通知
        if (window.speechManager && window.speechManager.speak) {
          window.speechManager.speak('操作モードが有効になりました。Alt+Cで元に戻せます。', 'normal', 3000);
        }
      } else {
        document.body.classList.remove('pointer-events-enabled');
        logDebug('デバッグモード無効: クリック透過');
        
        // デバッグパネルを非表示
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
          debugPanel.style.display = 'none';
        }
        
        // クリックスルーモードに戻ったことを通知
        if (window.speechManager && window.speechManager.speak) {
          window.speechManager.speak('クリック透過モードに戻りました', 'normal', 2000);
        }
      }
    });
  } else {
    logError('electronAPI.toggleClickThrough が利用できません');
  }
};

// レンダラープロセスのロード完了時にデバッグパネルのクリック透過を防止
window.addEventListener('DOMContentLoaded', () => {
  // デバッグパネルの要素を取得
  const debugPanel = document.getElementById('debug-panel');
  
  if (debugPanel) {
    // デバッグパネル内のボタンをクリックしたときの処理
    debugPanel.addEventListener('mouseenter', () => {
      if (window.electronAPI && window.electronAPI.enableClickThrough) {
        // パネル上にマウスが乗ったら一時的にクリックスルーを無効化
        window.electronAPI.enableClickThrough();
      }
    });
    
    debugPanel.addEventListener('mouseleave', () => {
      // デバッグモードが有効でない場合のみ元に戻す
      if (!document.body.classList.contains('pointer-events-enabled')) {
        if (window.electronAPI && window.electronAPI.disableClickThrough) {
          // パネルからマウスが離れたら元に戻す
          window.electronAPI.disableClickThrough();
        }
      }
    });
  }
});

// Electron IPCからのクリックスルー状態変更通知を処理
if (window.electronAPI) {
  window.electronAPI.onClickThroughChanged((isEnabled) => {
    if (isEnabled) {
      document.body.classList.remove('pointer-events-enabled');
    } else {
      document.body.classList.add('pointer-events-enabled');
    }
  });
}

// 画像ロード処理の修正
function setupAssistantImage() {
  const assistantImage = document.getElementById('assistantImage');
  if (assistantImage) {
    // 即時適用
    assistantImage.style.maxWidth = '35vw';
    assistantImage.style.maxHeight = '70vh';
    
    // onloadも設定
    assistantImage.onload = function() {
      logDebugToPanel(`画像読み込み完了: ${this.naturalWidth}x${this.naturalHeight}`);
      this.style.maxWidth = '35vw';
      this.style.maxHeight = '70vh';
      // スケール適用
      if (window.currentSettings && window.currentSettings.assistant && 
          typeof window.currentSettings.assistant.size === 'number') {
        this.style.transform = `scale(${window.currentSettings.assistant.size / 100})`;
      }
    };
  }
}

/**
 * デバッグパネルの初期化
 */
function setupDebugPanel() {
  try {
    logDebug('デバッグパネルのセットアップを開始');
    
    // デバッグパネル要素の追加
    const debugPanelExists = document.getElementById('debug-panel');
    if (debugPanelExists) {
      logDebug('デバッグパネルは既に存在します');
      return;
    }
    
    // デバッグパネル要素の作成
    const debugPanel = document.createElement('div');
    debugPanel.id = 'debug-panel';
    debugPanel.className = 'debug-panel';
    debugPanel.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      padding: 10px;
      border-radius: 5px;
      font-size: 12px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 5px;
      max-width: 150px;
    `;
    
    // タイトル追加
    const debugTitle = document.createElement('div');
    debugTitle.textContent = 'デバッグパネル';
    debugTitle.style.cssText = `
      font-weight: bold;
      text-align: center;
      margin-bottom: 5px;
      font-size: 14px;
    `;
    debugPanel.appendChild(debugTitle);
    
    // クリック透過切り替えボタン
    const clickThroughBtn = document.createElement('button');
    clickThroughBtn.textContent = 'クリック透過切替';
    clickThroughBtn.className = 'debug-btn';
    clickThroughBtn.style.cssText = `
      background: #9b59b6;
      border: none;
      color: white;
      padding: 5px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      margin-bottom: 5px;
    `;
    clickThroughBtn.onclick = () => {
      logDebug('クリック透過切替ボタンがクリックされました');
      window.toggleClickThroughMode();
    };
    debugPanel.appendChild(clickThroughBtn);
    
    // ゾンビ警告テストボタン
    const zombieWarningBtn = document.createElement('button');
    zombieWarningBtn.textContent = 'ゾンビ警告テスト';
    zombieWarningBtn.className = 'debug-btn';
    zombieWarningBtn.style.cssText = `
      background: #ff4500;
      border: none;
      color: white;
      padding: 5px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    `;
    zombieWarningBtn.onclick = () => {
      logDebug('ゾンビ警告テストボタンがクリックされました');
      sendTestZombieWarning();
    };
    debugPanel.appendChild(zombieWarningBtn);
    
    // ゾンビ検出テストボタン
    const zombieDetectionBtn = document.createElement('button');
    zombieDetectionBtn.textContent = 'ゾンビ検出テスト';
    zombieDetectionBtn.className = 'debug-btn';
    zombieDetectionBtn.style.cssText = `
      background: #3498db;
      border: none;
      color: white;
      padding: 5px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      margin-top: 5px;
    `;
    zombieDetectionBtn.onclick = () => {
      logDebug('ゾンビ検出テストボタンがクリックされました');
      sendTestDetection();
    };
    debugPanel.appendChild(zombieDetectionBtn);
    
    // WSメッセージログ表示切替ボタン
    const toggleWsLogBtn = document.createElement('button');
    toggleWsLogBtn.textContent = 'WSログ表示切替';
    toggleWsLogBtn.className = 'debug-btn';
    toggleWsLogBtn.style.cssText = `
      background: #2ecc71;
      border: none;
      color: white;
      padding: 5px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      margin-top: 5px;
    `;
    toggleWsLogBtn.onclick = () => {
      // wsDebugMode変数がwebsocketHandler.jsにあると仮定
      if (typeof window.toggleWsDebugMode === 'function') {
        window.toggleWsDebugMode();
      } else {
        logDebug('WebSocketデバッグモード切替機能が利用できません');
      }
    };
    debugPanel.appendChild(toggleWsLogBtn);
    
    // ステータス表示領域
    const statusArea = document.createElement('div');
    statusArea.id = 'debug-status';
    statusArea.style.cssText = `
      margin-top: 10px;
      font-size: 11px;
      color: #ddd;
      border-top: 1px solid rgba(255,255,255,0.2);
      padding-top: 5px;
    `;
    statusArea.innerHTML = 'クリック透過: <span id="click-through-status">-</span><br>';
    debugPanel.appendChild(statusArea);
    
    // クリック透過状態の更新関数
    const updateClickThroughStatus = () => {
      const statusSpan = document.getElementById('click-through-status');
      if (statusSpan) {
        const isEnabled = document.body.classList.contains('pointer-events-enabled');
        statusSpan.textContent = isEnabled ? '無効' : '有効';
        statusSpan.style.color = isEnabled ? '#72ff7d' : '#ff7272';
      }
    };
    
    // ステータス更新
    updateClickThroughStatus();
    
    // クリック透過状態が変更されたときに更新
    if (window.electronAPI) {
      window.electronAPI.onClickThroughChanged((isEnabled) => {
        updateClickThroughStatus();
      });
    }
    
    // デバッグパネルをボディに追加
    document.body.appendChild(debugPanel);
    
    logDebug('デバッグパネルのセットアップが完了しました');
  } catch (error) {
    logError('デバッグパネルのセットアップに失敗しました', error);
  }
}

// 表示・非表示アニメーションのセットアップ
function setupWindowAnimations() {
  // electronAPIが利用可能な場合のみ設定
  if (!window.electronAPI) return;
  
  // assistantContainerを取得
  const assistantContainer = document.querySelector('.assistant-container');
  const quitButton = document.getElementById('quitButton');
  
  if (!assistantContainer) {
    console.warn('assistant-containerが見つかりません。アニメーションは設定されません。');
    return;
  }
  
  // 表示アニメーションの準備
  window.electronAPI.onPrepareShowAnimation(() => {
    // cssアニメーション用のクラスを付与
    assistantContainer.classList.remove('hide-animation');
    assistantContainer.classList.remove('hidden');
    assistantContainer.classList.add('show-animation');
    
    // 終了ボタンを表示
    if (quitButton) {
      quitButton.style.display = 'flex';
    }
    
    // 音声再生（オプション）
    const appearSound = new Audio('../../assets/sounds/presets/appear.wav');
    appearSound.volume = 0.5;
    appearSound.play().catch(err => console.log('音声再生エラー:', err));
    
    // 秘書たんに「しゅぽっ」と言わせるオプション
    // セリフがあれば話す
    if (window.speak) {
      setTimeout(() => {
        window.speak('しゅぽっ♪', 'happy');
      }, 100);
    }
  });
  
  // 非表示アニメーションの準備
  window.electronAPI.onPrepareHideAnimation(() => {
    // cssアニメーション用のクラスを付与
    assistantContainer.classList.remove('show-animation');
    assistantContainer.classList.add('hide-animation');
    assistantContainer.classList.add('hidden');
    
    // 終了ボタンを非表示
    if (quitButton) {
      quitButton.style.display = 'none';
    }
    
    // 音声再生（オプション）
    const disappearSound = new Audio('../../assets/sounds/presets/disappear.mp3');
    disappearSound.volume = 0.5;
    disappearSound.play().catch(err => console.log('音声再生エラー:', err));
    
    // 秘書たんに「ふわ〜」と言わせるオプション
    if (window.speak) {
      window.speak('ふわ〜', 'normal');
    }
  });
}

console.log('📝 秘書たんレンダラープロセス初期化...');

// 画像パス解決のための関数
async function resolveImagePath(relativePath) {
  // パスの先頭に余計な ./ や / があれば削除
  const cleanPath = relativePath.replace(/^(\.\/)/g, '');
  // ただし、先頭が / だけの場合（絶対パス）は保持する
  
  try {
    // 0. 既に絶対パスで始まっている場合はそのまま返す
    if (relativePath.startsWith('/assets/')) {
      console.log(`絶対パスをそのまま使用: ${relativePath}`);
      return relativePath;
    }
    
    // 1. Electron環境での絶対パス解決（本番環境用）
    if (window.electronAPI) {
      // 新しいresolveImagePath APIがあればそれを使用
      if (window.electronAPI.resolveImagePath) {
        try {
          // パスにfrontend/ui/public/が含まれていなければVite対応パスに調整
          const adjustedPath = cleanPath.includes('frontend/ui/public/') 
            ? cleanPath 
            : cleanPath.startsWith('assets/') 
              ? cleanPath 
              : `assets/${cleanPath}`;
              
          const resolvedPath = await window.electronAPI.resolveImagePath(adjustedPath);
          if (resolvedPath) {
            console.log(`画像パスを解決しました: ${relativePath} → ${resolvedPath}`);
            return resolvedPath;
          }
        } catch (err) {
          console.warn(`resolveImagePathでのエラー: ${err.message}`);
        }
      }
      
      // 代替手段としてgetAssetPathを使用
      if (window.electronAPI.getAssetPath) {
        try {
          // 古いパスから新しいパスへの変換を試みる
          const adjustedPath = cleanPath.startsWith('assets/') 
            ? cleanPath 
            : `assets/${cleanPath}`;
            
          const assetPath = await window.electronAPI.getAssetPath(adjustedPath);
          if (assetPath) {
            console.log(`アセットパスを解決しました: ${relativePath} → ${assetPath}`);
            return assetPath;
          }
        } catch (err) {
          console.warn(`getAssetPathでのエラー: ${err.message}`);
        }
      }
    }
    
    // 2. 開発環境でのパス解決（Vite開発サーバー用）
    // 既に/で始まるパスはViteのpublicDirから探索されるのでそのまま
    if (relativePath.startsWith('/')) {
      return relativePath;
    }
    
    // パスにassetsが含まれている場合の処理
    if (cleanPath.startsWith('assets/')) {
      return `/${cleanPath}`; // assetsから始まる場合は先頭に/をつけて絶対パスに
    } else if (!cleanPath.includes('assets/')) {
      // assetsが含まれていなければ追加
      return `/assets/${cleanPath}`;
    }
    
    // 3. いずれの方法でも解決できない場合は、相対パスをそのまま返す
    console.warn(`画像パスを解決できませんでした: ${relativePath} - 元のパスを使用します`);
    return relativePath;
  } catch (error) {
    console.error(`画像パス解決エラー: ${error.message}`);
    return relativePath;
  }
}

// 秘書たんの画像を設定
async function loadSecretaryImage(emotion = 'normal') {
  try {
    const imgElement = document.getElementById('assistantImage');
    if (!imgElement) {
      console.error('秘書たん画像要素が見つかりません');
      return;
    }

    // 感情に基づいて画像ファイル名を決定
    const imageFileName = `secretary_${emotion}.png`;
    
    // 複数のパスパターンを試す（優先順位順）
    const pathOptions = [
      `/assets/images/${imageFileName}`,           // Vite開発サーバー（絶対パス）- 最優先
      `assets/images/${imageFileName}`,            // assetsフォルダ直下から
      `./public/assets/images/${imageFileName}`,   // public内のassets（開発環境用）
      `./assets/images/${imageFileName}`,          // 相対パス
      `../public/assets/images/${imageFileName}`,  // UI階層から見たpublic
      `../../assets/images/${imageFileName}`,      // 旧構造（上位ディレクトリから）
    ];

    // デバッグ用にパスを表示
    console.log('試行パスパターン:', pathOptions);

    // 最初のパスを設定
    let imagePath = await resolveImagePath(pathOptions[0]);
    console.log(`初期画像パス設定: ${imagePath}`);
    imgElement.src = imagePath;
    
    // 画像が読み込めなかった場合のエラーハンドリング
    imgElement.onerror = async () => {
      console.warn(`画像の読み込みに失敗: ${imagePath}`);
      
      // 他のパスオプションを試す
      for (let i = 1; i < pathOptions.length; i++) {
        const altPath = await resolveImagePath(pathOptions[i]);
        console.log(`代替パスを試行(${i}/${pathOptions.length-1}): ${altPath}`);
        
        // ファイルが存在するか確認（electronAPIを使用）
        if (window.electronAPI && window.electronAPI.checkImageExists) {
          try {
            const exists = await window.electronAPI.checkImageExists(altPath);
            if (exists) {
              console.log(`有効な画像パスを見つけました: ${altPath}`);
              imgElement.src = altPath;
              return;
            }
          } catch (err) {
            console.warn(`存在確認エラー: ${err.message}`);
          }
        } else {
          // 確認できない場合は単純に設定してみる
          console.log(`代替パスを直接設定: ${altPath}`);
          imgElement.src = altPath;
          
          // 一時的なタイムアウトを設定し、次のパスを試す前に少し待機
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // srcが変わっていなければエラーとみなして次へ
          if (imgElement.src === altPath && imgElement.complete && imgElement.naturalWidth === 0) {
            console.warn(`画像の読み込みに失敗（代替パス ${i}）: ${altPath}`);
            continue;
          }
          
          return;
        }
      }
      
      // すべてのパスが失敗した場合、プレースホルダー画像を表示
      console.error('すべての画像パスが失敗しました');
      imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjI0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBhbGlnbm1lbnQtYmFzZWxpbmU9Im1pZGRsZSIgZmlsbD0iIzk5OSI+6KaL44Gk44GL44KK44G+44Gb44KTPC90ZXh0Pjwvc3ZnPg==';
      
      // デバッグパネルにエラーを表示
      if (window.logDebugToPanel) {
        window.logDebugToPanel('画像読み込み失敗: すべてのパスが無効でした');
      }
    };
  } catch (error) {
    console.error(`秘書たん画像読み込みエラー: ${error.message}`);
  }
}

// 吹き出しを表示する関数
function showBubble(text, duration = 5000) {
  try {
    const speechBubble = document.getElementById('speechBubble');
    const speechText = document.getElementById('speechText');
    
    if (!speechBubble || !speechText) {
      console.error('吹き出し要素が見つかりません');
      return;
    }
    
    // テキストを設定
    speechText.textContent = text;
    
    // 吹き出しを表示
    speechBubble.style.display = 'flex';
    speechBubble.style.visibility = 'visible';
    speechBubble.style.opacity = '1';
    speechBubble.className = 'speech-bubble show';
    
    // 自動的に消える設定（durationが0より大きい場合）
    if (duration > 0) {
      setTimeout(() => {
        hideBubble();
      }, duration);
    }
  } catch (error) {
    console.error(`吹き出し表示エラー: ${error.message}`);
  }
}

// 吹き出しを非表示にする関数
function hideBubble() {
  try {
    const speechBubble = document.getElementById('speechBubble');
    if (!speechBubble) {
      console.error('吹き出し要素が見つかりません');
      return;
    }
    
    // 吹き出しを非表示にする
    speechBubble.className = 'speech-bubble hide';
    
    // アニメーション完了まで少し待ってから完全に非表示
    setTimeout(() => {
      speechBubble.style.display = 'none';
      speechBubble.style.visibility = 'hidden';
      speechBubble.style.opacity = '0';
    }, 300);
  } catch (error) {
    console.error(`吹き出し非表示エラー: ${error.message}`);
  }
}

// グローバルスコープに関数を公開
window.showBubble = showBubble;
window.hideBubble = hideBubble;
window.loadSecretaryImage = loadSecretaryImage;

// テスト用関数
window.testNormalBubble = function() {
  showBubble('ふにゃ〜、どうしたの？何かお手伝いすることある？', 5000);
};

window.testBubble = function() {
  const bubble = document.getElementById('speechBubble');
  if (bubble) {
    bubble.style.backgroundColor = 'rgba(255, 100, 100, 0.9)';
    showBubble('エラーが発生しました！', 3000);
    
    // 元に戻す
    setTimeout(() => {
      bubble.style.backgroundColor = '';
    }, 3000);
  }
};

// 開発者ツールを開く
window.openDevTools = function() {
  if (window.electronAPI && window.electronAPI.openDevTools) {
    window.electronAPI.openDevTools();
  }
};

console.log('📝 レンダラープロセス初期化完了');

/**
 * ホード夜モード設定UIを表示する関数
 * @param {boolean} currentValue - 現在の設定値
 * @param {Function} onChangeCallback - 値変更時のコールバック
 */
function showHordeModeSettings(currentValue = false, onChangeCallback = null) {
  try {
    // speechManagerからホード夜モード設定関数を呼び出す
    if (window.speechManager && window.speechManager.showHordeModeToggle) {
      window.speechManager.showHordeModeToggle(currentValue, (newValue) => {
        logDebug(`ホード夜モード設定が変更されました: ${newValue}`);
        
        // アプリケーション設定に保存
        if (window.electronAPI && window.electronAPI.saveSettings) {
          window.electronAPI.saveSettings({ 
            hordeMode: newValue 
          }).catch(err => logError(`設定保存エラー: ${err.message}`));
        }
        
        // コールバックがあれば実行
        if (typeof onChangeCallback === 'function') {
          onChangeCallback(newValue);
        }
      });
    } else {
      logError('speechManagerが見つからないかshowHordeModeToggle関数が利用できません');
    }
  } catch (err) {
    logError(`ホード夜モード設定表示エラー: ${err.message}`);
  }
}

/**
 * 複数設定項目を含む設定UIテスト関数
 */
function showMultipleSettings() {
  try {
    // 現在の設定値を取得
    const isHordeModeEnabled = window.speechManager?.getHordeModeState() || false;
    
    // 複数の設定項目を含むUIペイロードを作成
    const settingsPayload = {
      id: "multiple_settings",
      type: "setting",
      text: "アプリの設定を変更できるよ。何か変えたい設定はある？",
      emotion: "normal",
      uiPayload: [
        {
          type: "toggle",
          label: "ホード夜モード",
          description: "夜間にゾンビの出現頻度が上がります",
          value: isHordeModeEnabled,
          onChange: (newValue) => {
            // ホード夜モードの状態を更新
            window.speechManager?.setHordeModeState(newValue);
            logDebug(`ホード夜モード設定変更: ${newValue}`);
            
            // 設定を保存
            if (window.electronAPI && window.electronAPI.saveSettings) {
              window.electronAPI.saveSettings({ hordeMode: newValue })
                .catch(err => logError(`設定保存エラー: ${err.message}`));
            }
          }
        },
        {
          type: "toggle",
          label: "自動音声読み上げ",
          description: "セリフを自動的に音声合成で読み上げます",
          value: true,
          onChange: (newValue) => {
            logDebug(`自動音声読み上げ設定変更: ${newValue}`);
            // 実際の処理はここに実装
          }
        },
        {
          type: "toggle",
          label: "常に最前面表示",
          value: false,
          onChange: (newValue) => {
            logDebug(`常に最前面表示設定変更: ${newValue}`);
            // 実際の処理はここに実装
          }
        }
      ]
    };
    
    // 設定UIを表示
    window.speechManager?.speakWithObject(settingsPayload);
    
  } catch (err) {
    logError(`複数設定項目表示エラー: ${err.message}`);
  }
}

// グローバルスコープに公開（開発者ツールからアクセスできるように）
if (typeof window !== 'undefined') {
  window.showHordeModeSettings = showHordeModeSettings;
  window.showMultipleSettings = showMultipleSettings;
}

// ショートカットキー設定：
// Alt+H: ホード夜モード設定トグル表示
// Alt+S: 複数設定項目表示
document.addEventListener('keydown', (e) => {
  // Alt+H: ホード夜モード設定
  if (e.altKey && e.key === 'h') {
    const currentValue = window.speechManager?.getHordeModeState() || false;
    showHordeModeSettings(currentValue);
  }
  
  // Alt+S: 複数設定項目表示
  if (e.altKey && e.key === 's') {
    showMultipleSettings();
  }
});

/**
 * 右クリック（コンテキストメニュー）の設定
 * @description 秘書たんウィンドウで右クリックしたときの動作を設定します
 */
function setupContextMenuEvents() {
  // 右クリックイベントを設定する要素候補のリスト
  const possibleContainers = [
    document.querySelector('.assistant-container'), // 古い全画面オーバーレイ用
    document.querySelector('.paw-button-wrapper'),  // 現在のpaw.html用
    document.getElementById('assistantImage')       // 秘書たん画像自体
  ];
  
  // 有効なコンテナを見つける
  const validContainers = possibleContainers.filter(container => container !== null);
  
  if (validContainers.length === 0) {
    logWarn('右クリックイベント設定：有効な要素が見つかりませんでした。.assistant-containerまたは.paw-button-wrapperが存在するか確認してください。🚨');
    return;
  }
  
  logDebug(`右クリックイベント設定：${validContainers.length}個の要素に右クリックイベントを設定します 📝`);
  
  // 各有効なコンテナに右クリックイベントを設定
  validContainers.forEach(container => {
    container.addEventListener('contextmenu', (event) => {
      // デフォルトのコンテキストメニューを抑制
      event.preventDefault();
      
      // イベントの伝播を停止（バブリングを防止）
      event.stopPropagation();
      
      // イベント発生元要素をログ出力
      const elementInfo = container.id 
        ? `#${container.id}` 
        : container.className 
          ? `.${container.className.split(' ')[0]}` 
          : 'unknown';
      logDebug(`右クリックイベント発生: ${elementInfo} 要素 🖱️`);
      
      // 現在のホード夜モードの状態を取得
      const currentHordeModeState = window.speechManager?.getHordeModeState() || false;
      
      // ホード夜モード設定UIを表示
      if (window.speechManager && window.speechManager.showHordeModeToggle) {
        logDebug('右クリックでホード夜モード設定UIを表示します 🎮');
        window.speechManager.showHordeModeToggle(currentHordeModeState);
        
        // 設定UIの自動非表示タイマーを設定
        setupAutoHideSetting();
      } else {
        logError('speechManager.showHordeModeToggleが利用できません 🚨');
      }
    });
    
    // イベント登録のログ出力
    const elementInfo = container.id 
      ? `#${container.id}` 
      : container.className 
        ? `.${container.className.split(' ')[0]}` 
        : 'unknown';
    logDebug(`右クリックイベント設定：${elementInfo}に設定完了 ✅`);
  });
  
  // 追加：全体のcontextmenuイベントも捕捉（他の要素からのバブリングをキャッチ）
  document.addEventListener('contextmenu', (event) => {
    // assistantImageまたはpaw-button-wrapperの子孫要素からのイベントかチェック
    const isFromAssistant = event.composedPath().some(el => {
      if (el instanceof Element) {
        return el.id === 'assistantImage' || 
               el.classList?.contains('paw-button-wrapper') ||
               el.classList?.contains('assistant-container');
      }
      return false;
    });
    
    if (isFromAssistant) {
      event.preventDefault();
      logDebug('秘書たん関連要素からの右クリックイベントをdocumentで捕捉しました 🔍');
      
      // 既に個別要素で処理済みの場合は実行しない（二重実行防止）
      if (event.defaultPrevented) {
        return;
      }
      
      // 現在のホード夜モードの状態を取得して設定UIを表示
      const currentHordeModeState = window.speechManager?.getHordeModeState() || false;
      if (window.speechManager?.showHordeModeToggle) {
        window.speechManager.showHordeModeToggle(currentHordeModeState);
        setupAutoHideSetting();
      }
    }
  });
  
  // 吹き出し内の右クリックイベントリスナー（すでに吹き出しが表示されている場合）
  const speechBubble = document.getElementById('speechBubble');
  if (speechBubble) {
    speechBubble.addEventListener('contextmenu', (event) => {
      // デフォルトのコンテキストメニューを抑制
      event.preventDefault();
      event.stopPropagation();
      logDebug('吹き出し内で右クリックが発生しました 💬');
      
      // 吹き出しが既に表示されている場合は特に何もしない
      // または特定のアクションを追加することも可能
    });
  }
  
  logDebug('右クリックイベントリスナーの設定が完了しました ✨');
}

/**
 * 設定UI表示後の自動非表示タイマーを設定
 */
function setupAutoHideSetting() {
  // 吹き出し要素を取得
  const speechBubble = document.getElementById('speechBubble');
  if (!speechBubble) return;
  
  // マウスが離れたときの状態管理
  let mouseLeftTime = null;
  let autoHideTimerId = null;
  
  // マウス侵入時のイベントハンドラ
  const handleMouseEnter = () => {
    // タイマーをクリア
    if (autoHideTimerId) {
      clearTimeout(autoHideTimerId);
      autoHideTimerId = null;
    }
    mouseLeftTime = null;
    
    // CSS用のクラスを追加して表示を維持
    speechBubble.classList.add('keep-visible');
  };
  
  // マウスが離れたときのイベントハンドラ
  const handleMouseLeave = () => {
    // 表示維持用のクラスを削除
    speechBubble.classList.remove('keep-visible');
    mouseLeftTime = Date.now();
    
    // 3秒後に非表示にする
    autoHideTimerId = setTimeout(() => {
      hideSpeechBubble();
      
      // イベントリスナーを削除
      speechBubble.removeEventListener('mouseenter', handleMouseEnter);
      speechBubble.removeEventListener('mouseleave', handleMouseLeave);
      
      logDebug('設定UI吹き出しを自動的に非表示にしました');
    }, 3000);
  };
  
  // 既存のイベントリスナーを一度削除してからセット
  speechBubble.removeEventListener('mouseenter', handleMouseEnter);
  speechBubble.removeEventListener('mouseleave', handleMouseLeave);
  
  // 新しいイベントリスナーを追加
  speechBubble.addEventListener('mouseenter', handleMouseEnter);
  speechBubble.addEventListener('mouseleave', handleMouseLeave);
  
  // いずれにしても10秒後には強制的に非表示
  setTimeout(() => {
    // マウスが長時間その上にある場合は非表示にしない
    if (!mouseLeftTime || Date.now() - mouseLeftTime > 3000) {
      return;
    }
    
    if (autoHideTimerId) {
      clearTimeout(autoHideTimerId);
      autoHideTimerId = null;
    }
    
    // 吹き出しを非表示
    hideSpeechBubble();
    
    // イベントリスナーを削除
    speechBubble.removeEventListener('mouseenter', handleMouseEnter);
    speechBubble.removeEventListener('mouseleave', handleMouseLeave);
    
    logDebug('設定UI吹き出しを強制的に非表示にしました（タイムアウト）');
  }, 10000);
  
  logDebug('設定UI吹き出しの自動非表示タイマーを設定しました');
}

/**
 * 吹き出しを非表示にするヘルパー関数
 * 利用可能なAPI/メソッドに応じて適切な非表示処理を行う
 */
function hideSpeechBubble() {
  const speechBubble = document.getElementById('speechBubble');
  if (!speechBubble) return;
  
  try {
    // 方法1: speechManagerのhideBubble関数を使用
    if (window.speechManager && typeof window.speechManager.hideBubble === 'function') {
      window.speechManager.hideBubble();
      return;
    }
    
    // 方法2: uiHelperからインポートしたhideBubble関数を使用
    if (typeof hideBubble === 'function') {
      hideBubble();
      return;
    }
    
    // 方法3: スタイルで直接非表示に
    speechBubble.className = 'speech-bubble hide';
    speechBubble.style.opacity = '0';
    speechBubble.style.visibility = 'hidden';
    
    setTimeout(() => {
      speechBubble.style.display = 'none';
    }, 300);
    
    logDebug('吹き出しを直接スタイルで非表示にしました');
  } catch (err) {
    logError(`吹き出し非表示処理でエラー: ${err.message}`);
    
    // エラー発生時は直接スタイルで非表示に
    if (speechBubble) {
      speechBubble.style.display = 'none';
      speechBubble.style.visibility = 'hidden';
      speechBubble.style.opacity = '0';
    }
  }
}