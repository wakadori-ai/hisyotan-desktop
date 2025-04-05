
// UIデバッグユーティリティ
export function debugUI() {
    console.log('🔍 UIデバッグ情報を出力します');
    
    // UI要素の状態を確認
    const elements = {
      speechBubble: document.getElementById('speechBubble'),
      speechText: document.getElementById('speechText'),
      assistantImage: document.getElementById('assistantImage'),
      pawButton: document.getElementById('paw-button'),
      quitButton: document.getElementById('quit-button'),
      container: document.getElementById('assistant-container')
    };
    
    // 要素の存在をチェック
    console.log('🔍 UI要素の存在チェック:');
    for (const [name, element] of Object.entries(elements)) {
      console.log(`- ${name}: ${element ? '✅ 存在します' : '❌ 存在しません'}`);
    }
    
    // 吹き出し要素の重複チェック
    const speechBubbles = document.querySelectorAll('#speechBubble');
    console.log(`🔍 吹き出し要素の数: ${speechBubbles.length}`);
    
    // テキスト要素の重複チェック
    const speechTexts = document.querySelectorAll('#speechText');
    console.log(`🔍 テキスト要素の数: ${speechTexts.length}`);
    
    // 立ち絵要素の重複チェック
    const assistantImages = document.querySelectorAll('#assistantImage');
    console.log(`🔍 立ち絵要素の数: ${assistantImages.length}`);
    
    // 吹き出しの表示状態を確認
    if (elements.speechBubble) {
      const style = getComputedStyle(elements.speechBubble);
      console.log('🔍 吹き出し要素の表示状態:', {
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        zIndex: style.zIndex,
        position: style.position,
        width: style.width,
        height: style.height
      });
      
      // テキスト内容を確認
      if (elements.speechText) {
        console.log('🔍 テキスト要素の内容:', {
          textContent: elements.speechText.textContent,
          innerHTML: elements.speechText.innerHTML,
          childNodes: elements.speechText.childNodes.length
        });
      }
    }
    
    // 立ち絵の表示状態を確認
    if (elements.assistantImage) {
      const style = getComputedStyle(elements.assistantImage);
      console.log('🔍 立ち絵要素の表示状態:', {
        src: elements.assistantImage.src,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        width: style.width,
        height: style.height,
        naturalWidth: elements.assistantImage.naturalWidth,
        naturalHeight: elements.assistantImage.naturalHeight
      });
    }
    
    return {
      elements,
      restart: function() {
        // 重複要素をクリーンアップ
        cleanupDuplicateElements();
        
        // UI要素を作成し直す
        createUI();
        
        // 立ち絵を表示
        setTimeout(() => {
          showAssistantImage();
        }, 100);
        
        return 'UIを再構築しました。問題が解決したか確認してください。';
      },
      fixBubble: function() {
        // 吹き出し修復
        if (elements.speechBubble) {
          elements.speechBubble.remove();
        }
        
        // 新しい吹き出しを作成
        const newBubble = document.createElement('div');
        newBubble.id = 'speechBubble';
        newBubble.className = 'speech-bubble show fixed-position';
        
        // テキスト要素を作成
        const newText = document.createElement('div');
        newText.id = 'speechText';
        newText.className = 'speech-text';
        newText.textContent = 'こんにちは！何かお手伝いしましょうか？';
        newBubble.appendChild(newText);
        
        // コンテナに追加
        if (elements.container) {
          elements.container.appendChild(newBubble);
        } else {
          document.body.appendChild(newBubble);
        }
        
        return '吹き出しを修復しました。表示を確認してください。';
      },
      // 設定UIを吹き出しに表示する関数をエクスポート
      showHordeModeSettings
    };
  }