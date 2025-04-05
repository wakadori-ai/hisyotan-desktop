
// 立ち絵を表示する関数
export function showAssistantImage() {
    console.log('🖼️ 立ち絵を表示します');
    const imgElement = document.getElementById('assistantImage') || assistantImage;
    
    if (imgElement) {
      // 画像のソースを確認
      if (!imgElement.src || !imgElement.src.includes('secretary_')) {
        console.log('🖼️ 立ち絵のソースが設定されていません。デフォルト画像を設定します。');
        imgElement.src = '/assets/images/secretary_normal.png';
      }
      
      // サイズを明示的に設定
      imgElement.style.width = '256px';
      imgElement.style.height = 'auto';
      imgElement.style.minHeight = '250px';
      
      // 表示スタイルを設定
      imgElement.style.display = 'block';
      imgElement.style.visibility = 'visible';
      imgElement.style.opacity = '1';
      
      // レンダリングオプションを設定
      imgElement.style.imageRendering = 'auto';
      imgElement.style.objectFit = 'contain';
      
      // GPUアクセラレーションを有効化
      imgElement.style.transform = 'translateZ(0)';
      imgElement.style.backfaceVisibility = 'hidden';
      
      // アクティブクラスを追加
      imgElement.classList.add('active');
      
      // 表示位置の確認と調整
      const container = document.getElementById('assistant-container');
      if (container) {
        container.style.bottom = '0px';
        container.style.right = '0px';
      }
      
      // 画像の読み込みを監視
      imgElement.onload = () => {
        console.log('🖼️ 立ち絵画像の読み込みが完了しました。サイズ:', {
          naturalWidth: imgElement.naturalWidth,
          naturalHeight: imgElement.naturalHeight,
          displayWidth: imgElement.offsetWidth,
          displayHeight: imgElement.offsetHeight
        });
      };
      
      console.log('✅ 立ち絵を表示しました');
    } else {
      console.error('❌ 立ち絵要素が見つかりません');
    }
  }