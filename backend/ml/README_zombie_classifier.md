# 🧟‍♂️ ResNet18ベース ゾンビ分類器

YOLOv8で検出した人物領域が「ゾンビかどうか」を判定する軽量な画像分類モデル

## 📝 概要

- **目的**: YOLOで切り出された人物領域画像に対して「ゾンビっぽさ」を判定
- **モデル**: ResNet18ベースの転移学習モデル（軽量・高速）
- **入力**: 224x224 RGB画像
- **出力**: 2クラス分類（`zombie`, `not_zombie`）
- **特徴**: 
  - 全結合層のみの学習 or 全層微調整の選択が可能
  - 推論時のNumPy配列（YOLOの切り出し領域）入力に対応

## 🗂️ データセット構造

```
data/datasets/zombie_classifier/
├── zombie/       # ゾンビの画像（.png形式）
└── not_zombie/   # ゾンビではない画像（.png形式）
```

## 🔧 学習方法

以下のコマンドで学習を実行できます：

```bash
python backend/ml/train_zombie_classifier.py --epochs 30 --batch_size 32
```

### オプション引数

| パラメータ | 説明 | デフォルト値 |
|------------|------|------------|
| `--data_path` | データセットのパス | `data/datasets/zombie_classifier` |
| `--batch_size` | バッチサイズ | `32` |
| `--epochs` | 学習エポック数 | `30` |
| `--lr` | 学習率 | `1e-4` |
| `--finetune` | 全層微調整モード（指定しない場合は全結合層のみ学習） | `False` |

### 出力ファイル

- **モデルファイル**: `backend/models/zombie_classifier.pt`
- **混同行列**: `backend/ml/confusion_matrix.png`
- **学習履歴**: `backend/ml/training_history.png`
- **分類レポート**: ターミナルに出力（精度・再現率・F1スコア）

## 🔮 推論方法

推論スクリプトを使って、学習したモデルでゾンビ分類を行えます：

```bash
python backend/ml/infer_zombie_classifier.py [画像パス]
```

画像パスを指定しない場合は、データセットからランダムに画像を選択して推論します。

### APIでの利用例

```python
from backend.ml.infer_zombie_classifier import ZombieClassifier

# 分類器のインスタンス化
classifier = ZombieClassifier()

# 画像ファイルからの予測
pred_class, prob = classifier.predict_image("path/to/image.png")

# バイトデータからの予測
with open("path/to/image.png", "rb") as f:
    img_bytes = f.read()
pred_class, prob = classifier.predict_bytes(img_bytes)

# NumPy配列からの予測（YOLOの切り出し領域）
# img_array は (H, W, 3) の形状、RGB形式
pred_class, prob = classifier.predict_numpy(img_array)
```

## 📈 パフォーマンス

モデルの大きさと推論速度の比較：

| モデル | パラメータ数 | モデルサイズ | 推論速度 |
|--------|------------|------------|----------|
| ResNet18 | 約11M | 約44MB | 高速 |
| ResNet34 | 約21M | 約84MB | 中速 |

※ ResNet18は、ResNet34に比べて約半分のパラメータ数で、推論速度も向上

## 📚 依存ライブラリ

- PyTorch
- torchvision
- NumPy
- Pillow
- scikit-learn
- matplotlib
- seaborn 