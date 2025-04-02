"""
ResNet18ベースのゾンビ分類器の推論スクリプト
"""
import os
from pathlib import Path
import sys
import torch
from torchvision import transforms
from PIL import Image
import numpy as np

class ZombieClassifier:
    """ゾンビ分類器クラス"""
    def __init__(self, model_path=None):
        """
        Args:
            model_path: モデルファイルのパス
        """
        # モデルファイルのパスを設定
        if model_path is None:
            # デフォルトのモデルパス
            current_file = Path(os.path.abspath(__file__))
            backend_dir = current_file.parent.parent
            model_path = backend_dir / 'models' / 'zombie_classifier.pt'
        else:
            model_path = Path(model_path)
        
        self.model_path = model_path
        print(f"モデルパス: {self.model_path} (存在: {self.model_path.exists()})")
        
        # GPUが利用可能かチェック
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"使用デバイス: {self.device}")
        
        # モデルの読み込み
        self.model = None
        self.classes = None
        self.load_model()
        
        # 推論用の変換
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
    
    def load_model(self):
        """モデルを読み込む"""
        if not self.model_path.exists():
            print(f"エラー: モデルファイル {self.model_path} が見つかりません。")
            return False
        
        try:
            # モデルの読み込み
            checkpoint = torch.load(self.model_path, map_location=self.device)
            
            # クラス情報の取得
            self.classes = checkpoint.get('classes', ['not_zombie', 'zombie'])
            
            # ResNet18モデルの構築
            from torchvision import models
            import torch.nn as nn
            
            model = models.resnet18(weights='IMAGENET1K_V1')
            num_ftrs = model.fc.in_features
            model.fc = nn.Linear(num_ftrs, len(self.classes))
            
            # モデルの重みを読み込み
            model.load_state_dict(checkpoint['model_state_dict'])
            model = model.to(self.device)
            model.eval()
            
            self.model = model
            print(f"モデルを正常に読み込みました。クラス: {self.classes}")
            return True
        
        except Exception as e:
            print(f"モデルの読み込み中にエラーが発生しました: {e}")
            return False
    
    def predict_image(self, img_path):
        """画像ファイルからゾンビを予測
        
        Args:
            img_path: 画像ファイルのパス
            
        Returns:
            pred_class: 予測クラス
            probability: 予測確率
        """
        if self.model is None:
            print("エラー: モデルが読み込まれていません。")
            return None, None
        
        try:
            # 画像の読み込みと前処理
            img = Image.open(img_path).convert('RGB')
            img_tensor = self.transform(img).unsqueeze(0).to(self.device)
            
            # 予測
            with torch.no_grad():
                outputs = self.model(img_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
                
                # 最大確率のクラスを取得
                max_prob, pred_idx = torch.max(probabilities, 0)
                pred_class = self.classes[pred_idx.item()]
                probability = max_prob.item()
                
                return pred_class, probability
        
        except Exception as e:
            print(f"予測中にエラーが発生しました: {e}")
            return None, None
    
    def predict_bytes(self, img_bytes):
        """バイトデータからゾンビを予測
        
        Args:
            img_bytes: 画像のバイトデータ
            
        Returns:
            pred_class: 予測クラス
            probability: 予測確率
        """
        if self.model is None:
            print("エラー: モデルが読み込まれていません。")
            return None, None
        
        try:
            # バイトデータから画像を読み込み
            import io
            img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
            img_tensor = self.transform(img).unsqueeze(0).to(self.device)
            
            # 予測
            with torch.no_grad():
                outputs = self.model(img_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
                
                # 最大確率のクラスを取得
                max_prob, pred_idx = torch.max(probabilities, 0)
                pred_class = self.classes[pred_idx.item()]
                probability = max_prob.item()
                
                return pred_class, probability
        
        except Exception as e:
            print(f"予測中にエラーが発生しました: {e}")
            return None, None
    
    def predict_numpy(self, img_array):
        """NumPy配列からゾンビを予測（YOLOの切り出し画像用）
        
        Args:
            img_array: NumPy形式の画像データ (RGB)
            
        Returns:
            pred_class: 予測クラス
            probability: 予測確率
        """
        if self.model is None:
            print("エラー: モデルが読み込まれていません。")
            return None, None
        
        try:
            # NumPy配列からPIL画像に変換
            img = Image.fromarray(img_array.astype('uint8')).convert('RGB')
            img_tensor = self.transform(img).unsqueeze(0).to(self.device)
            
            # 予測
            with torch.no_grad():
                outputs = self.model(img_tensor)
                probabilities = torch.nn.functional.softmax(outputs, dim=1)[0]
                
                # 最大確率のクラスを取得
                max_prob, pred_idx = torch.max(probabilities, 0)
                pred_class = self.classes[pred_idx.item()]
                probability = max_prob.item()
                
                return pred_class, probability
        
        except Exception as e:
            print(f"予測中にエラーが発生しました: {e}")
            return None, None

def main():
    """メイン関数"""
    # 分類器のインスタンス化
    classifier = ZombieClassifier()
    
    # コマンドライン引数から画像パスを取得
    if len(sys.argv) > 1:
        img_path = sys.argv[1]
    else:
        # テスト用にランダムな画像を選択
        zombie_dir = Path('data/datasets/zombie_classifier/zombie')
        not_zombie_dir = Path('data/datasets/zombie_classifier/not_zombie')
        
        if zombie_dir.exists() and not_zombie_dir.exists():
            # ランダムにどちらかのディレクトリから画像を選択
            import random
            if random.choice([True, False]):
                img_files = list(zombie_dir.glob('*.png'))
                if img_files:
                    img_path = str(img_files[0])
                    print(f"[ゾンビ] ゾンビ画像を選択しました: {img_path}")
                else:
                    print("エラー: ゾンビ画像が見つかりません。")
                    return
            else:
                img_files = list(not_zombie_dir.glob('*.png'))
                if img_files:
                    img_path = str(img_files[0])
                    print(f"[人間] 非ゾンビ画像を選択しました: {img_path}")
                else:
                    print("エラー: 非ゾンビ画像が見つかりません。")
                    return
        else:
            print("エラー: データフォルダが正しく設定されていません。")
            print("データは次の場所にあるべきです: data/datasets/zombie_classifier/")
            return
    
    # 画像の予測
    pred_class, prob = classifier.predict_image(img_path)
    
    if pred_class and prob:
        # 結果の表示
        class_label = "[ゾンビ]" if pred_class == "zombie" else "[人間]"
        print(f"\n{class_label} 予測結果: {pred_class}")
        print(f"   確信度: {prob:.2%}")
        
        # 簡易的な説明
        if prob > 0.9:
            print("   非常に高い確率で判定しました ✨")
        elif prob > 0.7:
            print("   かなりの確率で判定しました 🐾")
        elif prob > 0.5:
            print("   やや確信度が低いですが、判定しました 🐈️")
        else:
            print("   確信度が低いです。別の画像で試してみてください 💫")
    else:
        print("エラー: 予測に失敗しました。モデルが正しく読み込まれているか確認してください。")
        print("  先にモデルを学習する必要があります。")

if __name__ == "__main__":
    main() 