// FFmpegを初期化
const { createFFmpeg, fetchFile } = FFmpeg;
const ffmpeg = createFFmpeg({
    log: true,
    corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js',
});

// DOM要素を取得
const videoUpload = document.getElementById('video-upload');
const imageUpload = document.getElementById('image-upload');
const videoElement = document.getElementById('background-video');
const overlayImage = document.getElementById('overlay-img');
const form = document.getElementById('editor-form');

let videoFile = null;
let imageFile = null;

// 動画ファイルのアップロードを処理
videoUpload.addEventListener('change', (e) => {
    videoFile = e.target.files[0];
    if (videoFile) {
        videoElement.src = URL.createObjectURL(videoFile);
        videoElement.style.display = 'block';
    }
});

// 画像ファイルのアップロードを処理
imageUpload.addEventListener('change', (e) => {
    imageFile = e.target.files[0];
    if (imageFile) {
        overlayImage.src = URL.createObjectURL(imageFile);
        overlayImage.style.display = 'block';
    }
});

// スライダーとコントロール（プレビュー用）
const xSlider = document.getElementById('x-slider');
const ySlider = document.getElementById('y-slider');
const sizeSlider = document.getElementById('size-slider');
const rotateSlider = document.getElementById('rotate-slider');

function updateOverlayStyle() {
    if (overlayImage.style.display === 'block') {
        const x = xSlider.value;
        const y = ySlider.value;
        const size = sizeSlider.value / 100;
        const rotate = rotateSlider.value;
        overlayImage.style.transform = `translate(${x}px, ${y}px) scale(${size}) rotate(${rotate}deg)`;
    }
}

xSlider.addEventListener('input', updateOverlayStyle);
ySlider.addEventListener('input', updateOverlayStyle);
sizeSlider.addEventListener('input', updateOverlayStyle);
rotateSlider.addEventListener('input', updateOverlayStyle);

// ---

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!videoFile || !imageFile) {
        alert('動画と画像を両方アップロードしてください。');
        return;
    }

    // ボタンを無効化し、処理中メッセージを表示
    const downloadButton = e.target.querySelector('button');
    downloadButton.textContent = '処理中...';
    downloadButton.disabled = true;

    // FFmpegが読み込まれていない場合はロード
    if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
    }

    // ファイルをFFmpegの仮想ファイルシステムに書き込み
    ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));
    ffmpeg.FS('writeFile', 'overlay.png', await fetchFile(imageFile));

    // ユーザー設定を取得
    const startTime = parseFloat(document.getElementById('start-time').value);
    const endTime = parseFloat(document.getElementById('end-time').value);
    const x = document.getElementById('x-slider').value;
    const y = document.getElementById('y-slider').value;
    const size = document.getElementById('size-slider').value;
    const rotate = document.getElementById('rotate-slider').value;

    // FFmpeg用の回転角度（ラジアン）を計算
    const rotateInRadians = (rotate * Math.PI) / 180;

    // FFmpegの複雑なフィルタを作成
    // [1:v]rotate=... : 画像（1番目の入力）を回転
    // [0:v][rotated]overlay=... : 動画（0番目の入力）の上に回転した画像を重ねる
    // enable='between(t,...)': 開始から終了秒数までフィルタを有効化
    const filterComplex = `[1:v]rotate=${rotateInRadians}:c=none:ow=rotw(${rotateInRadians}):oh=roth(${rotateInRadians})[rotated];[0:v][rotated]overlay=${x}:${y}:enable='between(t,${startTime},${endTime})':shortest=1[v]`;

    // FFmpegコマンドを実行
    try {
        await ffmpeg.run(
            '-i', 'input.mp4',
            '-i', 'overlay.png',
            '-filter_complex', filterComplex,
            '-map', '[v]',
            '-map', '0:a?', // 元の動画の音声があればコピー
            '-c:a', 'copy',
            'output.mp4'
        );
        console.log('FFmpegコマンドが正常に実行されました。');

        // 出力ファイルを読み込み
        const data = ffmpeg.FS('readFile', 'output.mp4');

        // ダウンロードリンクを作成
        const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
        const downloadUrl = URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'edited_video.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

    } catch (error) {
        console.error('FFmpegの処理中にエラーが発生しました:', error);
        alert('動画の処理中にエラーが発生しました。コンソールを確認してください。');
    } finally {
        // ボタンを有効化
        downloadButton.textContent = '動画をダウンロード';
        downloadButton.disabled = false;
        // 仮想ファイルシステムをクリーンアップ
        ffmpeg.FS('unlink', 'input.mp4');
        ffmpeg.FS('unlink', 'overlay.png');
    }
});
