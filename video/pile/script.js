const video = document.getElementById('background-video');
const overlayImg = document.getElementById('overlay-img');
const videoUpload = document.getElementById('video-upload');
const imageUpload = document.getElementById('image-upload');
const form = document.getElementById('editor-form');
const canvas = document.getElementById('output-canvas');
const ctx = canvas.getContext('2d');

const xSlider = document.getElementById('x-slider');
const ySlider = document.getElementById('y-slider');
const sizeSlider = document.getElementById('size-slider');
const rotateSlider = document.getElementById('rotate-slider');
const startTimeInput = document.getElementById('start-time');
const endTimeInput = document.getElementById('end-time');

let mediaRecorder;
let recordedChunks = [];
let drawInterval;
let ffmpeg = null; // FFmpegインスタンスを管理する変数を追加

// FFmpegインスタンスを初期化する関数
const createFFmpeg = async () => {
    if (ffmpeg) {
        return ffmpeg;
    }
    const { createFFmpeg } = FFmpeg;
    ffmpeg = createFFmpeg({ log: true });
    await ffmpeg.load();
    return ffmpeg;
};

// 動画ファイルの読み込み処理
videoUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const videoURL = URL.createObjectURL(file);
        video.src = videoURL;
        video.load();
    }
});

// 画像ファイルの読み込み処理
imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const imageURL = URL.createObjectURL(file);
        overlayImg.src = imageURL;
    }
});

// 動画のメタデータが読み込まれたらスライダーを調整
video.addEventListener('loadedmetadata', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    xSlider.max = video.videoWidth;
    ySlider.max = video.videoHeight;
    sizeSlider.max = Math.min(video.videoWidth, video.videoHeight);

    xSlider.value = 0;
    ySlider.value = 0;
    sizeSlider.value = 50; 
    rotateSlider.value = 0;
    
    updateOverlayStyle();
});

// Canvasにフレームを描画する関数
function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const currentTime = video.currentTime;
    const startTime = parseFloat(startTimeInput.value);
    const endTime = parseFloat(endTimeInput.value);

    // 画像が読み込まれていて、かつ指定された時間内なら描画
    if (overlayImg.complete && overlayImg.src && currentTime >= startTime && currentTime <= endTime) {
        const x = parseFloat(xSlider.value);
        const y = parseFloat(ySlider.value);
        const size = parseFloat(sizeSlider.value);
        const rotate = parseFloat(rotateSlider.value);
        
        ctx.save();
        ctx.translate(x + size / 2, y + size / 2);
        ctx.rotate(rotate * Math.PI / 180);
        ctx.drawImage(overlayImg, -size / 2, -size / 2, size, size);
        ctx.restore();
    }
}

// プレビュー用の関数。CSSで画像を直接動かすため
function updateOverlayStyle() {
    const x = xSlider.value;
    const y = ySlider.value;
    const size = sizeSlider.value;
    const rotate = rotateSlider.value;

    if (overlayImg.src) {
        overlayImg.style.left = `${x}px`;
        overlayImg.style.top = `${y}px`;
        overlayImg.style.width = `${size}px`;
        overlayImg.style.transform = `rotate(${rotate}deg)`;
    }
}

form.addEventListener('submit', async (e) => { // asyncを追加
    e.preventDefault();

    if (!video.src) {
        alert('動画をアップロードしてください。');
        return;
    }

    const downloadButton = e.target.querySelector('button[type="submit"]');
    downloadButton.disabled = true;
    downloadButton.textContent = 'ダウンロード中...';

    video.pause();
    video.currentTime = 0;

    const stream = canvas.captureStream(30);
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    recordedChunks = [];
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    // ダウンロード処理をMP4変換後に実行するように変更
    mediaRecorder.onstop = async () => { // asyncを追加
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        
        if (blob.size === 0) {
            alert('動画データの作成に失敗しました。');
            downloadButton.disabled = false;
            downloadButton.textContent = '動画をダウンロード';
            return;
        }

        // WebMデータをFFmpegに渡す
        const inputFileName = 'input.webm';
        const outputFileName = 'edited_video.mp4';
        
        // FFmpegインスタンスを生成
        const ffmpeg = await createFFmpeg();
        
        // ファイルシステムにWebMを書き込む
        const arrayBuffer = await blob.arrayBuffer();
        ffmpeg.FS('writeFile', inputFileName, new Uint8Array(arrayBuffer));
        
        // FFmpegコマンドを実行してMP4に変換
        // -c:v copy で動画ストリームをそのままコピーすることで変換を高速化する
        await ffmpeg.run('-i', inputFileName, '-c:v', 'libx264', '-crf', '23', outputFileName);
        
        // 変換されたMP4を読み込む
        const mp4Data = ffmpeg.FS('readFile', outputFileName);
        const mp4Blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });
        
        // ダウンロード用のリンクを作成してクリック
        const url = URL.createObjectURL(mp4Blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = outputFileName;
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        
        // ファイルシステムをクリーンアップ
        ffmpeg.FS('unlink', inputFileName);
        ffmpeg.FS('unlink', outputFileName);

        recordedChunks = [];
        downloadButton.disabled = false;
        downloadButton.textContent = '動画をダウンロード';
        video.pause();
    };

    mediaRecorder.start();

    video.play();
    
    const stopRecordingOnEnd = () => {
        clearInterval(drawInterval);
        if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
        video.removeEventListener('ended', stopRecordingOnEnd);
    };
    video.addEventListener('ended', stopRecordingOnEnd);
    
    drawInterval = setInterval(drawFrame, 1000 / 30);
});

// 動画再生中のプレビュー処理
video.addEventListener('timeupdate', () => {
    updateOverlayStyle();

    const currentTime = video.currentTime;
    const startTime = parseFloat(startTimeInput.value);
    const endTime = parseFloat(endTimeInput.value);

    // overlayImgの表示/非表示を切り替える
    if (overlayImg.src && currentTime >= startTime && currentTime <= endTime) {
        overlayImg.style.display = 'block';
    } else {
        overlayImg.style.display = 'none';
    }
});

// スライダーや入力値が変更されたらプレビューを更新
const inputs = form.querySelectorAll('input[type="range"], input[type="number"]');
inputs.forEach(input => {
    input.addEventListener('input', () => {
        updateOverlayStyle();
    });
});
