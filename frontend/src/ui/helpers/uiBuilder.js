/**
 * uiBuilder.js
 * 
 * このファイルは、UI要素の作成と初期化を担当します。
 * 
 */

import { setupEventListeners } from '../handlers/uiEventHandlers.js';

// 初期化済みフラグ
let isUIInitialized = false;

/**
 * UI要素を作成
 */
export function createUI() {
    console.log('🎨 UI要素を作成します');
    
    // 既に要素が存在する場合は作成しない
    if (document.getElementById('assistant-container')) {
      console.log('既にUIコンテナが存在します。スキップします。');
      return;
    }
    
    // メインコンテナの作成
    const container = document.createElement('div');
    container.id = 'assistant-container';
    container.className = 'assistant-container';
    
    // 立ち絵の作成
    const assistantImage = document.createElement('img');
    assistantImage.id = 'assistantImage';
    assistantImage.className = 'assistant-image active';
    assistantImage.src = '/assets/images/secretary_normal.png';
    assistantImage.alt = '秘書たん';
    assistantImage.style.width = '256px'; // 明示的なサイズ指定
    assistantImage.style.height = 'auto';
    assistantImage.style.minHeight = '250px';
    assistantImage.style.webkitAppRegion = 'drag'; // ドラッグ可能に設定
    assistantImage.style.imageRendering = 'auto'; // レンダリング設定
    assistantImage.style.objectFit = 'contain';
    assistantImage.style.display = 'block';
    assistantImage.style.visibility = 'visible';
    assistantImage.style.opacity = '1';
    assistantImage.style.position = 'fixed';
    assistantImage.style.bottom = '124px';
    assistantImage.style.right = '10px';
    assistantImage.style.zIndex = '1000';
    
    // 吹き出しの作成
    const speechBubble = document.createElement('div');
    speechBubble.id = 'speechBubble';
    speechBubble.className = 'speech-bubble show'; // showクラスを追加
    
    // 画面サイズを取得して適切な位置に配置
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    // 小さい画面の場合は上部に、それ以外は立ち絵の上に配置
    const bubblePosition = windowHeight < 600 ? 
      `top: 10px; bottom: auto;` : 
      `bottom: 300px; top: auto;`;
      
    speechBubble.style.cssText = `
      display: flex !important; 
      visibility: visible !important; 
      opacity: 1 !important;
      position: fixed !important;
      z-index: 2147483647 !important;
      ${bubblePosition}
      right: 10px !important;
      left: auto !important;
      width: 250px !important;
      max-width: 300px !important;
      background-color: rgba(255, 255, 255, 0.9) !important;
    `;
    speechBubble.style.webkitAppRegion = 'drag'; // ドラッグ可能に設定
    
    // 吹き出しテキストの作成
    const speechText = document.createElement('div');
    speechText.id = 'speechText';
    speechText.className = 'speech-text';
    speechText.style.cssText = `
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      color: #4e3b2b !important;
      font-size: 1.05rem !important;
      line-height: 1.6 !important;
      width: 100% !important;
      padding: 5px !important;
      margin: 0 !important;
      text-align: left !important;
      position: relative !important;
      z-index: 2147483646 !important;
    `;
    
    // テキストをスパン要素として追加
    const spanElement = document.createElement('span');
    spanElement.textContent = 'こんにちは！何かお手伝いしましょうか？';
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
    speechText.appendChild(spanElement);
    
    // 吹き出し要素を組み立て
    speechBubble.appendChild(speechText);
    
    // 肉球ボタンのラッパーを作成
    const pawButtonWrapper = document.createElement('div');
    pawButtonWrapper.className = 'paw-button-wrapper';
    pawButtonWrapper.style.webkitAppRegion = 'no-drag'; // クリック可能に設定
    pawButtonWrapper.style.position = 'fixed';
    pawButtonWrapper.style.bottom = '20px';
    pawButtonWrapper.style.right = '20px';
    pawButtonWrapper.style.zIndex = '9999';
    
    // 肉球ボタンの背景エフェクト要素を追加
    const pawBackground = document.createElement('div');
    pawBackground.className = 'paw-background';
    pawButtonWrapper.appendChild(pawBackground);
    
    // 肉球ボタンの作成
    const pawButton = document.createElement('div');
    pawButton.id = 'paw-button';
    pawButton.className = 'paw-button';
    pawButton.textContent = '🐾';
    pawButton.style.webkitAppRegion = 'no-drag'; // クリック可能に設定
    pawButton.style.cursor = 'pointer'; // カーソルをポインタに設定
    
    // 肉球アイコン（テキスト内容は既にpawButtonに設定済み）
    pawButtonWrapper.appendChild(pawButton);
    
    // ホバーエフェクト
    pawButton.addEventListener('mouseover', () => {
      pawButton.style.transform = 'scale(1.1) translateY(-5px)';
    });
    
    pawButton.addEventListener('mouseout', () => {
      pawButton.style.transform = 'scale(1)';
    });
    
    pawButton.addEventListener('mousedown', () => {
      pawButton.style.transform = 'scale(0.95)';
    });
    
    pawButton.addEventListener('mouseup', () => {
      pawButton.style.transform = 'scale(1)';
    });
    
    // 終了ボタンの作成
    const quitButton = document.createElement('div');
    quitButton.id = 'quit-button';
    quitButton.className = 'quit-button';
    quitButton.textContent = '×';
    quitButton.style.webkitAppRegion = 'no-drag'; // クリック可能に設定（これだけはインラインで）
    
    // ホバーエフェクト
    quitButton.addEventListener('mouseover', () => {
      quitButton.style.opacity = '1';
    });
    
    quitButton.addEventListener('mouseout', () => {
      quitButton.style.opacity = '0.8';
    });
    
    // 要素をコンテナに追加
    container.appendChild(assistantImage);
    container.appendChild(speechBubble);
    container.appendChild(pawButtonWrapper); // ラッパーを追加
    container.appendChild(quitButton);
    
    // コンテナをドキュメントに追加
    document.body.appendChild(container);
    
    // グローバル変数に要素を割り当て（参照をセット）
    window.pawButton = pawButton;
    window.quitButton = quitButton;
    window.speechBubble = speechBubble;
    window.speechText = speechText;
    window.assistantImage = assistantImage;
  
    // モジュール内グローバル変数にも割り当て
    globalThis.pawButton = pawButton;
    globalThis.quitButton = quitButton;
    globalThis.speechBubble = speechBubble;
    globalThis.speechText = speechText;
    globalThis.assistantImage = assistantImage;
  
    // イベントリスナーの設定（DOM要素を直接渡す）
    setTimeout(() => {
      console.log('🔄 イベントリスナーを設定します');
      // DOMツリーに追加されたことを確認した上で設定
      setupEventListeners();
    }, 50);
  
    console.log('✨ UI要素の作成が完了しました');
  }

/**
 * UI要素の初期化
 */
export function initUIElements() {
    console.log('🌸 assistantUI: UI要素を初期化します');
    
    // 既に初期化済みの場合は早期リターン
    if (isUIInitialized && document.getElementById('paw-button')) {
      console.log('🔄 UI要素はすでに初期化済みです');
      return;
    }
    
    // 必要なUI要素の定義
    const requiredElements = {
      pawButton: { id: 'paw-button', type: 'button' },
      quitButton: { id: 'quit-button', type: 'button' },
      speechBubble: { id: 'speechBubble', type: 'div' },
      speechText: { id: 'speechText', type: 'div' },
      assistantImage: { id: 'assistantImage', type: 'img' },
      // errorBubble関連の要素を完全に削除
      statusIndicator: { id: 'statusIndicator', type: 'div' }
      // speechSettingUI要素を削除（吹き出し内に表示するため）
    };
    
    // 各要素の初期化
    for (const [key, config] of Object.entries(requiredElements)) {
      let element = document.getElementById(config.id);
      
      if (!element) {
        console.log(`🆕 ${config.id}要素を作成します`);
        element = document.createElement(config.type);
        element.id = config.id;
        
        // 要素に応じた初期設定
        switch (config.id) {
          case 'speechBubble':
            element.className = 'speech-bubble';
            break;
          case 'speechText':
            element.className = 'speech-text';
            break;
          case 'statusIndicator':
            element.className = 'status-indicator';
            break;
        }
        
        document.body.appendChild(element);
      }
      
      // グローバル変数に要素を保存
      if (key === 'pawButton') pawButton = element;
      if (key === 'quitButton') quitButton = element;
      if (key === 'speechBubble') speechBubble = element;
      if (key === 'speechText') speechText = element;
      if (key === 'assistantImage') assistantImage = element;
    }
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // 初期化済みフラグをセット
    isUIInitialized = true;
  }