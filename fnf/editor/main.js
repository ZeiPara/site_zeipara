let maindata;

// 譜面データを描画する関数
function byouga(fnfData) {
  const maincontent = document.querySelector(".maincontent");
  maincontent.innerHTML = '';
  
  for (const difficulty in fnfData.notes) {
    const sections = fnfData.notes[difficulty];

    if (Array.isArray(sections)) {
      sections.forEach(section => {
        if (section.p && Array.isArray(section.p)) {
          section.p.forEach(note => {
            const noteImage = document.createElement("img");
            const arrowDirection = note.d % 4;
            
            noteImage.src = `https://zeipara.f5.si/sozai/${arrowDirection}.png`;
            noteImage.classList.add("note-image");
            
            const pixelsPerMillisecond = 0.05;
            noteImage.style.top = `${note.t * pixelsPerMillisecond}px`;

            const laneWidth = 100;
            noteImage.style.left = `${arrowDirection * laneWidth + 50}px`;
            
            maincontent.appendChild(noteImage);
          });
        }
      });
    }
  }
}

// 画面切り替えの関数
function showEditor() {
  document.querySelector(".fnfinput").style.display = "none";
  document.querySelector(".editor-container").style.display = "block";
}

window.onload = function() {
  maindata = {"version": "2.0.0", "scrollSpeed": {}, "events": [], "notes": {}, "generatedBy": "Friday Night Funkin' - v0.5.3"};
  
  document.getElementById("fnfinputfile").addEventListener("change", function(event) {
    const file = event.target.files[0];
    
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          maindata = JSON.parse(e.target.result);
          showEditor(); // 編集画面を表示
          byouga(maindata);
        } catch (error) {
          alert("JSONファイルの解析に失敗しました。ファイルが破損している可能性があります。");
        }
      };
      reader.readAsText(file);
    } else {
      alert("json形式のファイルを選択してください。");
    }
  });
}

function onnewspan() {
  showEditor(); // 編集画面を表示
  byouga(maindata);
}
