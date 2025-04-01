#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
スクリーンショット収集ツール
ゲームプレイ中の画面を定期的にキャプチャして保存するツールです
"""

import time
import datetime
import pyautogui
from pathlib import Path

def setup_directory() -> Path:
    """保存先ディレクトリを確認・作成する"""
    script_dir = Path(__file__).parent.absolute()
    capture_dir = script_dir / "captured_frames"
    
    if not capture_dir.exists():
        capture_dir.mkdir(parents=True, exist_ok=True)
        print(f"📁 保存先ディレクトリを作成しました: {capture_dir}")
    else:
        print(f"📁 保存先ディレクトリ: {capture_dir}")
    
    return capture_dir

def capture_screen(save_dir: Path) -> Path:
    """画面をキャプチャして保存する"""
    # タイムスタンプを含むファイル名を生成
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"capture_{timestamp}.png"
    file_path = save_dir / filename
    
    # スクリーンショットを撮影
    screenshot = pyautogui.screenshot()
    
    # 画像を保存
    screenshot.save(str(file_path))
    print(f"📸 スクリーンショットを保存しました: {filename}")
    
    return file_path

def main() -> None:
    """メイン処理"""
    print("🔍 スクリーンショット収集ツールを起動します...")
    save_dir = setup_directory()
    
    capture_interval = 5  # 5秒ごとに撮影
    
    print(f"⏱️ {capture_interval}秒間隔で撮影します（停止するには Ctrl+C を押してください）")
    count = 0
    
    try:
        while True:
            capture_screen(save_dir)
            count += 1
            print(f"💫 計{count}枚のスクリーンショットを撮影しました")
            time.sleep(capture_interval)
    except KeyboardInterrupt:
        print("\n✨ スクリーンショット収集を終了します。お疲れさまでした！")

if __name__ == "__main__":
    main() 