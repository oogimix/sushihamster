// js/paint-bbs.js  — Firebase compat お絵かきBBS（main.jsから動的に読み込まれる）
(function () {
  const db  = firebase.firestore();
  const COL = "oekaki_posts";

  const esc = s => String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // ---- キャンバス設定 ----
  const canvas      = document.getElementById("main-canvas");
  const ctx         = canvas.getContext("2d");
  const colorPicker = document.getElementById("color-picker");
  const sizeSlider  = document.getElementById("size-slider");
  const sizeLabel   = document.getElementById("size-label");
  const btnPen      = document.getElementById("btn-pen");
  const btnEraser   = document.getElementById("btn-eraser");

  let drawing = false, tool = "pen", lastX = 0, lastY = 0;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  sizeSlider.addEventListener("input", () => sizeLabel.textContent = sizeSlider.value);
  btnPen.addEventListener("click", () => {
    tool = "pen"; btnPen.classList.add("active"); btnEraser.classList.remove("active");
  });
  btnEraser.addEventListener("click", () => {
    tool = "eraser"; btnEraser.classList.add("active"); btnPen.classList.remove("active");
  });
  document.getElementById("clear-btn").addEventListener("click", () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width  / rect.width;
    const sy = canvas.height / rect.height;
    if (e.touches) return [(e.touches[0].clientX - rect.left) * sx, (e.touches[0].clientY - rect.top) * sy];
    return [(e.clientX - rect.left) * sx, (e.clientY - rect.top) * sy];
  }
  function startDraw(e) { e.preventDefault(); drawing = true; [lastX, lastY] = getPos(e); }
  function doDraw(e) {
    e.preventDefault();
    if (!drawing) return;
    const [x, y] = getPos(e);
    ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = tool === "eraser" ? "rgba(0,0,0,1)" : colorPicker.value;
    ctx.lineWidth   = parseInt(sizeSlider.value);
    ctx.lineCap     = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(lastX, lastY); ctx.lineTo(x, y); ctx.stroke();
    [lastX, lastY] = [x, y];
  }
  function endDraw(e) { e.preventDefault(); drawing = false; }

  canvas.addEventListener("mousedown",  startDraw);
  canvas.addEventListener("mousemove",  doDraw);
  canvas.addEventListener("mouseup",    endDraw);
  canvas.addEventListener("mouseleave", endDraw);
  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove",  doDraw,    { passive: false });
  canvas.addEventListener("touchend",   endDraw,   { passive: false });

  // ---- 投稿 ----
  const postBtn = document.getElementById("post-btn");
  postBtn.addEventListener("click", async () => {
    const name    = document.getElementById("inp-name").value.trim();
    const comment = document.getElementById("inp-comment").value.trim();
    const key     = document.getElementById("inp-delkey").value.trim();
    if (!name) { alert("名前を入力してください"); return; }
    postBtn.disabled = true; postBtn.textContent = "投稿中...";
    try {
      const off = document.createElement("canvas");
      off.width = canvas.width; off.height = canvas.height;
      const octx = off.getContext("2d");
      octx.fillStyle = "#ffffff"; octx.fillRect(0, 0, off.width, off.height);
      octx.drawImage(canvas, 0, 0);
      const imageData = off.toDataURL("image/jpeg", 0.6);
      await db.collection(COL).add({
        name, comment, deleteKey: key, imageData,
        ts: firebase.firestore.FieldValue.serverTimestamp()
      });
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      document.getElementById("inp-name").value    = "";
      document.getElementById("inp-comment").value = "";
      document.getElementById("inp-delkey").value  = "";
      alert("投稿しました！🐹");
    } catch (e) { alert("投稿に失敗しました: " + e.message); }
    postBtn.disabled = false; postBtn.textContent = "投稿する 🐹";
  });

  // ---- リアルタイムギャラリー ----
  const galleryEl = document.getElementById("gallery-list");
  const unsubscribe = db.collection(COL)
    .orderBy("ts", "desc").limit(100)
    .onSnapshot(snap => {
      if (!document.getElementById("gallery-list")) { unsubscribe(); return; }
      if (snap.empty) {
        galleryEl.innerHTML = "<p style='color:#aaa;text-align:center;padding:24px'>まだ投稿がありません。最初の絵を描いてね！🎨</p>";
        return;
      }
      galleryEl.innerHTML = "<div class='gallery-grid' id='inner-grid'></div>";
      const grid = document.getElementById("inner-grid");
      snap.forEach(d => {
        const { name, comment, imageData, deleteKey, ts } = d.data();
        const timeStr = ts?.toDate().toLocaleString("ja-JP") ?? "---";
        const card = document.createElement("div");
        card.className = "gallery-card";
        card.innerHTML = `
          <div class="thumb-wrap" data-img="${imageData || ''}" data-name="${esc(name)}" data-comment="${esc(comment || '')}">
            <img src="${imageData || ''}" alt="${esc(name)}の絵" loading="lazy" />
          </div>
          <div class="card-info">
            <div class="card-name">${esc(name)}</div>
            <div class="card-time">${timeStr}</div>
            ${comment ? `<div class="card-comment">${esc(comment)}</div>` : ""}
          </div>
          <button class="card-del-btn" data-id="${d.id}" data-key="${esc(deleteKey || '')}">削除</button>
        `;
        grid.appendChild(card);
      });
      grid.querySelectorAll(".thumb-wrap").forEach(w =>
        w.addEventListener("click", () => openLightbox(w.dataset.img, w.dataset.name, w.dataset.comment))
      );
      grid.querySelectorAll(".card-del-btn").forEach(btn =>
        btn.addEventListener("click", () => openDel(btn.dataset.id, btn.dataset.key))
      );
    }, err => {
      const el = document.getElementById("gallery-list");
      if (el) el.innerHTML = `<p style='color:red'>読み込み失敗: ${err.message}</p>`;
    });

  // ---- ライトボックス ----
  const lightbox = document.getElementById("lightbox");
  function openLightbox(img, name, comment) {
    document.getElementById("lb-img").src = img;
    document.getElementById("lb-name").textContent = name;
    document.getElementById("lb-comment").textContent = comment || "";
    lightbox.classList.add("show");
  }
  document.getElementById("lb-close").addEventListener("click",  () => lightbox.classList.remove("show"));
  lightbox.addEventListener("click", e => { if (e.target === lightbox) lightbox.classList.remove("show"); });
  document.addEventListener("keydown", function lbEsc(e) {
    if (e.key === "Escape") lightbox.classList.remove("show");
    if (!document.getElementById("lightbox")) document.removeEventListener("keydown", lbEsc);
  });

  // ---- 削除ダイアログ ----
  let pendingId = null, pendingKey = null;
  const overlay = document.getElementById("del-overlay");
  function openDel(id, key) {
    pendingId = id; pendingKey = key;
    document.getElementById("del-key-input").value = "";
    overlay.classList.add("show");
  }
  document.getElementById("del-cancel")?.addEventListener("click",  () => overlay.classList.remove("show"));
  document.getElementById("del-confirm")?.addEventListener("click", async () => {
    const input = document.getElementById("del-key-input").value.trim();
    if (pendingKey && input !== pendingKey) { alert("削除キーが違います"); return; }
    try {
      await db.collection(COL).doc(pendingId).delete();
      overlay.classList.remove("show");
    } catch (e) { alert("削除に失敗しました: " + e.message); }
  });
})();
