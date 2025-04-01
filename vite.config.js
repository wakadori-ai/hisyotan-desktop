import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './', // 相対パスでビルドするために必要
  
  // Electron統合のためのサーバー設定
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      overlay: false, // HMRオーバーレイを無効化（Electronウィンドウで表示崩れを防ぐ）
    }
  },
  
  // エイリアスの設定（相対パスを@付きのパスで置き換え可能に）
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'frontend/core'),
      '@ui': resolve(__dirname, 'frontend/ui'),
      '@emotion': resolve(__dirname, 'frontend/emotion'),
      '@assets': resolve(__dirname, 'frontend/assets'),
      '@config': resolve(__dirname, 'frontend/config'),
      '@voice': resolve(__dirname, 'frontend/voice')
    }
  },
  
  // Electronでの使用に適した設定
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'frontend/ui/index.html')
      }
    }
  }
}); 