let audio = new Audio();
let loopInterval;

document.getElementById('fileInput').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    audio.src = URL.createObjectURL(file);
    audio.load();
  }
});

function startLoop() {
  audio.currentTime = 0;
  audio.play();
  loopInterval = setInterval(() => {
    audio.currentTime = 0;
    audio.play();
  }, 2000); // 2秒間隔で再生
}

function stopLoop() {
  clearInterval(loopInterval);
  audio.pause();
}
