"""
音声合成リクエストモデル

音声合成に関するリクエストのデータモデルを定義
"""

from pydantic import BaseModel
from typing import Optional

class VoiceSynthesisRequest(BaseModel):
    """音声合成リクエストのデータモデル"""
    text: str
    speaker_id: int = 1
    speed: float = 1.0
    pitch: float = 0.0
    volume: float = 1.0
    pre_phoneme_length: float = 0.1
    post_phoneme_length: float = 0.1
    output_sampling_rate: Optional[int] = None
    output_stereo: bool = False 