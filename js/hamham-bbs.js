// js/hamham-bbs.js  — Firebase compat BBS（main.jsから動的に読み込まれる）
(function () {
  const db  = firebase.firestore();
  const COL = "bbs_posts";

  const esc = s => String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // ---- 文字数カウント ----
  const msgEl  = document.getElementById("inp-msg");
  const charEl = document.getElementById("char-num");
  if (msgEl) msgEl.addEventListener("input", () => charEl.textContent = msgEl.value.length);

  // ---- 投稿 ----
  const postBtn = document.getElementById("post-btn");
  if (postBtn) {
    postBtn.addEventListener("click", async () => {
      const name = document.getElementById("inp-name").value.trim();
      const msg  = msgEl.value.trim();
      const key  = document.getElementById("inp-delkey").value.trim();
      if (!name) { alert("名前を入力してください"); return; }
      if (!msg)  { alert("メッセージを入力してください"); return; }
      postBtn.disabled = true; postBtn.textContent = "投稿中...";
      try {
        await db.collection(COL).add({
          name, msg, deleteKey: key,
          ts: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById("inp-name").value  = "";
        document.getElementById("inp-delkey").value = "";
        msgEl.value = ""; charEl.textContent = "0";
      } catch (e) { alert("投稿に失敗しました: " + e.message); }
      postBtn.disabled = false; postBtn.textContent = "投稿する 🐹";
    });
  }

  // ---- リアルタイム一覧 ----
  const listEl = document.getElementById("posts-list");
  const unsubscribe = db.collection(COL)
    .orderBy("ts", "desc").limit(200)
    .onSnapshot(snap => {
      if (!document.getElementById("posts-list")) { unsubscribe(); return; }
      if (snap.empty) {
        listEl.innerHTML = "<p style='color:#aaa;text-align:center;padding:24px'>まだ投稿がありません。最初の一言をどうぞ！🐹</p>";
        return;
      }
      listEl.innerHTML = "";
      let no = snap.size;
      snap.forEach(d => {
        const { name, msg, deleteKey, ts } = d.data();
        const timeStr = ts?.toDate().toLocaleString("ja-JP") ?? "---";
        const card = document.createElement("div");
        card.className = "post-card";
        card.innerHTML = `
          <div class="post-meta">
            <span class="post-name">${esc(name)}</span>
            <span class="post-time">${timeStr}</span>
            <span class="post-no">No.${no--}</span>
          </div>
          <div class="post-body">${esc(msg)}</div>
          <button class="post-delete-btn" data-id="${d.id}" data-key="${esc(deleteKey || '')}">削除</button>
        `;
        listEl.appendChild(card);
      });
      listEl.querySelectorAll(".post-delete-btn").forEach(btn =>
        btn.addEventListener("click", () => openDel(btn.dataset.id, btn.dataset.key))
      );
    }, err => {
      const el = document.getElementById("posts-list");
      if (el) el.innerHTML = `<p style='color:red'>読み込み失敗: ${err.message}</p>`;
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
