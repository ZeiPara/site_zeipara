document.addEventListener('DOMContentLoaded', () => {
    const videoFile = document.getElementById('videoFile');
    const audioFile = document.getElementById('audioFile');
    const startSecondInput = document.getElementById('startSecond');
    const mergeButton = document.getElementById('mergeButton');
    const outputVideo = document.getElementById('outputVideo');

    let videoUrl = null;
    let audioBuffer = null;

    // 動画ファイルの読み込み
    videoFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            videoUrl = URL.createObjectURL(file);
            outputVideo.src = videoUrl;
        }
    });

    // 音声ファイルの読み込み
    audioFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                try {
                    audioBuffer = await audioContext.decodeAudioData(event.target.result);
                } catch (e) {
                    alert('音声ファイルのデコードに失敗しました。');
                    audioBuffer = null;
                }
            };
            reader.readAsArrayBuffer(file);
        }
    });

    // 合成ボタンのクリックイベント
    mergeButton.addEventListener('click', () => {
        // ファイルが選択されているかチェック
        if (!videoUrl || !audioBuffer) {
            alert('動画と音声ファイルを選択してください。');
            return;
        }

        const startSecond = parseFloat(startSecondInput.value);

        // 動画の読み込みが完了しているかチェック
        if (outputVideo.readyState < 2) {
            alert('動画の読み込みが完了していません。少し待ってから再度試してください。');
            return;
        }
        
        const videoDuration = outputVideo.duration;
        const audioDuration = audioBuffer.duration;

        // 秒数チェック
        if (videoDuration < startSecond + audioDuration) {
            alert('動画の長さが足りません！');
            return;
        }

        // 音声の再生
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);

        // 動画の再生開始と同時に音声を重ねる
        outputVideo.play();
        source.start(audioContext.currentTime, startSecond);
    });
});
