// js/paint-bbs.js  — Firebase compat お絵かきBBS（main.jsから動的に読み込まれる）
(function () {
  const db  = firebase.firestore();
  const COL = "oekaki_posts";

  // ---- いいね localStorage ----
  const LIKED_KEY = "sh_oekaki_liked";
  function getLiked() {
    try { return new Set(JSON.parse(localStorage.getItem(LIKED_KEY) || "[]")); }
    catch { return new Set(); }
  }
  function addLiked(id) {
    const s = getLiked(); s.add(id);
    localStorage.setItem(LIKED_KEY, JSON.stringify([...s]));
  }

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

  // ---- 全画面モード（スマホ用） ----
  const fsEl      = document.getElementById("canvas-fs");
  const fsToolsEl = document.getElementById("canvas-fs-tools");
  const fsAreaEl  = document.getElementById("canvas-fs-area");
  const fsDoneBtn = document.getElementById("canvas-fs-done");
  const btnFS     = document.getElementById("btn-fullscreen");
  const toolsEl   = document.getElementById("oekaki-tools");
  const canvasWrap= document.getElementById("canvas-wrap");

  // 元の位置をコメントノードで記憶
  let toolsPH = null, canvasPH = null;

  btnFS?.addEventListener("click", () => {
    toolsPH  = document.createComment("tools-ph");
    canvasPH = document.createComment("canvas-ph");
    toolsEl.parentNode.insertBefore(toolsPH,  toolsEl);
    canvasWrap.parentNode.insertBefore(canvasPH, canvasWrap);
    fsToolsEl.appendChild(toolsEl);
    fsAreaEl.appendChild(canvasWrap);
    fsEl.classList.add("show");
    document.body.style.overflow = "hidden";
  });

  fsDoneBtn?.addEventListener("click", () => {
    if (toolsPH)  toolsPH.parentNode.insertBefore(toolsEl,   toolsPH);
    if (canvasPH) canvasPH.parentNode.insertBefore(canvasWrap, canvasPH);
    toolsPH?.remove();  canvasPH?.remove();
    fsEl.classList.remove("show");
    document.body.style.overflow = "";
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
    const t = window.i18nGet || (k => k);
    const name    = document.getElementById("inp-name").value.trim();
    const comment = document.getElementById("inp-comment").value.trim();
    const key     = document.getElementById("inp-delkey").value.trim();
    if (!name) { alert(t("bbs.oekaki.name_req")); return; }
    postBtn.disabled = true; postBtn.textContent = t("bbs.oekaki.submitting");
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
      alert(t("bbs.posted"));
    } catch (e) { alert(t("bbs.post_fail") + ": " + e.message); }
    postBtn.disabled = false; postBtn.textContent = t("bbs.oekaki.submit");
  });

  // ---- リアルタイムギャラリー ----
  const galleryEl = document.getElementById("gallery-list");
  const unsubscribe = db.collection(COL)
    .orderBy("ts", "desc").limit(100)
    .onSnapshot(snap => {
      if (!document.getElementById("gallery-list")) { unsubscribe(); return; }
      if (snap.empty) {
        const t = window.i18nGet || (k => k);
        galleryEl.innerHTML = `<p style='color:#aaa;text-align:center;padding:24px'>${t("bbs.oekaki.empty")}</p>`;
        return;
      }
      galleryEl.innerHTML = "<div class='gallery-grid' id='inner-grid'></div>";
      const grid = document.getElementById("inner-grid");
      const likedSet = getLiked();
      snap.forEach(d => {
        const { name, comment, imageData, deleteKey, ts, likes } = d.data();
        const timeStr = ts?.toDate().toLocaleString("ja-JP") ?? "---";
        const likeCount = likes || 0;
        const alreadyLiked = likedSet.has(d.id);
        const t = window.i18nGet || (k => k);
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
          <div class="card-footer">
            <button class="like-btn${alreadyLiked ? ' liked' : ''}" data-id="${d.id}" title="${t('bbs.oekaki.like_title')}">
              💖 <span class="like-count">${likeCount}</span>
            </button>
            <button class="card-del-btn" data-id="${d.id}" data-key="${esc(deleteKey || '')}">${t("bbs.oekaki.delete_btn")}</button>
          </div>
        `;
        grid.appendChild(card);
      });
      grid.querySelectorAll(".thumb-wrap").forEach(w =>
        w.addEventListener("click", () => openLightbox(w.dataset.img, w.dataset.name, w.dataset.comment))
      );
      grid.querySelectorAll(".like-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (btn.classList.contains("liked")) return;
          btn.classList.add("liked");
          const countEl = btn.querySelector(".like-count");
          if (countEl) countEl.textContent = parseInt(countEl.textContent || "0") + 1;
          addLiked(btn.dataset.id);
          try {
            await db.collection(COL).doc(btn.dataset.id).update({
              likes: firebase.firestore.FieldValue.increment(1)
            });
          } catch (e) { console.error("いいね失敗:", e); }
        });
      });
      grid.querySelectorAll(".card-del-btn").forEach(btn =>
        btn.addEventListener("click", () => openDel(btn.dataset.id, btn.dataset.key))
      );
    }, err => {
      const el = document.getElementById("gallery-list");
      if (el) el.innerHTML = `<p style='color:red'>${(window.i18nGet||((k)=>k))("bbs.loading")}: ${err.message}</p>`;
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
    const t = window.i18nGet || (k => k);
    const input = document.getElementById("del-key-input").value.trim();
    if (pendingKey && input !== pendingKey) { alert(t("bbs.del_wrong_key")); return; }
    try {
      await db.collection(COL).doc(pendingId).delete();
      overlay.classList.remove("show");
    } catch (e) { alert(t("bbs.del_fail") + ": " + e.message); }
  });
})();
