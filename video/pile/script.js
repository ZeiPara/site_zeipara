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


video.addEventListener('loadedmetadata', () => {
    // 動画のサイズに合わせてCanvasのサイズを調整
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // スライダーの最大値を動画のサイズに合わせる
    xSlider.max = video.videoWidth - 100; // 画像の大きさを考慮して調整
    ySlider.max = video.videoHeight - 100; // 画像の大きさを考慮して調整
    // 画像が動画に収まる最大の大きさを計算
    sizeSlider.max = Math.min(video.videoWidth, video.videoHeight);

    // 初期値をリセット
    xSlider.value = 50;
    ySlider.value = 50;
    sizeSlider.value = 100; 
    rotateSlider.value = 0;
    
    // スライダーの表示値を更新
    updateOverlayStyle();
});

function drawFrame() {
    // Canvasをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 動画のフレームを描画
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const currentTime = video.currentTime;
    const startTime = parseFloat(startTimeInput.value);
    const endTime = parseFloat(endTimeInput.value);

    // 画像Aが表示される時間帯かチェック
    if (overlayImg.src && currentTime >= startTime && currentTime <= endTime) {
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

    // overlayImgが存在するか確認
    if (overlayImg.src) {
        overlayImg.style.display = 'block';
        overlayImg.style.left = `${x}px`;
        overlayImg.style.top = `${y}px`;
        overlayImg.style.width = `${size}px`;
        overlayImg.style.transform = `rotate(${rotate}deg)`;
    }
}

// フォームの送信（ダウンロードボタンクリック）時の処理
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!video.src) {
        alert('動画をアップロードしてください。');
        return;
    }

    // ダウンロードボタンを無効化
    const downloadButton = e.target.querySelector('button[type="submit"]');
    downloadButton.disabled = true;
    downloadButton.textContent = 'ダウンロード中...';

    video.currentTime = 0;
    video.pause(); // プレビュー用の動画は一時停止

    // Canvasからストリームを取得
    const stream = canvas.captureStream(30); // フレームレートを30fpsに設定
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    recordedChunks = [];
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, {
            type: 'video/webm'
        });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited_video.webm';
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        recordedChunks = [];
        
        // ボタンを元に戻す
        downloadButton.disabled = false;
        downloadButton.textContent = '動画をダウンロード';
    };

    mediaRecorder.start();

    // 録画を開始
    video.currentTime = 0;
    video.play();
    
    // 描画ループを開始
    drawInterval = setInterval(() => {
        drawFrame();
    }, 1000 / 30); // 30fpsで描画
});

// 動画の再生が終了したら録画も停止
video.addEventListener('ended', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(drawInterval);
    }
});

video.addEventListener('timeupdate', () => {
    // プレビューのオーバーレイを更新
    updateOverlayStyle();

    const currentTime = video.currentTime;
    const startTime = parseFloat(startTimeInput.value);
    const endTime = parseFloat(endTimeInput.value);

    // プレビュー用の画像表示/非表示を切り替える
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
