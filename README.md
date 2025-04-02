# ふにゃ秘書たん（Funyā Hishotan）

優しくてかわいい「ふにゃっと癒やし系のAI秘書」デスクトップアプリケーションです。ユーザーの日常をサポートし、かわいいキャラクターとインタラクションできます。

<img src="./assets/images/preview.png" alt="ふにゃ秘書たんプレビュー" width="300" />

## 🌟 概要

「ふにゃ秘書たん」は、デスクトップ上で動作するAI秘書アプリケーションで、感情表現豊かなキャラクターとVOICEVOXによる自然な音声合成を組み合わせた癒し系インターフェースを提供します。Electron+FastAPIのハイブリッド構造により、柔軟性と性能を両立させています。

## ✨ 主な機能

- **音声会話**: [VOICEVOX](https://voicevox.hiroshiba.jp/)を使用したかわいい音声での対話
- **感情表現**: 状況に応じた多彩な表情と反応パターン（happy、worried、surprised、gentle、sleepyなど）
- **リアルタイム連携**: 7 Days to Die（ゲーム）との連携機能 - ゾンビ検出による臨場感のある反応
- **カスタマイズ可能**: 画像や音声キャラクターを自由に変更可能
- **透明度・サイズ調整**: UI設定から簡単に見た目をカスタマイズ
- **位置調整**: 画面上の好きな位置に配置可能（左上・右上・左下・右下）
- **一発起動スクリプト**: 簡単な操作でアプリケーション全体を起動

## 📋 技術仕様

- **フロントエンド**: 
  - Electron v28.0.0
  - HTML/CSS/JavaScript
  - WebSocket通信によるリアルタイム更新
  - 感情表現・UI制御・音声再生機能
  - axios v1.6.2（HTTP通信）
  - electron-log v5.3.3（ログ管理）
  - electron-store v8.1.0（設定保存）
  - Vite v6.2.4（開発ビルドツール）

- **バックエンド**: 
  - Python/FastAPI v0.104.1
  - Uvicorn v0.23.2
  - WebSocketによるリアルタイム通信
  - マルチスレッド/非同期処理

- **AI・画像認識**: 
  - YOLO v8（ultralytics 8.0.207）
  - OpenCV 4.8.1
  - ゲーム画面からのゾンビ検出機能
  - 転移学習によるカスタムモデル

- **音声合成**: 
  - VOICEVOX連携
  - 感情に応じた自然な音声生成
  - リアルタイム音声合成

- **通信アーキテクチャ**:
  - **HTTP API (REST)**: 設定取得、一時的なコマンド実行など
  - **WebSocket**: リアルタイム通信（ゾンビ検出結果、状態変更通知など）
  - **プロセス間通信**: ElectronのMain/Renderer間通信

## 🔧 インストールと設定

### 前提条件

- **フロントエンド**：
  - [Node.js](https://nodejs.org/) v14以上
  - npm（Node.jsに含まれています）

- **バックエンド**：
  - [Python](https://www.python.org/) 3.9以上（推奨：3.10）
  - [VOICEVOX](https://voicevox.hiroshiba.jp/) のインストール（音声合成エンジン）

### インストール手順

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/hisyotan-desktop.git
cd hisyotan-desktop

# フロントエンド依存関係のインストール
npm install

# バックエンド依存関係のインストール
pip install -r requirements.txt

# 機械学習モジュールの依存関係（オプション、ゾンビ検出機能を使用する場合）
pip install -r backend/ml/requirements.txt

# アプリケーションの起動
npm start
```

アプリケーションの起動時に自動的にバックエンド（Python FastAPI）が起動します。通常は手動でバックエンドを起動する必要はありません。

### Windows向け便利な起動方法

#### 簡単な起動方法

1. PowerShellを開きます
2. 以下のコマンドを実行します：
   ```
   .\start.ps1
   ```
   
このスクリプトは自動的に必要な環境をチェックし、フロントエンドとバックエンドを起動します。

#### 起動オプション

```
.\start.ps1                 通常モードで起動（Electron + Backend）
.\start.ps1 -Dev            開発モード起動（Vite + Electron + Backend）
.\start.ps1 -BackendOnly    バックエンド（FastAPI）のみ起動
.\start.ps1 -FrontendOnly   フロントエンド（Vite）のみ起動
.\start.ps1 -ElectronOnly   Electronのみ起動（他は手動で起動）
.\start.ps1 -Help           ヘルプ表示
```

バックエンドサーバーは以下のオプションもサポートしています：

```bash
# ゾンビ監視を有効にして起動
python backend/main.py --enable-monitoring

# ゾンビ検出機能を有効にして起動
python backend/main.py --zombie-detection

# デバッグモードで起動
python backend/main.py --debug
```

#### 診断ツール

システムの問題を診断するには、以下のコマンドを実行します：

```
.\diagnose.ps1
```

このスクリプトは必要な環境やサービスを自動的にチェックし、問題が見つかった場合は解決方法を提案します。

### アプリケーションの制御

- **表示/操作モードの切替**: 右上の設定アイコンをクリック
- **設定メニュー**: 透明度・サイズ・位置・自動透明化・最前面表示など調整可能
- **アプリの終了**: マウスカーソルをキャラクターに合わせると表示される×ボタンをクリック

## ⚙️ 設定ファイル

### フロントエンド設定 (`frontend/config/config.json`)

```json
{
  "window": {
    "width": 400,
    "height": 600,
    "opacity": 0.9
  },
  "voicevox": {
    "host": "http://127.0.0.1:50021",
    "speaker_id": 8
  },
  "backend": {
    "host": "http://127.0.0.1:8000",
    "ws_url": "ws://127.0.0.1:8000/ws"
  },
  "api": {
    "baseUrl": "http://127.0.0.1:8000"
  },
  "ui": {
    "display_time": 5000
  }
}
```

### バックエンド設定 (`backend/app/config.py`)

バックエンドの設定はPythonファイルで管理されており、音声合成や画像認識、WebSocket通信などの設定が含まれています。

```python
# VOICEVOXの設定
VOICEVOX_HOST = "http://127.0.0.1:50021"  # ローカルホストに変更
VOICEVOX_SPEAKER = 8  # 春日部つむぎ

# 音声パラメータのプリセット
VOICE_PRESETS = {
    "にこにこ": {"pitch": 0.06, "intonation": 1.3, "speed": 1.05},   # 明るく元気な声
    "警戒・心配": {"pitch": -0.03, "intonation": 0.9, "speed": 0.95}, # 少し不安げな声
    "びっくり": {"pitch": 0.12, "intonation": 1.5, "speed": 1.2},     # テンパっている声
    "やさしい": {"pitch": -0.06, "intonation": 1.1, "speed": 0.9},    # 落ち着いた声
    "眠そう": {"pitch": -0.09, "intonation": 0.8, "speed": 0.8}       # ふにゃふにゃ声
}
```

## 🔨 開発とビルド

### 開発モード

```bash
# 開発モードで実行（Vite開発サーバーのみ）
npm run dev

# 開発モードで実行（Vite + Electron）
npm run dev:electron
```

### アプリケーションのビルド

```bash
# フロントエンドビルド
npm run build

# Electronアプリケーションビルド
npm run build:electron

# Windows用ビルド
npm run dist -- --win

# macOS用ビルド
npm run dist -- --mac

# Linux用ビルド
npm run dist -- --linux
```

ビルド設定は`package.json`の`build`セクションで定義されています。

### Vite導入について

プロジェクトにViteを導入し、以下の機能が利用可能になりました：

#### パスエイリアス
相対パスの代わりに、以下のエイリアスが使用できます：

```js
// 変更前
import { logger } from '../core/logger.js';

// 変更後
import { logger } from '@core/logger.js';
```

利用可能なエイリアス：
- `@core` -> `frontend/core`
- `@ui` -> `frontend/ui`
- `@emotion` -> `frontend/emotion`
- `@assets` -> `frontend/assets`
- `@config` -> `frontend/config`
- `@voice` -> `frontend/voice`

## 🎨 キャラクターのカスタマイズ

### 画像リソース

- `assets/images/` ディレクトリにキャラクター画像を配置します
- 命名規則：`secretary_[emotion].png`（例：`secretary_happy.png`, `secretary_surprised.png`）
- 現在対応している感情表現：
  - normal（通常）
  - happy（幸せ）
  - smile（笑顔）
  - serious（真面目）
  - surprised（驚き）
  - sleepy（眠い）
  - relieved（安心）
  - archivement（達成感）
- 推奨サイズ：400x600px（設定に合わせて調整）
- 透過PNG形式を推奨

### 音声リソース

音声ファイルは以下のディレクトリに整理されています：

- `assets/sounds/presets/`: あらかじめ用意された効果音や音声
- `assets/sounds/generated/`: VOICEVOXで生成された音声のキャッシュ

### 感情表現システム

アプリケーションは以下の感情状態を認識し、それに応じた表示と音声を自動選択します：

| 感情ID | 対応する画像 | 表示条件 | 音声特性 |
|---------|----------|----------|----------|
| happy | secretary_happy.png | 通常時・ゾンビ1体以下 | 明るく優しい |
| worried | secretary_serious.png | ゾンビ2-4体検出時 | やや緊張した |
| surprised | secretary_surprised.png | ゾンビ5体以上検出時 | 高めのピッチで驚き |
| gentle | secretary_smile.png | ヘルプ表示時など | 落ち着いた丁寧な口調 |
| sleepy | secretary_sleepy.png | 長時間操作がない時 | ゆっくりで眠そうな |
| normal | secretary_normal.png | デフォルト状態 | 標準的な口調 |
| relieved | secretary_relieved.png | 危険が去った時 | 安堵した口調 |
| achievement | secretary_archivement.png | 達成時のお祝い | 嬉しそうな口調 |

`expressionManager.js`が感情状態の表示を、`emotionHandler.js`が感情状態の管理を制御しています。

## 🔊 音声合成システム

### 音声合成の仕組み

1. フロントエンド（`speechManager.js`）がバックエンドAPIに話す内容と感情を送信
2. バックエンドの`voice`モジュールがVOICEVOXと連携して音声を合成
3. WebSocketを通じて合成された音声データがフロントエンドに返され再生

### 話者選択

以下の話者IDを`config.json`で指定できます：

| キャラクター | 話者ID | 特徴 |
|-------------|--------|------|
| 四国めたん（あまあま） | 0 | 甘い声色の女性 |
| 四国めたん（ノーマル） | 1 | 標準的な女性 |
| 春日部つむぎ | 8 | 落ち着いた女性 |
| 青山龍星 | 14 | 若い男性 |

## 🦠 ゾンビ検出システム

ゲーム「7 Days to Die」との連携機能として、画面上のゾンビを検出する機能を搭載しています：

1. `detector_core.py`がYOLOv8を使用して画面上のゾンビを検出
2. `monitor.py`が定期的に画面をキャプチャし、検出結果を処理
3. `notification.py`が検出結果に基づき適切な通知とセリフを生成
4. WebSocketで結果をフロントエンドに送信し、秘書たんが適切に反応

### テスト機能

音声合成や機能をテストするには、以下のスクリプトを実行します：

```powershell
# 基本テスト（最新のログからゾンビ数を取得）
.\test_zombie_voice.ps1

# 特定の数のゾンビを検出した場合のテスト
.\test_zombie_voice.ps1 -count 5

# 全パターンをテスト
.\test_zombie_voice.ps1 -all

# APIエンドポイント経由でテスト
.\test_zombie_voice.ps1 -api -count 3

# 話者を変更してテスト
.\test_zombie_voice.ps1 -speaker 8 -count 3

# ヘルプ表示
.\test_zombie_voice.ps1 -help
```

## 📦 プロジェクト構造

```
hisyotan-desktop/
├── assets/                # 静的アセット
│   ├── images/           # キャラクター画像
│   ├── icons/            # アプリケーションアイコン
│   ├── models/           # AIモデルファイル
│   └── sounds/           # 効果音・音声ファイル
├── frontend/              # フロントエンドコード
│   ├── core/             # コア機能
│   ├── ui/               # UI関連コード
│   ├── emotion/          # 感情表現システム
│   ├── voice/            # 音声処理
│   ├── config/           # 設定関連
│   ├── index.html        # メインHTML
│   └── styles.css        # スタイルシート
├── backend/               # バックエンドコード（Python）
│   ├── app/              # アプリケーションモジュール
│   │   ├── core/         # コア機能
│   │   ├── zombie/       # ゾンビ検出関連
│   │   ├── voice/        # 音声合成関連
│   │   ├── services/     # 各種サービス機能
│   │   ├── ws/           # WebSocket処理
│   │   ├── routers/      # APIルーター
│   │   ├── models/       # データモデル
│   │   ├── events/       # イベント処理
│   │   └── config/       # 設定
│   ├── ml/               # 機械学習モジュール
│   ├── data/             # データ保存・キャッシュ
│   └── main.py           # バックエンドエントリーポイント
├── logs/                  # ログファイル格納ディレクトリ
├── main.js               # Electronエントリーポイント
├── package.json          # npm設定とスクリプト
├── vite.config.js        # Vite設定ファイル
├── requirements.txt      # Pythonパッケージ依存
├── .python-version       # Pythonバージョン指定
├── start.ps1             # 起動スクリプト
├── diagnose.ps1          # 診断スクリプト
├── copy-preload.js       # プリロードスクリプトコピー用
└── README.md             # プロジェクト説明
```

## 🤖 機械学習モジュール

`backend/ml` ディレクトリには、ゾンビ検出のためのモデルトレーニングと推論に関連するコードが含まれています：

- **train.py**: YOLOv8ベースのカスタムモデルをトレーニングするためのスクリプト
- **infer.py**: トレーニング済みモデルを使用して画像から対象物を検出するための推論スクリプト
- **models/**: トレーニング済みの検出モデルが保存されるディレクトリ
- **confusion_matrix.png**: モデルの性能評価のための混同行列
- **training_history.png**: 学習過程の可視化グラフ
- **sample_images.png**: 実際の検出例を示すサンプル画像

データセット構造は以下のようになっています：

```
data/datasets/zombie_classifier/
├── zombie/       # ゾンビの画像（.png形式）
└── not_zombie/   # ゾンビではない画像（.png形式）
```

## 処理フロー
![](docs/system-flow.png)


## 📝 ライセンス

MIT License

## 🤝 貢献

プルリクエストや機能提案は大歓迎です！バグ修正や新機能の提案は、Issue機能を使ってお気軽にお知らせください。

## 📅 最終更新日

2023年4月2日