# ヒショたんデスクトップ - デバッグガイド

ゾンビ検出機能でエラーが発生した場合のデバッグ手順を説明します。

## デバッグモードの使い方

ゾンビ検出機能をデバッグするための専用スクリプト `debug_start.py` を用意しています。このスクリプトを使用することで、検出閾値を調整したり詳細なログを確認したりできます。

### 基本的な使い方

```bash
python backend/debug_start.py
```

このコマンドは、デフォルトの設定（閾値 0.3）でバックエンドをデバッグモードで起動します。

### コマンドオプション

以下のオプションが利用可能です：

- `-h, --help`: ヘルプメッセージを表示
- `--threshold THRESHOLD, -t THRESHOLD`: 検出閾値を設定（デフォルト: 0.3）
- `--verbose, -v`: 詳細なログ出力を有効化

### 実行例

閾値を0.2に設定してデバッグを実行：
```bash
python backend/debug_start.py --threshold 0.2
```

詳細なログ出力を有効にして実行：
```bash
python backend/debug_start.py --verbose
```

閾値を0.1に設定して詳細ログも有効にする：
```bash
python backend/debug_start.py --threshold 0.1 --verbose
```

## トラブルシューティング

### ゾンビが検出されない場合

1. 閾値を下げてみてください：
   ```bash
   python backend/debug_start.py --threshold 0.2
   ```

2. 詳細ログを有効にして問題を特定：
   ```bash
   python backend/debug_start.py --verbose
   ```

### ファイルアクセスエラーの場合

1. メモリ処理の失敗：
   - メモリ内での画像処理に失敗した場合、ファイルI/Oを使用するフォールバック処理が実行されます
   - 詳細ログで処理経路を確認できます

2. リトライロジック：
   - ファイルアクセスエラーが発生した場合、自動的に5回までリトライします
   - 詳細ログを有効にすると、リトライの状況が確認できます

3. エラーログ：
   - フルスタックトレースが表示されるので、エラーの具体的な原因を特定できます

### WebSocket接続のデバッグ

WebSocket接続に問題がある場合：

1. 詳細ログを有効にして接続状態を確認：
   ```bash
   python backend/debug_start.py --verbose
   ```

## 既知の問題

### 1. timeモジュールの変数衝突

`detector_core.py`内で`time`変数の名前衝突が発生することがあります。この場合、以下のエラーが表示されます：

```
UnboundLocalError: cannot access local variable 'time' where it is not associated with a value
```

解決策：
- デバッグスクリプトでは自動的にこの問題を回避する対策を実装しています
- 根本的な修正を行う場合は`detector_core.py`内の`_detect_zombies`メソッドを修正してください

### 2. Windowsファイルアクセスの衝突

Windowsでは一時ファイルへのアクセス時に衝突が発生することがあります。
システムがリトライ処理を行いますが、それでも解決しない場合は、メモリ内処理への
フォールバックが試行されます。

## システム要件

- Python 3.8以上
- 必要なライブラリがすべてインストールされていること
- ゾンビ検出モデルファイルが`backend/models`ディレクトリに存在すること

問題が解決しない場合は、詳細なログを添えてIssueを作成してください。 