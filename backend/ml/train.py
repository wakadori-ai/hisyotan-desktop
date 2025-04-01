import os
from pathlib import Path
import numpy as np
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
from torch.utils.data import Dataset, DataLoader
import random
import shutil

class ZombieDataset(Dataset):
    def __init__(self, root_dir, transform=None, train=True, valid_split=0.2):
        """ゾンビ分類用のデータセット
        
        Args:
            root_dir: データセットのルートディレクトリ
            transform: 適用する変換
            train: 訓練データか検証データか
            valid_split: 検証データの割合
        """
        self.root_dir = Path(root_dir)
        self.transform = transform
        self.train = train
        self.valid_split = valid_split
        
        # クラスを取得
        self.classes = [d.name for d in self.root_dir.iterdir() if d.is_dir()]
        self.class_to_idx = {cls: i for i, cls in enumerate(self.classes)}
        
        # 画像パスとラベルのリストを作成
        self.images = []
        for cls in self.classes:
            class_dir = self.root_dir / cls
            for img_path in class_dir.glob('*.png'):
                self.images.append((img_path, self.class_to_idx[cls]))
        
        # 訓練/検証データに分割
        random.seed(42)
        random.shuffle(self.images)
        
        split_idx = int(len(self.images) * (1 - valid_split))
        if train:
            self.images = self.images[:split_idx]
        else:
            self.images = self.images[split_idx:]
    
    def __len__(self):
        return len(self.images)
    
    def __getitem__(self, idx):
        img_path, label = self.images[idx]
        image = Image.open(img_path).convert('RGB')
        
        if self.transform:
            image = self.transform(image)
        
        return image, label

class ZombieClassifier:
    def __init__(self, data_path='../data/datasets/zombie_classifier'):
        """ゾンビ分類器の初期化
        
        Args:
            data_path: データセットへのパス
        """
        self.data_path = Path(data_path)
        self.model_path = Path('models')
        self.model_path.mkdir(exist_ok=True)
        self.model = None
        self.classes = ['not_zombie', 'zombie']  # クラスラベル
        
        # GPUが利用可能かチェック
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"使用デバイス: {self.device}")
        
        # 変換の定義
        self.train_transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(20),
            transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
        
        self.valid_transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
    
    def prepare_data(self, batch_size=8):
        """データの準備とDataLoaderの作成
        
        Args:
            batch_size: バッチサイズ
        """
        # データパスの確認
        print(f"データパス: {self.data_path} (存在: {self.data_path.exists()})")
        
        if not self.data_path.exists():
            raise FileNotFoundError(f"データパス {self.data_path} が見つかりません。パスを確認してください。")
            
        # サブディレクトリの確認
        subdirs = [d for d in self.data_path.iterdir() if d.is_dir()]
        if not subdirs:
            raise FileNotFoundError(f"データパス {self.data_path} 内にクラスディレクトリが見つかりません。")
        
        print(f"データディレクトリ: {[d.name for d in subdirs]}")
        
        # データセットの作成
        train_dataset = ZombieDataset(self.data_path, transform=self.train_transform, train=True)
        valid_dataset = ZombieDataset(self.data_path, transform=self.valid_transform, train=False)
        
        # DataLoaderの作成
        self.train_loader = DataLoader(
            train_dataset, 
            batch_size=batch_size, 
            shuffle=True,
            num_workers=0
        )
        
        self.valid_loader = DataLoader(
            valid_dataset, 
            batch_size=batch_size, 
            shuffle=False,
            num_workers=0
        )
        
        # クラス情報の保存
        self.classes = train_dataset.classes
        print(f"クラス: {self.classes}")
        
        return self.train_loader, self.valid_loader
    
    def train(self, epochs=10, lr=1e-4):
        """モデルの学習
        
        Args:
            epochs: 学習エポック数
            lr: 学習率
        """
        # ResNet18モデルの作成
        self.model = models.resnet18(weights='IMAGENET1K_V1')
        
        # 最終層を置き換え
        num_ftrs = self.model.fc.in_features
        self.model.fc = nn.Linear(num_ftrs, len(self.classes))
        
        # GPUに転送
        self.model = self.model.to(self.device)
        
        # 損失関数と最適化手法の設定
        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        
        # 学習率スケジューラ
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode='min', factor=0.5, patience=2, verbose=True
        )
        
        # 学習履歴
        history = {'train_loss': [], 'train_acc': [], 'valid_loss': [], 'valid_acc': []}
        best_valid_acc = 0
        
        # 学習ループ
        print(f"開始: {epochs}エポックの学習を開始します...")
        for epoch in range(epochs):
            # 訓練フェーズ
            self.model.train()
            train_loss = 0
            train_correct = 0
            train_total = 0
            
            for inputs, labels in self.train_loader:
                inputs, labels = inputs.to(self.device), labels.to(self.device)
                
                # 勾配をゼロにリセット
                optimizer.zero_grad()
                
                # 順伝播、逆伝播、最適化
                outputs = self.model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
                
                # 統計情報の更新
                train_loss += loss.item() * inputs.size(0)
                _, predicted = torch.max(outputs, 1)
                train_total += labels.size(0)
                train_correct += (predicted == labels).sum().item()
            
            # エポックごとの訓練損失と精度
            train_loss = train_loss / train_total
            train_acc = train_correct / train_total
            
            # 検証フェーズ
            self.model.eval()
            valid_loss = 0
            valid_correct = 0
            valid_total = 0
            
            with torch.no_grad():
                for inputs, labels in self.valid_loader:
                    inputs, labels = inputs.to(self.device), labels.to(self.device)
                    
                    # 順伝播
                    outputs = self.model(inputs)
                    loss = criterion(outputs, labels)
                    
                    # 統計情報の更新
                    valid_loss += loss.item() * inputs.size(0)
                    _, predicted = torch.max(outputs, 1)
                    valid_total += labels.size(0)
                    valid_correct += (predicted == labels).sum().item()
            
            # エポックごとの検証損失と精度
            valid_loss = valid_loss / valid_total
            valid_acc = valid_correct / valid_total
            
            # 学習率の調整
            scheduler.step(valid_loss)
            
            # 結果の表示
            print(f"Epoch {epoch+1}/{epochs} | "
                  f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.4f} | "
                  f"Valid Loss: {valid_loss:.4f} | Valid Acc: {valid_acc:.4f}")
            
            # 履歴の更新
            history['train_loss'].append(train_loss)
            history['train_acc'].append(train_acc)
            history['valid_loss'].append(valid_loss)
            history['valid_acc'].append(valid_acc)
            
            # 最良モデルの保存
            if valid_acc > best_valid_acc:
                best_valid_acc = valid_acc
                model_path = self.model_path/'zombie_classifier.pth'
                torch.save({
                    'epoch': epoch,
                    'model_state_dict': self.model.state_dict(),
                    'optimizer_state_dict': optimizer.state_dict(),
                    'train_loss': train_loss,
                    'valid_loss': valid_loss,
                    'valid_acc': valid_acc,
                    'classes': self.classes
                }, model_path)
                print(f"精度向上: モデルを保存しました: {model_path}")
        
        print(f"完了: 学習完了！最終精度: {valid_acc:.4f}")
        return self.model, history
    
    def evaluate(self):
        """モデルの評価"""
        if self.model is None:
            print("エラー: モデルが学習されていません。train()を先に実行してください。")
            return
        
        # 混同行列のデータ収集
        self.model.eval()
        y_true = []
        y_pred = []
        
        with torch.no_grad():
            for inputs, labels in self.valid_loader:
                inputs, labels = inputs.to(self.device), labels.to(self.device)
                outputs = self.model(inputs)
                _, predicted = torch.max(outputs, 1)
                
                y_true.extend(labels.cpu().numpy())
                y_pred.extend(predicted.cpu().numpy())
        
        # 混同行列の表示
        from sklearn.metrics import confusion_matrix, classification_report
        import seaborn as sns
        
        cm = confusion_matrix(y_true, y_pred)
        plt.figure(figsize=(8, 6))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                    xticklabels=self.classes, yticklabels=self.classes)
        plt.xlabel('予測')
        plt.ylabel('実際')
        plt.title('混同行列')
        plt.savefig('confusion_matrix.png')
        
        # 分類レポートの表示
        report = classification_report(y_true, y_pred, target_names=self.classes)
        print("分類レポート:")
        print(report)
        
        # 精度の計算
        correct = sum(p == t for p, t in zip(y_pred, y_true))
        total = len(y_true)
        accuracy = correct / total
        print(f"📊 検証データでの精度: {accuracy:.4f}")
        
        return accuracy
    
    def predict_image(self, img_path):
        """画像の予測
        
        Args:
            img_path: 予測する画像のパス
            
        Returns:
            予測クラス, 信頼度
        """
        if self.model is None:
            try:
                # モデルの読み込み
                model_path = self.model_path/'zombie_classifier.pth'
                checkpoint = torch.load(model_path)
                
                # ResNet18モデルの作成
                self.model = models.resnet18(weights=None)
                num_ftrs = self.model.fc.in_features
                self.model.fc = nn.Linear(num_ftrs, len(self.classes))
                
                # 保存されたパラメータを読み込み
                self.model.load_state_dict(checkpoint['model_state_dict'])
                self.model.to(self.device)
                self.model.eval()
                
                print(f"モデルを読み込みました: {model_path}")
            except Exception as e:
                print(f"エラー: モデルの読み込みに失敗しました: {e}")
                return None, 0.0
        
        try:
            # 画像の前処理
            img = Image.open(img_path).convert('RGB')
            image_tensor = self.valid_transform(img).unsqueeze(0).to(self.device)
            
            # 予測の実行
            with torch.no_grad():
                outputs = self.model(image_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)
                confidence, predicted = torch.max(probabilities, 1)
                
            # 結果の返却
            predicted_class = self.classes[predicted[0].item()]
            confidence_value = confidence[0].item()
            
            return predicted_class, confidence_value
        
        except Exception as e:
            print(f"エラー: 画像の予測中にエラーが発生しました: {e}")
            return None, 0.0

def plot_training_history(history):
    """学習履歴をプロット"""
    plt.figure(figsize=(12, 4))
    
    # 損失のプロット
    plt.subplot(1, 2, 1)
    plt.plot(history['train_loss'], label='Train Loss')
    plt.plot(history['valid_loss'], label='Valid Loss')
    plt.xlabel('Epochs')
    plt.ylabel('Loss')
    plt.legend()
    plt.title('Training and Validation Loss')
    
    # 精度のプロット
    plt.subplot(1, 2, 2)
    plt.plot(history['train_acc'], label='Train Accuracy')
    plt.plot(history['valid_acc'], label='Valid Accuracy')
    plt.xlabel('Epochs')
    plt.ylabel('Accuracy')
    plt.legend()
    plt.title('Training and Validation Accuracy')
    
    plt.tight_layout()
    plt.savefig('training_history.png')

def main():
    """メイン処理：データセットの学習と評価"""
    # GPUの状態を確認
    print(f"CUDA利用可能: {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"GPU: {torch.cuda.get_device_name(0)}")
        print(f"GPU数: {torch.cuda.device_count()}")
        
    # クラスのインスタンス化
    classifier = ZombieClassifier()
    
    # データの準備
    print("開始: モデルの学習を開始します...")
    train_loader, valid_loader = classifier.prepare_data(batch_size=8)
    
    # データサンプルの表示（オプション）
    def show_batch(loader):
        images, labels = next(iter(loader))
        plt.figure(figsize=(10, 8))
        grid = np.zeros((4*224, 4*224, 3))
        
        for i in range(min(16, len(images))):
            img = images[i].permute(1, 2, 0).cpu().numpy()
            img = (img * [0.229, 0.224, 0.225]) + [0.485, 0.456, 0.406]  # 正規化を戻す
            img = np.clip(img, 0, 1)
            
            row = i // 4
            col = i % 4
            grid[row*224:(row+1)*224, col*224:(col+1)*224] = img
            
        plt.imshow(grid)
        plt.axis('off')
        plt.savefig('sample_images.png')
    
    try:
        show_batch(train_loader)
    except:
        print("サンプル画像の表示をスキップします")
    
    # モデルの学習
    print("🚀 モデルの学習を開始します...")
    model, history = classifier.train(epochs=8, lr=1e-4)
    
    # 学習履歴のプロット
    plot_training_history(history)
    
    # モデルの評価
    print("📊 モデルを評価しています...")
    classifier.evaluate()
    
    # テスト推論（サンプル）
    try:
        test_img = list(Path('../data/datasets/zombie_classifier/zombie').glob('*.png'))[0]
        print(f"🧪 テスト画像での推論: {test_img}")
        pred_class, prob = classifier.predict_image(test_img)
    except IndexError:
        print("警告: テスト画像が見つかりませんでした。モデルは正常に学習されています。")

if __name__ == "__main__":
    main() 