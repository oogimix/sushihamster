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
      const t = window.i18nGet || (k => k);
      const name = document.getElementById("inp-name").value.trim();
      const msg  = msgEl.value.trim();
      const key  = document.getElementById("inp-delkey").value.trim();
      if (!name) { alert(t("bbs.board.name_req")); return; }
      if (!msg)  { alert(t("bbs.board.msg_req")); return; }
      postBtn.disabled = true; postBtn.textContent = t("bbs.board.submitting");
      try {
        await db.collection(COL).add({
          name, msg, deleteKey: key,
          ts: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById("inp-name").value  = "";
        document.getElementById("inp-delkey").value = "";
        msgEl.value = ""; charEl.textContent = "0";
      } catch (e) { alert(t("bbs.post_fail") + ": " + e.message); }
      postBtn.disabled = false; postBtn.textContent = t("bbs.board.submit");
    });
  }

  // ---- リアルタイム一覧 ----
  const listEl = document.getElementById("posts-list");
  const unsubscribe = db.collection(COL)
    .orderBy("ts", "desc").limit(200)
    .onSnapshot(snap => {
      if (!document.getElementById("posts-list")) { unsubscribe(); return; }
      if (snap.empty) {
        const t = window.i18nGet || (k => k);
        listEl.innerHTML = `<p style='color:#aaa;text-align:center;padding:24px'>${t("bbs.board.empty")}</p>`;
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
          <button class="post-delete-btn" data-id="${d.id}" data-key="${esc(deleteKey || '')}">${(window.i18nGet||((k)=>k))("bbs.board.delete_btn")}</button>
        `;
        listEl.appendChild(card);
      });
      listEl.querySelectorAll(".post-delete-btn").forEach(btn =>
        btn.addEventListener("click", () => openDel(btn.dataset.id, btn.dataset.key))
      );
    }, err => {
      const el = document.getElementById("posts-list");
      if (el) el.innerHTML = `<p style='color:red'>${(window.i18nGet||((k)=>k))("bbs.loading")}: ${err.message}</p>`;
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
