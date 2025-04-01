# ゾンビ画像分類器 🧟✨

シンプルな転移学習ベースの画像分類器です。ゾンビの画像を認識するためのモデルを学習・推論します。

## セットアップ

必要なライブラリをインストールします：

```bash
pip install -r requirements.txt
```

## データセット構造

データセットは以下のフォルダ構造を想定しています：

```
data/datasets/zombie_classifier/
├── zombie/       # ゾンビの画像（.png形式）
└── not_zombie/   # ゾンビではない画像（.png形式）
```

## 使い方

### モデルの学習

```python
from zombie_classifier import ZombieClassifier

# 分類器のインスタンス化
classifier = ZombieClassifier()

# データの準備
dls = classifier.prepare_data()

# モデルの学習
learn = classifier.train(epochs=8)

# モデルの評価
classifier.evaluate()
```

### 単一画像の予測

```python
# 画像を予測
pred_class, prob = classifier.predict_image("path/to/image.png")
print(f"予測クラス: {pred_class}, 確率: {prob:.4f}")
```

## パラメータ調整

学習パラメータは`train()`メソッドで調整できます：

```python
classifier.train(
    epochs=10,            # 学習エポック数
    lr=1e-4,              # 学習率
    freeze_epochs=3,      # 特徴抽出部を凍結するエポック数
    model_name='resnet34'  # 使用する事前学習モデル
)
```

## 注意点

- データ量が少ない場合は、データ拡張が自動的に適用されます
- モデルは`models/zombie_classifier.pkl`に保存されます
- 評価結果は画像ファイル（confusion_matrix.pngとtop_losses.png）に保存されます 