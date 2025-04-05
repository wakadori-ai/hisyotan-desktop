/**
 * 吹き出しを表示する
 * @param {string} type - 吹き出しタイプ
 * @param {string} text - 表示テキスト
 */
export function showBubble(type = 'default', text = 'こんにちは！何かお手伝いしましょうか？') {
  console.log(`🗨️ 吹き出しを表示: ${type} - "${text.substring(0, 15)}..."`);
  
  // 既存の吹き出し要素をすべて取得（重複チェック用）
  const allBubbles = document.querySelectorAll('#speechBubble');
  if (allBubbles.length > 1) {
    console.log(`⚠️ 重複する吹き出し要素が ${allBubbles.length} 個見つかりました。クリーンアップします。`);
    cleanupDuplicateElements();
  }
  
  // 吹き出し要素の取得
  const bubble = document.getElementById('speechBubble') || speechBubble;
  if (!bubble) {
    console.log('💬 speechBubble要素が見つかりません。作成します。');
    createUI();
    return setTimeout(() => showBubble(type, text), 10);
  }
  
  // テキスト要素の取得
  const textElement = document.getElementById('speechText') || speechText;
  if (!textElement) {
    console.log('💬 speechText要素が見つかりません。作成します。');
    const newText = document.createElement('div');
    newText.id = 'speechText';
    newText.className = 'speech-text';
    // 明示的なスタイルを設定
    newText.style.cssText = `
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      color: #4e3b2b !important;
      width: 100% !important;
    `;
    bubble.appendChild(newText);
    speechText = newText;
  } else {
    // テキスト要素がspeechBubbleの子要素でない場合は追加
    if (!bubble.contains(textElement)) {
      console.log('⚠️ speechTextがspeechBubbleの子要素ではありません。追加します。');
      
      // 念のため既存の親から切り離す
      if (textElement.parentElement) {
        textElement.parentElement.removeChild(textElement);
      }
      
      // speechBubbleに追加
      bubble.appendChild(textElement);
    }
    
    // テキスト要素内の余分な要素をクリア
    textElement.innerHTML = '';
    // 明示的なスタイルを設定
    textElement.style.cssText = `
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      color: #4e3b2b !important;
      width: 100% !important;
    `;
  }
  
  // DOMの構造をログ出力
  console.log('💬 DOM構造確認:', {
    speechBubbleExists: !!bubble,
    speechTextExists: !!textElement,
    speechTextIsChildOfBubble: bubble?.contains(textElement),
    speechBubbleChildCount: bubble?.childElementCount || 0
  });
  
  // 吹き出しのスタイルを設定
  bubble.className = 'speech-bubble';
  bubble.classList.add('show');
  bubble.classList.add('fixed-position');
  
  // 吹き出しに明示的なスタイルを設定
  bubble.style.cssText = `
    display: flex !important; 
    visibility: visible !important; 
    opacity: 1 !important;
    z-index: 9999 !important;
  `;
  
  // タイプに応じたクラスを追加
  if (type === 'warning') {
    bubble.classList.add('warning');
  } else if (type === 'error') {
    bubble.classList.add('error');
  } else if (type === 'success') {
    bubble.classList.add('success');
  } else if (type === 'zombie_warning') {
    bubble.classList.add('zombie-warning');
  }
  
  // 吹き出しが非表示にならないように監視
  startBubbleObserver();
  
  // 強制的に再描画を促す
  void bubble.offsetWidth;
  
  // 親要素の確認と表示状態の調整
  ensureBubbleVisibility(bubble);

  // テキストを設定（export済みのsetText関数を明示的に呼び出し）
  setText(text);
}


/**
 * 吹き出しにテキストを設定
 * @param {string} text - 表示テキスト
 */
export function setText(text) {
  if (!text) {
    console.error('setText: テキストが空です');
    return;
  }

  console.log('[setText] 開始: ', text);

  // テキスト要素の取得
  const textElement = document.getElementById('speechText') || speechText;
  if (!textElement) {
    console.error('speechText要素が見つかりません');
    return;
  }
  
  console.log(`📝 テキストを設定: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);
  
  // テキスト要素内を空にする前に、明示的にロックをかける
  textElement.dataset.locked = 'true';
  textElement.dataset.setTime = Date.now().toString();
  
  // データ属性にバックアップ（最初に設定）
  textElement.dataset.originalText = text;
  
  // テキスト要素内を空にする
  textElement.innerHTML = '';
  
  try {
    // 確実に表示されるよう、明示的なスタイルを持つspanを作成
    const spanElement = document.createElement('span');
    spanElement.textContent = text;
    spanElement.className = 'speech-text-content';
    // 明示的な色と表示スタイルを設定
    spanElement.style.cssText = `
      color: #4e3b2b !important; 
      display: inline-block !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100% !important;
      font-size: 1.05rem !important;
      line-height: 1.6 !important;
      position: relative !important;
      z-index: 5 !important;
      margin: 0 !important;
      padding: 0 !important;
      text-shadow: 0 0 1px rgba(255,255,255,0.7) !important; /* テキスト視認性向上 */
    `;
    textElement.appendChild(spanElement);
    
    // テキスト要素自体にも明示的なスタイルを設定
    textElement.style.cssText = `
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      color: #4e3b2b !important;
      width: 100% !important;
      padding: 5px !important;
      box-sizing: border-box !important;
      min-height: 50px !important;
      position: relative !important;
      z-index: 5 !important;
    `;
    
  } catch (error) {
    console.error('テキスト設定エラー:', error);
  }
  
  // 強制的に再描画を促す
  void textElement.offsetHeight;
  
  // 設定後の確認
  setTimeout(() => {
    if (!textElement.textContent || textElement.textContent.trim() === '') {
      console.warn('⚠️ テキスト設定後も空になっています。再試行します。');
      
      // データ属性から復元を試みる
      if (textElement.dataset.originalText) {
        const spanElement = document.createElement('span');
        spanElement.textContent = textElement.dataset.originalText;
        spanElement.className = 'speech-text-content retry';
        spanElement.style.cssText = `
          color: #4e3b2b !important; 
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          font-size: 1.05rem !important;
          line-height: 1.6 !important;
          position: relative !important;
          z-index: 5 !important;
          margin: 0 !important;
          padding: 0 !important;
          text-shadow: 0 0 1px rgba(255,255,255,0.7) !important;
        `;
        textElement.innerHTML = '';
        textElement.appendChild(spanElement);
      } else {
        const textNode = document.createTextNode(text);
        textElement.appendChild(textNode);
      }
    }
    
    // 一定時間後にロックを解除（十分に時間を空けて）
    setTimeout(() => {
      // ロックを解除する前に内容を確認
      if (!textElement.textContent || textElement.textContent.trim() === '') {
        console.warn('⚠️ ロック解除前にテキストが空です。復元を試みます。');
        if (textElement.dataset.originalText) {
          const spanElement = document.createElement('span');
          spanElement.textContent = textElement.dataset.originalText;
          spanElement.className = 'speech-text-content final-recovery';
          spanElement.style.cssText = `
            color: #4e3b2b !important; 
            display: inline-block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            font-size: 1.05rem !important;
            line-height: 1.6 !important;
            position: relative !important;
            z-index: 5 !important;
            margin: 0 !important;
            padding: 0 !important;
            text-shadow: 0 0 1px rgba(255,255,255,0.7) !important;
          `;
          textElement.innerHTML = '';
          textElement.appendChild(spanElement);
        }
      }
      
      textElement.dataset.locked = 'false';
      console.log('🔓 テキスト要素のロックを解除しました');
    }, 2000); // ロック解除時間をさらに延長（2秒）
    
  }, 100); // 確認時間を延長
}

/**
 * ホードモード設定を表示
 * @param {boolean} currentValue - 現在の設定値
 * @param {Function} onChangeCallback - 値変更時のコールバック
 */
export function showHordeModeSettings(currentValue = false, onChangeCallback = null) {
  // 要素の取得
  const bubble = document.getElementById('speechBubble');
  const bubbleText = document.getElementById('bubbleText');
  
  if (!bubble || !bubbleText) {
    return;
  }
  
  // 既存のタイムアウトをクリア
  if (bubbleTimeout) {
    clearTimeout(bubbleTimeout);
    bubbleTimeout = null;
  }
  
  // HTML要素の作成
  bubbleText.innerHTML = `
    <div class="settings-container">
      <h3>ホードモード設定</h3>
      <div class="setting-item">
        <label class="toggle-switch">
          <input type="checkbox" id="hordeModeToggle" ${currentValue ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
        <span class="setting-label">有効にする</span>
      </div>
      <button id="closeSettingsBtn" class="btn btn-sm">閉じる</button>
    </div>
  `;
  
  // イベントリスナーの設定
  bubble.style.display = 'block';
  
  const closeBtn = document.getElementById('closeSettingsBtn');
  const toggleSwitch = document.getElementById('hordeModeToggle');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', hideBubble);
  }
  
  if (toggleSwitch && onChangeCallback) {
    toggleSwitch.addEventListener('change', function() {
      onChangeCallback(this.checked);
    });
  }
} 



// 吹き出しの表示状態を監視する関数
let bubbleObserver = null;
export function startBubbleObserver() {
  if (bubbleObserver) return; // 既に監視中なら何もしない
  
  const checkBubbleVisibility = () => {
    const bubble = document.getElementById('speechBubble') || speechBubble;
    if (!bubble) return;
    
    const computedStyle = window.getComputedStyle(bubble);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || parseFloat(computedStyle.opacity) < 0.1) {
      console.log('💬 吹き出しが非表示になっていました。表示状態を復元します。');
      bubble.style.display = 'flex';
      bubble.style.visibility = 'visible';
      bubble.style.opacity = '1';
    }
  };
  
  // 定期的に表示状態をチェック
  bubbleObserver = setInterval(checkBubbleVisibility, 500);
}

// 監視を停止する関数
export function stopBubbleObserver() {
  if (bubbleObserver) {
    clearInterval(bubbleObserver);
    bubbleObserver = null;
  }
}



/**
 * 吹き出しの表示を確実にするためのヘルパー関数
 * @param {HTMLElement} bubble - 吹き出し要素
 */
export function ensureBubbleVisibility(bubble) {
  if (!bubble) return;
  
  console.log('💬 吹き出しの表示状態を確認します');
  
  // 親要素の表示状態を確認
  const parent = bubble.parentElement;
  if (parent) {
    // 親要素が表示状態であることを確認
    if (getComputedStyle(parent).display === 'none') {
      console.log('⚠️ 親要素が非表示です。表示に設定します。');
      parent.style.display = 'block';
    }
    
    // 親要素のz-indexを確認
    const parentZIndex = parseInt(getComputedStyle(parent).zIndex);
    if (!isNaN(parentZIndex) && parentZIndex >= 9999) {
      console.log('⚠️ 親要素のz-indexが高すぎます。吹き出しのz-indexを上げます。');
      bubble.style.zIndex = (parentZIndex + 1);
    }
  }
  
  // 吹き出しの表示状態を再確認
  setTimeout(() => {
    const computedStyle = getComputedStyle(bubble);
    console.log('💬 吹き出し表示状態:', {
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      zIndex: computedStyle.zIndex,
      position: computedStyle.position
    });
    
    // 表示されていない場合は強制的に表示
    if (computedStyle.display === 'none' || 
        computedStyle.visibility === 'hidden' || 
        parseFloat(computedStyle.opacity) < 0.1) {
      console.log('⚠️ 吹き出しが表示されていません。強制的に表示します。');
      
      // 再度クラスを適用
      bubble.className = 'speech-bubble show fixed-position';
      
      // DOMツリーの最後に移動（他の要素の下に隠れる問題を解決）
      document.body.appendChild(bubble);
    }
  }, 100);
}

/**
 * 吹き出しを非表示にする
 * @param {boolean} immediate - 即時に非表示にするかどうか（falseの場合はフェードアウト）
 */
export function hideBubble(immediate = false) {
  console.log('🗨️ 吹き出しを非表示にします', immediate ? '（即時）' : '（フェードアウト）');

  const bubble = document.getElementById('speechBubble');
  if (!bubble) {
    console.error('speechBubble要素が見つかりません');
    return;
  }

  if (immediate) {
    // 即時非表示
    bubble.style.display = 'none';
    bubble.classList.remove('show');
    bubble.classList.add('hide');
  } else {
    // フェードアウト
    bubble.classList.remove('show');
    bubble.classList.add('hide');
    
    // フェードアウト完了後に非表示
    setTimeout(() => {
      bubble.style.display = 'none';
    }, 500); // CSSのトランジション時間に合わせる
  }
  
  // 監視を停止
  stopBubbleObserver();
}