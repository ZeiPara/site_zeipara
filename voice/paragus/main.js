// --- 設定部分 ---
// 音声分割用データ例（各文字ごとのタイミング区間リスト）
const dataArray = ["こんにちは", "ばんごはん"];
const voiceTimings = [
  [ [0,0.5], [0.5,1], [1,1.5], [1.5,2], [2,2.5] ], // こんにちは
  [ [0,0.5], [0.5,1], [1,1.5], [1.5,2], [2,2.5] ]  // ばんごはん
];

// 音声ファイルURL（例: 2つのWAVファイルを用意）
const wavFiles = [
  'voice_konnichiwa.wav',    // こんにちは
  'voice_bangohan.wav'       // ばんごはん
];

// --- 部分一致判定ロジック ---
function findMatches(content, dataArray) {
  const matchResults = [];
  while (content.length > 0) {
    let found = false;
    for (let i = content.length; i > 0; i--) {
      const subStr = content.slice(0, i);
      for (let idx = 0; idx < dataArray.length; idx++) {
        const data = dataArray[idx];
        if (data.includes(subStr)) {
          // 部分ごとの位置を記録
          let chars = [];
          let pos = data.indexOf(subStr);
          for (let j = 0; j < subStr.length; j++) {
            chars.push(pos + j);
          }
          matchResults.push({ dataIdx: idx, charIdxs: chars });
          content = content.slice(i);
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) content = content.slice(1);
  }
  return matchResults;
}

// --- WAV切り抜き関数 ---
function trimWav(wavBuffer, startTimeMs, endTimeMs) {
  const sampleRate = new DataView(wavBuffer).getUint32(24, true);
  const channels = new DataView(wavBuffer).getUint16(22, true);
  const bitsPerSample = new DataView(wavBuffer).getUint16(34, true);
  const dataStart = 44;

  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
  const startByte = dataStart + Math.round((startTimeMs / 1000) * bytesPerSecond);
  const endByte = dataStart + Math.round((endTimeMs / 1000) * bytesPerSecond);

  const trimmedData = wavBuffer.slice(startByte, endByte);

  const newWavBuffer = new ArrayBuffer(44 + trimmedData.byteLength);
  const view = new DataView(newWavBuffer);

  // ヘッダーコピー
  new Uint8Array(newWavBuffer, 0, 44).set(new Uint8Array(wavBuffer, 0, 44));
  view.setUint32(4, 36 + trimmedData.byteLength, true); // ファイルサイズ
  view.setUint32(40, trimmedData.byteLength, true);      // データサイズ

  // データコピー
  new Uint8Array(newWavBuffer, 44).set(new Uint8Array(trimmedData));

  return newWavBuffer;
}

// --- WAV結合関数 ---
function concatWav(buffers) {
  // すべてのデータ部分（44byte以降）を結合
  let totalLength = 44;
  const datas = [];
  for (const b of buffers) {
    datas.push(new Uint8Array(b, 44));
    totalLength += b.byteLength - 44;
  }

  // 新しいWAVヘッダを生成
  const result = new ArrayBuffer(totalLength);
  const view = new DataView(result);

  // 先頭は最初のヘッダをコピー
  new Uint8Array(result, 0, 44).set(new Uint8Array(buffers[0], 0, 44));
  view.setUint32(4, 36 + totalLength - 44, true); // ファイルサイズ
  view.setUint32(40, totalLength - 44, true);     // データサイズ

  // データ部分を結合
  let offset = 44;
  for (const d of datas) {
    new Uint8Array(result, offset, d.length).set(d);
    offset += d.length;
  }
  return result;
}

// --- ボタンイベント ---
document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('download');
  button.addEventListener('click', async (e) => {
    e.preventDefault();

    const inputElem = document.getElementById('content');
    // <form type="text" id="content"> ではなく <input type="text" id="content"> にするべき
    // ここでは value を取得
    const content = inputElem.value || "";

    // 部分一致判定
    const matches = findMatches(content, dataArray);

    // 各WAVファイルをfetchしてArrayBuffer取得
    const buffers = [];
    for (let i = 0; i < wavFiles.length; i++) {
      const response = await fetch(wavFiles[i]);
      const arrayBuffer = await response.arrayBuffer();
      buffers.push(arrayBuffer);
    }

    // 必要部分のみ切り抜き
    let cutBuffers = [];
    for (const match of matches) {
      const wavBuffer = buffers[match.dataIdx];
      for (const charIdx of match.charIdxs) {
        const [start, end] = voiceTimings[match.dataIdx][charIdx];
        const cutBuf = trimWav(wavBuffer, start * 1000, end * 1000);
        cutBuffers.push(cutBuf);
      }
    }

    // WAV結合
    const finalWav = concatWav(cutBuffers);

    // Blob生成＆ダウンロード
    const blob = new Blob([finalWav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'result.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    // ダウンロードエリアにメッセージ表示
    const downloadArea = document.querySelector('.downloadarea');
    downloadArea.textContent = 'ダウンロードしました！';
  });
});
