// overlayManager.js
// ゾンビの存在感を画面上に可視化するためのモジュール

import { logDebug } from '@core/logger.js';

class ZombieOverlayManager {
  constructor() {
    this.overlayContainer = null;
    this.zombieShadows = []; // ゾンビ影の要素を保持する配列
    this.warningOverlay = null; // 全画面警告オーバーレイ
    this.fadeTimeoutId = null; // フェードアウト用タイマーID
    this.initialized = false;
    
    // 設定
    this.config = {
      fadeOutTime: 3000, // フェードアウト時間 (ミリ秒)
      weakShadowImage: '/assets/images/zombie_shadow_weak.png', // 弱いゾンビ影画像パス
      strongShadowImage: '/assets/images/zombie_shadow_strong.png', // 強いゾンビ影画像パス
      warningOverlayImage: '/assets/images/warning_overlay.png', // 全画面警告オーバーレイ画像パス
      confidenceThreshold: 0.7 // 「強い」判定の閾値
    };
    
    // 画像の存在確認（オプション）
    this.checkImageExists();
  }
  
  /**
   * 画像ファイルの存在を確認し、必要に応じてCSS代替を使用
   */
  checkImageExists() {
    const checkImage = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
    };
    
    // 非同期で画像の存在チェック
    Promise.all([
      checkImage(this.config.weakShadowImage),
      checkImage(this.config.strongShadowImage),
      checkImage(this.config.warningOverlayImage)
    ]).then(results => {
      const [weakExists, strongExists, overlayExists] = results;
      
      // 必要に応じてCSS代替を使用
      if (!weakExists) {
        logDebug('弱いゾンビ影画像が見つかりません。CSS代替を使用します');
        this.useCssForWeakShadow = true;
      }
      
      if (!strongExists) {
        logDebug('強いゾンビ影画像が見つかりません。CSS代替を使用します');
        this.useCssForStrongShadow = true;
      }
      
      if (!overlayExists) {
        logDebug('警告オーバーレイ画像が見つかりません。CSS代替を使用します');
        this.useCssForWarningOverlay = true;
      }
    });
  }
  
  /**
   * オーバーレイマネージャーを初期化
   */
  initialize() {
    if (this.initialized) {
      return;
    }
    
    logDebug('ZombieOverlayManager: 初期化を開始します');
    
    // オーバーレイコンテナの作成
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.className = 'zombie-overlay-container';
    this.overlayContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9990;
      overflow: hidden;
    `;
    
    // 全画面警告オーバーレイを作成
    this.warningOverlay = document.createElement('div');
    this.warningOverlay.className = 'zombie-warning-overlay';
    this.warningOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url('${this.config.warningOverlayImage}');
      background-size: cover;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
      pointer-events: none;
      z-index: 9991;
    `;
    
    // コンテナにオーバーレイを追加
    this.overlayContainer.appendChild(this.warningOverlay);
    
    // bodyに追加
    document.body.appendChild(this.overlayContainer);
    
    this.initialized = true;
    logDebug('ZombieOverlayManager: 初期化が完了しました');
  }
  
  /**
   * 検出結果を表示する
   * @param {Array} yoloResults - YOLOの検出結果配列 [{x1, y1, x2, y2, confidence}]
   * @param {Boolean} resnetAlive - ResNetの判定結果（true=ゾンビ存在）
   */
  showDetection(yoloResults = [], resnetAlive = false) {
    if (!this.initialized) {
      this.initialize();
    }
    
    logDebug(`ZombieOverlayManager: 検出結果を表示します - YOLO: ${yoloResults.length}個, ResNet: ${resnetAlive}`);
    
    // 既存のゾンビ影をクリア
    this.clearZombieShadows();
    
    // フェードアウトタイマーをクリア
    if (this.fadeTimeoutId) {
      clearTimeout(this.fadeTimeoutId);
      this.fadeTimeoutId = null;
    }
    
    // 表示強度ロジックに基づいて表示
    const hasYolo = yoloResults && yoloResults.length > 0;
    
    // 表示分岐
    if (!hasYolo && !resnetAlive) {
      // ケース1: 完全安全モード - 何も表示しない
      this.hideAllOverlays();
      return;
    } else if (hasYolo && !resnetAlive) {
      // ケース2: 軽い警告 - 半透明ゾンビ影
      this.showZombieShadows(yoloResults, 0.5); // 薄めに表示
      this.hideWarningOverlay();
    } else if (!hasYolo && resnetAlive) {
      // ケース3: 雰囲気警告 - 全体にうっすら警告フィルタ
      this.hideZombieShadows();
      this.showWarningOverlay(0.3); // 薄めに表示
    } else {
      // ケース4: 強い警告 - 実体ゾンビ＋赤い強調エフェクト
      this.showZombieShadows(yoloResults, 0.8); // 濃く表示
      this.showWarningOverlay(0.5); // 中程度に表示
    }
    
    // 一定時間後に自動フェードアウト
    this.fadeTimeoutId = setTimeout(() => {
      this.fadeOutAll();
    }, this.config.fadeOutTime);
  }
  
  /**
   * ゾンビの影を表示する
   * @param {Array} detections - 検出結果配列 [{x1, y1, x2, y2, confidence}]
   * @param {Number} baseOpacity - 基本の不透明度
   */
  showZombieShadows(detections, baseOpacity = 0.7) {
    detections.forEach(detection => {
      const { x1, y1, x2, y2, confidence } = detection;
      
      // 信頼度に基づいて表示を変える
      const isStrong = confidence >= this.config.confidenceThreshold;
      const useCssAlternative = isStrong ? this.useCssForStrongShadow : this.useCssForWeakShadow;
      const imagePath = isStrong 
                       ? this.config.strongShadowImage 
                       : this.config.weakShadowImage;
      
      // サイズ計算（信頼度が高いほど大きく）
      const width = (x2 - x1) * (0.8 + confidence * 0.4);
      const height = (y2 - y1) * (0.8 + confidence * 0.4);
      
      // 不透明度計算（信頼度が高いほど濃く）
      const opacity = baseOpacity * (0.5 + confidence * 0.5);
      
      // ゾンビ影要素を作成
      const shadow = document.createElement('div');
      shadow.className = `zombie-shadow ${isStrong ? 'strong' : 'weak'}`;
      
      // CSS代替を使用する場合
      if (useCssAlternative) {
        const color = isStrong 
                     ? `rgba(255, 0, 0, ${opacity})`
                     : `rgba(255, 30, 30, ${opacity * 0.7})`;
        const blur = isStrong ? '0px' : '3px';
        const animation = isStrong ? 'zombie-pulse 2s infinite ease-in-out' : 'none';
        
        shadow.style.cssText = `
          position: absolute;
          top: ${y1}px;
          left: ${x1}px;
          width: ${width}px;
          height: ${height}px;
          background-color: ${color};
          border-radius: 50%;
          filter: blur(${blur}) drop-shadow(0 0 10px ${color});
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
          pointer-events: none;
          z-index: 9992;
          animation: ${animation};
        `;
      } else {
        // 通常の画像ベースの表示
        shadow.style.cssText = `
          position: absolute;
          top: ${y1}px;
          left: ${x1}px;
          width: ${width}px;
          height: ${height}px;
          background-image: url('${imagePath}');
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
          pointer-events: none;
          z-index: 9992;
        `;
      }
      
      // コンテナに追加
      this.overlayContainer.appendChild(shadow);
      
      // 配列に保存（後で削除できるように）
      this.zombieShadows.push(shadow);
      
      // アニメーション効果（フェードイン）
      setTimeout(() => {
        shadow.style.opacity = opacity;
      }, 10);
    });
  }
  
  /**
   * 全画面警告オーバーレイを表示
   * @param {Number} opacity - 不透明度（0-1）
   */
  showWarningOverlay(opacity = 0.4) {
    if (!this.warningOverlay) return;
    
    // CSS代替を使用する場合
    if (this.useCssForWarningOverlay) {
      this.warningOverlay.style.backgroundImage = 'none';
      this.warningOverlay.style.backgroundColor = `rgba(255, 0, 0, ${opacity})`;
      this.warningOverlay.style.boxShadow = `inset 0 0 50px rgba(255, 0, 0, ${opacity * 1.5})`;
    }
    
    this.warningOverlay.style.opacity = opacity;
  }
  
  /**
   * 全画面警告オーバーレイを非表示
   */
  hideWarningOverlay() {
    if (!this.warningOverlay) return;
    this.warningOverlay.style.opacity = 0;
  }
  
  /**
   * ゾンビ影を非表示
   */
  hideZombieShadows() {
    this.zombieShadows.forEach(shadow => {
      shadow.style.opacity = 0;
    });
  }
  
  /**
   * ゾンビ影を完全に削除
   */
  clearZombieShadows() {
    this.zombieShadows.forEach(shadow => {
      if (shadow.parentNode) {
        shadow.parentNode.removeChild(shadow);
      }
    });
    this.zombieShadows = [];
  }
  
  /**
   * すべてのオーバーレイを非表示
   */
  hideAllOverlays() {
    this.hideWarningOverlay();
    this.hideZombieShadows();
  }
  
  /**
   * すべてのオーバーレイをフェードアウト
   */
  fadeOutAll() {
    this.hideAllOverlays();
    this.clearZombieShadows();
  }
  
  /**
   * テスト用のオーバーレイ表示
   */
  testOverlay() {
    this.initialize();
    this.showDetection([
      { x1: 100, y1: 100, x2: 300, y2: 300, confidence: 0.9 },
      { x1: 400, y1: 200, x2: 600, y2: 400, confidence: 0.6 }
    ], true);
  }
}

export default new ZombieOverlayManager(); 