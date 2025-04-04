// renderer.js
// 秘書たんのUI制御用エントリポイント

// スタイルシートをインポート
// import '@ui/styles.css';

// 肉球UIをインポート（重要：これがないとpaw.jsが読み込まれない）
import '@ui/paw.js';

// コア機能のインポート
import { logDebug, logError, saveErrorLog } from '@core/logger.js';
import { loadConfig } from '@config/configLoader.js';
import { initUIElements, showError, shouldShowError } from '@ui/uiHelper.js';
import { initExpressionElements, setExpression } from '@emotion/expressionManager.js';
import { setConfig as setWebSocketConfig, initWebSocket } from '@core/websocketHandler.js';
import { setConfig as setSpeechConfig, checkVoicevoxConnection } from '@emotion/speechManager.js';
import { initRandomLines } from '@emotion/emotionHandler.js';
import zombieOverlayManager from '@ui/overlayManager.js';

// 分割したハンドラーのインポート
import { setupMouseEventHandling } from '@ui/handlers/setupMouseEvents.js';
import { setupContextMenuEvents } from '@ui/handlers/contextMenuHandler.js';
import { setupWindowAnimations } from '@ui/handlers/animationHandler.js';
import { setupDebugPanel } from '@ui/handlers/debugPanel.js';
import { setupAssistantImage } from '@ui/handlers/assistantImage.js';
import { loadAndApplySettings } from '@ui/handlers/settingsLoader.js';
import { showBubble, hideBubble } from '@ui/handlers/bubbleManager.js';
// レイアウトマネージャーをインポート
import { setupLayoutManager } from '@ui/handlers/layoutManager.js';

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
    
    // デバッグ用グローバル公開
    if (typeof window !== 'undefined') {
      window.zombieOverlayManager = zombieOverlayManager;
      window.showBubble = showBubble;
      window.hideBubble = hideBubble;
    }
    
    // バックエンドとの接続
    initWebSocket();
    
    // VOICEVOXの接続確認
    checkVoicevoxConnection().catch(error => {
      logDebug(`VOICEVOX接続確認中のエラー: ${error.message}`);
    });
    
    // ランダムセリフの初期化
    try {
      logDebug('ランダムセリフ機能を初期化しています...');
      const randomController = initRandomLines(30000);
      
      // グローバルスコープに保存
      if (typeof window !== 'undefined') {
        window.randomLinesController = randomController;
        window.initRandomLines = initRandomLines;
        logDebug('ランダムセリフ機能をグローバルに公開しました');
      }
    } catch (error) {
      logDebug(`ランダムセリフ初期化エラー: ${error.message}`);
      saveErrorLog(error);
    }
    
    // 各機能の初期化
    setupWindowAnimations();
    setupMouseEventHandling();
    await loadAndApplySettings();
    setupAssistantImage();
    setupDebugPanel();
    setupContextMenuEvents();
    // レイアウトマネージャーの初期化
    setupLayoutManager();
    
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
console.log('renderer.js: すべての初期化処理が構成されました'); 