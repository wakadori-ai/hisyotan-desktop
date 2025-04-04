// speechBubble.js
// 吹き出し表示・非表示・テキスト処理を担当するモジュール

import { logDebug, logError, logZombieWarning } from '@core/logger.js';
import { hideBubble } from '@ui/handlers/bubbleManager.js';

// DOM要素
let speechBubble;
let speechText;

/**
 * 吹き出し関連のDOM要素を初期化する
 */
export function initSpeechBubbleElements() {
  logDebug('吹き出し要素初期化を開始');
  
  // 要素の取得
  speechBubble = document.getElementById('speechBubble');
  speechText = document.getElementById('speechText');
  
  // 各要素の存在確認とログ
  if (speechBubble) {
    logDebug('speechBubble要素を取得しました');
  } else {
    logError('speechBubble要素が見つかりません');
  }
  
  if (speechText) {
    logDebug('speechText要素を取得しました');
  } else {
    logError('speechText要素が見つかりません');
    
    // speechBubbleが存在してspeechTextが存在しない場合、自動的に作成
    if (speechBubble) {
      logDebug('speechText要素を自動作成します');
      speechText = document.createElement('div');
      speechText.id = 'speechText';
      speechText.className = 'speech-text';
      speechBubble.appendChild(speechText);
    }
  }
  
  logDebug('吹き出し要素初期化が完了しました');
}

/**
 * 吹き出しを表示する
 * @param {string} eventType - イベントタイプ（オプション）
 * @param {string} text - 表示するテキスト
 */
export function showBubble(eventType = 'default', text) {
  // デフォルトのテキストを設定
  if (!text) {
    text = 'こんにちは！何かお手伝いしましょうか？';
  }
  
  // ログ出力
  const isZombieWarning = eventType === 'zombie_warning';
  if (isZombieWarning) {
    logZombieWarning(`吹き出しを表示します... (イベント: ${eventType})`);
  } else {
    logDebug(`吹き出しを表示します... (イベント: ${eventType}) - テキスト: ${text.substring(0, 20)}...`);
  }
  
  // DOM要素の取得確認
  if (!speechBubble) {
    speechBubble = document.getElementById('speechBubble');
    if (!speechBubble) {
      logError('speechBubble要素が見つかりません。表示できません。');
      return;
    }
  }
  
  // speechText要素の確認と取得
  if (!speechText) {
    speechText = document.getElementById('speechText');
    if (!speechText && speechBubble) {
      logDebug('speechText要素が見つからないため作成します');
      speechText = document.createElement('div');
      speechText.id = 'speechText';
      speechText.className = 'speech-text';
      speechBubble.appendChild(speechText);
    }
  }
  
  // テキストを設定
  if (speechText && text) {
    setText(text);
  }
  
  // スタイル設定前の状態をデバッグ出力
  if (isZombieWarning) {
    logZombieWarning('表示前の吹き出し状態:');
    debugBubbleStyles();
  }
  
  // ❶ hideクラスを確実に削除
  speechBubble.classList.remove('hide');
  
  // ❷ クラスのリセットとスタイル初期化
  // 現在のクラスをすべてクリアせず、基本クラスとshowのみ設定
  speechBubble.className = 'speech-bubble';
  
  // ❸ 表示のための直接スタイル設定（強制的に上書き）
  speechBubble.style.cssText = `
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    z-index: 2147483647 !important;
    pointer-events: auto !important;
  `;
  
  // ❹ リフローの強制（スタイル適用を確実にするため）
  void speechBubble.offsetWidth;
  
  // ❺ クラスの追加（showクラスを最後に追加）
  speechBubble.classList.add('show');
  if (isZombieWarning) {
    speechBubble.classList.add('zombie-warning');
  }
  
  // ❻ スタイル上書きの追加保険（クラスだけでは不十分な場合のため）
  setTimeout(() => {
    // 確実に表示状態にする最終チェック
    const computedStyle = window.getComputedStyle(speechBubble);
    if (computedStyle.display !== 'flex' || 
        computedStyle.visibility !== 'visible' || 
        parseFloat(computedStyle.opacity) < 0.9) {
      
      console.log('[showBubble] 表示状態が不完全です。強制表示を実行します');
      
      // 最も強力な表示方法で強制表示
      speechBubble.style.cssText = `
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
      `;
    }
    
    // MutationObserverで状態監視開始
    if (!window._speechTextObserverAttached) {
      // 別モジュールから呼び出し
      if (typeof window.speechObserver?.observeSpeechTextAutoRecovery === 'function') {
        window.speechObserver.observeSpeechTextAutoRecovery();
      }
    }
    
    // 表示後の状態を確認
    debugBubbleStyles();
  }, 50);
  
  logDebug(`吹き出し表示設定完了: クラス=${speechBubble.className}`);
}

/**
 * 吹き出しにテキストを設定する
 * @param {string} text - 表示するテキスト
 */
export function setText(text) {
  if (!text) {
    logError('setText: テキストが空です');
    return;
  }

  logDebug(`テキスト設定開始: "${text}"`);
  
  // MutationObserverが既に存在する場合はリセット
  if (window._speechTextObserver) {
    window._speechTextObserver.disconnect();
    window._speechTextObserver = null;
    window._speechTextObserverAttached = false;
    logDebug('既存のMutationObserverをリセットしました');
  }
  
  // 吹き出し要素の取得
  const bubble = document.getElementById('speechBubble');
  if (!bubble) {
    logError('speechBubble要素が見つかりません。表示できません');
    return;
  }
  
  // speechText要素の取得または作成
  let textElement = document.getElementById('speechText');
  
  if (!textElement) {
    logDebug('speechText要素が見つかりません。新規作成します');
    
    // 新しいspeechText要素を作成
    textElement = document.createElement('div');
    textElement.id = 'speechText';
    textElement.className = 'speech-text';
    
    // 適切な位置に挿入（アイコンやUIの前に配置）
    // 通常、テキストは最初の要素なので、最初の子要素として挿入
    bubble.insertBefore(textElement, bubble.firstChild);
    logDebug('新しいspeechText要素を作成して吹き出しに挿入しました');
    
    // グローバル変数を更新
    speechText = textElement;
  }
  
  // テキストを複数の方法で設定（確実に表示されるようにするため）
  textElement.textContent = text;
  textElement.innerText = text;
  textElement.innerHTML = text;
  
  // データ属性にも保存（バックアップ）
  textElement.dataset.originalText = text;
  
  // 強制再描画トリガー
  void textElement.offsetHeight;
  textElement.style.transform = 'scale(1.00001)';
  
  // 必要に応じて保険設定（Electron特有の問題対策）
  setTimeout(() => {
    if (textElement && textElement.textContent.trim() === '') {
      logZombieWarning('テキストが空です。強制再設定します');
      
      // データ属性から復元を試みる
      const originalText = textElement.dataset.originalText || text;
      
      // すべての方法で再設定
      textElement.textContent = originalText;
      textElement.innerText = originalText;
      textElement.innerHTML = originalText;
      
      // 強制再描画のためにCSSプロパティを一時的に変更
      const originalDisplay = textElement.style.display;
      textElement.style.display = 'inline-block';
      void textElement.offsetHeight;
      textElement.style.display = originalDisplay;
    }
  }, 0);
  
  logDebug(`テキスト設定完了: "${text}"`);
}

/**
 * 吹き出しを表示状態に維持する（マウスホバー時）
 */
export function keepBubbleVisible() {
  logDebug('吹き出しにマウスが入りました。表示を維持します');
  
  // 既存の非表示タイマーをクリア
  if (window.hideTimeoutMap && window.hideTimeoutMap.size > 0) {
    for (const [key, timerId] of window.hideTimeoutMap.entries()) {
      clearTimeout(timerId);
      logDebug(`タイマー ${key} をクリアしました`);
    }
    window.hideTimeoutMap.clear();
  }
  
  // 吹き出しに特別なクラスを追加
  if (speechBubble) {
    speechBubble.classList.add('keep-visible');
  }
}

/**
 * 吹き出しの自動非表示を許可する（マウスリーブ時）
 */
export function allowBubbleHide() {
  logDebug('吹き出しからマウスが離れました。表示維持を解除します');
  
  // 吹き出しから特別なクラスを削除
  if (speechBubble) {
    speechBubble.classList.remove('keep-visible');
  }
}

/**
 * 吹き出しのスタイル状態をデバッグ出力
 * @return {Object} 吹き出しのスタイル情報
 */
export function debugBubbleStyles() {
  const speechBubble = document.getElementById('speechBubble');
  if (!speechBubble) {
    console.log('speechBubble要素が見つかりません');
    return null;
  }
  
  const computedStyle = window.getComputedStyle(speechBubble);
  const classes = speechBubble.className;
  
  // テキスト要素のチェック
  const textElement = document.getElementById('speechText');
  const textContent = textElement ? textElement.textContent : 'テキスト要素なし';
  const textDisplay = textElement ? window.getComputedStyle(textElement).display : 'N/A';
  
  const styleInfo = {
    display: computedStyle.display,
    visibility: computedStyle.visibility,
    opacity: computedStyle.opacity,
    zIndex: computedStyle.zIndex,
    classes,
    text: textContent.substring(0, 30) + (textContent.length > 30 ? '...' : ''),
    textDisplay
  };
  
  console.log('吹き出しのスタイル情報:', styleInfo);
  return styleInfo;
}

/**
 * 吹き出しの表示状態を強制的にリセットして表示
 * 緊急時のみ使用
 */
export function forceResetAndShowBubble() {
  const speechBubble = document.getElementById('speechBubble');
  if (!speechBubble) {
    console.log('forceResetAndShowBubble: speechBubble要素が見つかりません');
    return;
  }
  
  console.log('吹き出し表示を強制リセットします...');
  
  // リセット前の状態を確認
  debugBubbleStyles();
  
  // 全てをリセット
  speechBubble.className = '';
  speechBubble.removeAttribute('style');
  
  // リフローを強制
  void speechBubble.offsetWidth;
  
  // 基本クラスを設定
  speechBubble.className = 'speech-bubble';
  
  // 強制的に表示状態にする
  speechBubble.style.cssText = `
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: absolute !important;
    z-index: 2147483647 !important;
    top: 20% !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    pointer-events: auto !important;
  `;
  
  // 最後に show クラスを追加
  setTimeout(() => {
    speechBubble.classList.add('show');
    console.log('強制表示処理完了:');
    debugBubbleStyles();
  }, 20);
}

/**
 * 吹き出し表示のテスト
 * 開発・デバッグ用の機能
 * @param {number} [timeout=3000] - 表示から非表示までの時間（ミリ秒）
 * @param {string} [text='吹き出し表示テスト中...'] - 表示するテキスト
 * @param {boolean} [isZombie=false] - ゾンビ警告モードで表示するかどうか
 */
export function testBubbleDisplay(timeout = 3000, text = '吹き出し表示テスト中...', isZombie = false) {
  console.log('=== 🧪 吹き出し表示テストを実行します ===');
  console.log(`📝 パラメータ: timeout=${timeout}ms, zombie=${isZombie}`);
  
  // DOM要素確認
  const speechBubble = document.getElementById('speechBubble');
  const speechText = document.getElementById('speechText');
  
  if (!speechBubble) {
    console.error('❌ speechBubble要素が見つかりません！テストを中止します。');
    return;
  }
  
  if (!speechText) {
    console.warn('⚠️ speechText要素が見つかりません。テキスト設定をスキップします。');
  } else {
    // テキスト設定
    speechText.textContent = text;
    console.log(`✏️ テキスト設定: "${text}"`);
  }
  
  // 現在の表示状態をデバッグ出力
  console.log('📊 テスト前の吹き出し状態:');
  debugBubbleStyles();
  
  // テストID生成（ログ識別用）
  const testId = Math.floor(Math.random() * 1000);
  console.log(`🆔 テストID: ${testId}`);
  
  // 表示処理
  console.log(`▶️ [${testId}] showBubble() を実行します...`);
  showBubble(isZombie ? 'zombie_warning' : 'default');
  
  // 表示直後の状態確認
  setTimeout(() => {
    console.log(`⏱️ [${testId}] showBubble() 実行から 50ms 経過`);
    const status = debugBubbleStyles();
    validateBubbleStatus(status, true);
  }, 50);
  
  // 表示中の状態を一定時間後に確認
  setTimeout(() => {
    console.log(`⏱️ [${testId}] 表示から ${timeout / 2}ms 経過時の状態確認:`);
    const status = debugBubbleStyles();
    validateBubbleStatus(status, true);
  }, timeout / 2);
  
  // 指定時間後に非表示化
  setTimeout(() => {
    console.log(`⏱️ [${testId}] ${timeout}ms 経過したため hideBubble() を実行します...`);
    hideBubble();
    
    // 非表示後の状態確認
    setTimeout(() => {
      console.log(`⏱️ [${testId}] hideBubble() 実行から 150ms 経過時の状態確認:`);
      const status = debugBubbleStyles();
      validateBubbleStatus(status, false);
      
      console.log(`✅ [${testId}] 吹き出し表示テスト完了`);
    }, 150);
  }, timeout);
  
  console.log(`🔄 [${testId}] テスト実行中... ${timeout + 200}ms 後に完了予定`);
}

/**
 * 吹き出しの状態を検証してレポート
 * @private
 * @param {Object} status - debugBubbleStyles() の戻り値
 * @param {boolean} shouldBeVisible - 表示されているべきかどうか
 * @return {boolean} 期待通りの状態かどうか
 */
function validateBubbleStatus(status, shouldBeVisible) {
  if (!status) {
    console.error('❌ 吹き出し状態の取得に失敗しました');
    return false;
  }
  
  const { display, visibility, opacity } = status.computedStyle;
  const isVisible = visibility === 'visible' && parseFloat(opacity) > 0.5 && display !== 'none';
  const hasShowClass = status.classes.includes('show');
  const hasHideClass = status.classes.includes('hide');
  const hasImportant = status.inlineStyle && status.inlineStyle.includes('!important');
  
  console.log('🔍 吹き出し状態分析:');
  console.log(`- 視覚的に表示: ${isVisible ? '✅ YES' : '❌ NO'} (display=${display}, visibility=${visibility}, opacity=${opacity})`);
  console.log(`- クラス状態: ${hasShowClass ? '🟢 show' : '⚪️ no-show'} / ${hasHideClass ? '🔴 hide' : '⚪️ no-hide'}`);
  console.log(`- !important使用: ${hasImportant ? '✅ YES' : '❌ NO'}`);
  
  if (shouldBeVisible) {
    // 表示されているべき場合のチェック
    if (isVisible && hasShowClass && !hasHideClass) {
      console.log('✅ 期待通り表示されています');
      return true;
    } else {
      console.error('❌ 期待通り表示されていません');
      console.log('- 期待: display=flex, visibility=visible, opacity>0.5, show クラスあり, hide クラスなし');
      return false;
    }
  } else {
    // 非表示であるべき場合のチェック
    if (!isVisible && !hasShowClass && hasHideClass) {
      console.log('✅ 期待通り非表示になっています');
      return true;
    } else {
      console.error('❌ 期待通り非表示になっていません');
      console.log('- 期待: display=none, visibility=hidden, opacity=0, show クラスなし, hide クラスあり');
      return false;
    }
  }
}

/**
 * 吹き出し表示の複数回切り替えテスト
 * 表示と非表示を連続で切り替えて安定性を確認
 * @param {number} [cycles=3] - テストサイクル数
 * @param {number} [interval=1000] - 各状態の表示時間（ミリ秒）
 */
export function testBubbleToggle(cycles = 3, interval = 1000) {
  console.log(`=== 🔄 吹き出し表示切り替えテスト開始 (${cycles}サイクル) ===`);
  
  // テストID生成（ログ識別用）
  const testId = Math.floor(Math.random() * 1000);
  console.log(`🆔 テストID: ${testId}`);
  
  let currentCycle = 0;
  let isVisible = false;
  
  // DOM要素確認
  const speechBubble = document.getElementById('speechBubble');
  const speechText = document.getElementById('speechText');
  
  if (!speechBubble) {
    console.error('❌ speechBubble要素が見つかりません！テストを中止します。');
    return;
  }
  
  // テキスト設定
  if (speechText) {
    speechText.textContent = `トグルテスト中... (ID: ${testId})`;
    console.log(`✏️ テキスト設定: "トグルテスト中... (ID: ${testId})"`);
  }
  
  // 初期状態を非表示に強制設定
  hideBubble();
  console.log(`▶️ [${testId}] 初期状態を非表示に設定しました`);
  
  // テスト状態の詳細を出力
  console.log(`📊 [${testId}] テスト設定: ${cycles}サイクル × ${interval}ms間隔`);
  console.log(`⏱️ [${testId}] 推定完了時間: ${new Date(Date.now() + (cycles * interval * 2)).toLocaleTimeString()}`);
  
  // 定期的に表示・非表示を切り替える
  const toggleInterval = setInterval(() => {
    isVisible = !isVisible;
    
    if (isVisible) {
      // 表示処理
      console.log(`▶️ [${testId}] サイクル ${currentCycle + 1}/${cycles}: showBubble() 実行`);
      showBubble();
      
      // 表示状態確認
      setTimeout(() => {
        console.log(`🔍 [${testId}] サイクル ${currentCycle + 1}/${cycles}: 表示状態確認`);
        const status = debugBubbleStyles();
        validateBubbleStatus(status, true);
      }, Math.min(interval / 3, 300));
    } else {
      // 非表示処理
      console.log(`▶️ [${testId}] サイクル ${currentCycle + 1}/${cycles}: hideBubble() 実行`);
      hideBubble();
      
      // 非表示状態確認
      setTimeout(() => {
        console.log(`🔍 [${testId}] サイクル ${currentCycle + 1}/${cycles}: 非表示状態確認`);
        const status = debugBubbleStyles();
        validateBubbleStatus(status, false);
      }, Math.min(interval / 3, 300));
      
      currentCycle++;
      
      // 全サイクル完了したかチェック
      if (currentCycle >= cycles) {
        clearInterval(toggleInterval);
        console.log(`✅ [${testId}] 吹き出し表示切り替えテスト完了 (${cycles}サイクル)`);
        
        // 最終状態を非表示に設定
        setTimeout(() => {
          console.log(`🧹 [${testId}] テスト終了処理: 最終状態を非表示に設定`);
          hideBubble();
        }, 100);
      }
    }
  }, interval);
  
  return testId; // テストIDを返す（テスト識別用）
}

// グローバルアクセス用のオブジェクトをエクスポート
export const speechBubbleModule = {
  initSpeechBubbleElements,
  showBubble,
  setText,
  keepBubbleVisible,
  allowBubbleHide,
  debugBubbleStyles,
  forceResetAndShowBubble,
  testBubbleDisplay,
  testBubbleToggle
}; 