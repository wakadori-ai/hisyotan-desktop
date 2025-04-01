/**
 * VOICEVOX音声キャッシュ管理モジュール
 * セリフIDに対応する音声ファイルの管理と生成を行います
 */

// 設定の読み込み（将来的にはconfigLoaderから取得するようにも可能）
const VOICEVOX_HOST = 'http://127.0.0.1:50021';
const CACHE_DIR = 'assets/sounds/generated';
const INDEX_FILE = `${CACHE_DIR}/index.json`;

// 音声インデックスのキャッシュ
let voiceIndex = null;

/**
 * VOICEVOXでセリフを生成 or キャッシュ取得
 * @param {string} id - セリフID（ファイル名にも使う）
 * @param {string} text - セリフ本文
 * @param {number} speakerId - VOICEVOXの話者ID（例: 8）
 * @param {Object} metadata - 追加のメタデータ（感情ラベル等）
 * @returns {Promise<string>} - ローカルWAVファイルのパス
 */
export async function getOrGenerateVoice(id, text, speakerId = 8, metadata = {}) {
  try {
    // キャッシュパスの構築
    const cachePath = `${CACHE_DIR}/${id}.wav`;
    
    // ファイルの存在確認（HEAD リクエスト）
    const exists = await checkFileExists(cachePath);
    
    // キャッシュが存在する場合はそのパスを返す
    if (exists) {
      console.log(`🎵 キャッシュ音声使用: ${id}`);
      return cachePath;
    }
    
    // キャッシュがない場合は新規生成
    console.log(`🔊 音声生成中: ${id} "${text}"`);
    
    // 1. VOICEVOX の audio_query エンドポイントを呼び出し
    const query = await generateAudioQuery(text, speakerId);
    
    // 2. synthesis エンドポイントで音声を生成
    const audioBlob = await synthesizeVoice(query, speakerId);
    
    // 3. 生成した音声をファイルに保存
    await saveVoiceToFile(audioBlob, cachePath);
    
    // 4. インデックスに情報を追加
    await addToVoiceIndex(id, text, speakerId, metadata);
    
    // 5. 保存したファイルのパスを返す
    return cachePath;
  } catch (error) {
    console.error('音声生成エラー:', error);
    throw error;
  }
}

/**
 * インデックスファイルから音声情報を取得
 * @param {string} id - セリフID
 * @returns {Promise<Object|null>} - 音声情報（存在しない場合はnull）
 */
export async function getVoiceInfo(id) {
  const index = await loadVoiceIndex();
  return index[id] || null;
}

/**
 * 全ての音声情報を取得
 * @returns {Promise<Object>} - 全音声情報のオブジェクト
 */
export async function getAllVoices() {
  return await loadVoiceIndex();
}

/**
 * ファイルの存在確認
 * @param {string} path - 確認するファイルパス
 * @returns {Promise<boolean>} - ファイルが存在するかどうか
 */
async function checkFileExists(path) {
  try {
    // Electron環境ならelectronAPI経由でメインプロセスに確認を依頼
    if (window.electronAPI) {
      return await window.electronAPI.checkFileExists(path);
    }
    
    // 通常のWeb環境ではHEADリクエストで存在確認（開発用）
    const response = await fetch(path, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.warn('ファイル存在確認エラー:', error);
    return false;
  }
}

/**
 * 音声インデックスを読み込み
 * @returns {Promise<Object>} - 音声インデックスオブジェクト
 */
async function loadVoiceIndex() {
  // キャッシュがあればそれを返す
  if (voiceIndex !== null) {
    return voiceIndex;
  }
  
  try {
    // インデックスファイルの存在確認
    const exists = await checkFileExists(INDEX_FILE);
    
    if (!exists) {
      // 存在しない場合は空のインデックスを作成
      voiceIndex = {};
      return voiceIndex;
    }
    
    // Electron環境の場合
    if (window.electronAPI) {
      const indexData = await window.electronAPI.readJsonFile(INDEX_FILE);
      voiceIndex = indexData || {};
      return voiceIndex;
    }
    
    // 通常のWeb環境の場合
    const response = await fetch(INDEX_FILE);
    if (response.ok) {
      voiceIndex = await response.json();
    } else {
      voiceIndex = {};
    }
    
    return voiceIndex;
  } catch (error) {
    console.warn('音声インデックス読み込みエラー:', error);
    return {};
  }
}

/**
 * 音声インデックスに情報を追加
 * @param {string} id - セリフID
 * @param {string} text - セリフ本文
 * @param {number} speakerId - 話者ID
 * @param {Object} metadata - 追加のメタデータ
 * @returns {Promise<boolean>} - 成功したかどうか
 */
async function addToVoiceIndex(id, text, speakerId, metadata = {}) {
  try {
    // インデックスを読み込み
    const index = await loadVoiceIndex();
    
    // 新しい情報を追加
    index[id] = {
      id,
      text,
      speaker_id: speakerId,
      file_path: `${CACHE_DIR}/${id}.wav`,
      created_at: new Date().toISOString(),
      ...metadata
    };
    
    // インデックスを保存
    if (window.electronAPI) {
      await window.electronAPI.writeJsonFile(INDEX_FILE, index);
    } else {
      console.warn('Web環境ではインデックスの保存はスキップされます');
    }
    
    // メモリ上のキャッシュを更新
    voiceIndex = index;
    
    return true;
  } catch (error) {
    console.error('インデックス更新エラー:', error);
    return false;
  }
}

/**
 * VOICEVOXのaudio_queryエンドポイントを呼び出し
 * @param {string} text - 音声化するテキスト
 * @param {number} speakerId - 話者ID
 * @returns {Promise<Object>} - 音声合成用クエリ
 */
async function generateAudioQuery(text, speakerId) {
  const url = `${VOICEVOX_HOST}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`VOICEVOX audio_query エラー: ${response.status}`);
  }
  
  return await response.json();
}

/**
 * VOICEVOXのsynthesisエンドポイントで音声合成
 * @param {Object} query - audio_queryの結果
 * @param {number} speakerId - 話者ID
 * @returns {Promise<Blob>} - 生成された音声データ
 */
async function synthesizeVoice(query, speakerId) {
  const url = `${VOICEVOX_HOST}/synthesis?speaker=${speakerId}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/wav',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(query)
  });
  
  if (!response.ok) {
    throw new Error(`VOICEVOX synthesis エラー: ${response.status}`);
  }
  
  return await response.blob();
}

/**
 * 生成した音声をファイルに保存
 * @param {Blob} audioBlob - 音声データ
 * @param {string} filePath - 保存先パス
 * @returns {Promise<void>}
 */
async function saveVoiceToFile(audioBlob, filePath) {
  // Electron環境ならelectronAPI経由でメインプロセスにファイル保存を依頼
  if (window.electronAPI) {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    await window.electronAPI.saveVoiceFile(filePath, Array.from(uint8Array));
    return;
  }
  
  // ブラウザ環境では一時的にダウンロードリンクを作成（開発/テスト用）
  console.warn('ブラウザ環境では実際のファイル保存はできません。音声URLを返します。');
  return URL.createObjectURL(audioBlob);
} 