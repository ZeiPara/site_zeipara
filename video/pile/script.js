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
        video.load(); // 動画を読み込む
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


// ... この下のコードは前回のものと同じだよ ...

// Canvasのサイズを動画に合わせる
video.addEventListener('loadedmetadata', () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
});

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

video.addEventListener('play', () => {
    const drawInterval = setInterval(() => {
        drawFrame();
        if (video.paused || video.ended) {
            clearInterval(drawInterval);
        }
    }, 1000 / 30);
});

video.addEventListener('timeupdate', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording' && video.ended) {
        mediaRecorder.stop();
        video.pause();
    }
});

const inputs = form.querySelectorAll('input[type="range"], input[type="number"]');
inputs.forEach(input => {
    input.addEventListener('input', () => {
        if (!video.paused) {
            drawFrame();
        }
    });
});
