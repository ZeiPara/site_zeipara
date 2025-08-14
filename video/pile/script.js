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

function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const currentTime = video.currentTime;
    const startTime = parseFloat(startTimeInput.value);
    const endTime = parseFloat(endTimeInput.value);

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


form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!video.src) {
        alert('動画をアップロードしてください。');
        return;
    }

    const downloadButton = e.target.querySelector('button[type="submit"]');
    downloadButton.disabled = true;
    downloadButton.textContent = 'ダウンロード中...';

    // 録画前に一度動画の再生を停止
    video.pause();
    video.currentTime = 0;

    // Canvasからストリームを取得してMediaRecorderを開始
    const stream = canvas.captureStream(30);
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

    recordedChunks = [];
    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited_video.webm';
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        recordedChunks = [];
        
        downloadButton.disabled = false;
        downloadButton.textContent = '動画をダウンロード';
        video.pause(); // 念のため録画終了後も停止
    };

    mediaRecorder.start();

    // 録画開始と同時に動画の再生も開始
    video.play();
    
    // 描画ループを開始
    drawInterval = setInterval(() => {
        drawFrame();
        // ここで動画が終了したら録画も停止
        if (video.ended) {
            clearInterval(drawInterval);
            if (mediaRecorder.state === 'recording') {
                mediaRecorder.stop();
            }
        }
    }, 1000 / 30);
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
