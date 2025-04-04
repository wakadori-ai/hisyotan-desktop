# 🛠️ 開発ツール集

このディレクトリには、秘書たんプロジェクトの開発をサポートするための様々なツールが含まれています。✨

## 📸 スクリーンショット収集ツール

ゲームプレイ中の画面を定期的にキャプチャして画像として保存するためのツールです。

### 使い方

```bash
# Pythonで実行
python tools/screenshot_capture.py
```

### 機能

- Windows環境で動作します
- 5秒ごとに画面をキャプチャします
- `tools/captured_frames/` ディレクトリにPNG形式で保存します
- ファイル名にはタイムスタンプが付与されます
- Ctrl+Cで停止するまで無限ループで動作します

### 収集した画像の使い方

収集した画像は以下のような用途に活用できます：

- 画像分類モデルのトレーニングデータ作成
- ゲーム状況の検出学習
- UI/UXの分析と改善

---

🌸 新しいツールを追加する場合は、このREADMEを更新してくださいね！ 