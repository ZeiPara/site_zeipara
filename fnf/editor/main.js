// byouga関数を修正
function byouga(fnfData) {
  const maincontent = document.querySelector(".maincontent");
  maincontent.innerHTML = ''; // 既存の内容をクリア

  // 曲全体の長さを考慮して、maincontentのmin-heightを動的に設定することも可能
  // const lastNoteTime = ...;
  // maincontent.style.minHeight = `${lastNoteTime / 10 + 500}px`;

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
            
            // `top`プロパティをミリ秒に基づいて計算
            // 例：1秒(1000ms) = 50px の速さで流れると仮定
            const pixelsPerMillisecond = 0.05; 
            noteImage.style.top = `${note.t * pixelsPerMillisecond}px`;
            
            // `left`プロパティを矢印の方向に合わせて調整
            const laneWidth = 100; // レーンの幅をピクセルで指定
            noteImage.style.left = `${arrowDirection * laneWidth}px`;
            
            maincontent.appendChild(noteImage);
          });
        }
      });
    }
  }
}

// 他のJavaScriptコード...
window.onload = function() {
  // ...既存のコード...
  document.getElementById("fnfinputfile").addEventListener("change", function(event) {
    const file = event.target.files[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          maindata = JSON.parse(e.target.result);
          document.querySelector(".fnfinput").style.display = "none";
          document.querySelector(".editor-container").style.display = "block"; // 変更点
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
  document.querySelector(".fnfinput").style.display = "none";
  document.querySelector(".editor-container").style.display = "block"; // 変更点
  byouga(maindata);
}
