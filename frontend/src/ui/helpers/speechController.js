

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
  
  // テキストを設定（複数の方法で確実に）
  setText(text);
  
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
  
  // タイマーを使って再度表示をチェック
  setTimeout(() => {
    const computedStyle = getComputedStyle(bubble);
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      console.log('⚠️ 吹き出しが再び非表示になっています。強制表示を試みます。');
      ensureBubbleVisibility(bubble);
    }
    
    // テキストが空になっている場合は再設定
    if (!textElement.textContent || textElement.textContent.trim() === '') {
      console.log('⚠️ テキストが空になっています。再設定します。');
      setText(text);
    }
  }, 100);
}


/**
 * 吹き出しにテキストを設定
 * @param {string} text - 表示テキスト
 */
function setText(text) {
  if (!text) {
    console.error('setText: テキストが空です');
    return;
  }
  
  // テキスト要素の取得
  const textElement = document.getElementById('speechText') || speechText;
  if (!textElement) {
    console.error('speechText要素が見つかりません');
    return;
  }
  
  console.log(`📝 テキストを設定: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);
  
  // テキスト要素内を空にする
  textElement.innerHTML = '';
  
  try {
    // 確実に表示されるよう、明示的なスタイルを持つspanを作成
    const spanElement = document.createElement('span');
    spanElement.textContent = text;
    spanElement.className = 'speech-text-content';
    // 明示的な色と表示スタイルを設定
    spanElement.style.cssText = `
      color: #4e3b2b; 
      display: inline-block;
      visibility: visible;
      opacity: 1;
      width: 100%;
      font-size: 1.05rem;
      line-height: 1.6;
    `;
    textElement.appendChild(spanElement);
    
    // データ属性にバックアップ
    textElement.dataset.originalText = text;
    
  } catch (error) {
    console.error('テキスト設定エラー:', error);
  }
  
  // 強制的に再描画を促す
  void textElement.offsetHeight;
  
  // 設定後の確認
  setTimeout(() => {
    if (!textElement.textContent || textElement.textContent.trim() === '') {
      console.warn('⚠️ テキスト設定後も空になっています。再試行します。');
      // 単純なテキストノードを追加し、親要素にも明示的なスタイルを設定
      textElement.style.cssText = `
        color: #4e3b2b !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      `;
      const textNode = document.createTextNode(text);
      textElement.appendChild(textNode);
    }
  }, 50);
}

// 吹き出し内に設定UIを表示する関数
export async function showSettingsInBubble() {
    // 吹き出し要素の取得
    const bubble = document.getElementById('speechBubble') || speechBubble;
    if (!bubble) {
      console.error('吹き出し要素が見つかりません');
      return;
    }
    
    // 吹き出しテキスト要素の取得
    const textElement = document.getElementById('speechText') || speechText;
    if (!textElement) {
      console.error('テキスト要素が見つかりません');
      return;
    }
    
    console.log('🔧 吹き出し内に設定UIを表示します');
    
    // 設定データを取得（APIクライアントが利用可能であれば使用）
    let settings = {};
    
    try {
      if (window.settingsApi && typeof window.settingsApi.getSettings === 'function') {
        const response = await window.settingsApi.getSettings();
        settings = response.settings || {};
      }
    } catch (error) {
      console.warn('設定データの取得に失敗しました:', error);
      // デフォルト設定を使用
      settings = {
        voice: {
          pitch: 1.0,
          speed: 1.0,
          enabled: true
        },
        ui: {
          opacity: 0.9,
          size: 100
        }
      };
    }
    
    // 吹き出しを表示（非表示の場合）
    bubble.style.display = 'flex';
    bubble.style.visibility = 'visible';
    bubble.style.opacity = '1';
    bubble.classList.add('show');
    
    // 設定UIのHTMLを生成
    const settingsHTML = `
      <div class="settings-container">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; color: #555;">⚙️ 設定メニュー</h3>
        
        <div class="settings-section">
          <h4 style="margin: 8px 0; font-size: 13px; color: #666;">🎤 音声設定</h4>
          
          <div class="settings-item" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #555;">話速</label>
            <div style="display: flex; align-items: center;">
              <input type="range" id="voice-speed" min="0.5" max="2.0" step="0.1" value="${settings.voice?.speed || 1.0}" 
                    style="width: 100px; height: 6px;">
              <span id="speed-value" style="margin-left: 8px; font-size: 12px; min-width: 24px;">${settings.voice?.speed || 1.0}</span>
            </div>
          </div>
          
          <div class="settings-item" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #555;">声の高さ</label>
            <div style="display: flex; align-items: center;">
              <input type="range" id="voice-pitch" min="0.5" max="2.0" step="0.1" value="${settings.voice?.pitch || 1.0}" 
                    style="width: 100px; height: 6px;">
              <span id="pitch-value" style="margin-left: 8px; font-size: 12px; min-width: 24px;">${settings.voice?.pitch || 1.0}</span>
            </div>
          </div>
          
          <div class="settings-item" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #555;">声を有効</label>
            <label class="switch" style="position: relative; display: inline-block; width: 36px; height: 20px;">
              <input type="checkbox" id="voice-enabled" ${settings.voice?.enabled ? 'checked' : ''}>
              <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; border-radius: 10px; transition: .3s;"></span>
            </label>
          </div>
        </div>
        
        <div class="settings-section">
          <h4 style="margin: 8px 0; font-size: 13px; color: #666;">🎨 見た目設定</h4>
          
          <div class="settings-item" style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #555;">透明度</label>
            <div style="display: flex; align-items: center;">
              <input type="range" id="ui-opacity" min="0.1" max="1.0" step="0.1" value="${settings.ui?.opacity || 0.9}" 
                    style="width: 100px; height: 6px;">
              <span id="opacity-value" style="margin-left: 8px; font-size: 12px; min-width: 24px;">${settings.ui?.opacity || 0.9}</span>
            </div>
          </div>
          
          <div class="settings-item" style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <label style="font-size: 12px; color: #555;">サイズ</label>
            <div style="display: flex; align-items: center;">
              <input type="range" id="ui-size" min="50" max="150" step="10" value="${settings.ui?.size || 100}" 
                    style="width: 100px; height: 6px;">
              <span id="size-value" style="margin-left: 8px; font-size: 12px; min-width: 24px;">${settings.ui?.size || 100}%</span>
            </div>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-top: 12px;">
          <button id="settings-close" style="padding: 4px 10px; font-size: 12px; border: none; background: #eee; border-radius: 4px; cursor: pointer;">
            閉じる
          </button>
          <button id="settings-save" style="padding: 4px 10px; font-size: 12px; border: none; background: #4caf50; color: white; border-radius: 4px; cursor: pointer;">
            保存
          </button>
        </div>
      </div>
    `;
    
    // 吹き出しにHTMLを設定
    textElement.innerHTML = settingsHTML;
    
    // イベントリスナーを設定
    setTimeout(() => {
      // スライダーの変更を監視して値を表示
      const speedSlider = document.getElementById('voice-speed');
      const speedValue = document.getElementById('speed-value');
      if (speedSlider && speedValue) {
        speedSlider.addEventListener('input', () => {
          speedValue.textContent = speedSlider.value;
        });
      }
      
      const pitchSlider = document.getElementById('voice-pitch');
      const pitchValue = document.getElementById('pitch-value');
      if (pitchSlider && pitchValue) {
        pitchSlider.addEventListener('input', () => {
          pitchValue.textContent = pitchSlider.value;
        });
      }
      
      const opacitySlider = document.getElementById('ui-opacity');
      const opacityValue = document.getElementById('opacity-value');
      if (opacitySlider && opacityValue) {
        opacitySlider.addEventListener('input', () => {
          opacityValue.textContent = opacitySlider.value;
        });
      }
      
      const sizeSlider = document.getElementById('ui-size');
      const sizeValue = document.getElementById('size-value');
      if (sizeSlider && sizeValue) {
        sizeSlider.addEventListener('input', () => {
          sizeValue.textContent = `${sizeSlider.value}%`;
        });
      }
      
      // 閉じるボタン
      const closeButton = document.getElementById('settings-close');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          hideBubble();
        });
      }
      
      // 保存ボタン
      const saveButton = document.getElementById('settings-save');
      if (saveButton) {
        saveButton.addEventListener('click', async () => {
          try {
            // 設定値を取得
            const newSettings = {
              voice: {
                speed: parseFloat(speedSlider?.value || settings.voice?.speed || 1.0),
                pitch: parseFloat(pitchSlider?.value || settings.voice?.pitch || 1.0),
                enabled: document.getElementById('voice-enabled')?.checked ?? settings.voice?.enabled ?? true
              },
              ui: {
                opacity: parseFloat(opacitySlider?.value || settings.ui?.opacity || 0.9),
                size: parseInt(sizeSlider?.value || settings.ui?.size || 100)
              }
            };
            
            console.log('新しい設定を保存します:', newSettings);
            
            // 設定を保存（APIクライアントが利用可能であれば）
            if (window.settingsApi && typeof window.settingsApi.saveSettings === 'function') {
              await window.settingsApi.saveSettings(newSettings);
            }
            
            // SpeechManagerに設定を適用
            if (window.speechManager && typeof window.speechManager.setConfig === 'function') {
              window.speechManager.setConfig(newSettings);
            }
            
            // UIに透明度とサイズを適用
            const assistantImg = document.getElementById('assistantImage');
            if (assistantImg) {
              assistantImg.style.opacity = newSettings.ui.opacity;
              assistantImg.style.transform = `scale(${newSettings.ui.size / 100})`;
            }
            
            // 成功メッセージを表示
            showBubbleFromHelper('success', '設定を保存しました ✨');
          } catch (error) {
            console.error('設定の保存に失敗しました:', error);
            showBubbleFromHelper('error', '設定の保存に失敗しました');
          }
        });
      }
    }, 50);
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