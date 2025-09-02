function trimWav(wavBuffer, startTimeMs, endTimeMs) {
  // 1. WAVヘッダーの解析とデータの抽出
  const sampleRate = new DataView(wavBuffer).getUint32(24, true);
  const channels = new DataView(wavBuffer).getUint16(22, true);
  const bitsPerSample = new DataView(wavBuffer).getUint16(34, true);
  const dataStart = 44;

  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
  const startByte = dataStart + Math.round((startTimeMs / 1000) * bytesPerSecond);
  const endByte = dataStart + Math.round((endTimeMs / 1000) * bytesPerSecond);

  const trimmedData = wavBuffer.slice(startByte, endByte);

  // 2. 新しいWAVファイル用のArrayBufferを作成
  const newWavBuffer = new ArrayBuffer(44 + trimmedData.byteLength);
  const view = new DataView(newWavBuffer);

  // ヘッダーをコピー
  new Uint8Array(newWavBuffer, 0, 44).set(new Uint8Array(wavBuffer, 0, 44));

  // ヘッダー情報を更新
  view.setUint32(4, 36 + trimmedData.byteLength, true); // ファイルサイズ
  view.setUint32(40, trimmedData.byteLength, true); // データサイズ

  // 音声データをコピー
  new Uint8Array(newWavBuffer, 44).set(new Uint8Array(trimmedData));

  // 3. Blobを作成してURLを生成
  const blob = new Blob([newWavBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  
  return url;
}

// 使用例
// ユーザーがボタンをクリックしたときの処理など
document.getElementById('downloadButton').addEventListener('click', async () => {
  // 例: Fetch APIで元のWAVファイルを取得
  const response = await fetch('your_audio_file.wav');
  const arrayBuffer = await response.arrayBuffer();

  // 切り抜き処理を実行し、ダウンロードURLを取得
  const downloadUrl = trimWav(arrayBuffer, 1000, 5000); 

  // ダウンロードリンクをシミュレート
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = 'trimmed_audio.wav'; 
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // URLを解放（メモリを節約）
  URL.revokeObjectURL(downloadUrl);
});
