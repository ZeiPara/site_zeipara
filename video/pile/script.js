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


// !!!---ここから新しい処理を追加---!!!
video.addEventListener('loadedmetadata', () => {
    // 動画のサイズに合わせてCanvasのサイズを調整
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // スライダーの最大値を動画のサイズに合わせる
    xSlider.max = video.videoWidth;
    ySlider.max = video.videoHeight;
    // 画像が動画に収まる最大の大きさを計算
    sizeSlider.max = Math.min(video.videoWidth, video.videoHeight);

    // 初期値をリセット
    xSlider.value = 0;
    ySlider.value = 0;
    sizeSlider.value = 50; // 例として初期値も調整
    
    // スライダーの表示値を更新
    updateOverlayStyle();
});

// !!!---ここまで新しい処理を追加---!!!


function drawFrame() {
    // Canvasをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // 動画のフレームを描画
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const currentTime = video.currentTime;
    const startTime = parseFloat(startTimeInput.value);
    const endTime = parseFloat(endTimeInput.value);

    if (currentTime >= startTime && currentTime <= endTime) {
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
form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (!video.src) {
        alert('動画をアップロードしてください。');
        return;
    }

    video.currentTime = 0;
    video.play();

    const stream = canvas.captureStream();
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

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
    };

    mediaRecorder.start();
});

// 動画の再生ごとに描画を更新
video.addEventListener('play', () => {
    const drawInterval = setInterval(() => {
        drawFrame();
        if (video.paused || video.ended) {
            clearInterval(drawInterval);
        }
    }, 1000 / 30);
});

video.addEventListener('timeupdate', () => {
    // 録画中は指定時間で停止
    if (mediaRecorder && mediaRecorder.state === 'recording' && video.ended) {
        mediaRecorder.stop();
        video.pause();
    }
    // プレビューも更新
    updateOverlayStyle();
});

const inputs = form.querySelectorAll('input[type="range"], input[type="number"]');
inputs.forEach(input => {
    input.addEventListener('input', () => {
        // 再生中の場合は、リアルタイムにプレビューを更新する
        if (!video.paused) {
            drawFrame();
        }
        updateOverlayStyle();
    });
});
