import { showHordeModeSettings } from '../helpers/speechController.js';

// 肉球ボタンのイベント設定を分離
export function setupPawButtonEvents(pawButton) {
    console.log('🐾 setupPawButtonEvents: 肉球ボタンにイベントを設定します', pawButton);
    
    if (!pawButton) {
      console.error('❌ setupPawButtonEvents: pawButtonが見つかりません');
      return;
    }
    
    // 直接クリックハンドラを設定
    console.log('🐾 直接的なクリックハンドラを設定します');
    
    // デバウンス処理のための変数
    let isProcessing = false;
    let lastClickTime = 0;
    const DEBOUNCE_TIME = 500; // ミリ秒
    
    // 既存のイベントをすべて削除
    const clone = pawButton.cloneNode(true);
    pawButton.parentNode.replaceChild(clone, pawButton);
    pawButton = clone;
    
    // グローバル参照を更新
    window.pawButton = pawButton;
    globalThis.pawButton = pawButton;
    
    // 統合されたクリックハンドラ関数
    const handlePawClick = function(event) {
      // イベントの詳細をログ
      console.log(`🐾 肉球ボタンイベント受信: ${event.type} (${new Date().toISOString()})`);
      
      // イベントの伝播を防止
      event.preventDefault();
      event.stopPropagation();
      
      // デバウンス処理
      const currentTime = Date.now();
      if (isProcessing || currentTime - lastClickTime < DEBOUNCE_TIME) {
        console.log('⏱️ デバウンス中: イベントをスキップします');
        return false;
      }
      
      // 処理中フラグを設定
      isProcessing = true;
      lastClickTime = currentTime;
      
      console.log('🎯 クリック処理を実行します');
      
      // 少し遅延させて実行（同じフレームでの複数イベント処理を防止）
      setTimeout(() => {
        try {
          handlePawButtonClick();
        } finally {
          // 処理完了フラグを解除（タイムアウト付き）
          setTimeout(() => {
            isProcessing = false;
            console.log('🔓 肉球ボタン処理完了、次のイベントを受け付けます');
          }, 300);
        }
      }, 10);
      
      return false;
    };
    
    // 右クリックハンドラ関数
    const rightClickHandler = function(event) {
      console.log('🔧 肉球ボタンが右クリックされました', new Date().toISOString());
      event.preventDefault();
      event.stopPropagation();
      
      // デバウンス処理
      const currentTime = Date.now();
      if (isProcessing || currentTime - lastClickTime < DEBOUNCE_TIME) {
        console.log('⏱️ デバウンス中: 右クリックイベントをスキップします');
        return false;
      }
      
      // 処理中フラグを設定
      isProcessing = true;
      lastClickTime = currentTime;
      
      // シンプルに直接処理を呼び出し
      setTimeout(() => {
        try {
          handlePawButtonRightClick();
        } finally {
          setTimeout(() => {
            isProcessing = false;
          }, 300);
        }
      }, 10);
      
      return false;
    };
    
    // 強制的にスタイルを設定
    pawButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background-color: rgba(255, 192, 203, 0.9);
      background-image: radial-gradient(circle, #ffb6c1 30%, #ff69b4 100%);
      cursor: pointer !important;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
      transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transform-origin: center;
      -webkit-app-region: no-drag !important;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
      user-select: none;
      border: 2px solid rgba(255, 255, 255, 0.7);
      pointer-events: auto !important;
    `;
    
    // 肉球絵文字を明示的に設定
    pawButton.textContent = '🐾';
    
    // HTML属性も追加
    pawButton.setAttribute('role', 'button');
    pawButton.setAttribute('tabindex', '0');
    pawButton.setAttribute('aria-label', '話しかける');
    
    // クリックイベントだけに統一（余分なイベントを登録しない）
    pawButton.addEventListener('click', handlePawClick);
    pawButton.addEventListener('contextmenu', rightClickHandler);
    
    // キーボードイベント
    pawButton.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        handlePawClick(e);
      }
    });
    
    console.log('✅ 肉球ボタンにイベントリスナーを設定しました');
    
    // テスト用（必要な場合のみ、通常はコメントアウト）
    // setTimeout(() => {
    //   console.log('🔄 肉球ボタンの自動クリックテストを実行します');
    //   pawButton.click();
    // }, 10000);
  }



  // 肉球ボタンのクリック処理
export function handlePawButtonClick() {
    console.log('🐾 handlePawButtonClick: 処理開始');
    console.log('speechManager確認:', window.speechManager ? '存在します' : '存在しません');
    
    // デバッグ: インスペクト
    try {
      const pawButton = document.getElementById('paw-button');
      if (pawButton) {
        console.log('🐾 pawButtonインスペクト:', {
          id: pawButton.id,
          className: pawButton.className,
          style: pawButton.style.cssText,
          offsetWidth: pawButton.offsetWidth,
          offsetHeight: pawButton.offsetHeight
        });
      } else {
        console.error('❌ pawButtonが見つかりません');
      }
    } catch (e) {
      console.error('pawButtonインスペクトエラー:', e);
    }
    
    if (window.speechManager && window.speechManager.speak) {
      console.log('🐾 speechManager.speakメソッドが見つかりました、実行します');
      const messages = [
        'こんにちは！何かお手伝いしましょうか？',
        'お疲れ様です！休憩も大切ですよ✨',
        '何か質問があればいつでも声をかけてくださいね',
        'お仕事頑張ってますね！素敵です',
        'リラックスタイムも必要ですよ〜',
        'デスクの整理、手伝いましょうか？'
      ];
      
      const randomIndex = Math.floor(Math.random() * messages.length);
      const message = messages[randomIndex];
      
      try {
        window.speechManager.speak(message, 'normal', 5000);
        console.log('🐾 speechManager.speak呼び出し成功:', message);
      } catch (error) {
        console.error('🐾 speechManager.speak呼び出しエラー:', error);
        // フォールバック処理
        showBubbleFromHelper('default', message);
      }
      return;
    }
    
    console.log('🐾 speechManagerまたはspeakメソッドが見つからないため、代替手段を使用します');
    
    if (window.electron && window.electron.ipcRenderer) {
      try {
        console.log('🐾 electron.ipcRendererを使用して処理します');
        window.electron.ipcRenderer.send('show-random-message');
      } catch (error) {
        console.error('IPC呼び出しエラー:', error);
        showBubbleFromHelper('default', 'こんにちは！何かお手伝いしましょうか？');
      }
    } else {
      console.log('🐾 フォールバック: 直接吹き出しを表示します');
      showBubbleFromHelper('default', 'こんにちは！何かお手伝いしましょうか？');
    }
  } 
  
  // 肉球ボタンの右クリック処理
  function handlePawButtonRightClick() {
    try {
      // 独立したUIではなく吹き出し内に設定メニューを表示
      showHordeModeSettings();
      
      if (window.speechManager && window.speechManager.speak) {
        window.speechManager.speak('設定メニューを開きますね', 'normal', 3000);
      } else {
        showBubbleFromHelper('default', '設定メニューを開きますね');
      }
    } catch (error) {
      console.error('設定UI表示エラー:', error);
      showBubbleFromHelper('warning', '設定を開けませんでした');
    }
  }