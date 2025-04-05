

// 終了ボタンのクリック処理
export function handleQuitButtonClick() {
    if (window.speechManager) {
      window.speechManager.speak('さようなら、またね！', 'normal', 2000, null, 'quit_app');
    }
    
    if (window.electron && window.electron.ipcRenderer) {
      try {
        // バックエンドも含めて完全終了
        window.electron.ipcRenderer.send('quit-app-with-backend');
        
        // Windows環境ではPythonプロセスも明示的に終了
        if (navigator.platform.includes('Win')) {
          window.electron.ipcRenderer.send('kill-python-process');
        }
        
        // 遅延を入れて確実に終了するようにする
        setTimeout(() => {
          window.electron.ipcRenderer.send('quit-app');
        }, 500);
        
        setTimeout(() => {
          try {
            window.electron.ipcRenderer.invoke('quit-app')
              .catch(() => window.close());
          } catch (error) {
            window.close();
          }
        }, 300);
      } catch (error) {
        window.close();
      }
    } else {
      window.close();
    }
  }