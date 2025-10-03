let audio = new Audio();
let loopInterval;
const start = document.getElementById("start");
const stop = document.getElementById("stop");


document.getElementById('fileInput').addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (file) {
    audio.src = URL.createObjectURL(file);
    audio.load();
  }
});

function startLoop() {
  start.style.display = "none";
  stop.style.display = "block";
  audio.currentTime = 0;
  audio.play();
  loopInterval = setInterval(() => {
    audio.currentTime = 0;
    audio.play();
  }, 2000); // 2秒間隔で再生
}

function stopLoop() {
  start.style.display = "block";
  stop.style.display = "none";
  clearInterval(loopInterval);
  audio.pause();
}
