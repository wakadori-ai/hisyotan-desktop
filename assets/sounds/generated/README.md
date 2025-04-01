# VOICEVOX生成音声キャッシュディレクトリ

このディレクトリには、VOICEVOXで生成された音声ファイルがキャッシュとして保存されます。

## ディレクトリ構成

- `*.wav` - 生成された音声ファイル（IDごと）
- `index.json` - 音声ファイルの一覧とメタデータ

## インデックスファイル (index.json) の形式

```json
{
  "surprised_01": {
    "id": "surprised_01",
    "text": "や、やばいってば〜！",
    "speaker_id": 8,
    "file_path": "assets/sounds/generated/surprised_01.wav",
    "created_at": "2023-05-01T12:34:56.789Z",
    "emotion": "surprised",
    "priority": "high"
  },
  "worried_01": {
    "id": "worried_01",
    "text": "ちょっと心配だよ...",
    "speaker_id": 8,
    "file_path": "assets/sounds/generated/worried_01.wav",
    "created_at": "2023-05-01T13:45:12.345Z",
    "emotion": "worried",
    "priority": "medium"
  }
}
``` 