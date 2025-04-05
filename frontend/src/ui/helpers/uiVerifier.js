/**
 * DOM構造とスタイルを確認し、問題があれば修正する
 */
export function verifyAndFixUIStructure() {
    console.log('🔍 UI構造を検証・修復します');
    
    // 必要なCSSクラスが適用されているか確認
    const assistantImage = document.getElementById('assistantImage');
    if (assistantImage) {
      if (!assistantImage.classList.contains('assistant-image')) {
        console.log('⚠️ 立ち絵にassistant-imageクラスが付与されていません。追加します。');
        assistantImage.classList.add('assistant-image');
      }
      
      // スタイル適用確認
      const computedStyle = getComputedStyle(assistantImage);
      if (computedStyle.width === '0px' || computedStyle.height === '0px') {
        console.log('⚠️ 立ち絵のサイズが0pxです。修正します。');
        
        // インラインスタイルで修正
        assistantImage.style.width = '256px';
        assistantImage.style.height = 'auto';
        assistantImage.style.minHeight = '250px';
        assistantImage.style.maxHeight = '400px';
        assistantImage.style.display = 'block';
        assistantImage.style.visibility = 'visible';
        assistantImage.style.opacity = '1';
        assistantImage.style.objectFit = 'contain';
        assistantImage.style.imageRendering = 'auto';
      }
      
      // ソースパスの確認
      if (!assistantImage.src || !assistantImage.src.includes('secretary_')) {
        console.log('⚠️ 立ち絵の画像パスが不正です。修正します。');
        assistantImage.src = '/assets/images/secretary_normal.png';
      }
    }
    
    // 吹き出しの構造確認
    const speechBubble = document.getElementById('speechBubble');
    if (speechBubble) {
      if (!speechBubble.classList.contains('speech-bubble')) {
        console.log('⚠️ 吹き出しにspeech-bubbleクラスが付与されていません。追加します。');
        speechBubble.classList.add('speech-bubble');
      }
      
      // スタイル適用確認
      const computedStyle = getComputedStyle(speechBubble);
      if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || parseFloat(computedStyle.opacity) < 0.1) {
        console.log('⚠️ 吹き出しが非表示状態です。修正します。');
        
        // インラインスタイルで修正
        speechBubble.style.cssText = `
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: fixed !important;
          z-index: 9999 !important;
        `;
      }
      
      // テキスト要素の確認
      const speechText = document.getElementById('speechText');
      if (!speechText) {
        console.log('⚠️ テキスト要素が見つかりません。作成します。');
        const newText = document.createElement('div');
        newText.id = 'speechText';
        newText.className = 'speech-text';
        newText.textContent = 'こんにちは！何かお手伝いしましょうか？';
        speechBubble.appendChild(newText);
      } else if (!speechText.textContent || speechText.textContent.trim() === '') {
        // ロックされている場合は必ずdataset.originalTextから復元を試みる
        if (speechText.dataset.locked === 'true') {
          console.log('🔒 テキスト要素はロックされています。dataset.originalTextから復元します。');
          
          if (speechText.dataset.originalText) {
            console.log('🔄 ロックされたテキストを元のテキストから復元します: ', speechText.dataset.originalText);
            const spanElement = document.createElement('span');
            spanElement.textContent = speechText.dataset.originalText;
            spanElement.className = 'speech-text-content recovered-from-original';
            spanElement.style.cssText = `
              color: #4e3b2b; 
              display: inline-block;
              visibility: visible;
              opacity: 1;
              width: 100%;
              font-size: 1.05rem;
              line-height: 1.6;
            `;
            speechText.innerHTML = '';
            speechText.appendChild(spanElement);
          } else {
            console.warn('⚠️ ロックされていますが、originalTextが設定されていません');
          }
        } else {
          // ロックされていない場合のみデフォルトテキストを設定
          console.log('⚠️ テキスト要素が空です。テキストを設定します。');
          speechText.textContent = 'こんにちは！何かお手伝いしましょうか？';
        }
      }
    }
    
    console.log('✅ UI構造の検証・修復が完了しました');
  }
  
  /**
   * 重複する要素を削除するクリーンアップ関数
   */
  export function cleanupDuplicateElements() {
    console.log('🧹 重複要素のクリーンアップを開始します');
    
    // 吹き出し要素の重複チェック
    const speechBubbles = document.querySelectorAll('#speechBubble');
    if (speechBubbles.length > 1) {
      console.log(`💬 重複する吹き出し要素が ${speechBubbles.length} 個見つかりました。古い要素を削除します。`);
      
      // 最初の要素以外を削除（インデックス1以降）
      for (let i = 1; i < speechBubbles.length; i++) {
        console.log(`🗑️ 吹き出し要素 ${i+1}/${speechBubbles.length} を削除します`);
        speechBubbles[i].remove();
      }
    }
    
    // 立ち絵要素の重複チェック
    const assistantImages = document.querySelectorAll('#assistantImage');
    if (assistantImages.length > 1) {
      console.log(`🖼️ 重複する立ち絵要素が ${assistantImages.length} 個見つかりました。古い要素を削除します。`);
      
      // 最初の要素以外を削除（インデックス1以降）
      for (let i = 1; i < assistantImages.length; i++) {
        console.log(`🗑️ 立ち絵要素 ${i+1}/${assistantImages.length} を削除します`);
        assistantImages[i].remove();
      }
    }
    
    // テキスト要素の重複チェック
    const speechTexts = document.querySelectorAll('#speechText');
    if (speechTexts.length > 1) {
      console.log(`📝 重複するテキスト要素が ${speechTexts.length} 個見つかりました。古い要素を削除します。`);
      
      // 最初の要素以外を削除（インデックス1以降）
      for (let i = 1; i < speechTexts.length; i++) {
        console.log(`🗑️ テキスト要素 ${i+1}/${speechTexts.length} を削除します`);
        speechTexts[i].remove();
      }
    }
    
    // quitボタン要素の重複チェック
    const quitButtons = document.querySelectorAll('#quit-button');
    if (quitButtons.length > 1) {
      console.log(`🚪 重複する終了ボタン要素が ${quitButtons.length} 個見つかりました。古い要素を削除します。`);
      
      // 最初の要素以外を削除（インデックス1以降）
      for (let i = 1; i < quitButtons.length; i++) {
        console.log(`🗑️ 終了ボタン要素 ${i+1}/${quitButtons.length} を削除します`);
        quitButtons[i].remove();
      }
    }
    
    // pawボタン要素の重複チェック
    const pawButtons = document.querySelectorAll('#paw-button');
    if (pawButtons.length > 1) {
      console.log(`🐾 重複する肉球ボタン要素が ${pawButtons.length} 個見つかりました。古い要素を削除します。`);
      
      // 最初の要素以外を削除（インデックス1以降）
      for (let i = 1; i < pawButtons.length; i++) {
        console.log(`🗑️ 肉球ボタン要素 ${i+1}/${pawButtons.length} を削除します`);
        pawButtons[i].remove();
      }
    }
    
    console.log('🧹 重複要素のクリーンアップが完了しました');
  }