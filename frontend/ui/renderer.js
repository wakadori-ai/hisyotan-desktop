// renderer.js
// 秘書たんのUI制御用エントリポイント

// スタイルシートをインポート
import '../styles.css';

import { logDebug, logError, saveErrorLog } from '@core/logger.js';
import { loadConfig } from '@config/configLoader.js';
import { initUIElements, showError, shouldShowError } from '@ui/uiHelper.js';
import { initExpressionElements, setExpression } from '@emotion/expressionManager.js';
import { setConfig as setWebSocketConfig, initWebSocket } from '@core/websocketHandler.js';
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
        
        console.log('秘書たんの設定を適用しました', config.assistant);
      }
    }
  } catch (error) {
    console.error('設定の読み込みと適用に失敗しました:', error);
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
    document.getElementById('overlayMenu')
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
          
          if (!isOverInteractive) {
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
    
    // 初期状態では無効化しておく
    window.electronAPI.disableMouseEvents();
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
      // クリックスルーが無効（つまりクリック可能）ならデバッグモード表示
      if (isDisabled) {
        document.body.classList.add('pointer-events-enabled');
        console.log('デバッグモード有効: クリック可能');
        
        // デバッグパネルを表示
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
          debugPanel.style.display = 'block';
        }
        
        // 操作可能状態を通知
        speak('操作モードが有効になりました。Alt+Cで元に戻せます。', 'normal', 3000);
      } else {
        document.body.classList.remove('pointer-events-enabled');
        console.log('デバッグモード無効: クリック透過');
        
        // デバッグパネルを非表示
        const debugPanel = document.getElementById('debug-panel');
        if (debugPanel) {
          debugPanel.style.display = 'none';
        }
        
        // クリックスルーモードに戻ったことを通知
        speak('クリック透過モードに戻りました', 'normal', 2000);
      }
    });
  } else {
    console.error('electronAPI.toggleClickThrough が利用できません');
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

function setupDebugPanel() {
  // 既存のdebug-panelがあれば削除
  const oldPanel = document.getElementById('floating-debug');
  if (oldPanel) oldPanel.remove();

  // 新しいデバッグパネルを作成
  const panel = document.createElement('div');
  panel.id = 'floating-debug';
  panel.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0,0,0,0.7);
    color: white;
    padding: 10px;
    border-radius: 5px;
    z-index: 999999;
    max-width: 300px;
    max-height: 400px;
    overflow: auto;
    font-size: 12px;
    font-family: monospace;
    pointer-events: auto;
  `;
  
  // ログエリア
  const logArea = document.createElement('div');
  logArea.id = 'debug-log';
  panel.appendChild(logArea);
  
  // テスト用ボタン
  const testButton = document.createElement('button');
  testButton.textContent = '画像サイズ確認';
  testButton.onclick = () => {
    const img = document.getElementById('assistantImage');
    logDebugToPanel(`画像サイズ: ${img.width}x${img.height}, style: ${img.style.cssText}`);
  };
  panel.appendChild(testButton);
  
  document.body.appendChild(panel);
  
  // デバッグ関数
  window.logDebugToPanel = function(message) {
    const logArea = document.getElementById('debug-log');
    if (logArea) {
      const entry = document.createElement('div');
      entry.textContent = message;
      logArea.appendChild(entry);
      
      // ファイルにも記録
      if (window.electronLogger && window.electronLogger.logToFile) {
        window.electronLogger.logToFile(message);
      }
      
      // 10行を超えたら古いものを削除
      while (logArea.children.length > 10) {
        logArea.removeChild(logArea.firstChild);
      }
    }
  };
}

// 表示・非表示アニメーションのセットアップ
function setupWindowAnimations() {
  // electronAPIが利用可能な場合のみ設定
  if (!window.electronAPI) return;
  
  // assistantContainerを取得
  const assistantContainer = document.querySelector('.assistant-container');
  if (!assistantContainer) {
    console.warn('assistant-containerが見つかりません。アニメーションは設定されません。');
    return;
  }
  
  // 表示アニメーションの準備
  window.electronAPI.onPrepareShowAnimation(() => {
    // cssアニメーション用のクラスを付与
    assistantContainer.classList.remove('hide-animation');
    assistantContainer.classList.add('show-animation');
    
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