"""
ゾンビ分類器の使用例：推論サンプル
"""
from pathlib import Path
import sys
from backend.ml.train import ZombieClassifier

def main():
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
                    print(f"🧟 ゾンビ画像を選択しました: {img_path}")
                else:
                    print("❌ ゾンビ画像が見つかりません。")
                    return
            else:
                img_files = list(not_zombie_dir.glob('*.png'))
                if img_files:
                    img_path = str(img_files[0])
                    print(f"🙂 非ゾンビ画像を選択しました: {img_path}")
                else:
                    print("❌ 非ゾンビ画像が見つかりません。")
                    return
        else:
            print("❌ データフォルダが正しく設定されていません。")
            print("データは次の場所にあるべきです: data/datasets/zombie_classifier/")
            return
    
    # 画像の予測
    pred_class, prob = classifier.predict_image(img_path)
    
    if pred_class and prob:
        # 結果の表示（より詳細に）
        emoji = "🧟" if pred_class == "zombie" else "🙂"
        print(f"\n{emoji} 予測結果: {pred_class}")
        print(f"   確信度: {prob:.2%}")
        
        # 簡易的な説明
        if prob > 0.9:
            print("   非常に高い確率で判定しました ✓")
        elif prob > 0.7:
            print("   かなりの確率で判定しました ✓")
        elif prob > 0.5:
            print("   やや確信度が低いですが、判定しました △")
        else:
            print("   確信度が低いです。別の画像で試してみてください ×")
    else:
        print("❌ 予測に失敗しました。モデルが正しく読み込まれているか確認してください。")
        print("  先にモデルを学習する必要があります。")

if __name__ == "__main__":
    main() 