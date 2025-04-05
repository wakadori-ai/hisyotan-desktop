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
  const callStackTrace = new Error().stack;
  console.log(`📝 [setText] 呼び出し元スタック: ${callStackTrace}`);
  
  if (!text || text.trim() === '') {
    logError('setText: テキストが空です。フォールバックテキストを使用します');
    text = '...'; // フォールバックメッセージを設定
  }

  // 確実にspeechTextを取得
  if (!speechText) {
    speechText = document.getElementById('speechText');
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
    // 新しいspeechText要素を作成
    textElement = document.createElement('div');
    textElement.id = 'speechText';
    textElement.className = 'speech-text';
    
    // 吹き出しの先頭に挿入
    bubble.insertBefore(textElement, bubble.firstChild);
    
    // グローバル変数を更新
    speechText = textElement;
    
    // ログで確認
    console.log('新しいspeechText要素を作成しました', textElement);
  }
  
  // 吹き出しの位置調整（画面内に確実に表示されるように）
  if (bubble) {
    // 吹き出しが画面内に収まるよう位置を調整
    const windowHeight = window.innerHeight;
    if (windowHeight < 600) {
      // 小さい画面サイズの場合は上部に表示
      bubble.style.top = '10px';
      bubble.style.bottom = 'auto';
    } else {
      // 通常サイズの画面では、画面の中央より少し上に表示
      const assistantImg = document.getElementById('assistantImage');
      if (assistantImg) {
        const imgRect = assistantImg.getBoundingClientRect();
        if (imgRect.top > 0) {
          // 立ち絵の上に配置
          bubble.style.bottom = `${windowHeight - imgRect.top + 10}px`;
        } else {
          // 立ち絵が見つからない場合はデフォルト位置
          bubble.style.bottom = '300px';
        }
      } else {
        bubble.style.bottom = '300px';
      }
    }
    bubble.style.right = '5px';
    
    // 吹き出しの表示を強制
    bubble.style.cssText += `
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: fixed !important;
      z-index: 9999 !important;
    `;
  }
  
  console.log(`📝 [setText] テキスト設定前の状態:`, {
    textElementExists: !!textElement,
    currentTextContent: textElement ? textElement.textContent : 'なし',
    bubbleDisplayStyle: bubble ? bubble.style.display : 'なし',
    bubbleVisibility: bubble ? bubble.style.visibility : 'なし',
    bubbleOpacity: bubble ? bubble.style.opacity : 'なし'
  });
  
  // テキストを設定（すべての方法で試す）
  textElement.innerHTML = ''; // 内容をクリア
  
  // 明示的なスタイルを持つspanを作成して追加
  const spanElement = document.createElement('span');
  spanElement.textContent = text;
  spanElement.className = 'speech-text-content';
  spanElement.style.cssText = `
    color: #4e3b2b !important; 
    display: inline-block !important;
    visibility: visible !important;
    opacity: 1 !important;
    width: 100% !important;
    font-size: 1.05rem !important;
    line-height: 1.6 !important;
  `;
  textElement.appendChild(spanElement);
  
  // データ属性に保存
  textElement.dataset.originalText = text;
  textElement.dataset.setTime = Date.now().toString();
  
  // テキスト要素自体のスタイルも強制的に設定
  textElement.style.cssText += `
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    color: #4e3b2b !important;
    font-size: 1.05rem !important;
    line-height: 1.6 !important;
    width: 100% !important;
  `;
  
  // テスト用にログ出力
  console.log('テキスト設定完了:', {
    element: textElement,
    text: text,
    content: textElement.textContent,
    innerText: textElement.innerText,
    boundingRect: textElement.getBoundingClientRect(),
    bubbleRect: bubble ? bubble.getBoundingClientRect() : null
  });
  
  // 吹き出しを表示
  bubble.classList.add('show');
  bubble.classList.remove('hide');
  
  // 連続setText検出のためのMutationObserverを設定
  setupTextMonitor(textElement, text);
}

// テキスト要素の変更を監視するMutationObserver
let textChangeObserver = null;

/**
 * テキスト変更の監視を設定
 * @param {HTMLElement} textElement - 監視対象のテキスト要素
 * @param {string} originalText - 設定された元のテキスト
 */
function setupTextMonitor(textElement, originalText) {
  // 既存のObserverがあれば切断
  if (textChangeObserver) {
    textChangeObserver.disconnect();
  }
  
  // 新しいObserverを設定
  textChangeObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // テキストが変更されたか空になった場合
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        const currentText = textElement.textContent || '';
        
        // テキストが空になった、または変更された場合
        if (!currentText || currentText !== originalText) {
          console.warn(`⚠️ [TextMonitor] テキストが変更されました: "${originalText}" → "${currentText}"`, {
            mutationType: mutation.type,
            target: mutation.target,
            addedNodes: Array.from(mutation.addedNodes).map(n => n.nodeName),
            removedNodes: Array.from(mutation.removedNodes).map(n => n.nodeName)
          });
          
          // 呼び出し元を特定するためのスタックトレース
          console.warn(`⚠️ [TextMonitor] 変更検出時のスタック: ${new Error().stack}`);
          
          // テキストが空になった場合は再設定
          if (!currentText && originalText) {
            console.log(`🔄 [TextMonitor] テキストが空になったため再設定します: "${originalText}"`);
            
            // spanを再作成してテキストを復元
            const newSpan = document.createElement('span');
            newSpan.textContent = originalText;
            newSpan.className = 'speech-text-content recovered';
            newSpan.style.cssText = `
              color: #4e3b2b !important; 
              display: inline-block !important;
              visibility: visible !important;
              opacity: 1 !important;
              width: 100% !important;
              font-size: 1.05rem !important;
              line-height: 1.6 !important;
            `;
            
            // 子要素をクリアして新しいspanを追加
            textElement.innerHTML = '';
            textElement.appendChild(newSpan);
            
            // データ属性を更新して回復したことを記録
            textElement.dataset.recovered = 'true';
            textElement.dataset.recoveryTime = Date.now().toString();
          }
        }
      }
    }
  });
  
  // テキスト要素とその子要素の変更を監視
  textChangeObserver.observe(textElement, {
    childList: true,
    characterData: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
  
  console.log(`🔍 [TextMonitor] テキスト "${originalText.substring(0, 20)}..." の監視を開始しました`);
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