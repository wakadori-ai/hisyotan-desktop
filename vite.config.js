import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  root: 'frontend', // 開発サーバーのルートディレクトリを変更
  base: './', // 相対パスでビルドするために必要
  
  // 静的アセット用のパブリックディレクトリを設定
  // frontend/ui/public が実際のパブリックフォルダになります
  publicDir: 'ui/public',
  
  // Electron統合のためのサーバー設定
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: false, // HMRオーバーレイを無効化（Electronウィンドウで表示崩れを防ぐ）
    }
  },
  
  // エイリアスの設定（相対パスを@付きのパスで置き換え可能に）
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'frontend/src/core'),
      '@ui': resolve(__dirname, 'frontend/src/ui'),
      '@emotion': resolve(__dirname, 'frontend/emotion'),
      '@assets': resolve(__dirname, 'frontend/ui/public/assets'),
      '@config': resolve(__dirname, 'frontend/config'),
      '@voice': resolve(__dirname, 'frontend/voice')
    }
  },
  
  // Electronでの使用に適した設定
  build: {
    outDir: 'dist', // ルートからの相対パスになるよう調整
    emptyOutDir: true,
    // ビルド設定
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'frontend/index.html')
      }
    }
  }
}); 