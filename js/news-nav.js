// ✅ news-nav.js（共通で記事末尾に前後リンク生成）
function generateNewsNav(currentFilename) {
  fetch("/news/files-html.json?nocache=" + Date.now())
    .then(res => res.json())
    .then(files => {
      const index = files.indexOf(currentFilename);
      if (index === -1) return;

      const prev = files[index + 1];
      const next = files[index - 1];

      const nav = document.querySelector(".news-nav");
      if (!nav) return;

      const createLink = (file, text) => {
        const a = document.createElement("a");
        a.href = "#";
        a.textContent = text;
        a.onclick = (e) => {
          e.preventDefault();
          loadPage("news/" + file);
        };
        return a;
      };

      nav.innerHTML = "";
      nav.appendChild(prev ? createLink(prev, "← 前の記事へ") : document.createElement("span"));
      nav.appendChild(createLink("information.html", "お知らせ一覧へ戻る"));
      nav.appendChild(next ? createLink(next, "次の記事へ →") : document.createElement("span"));
    })
    .catch(err => {
      console.error("news-nav.js エラー:", err);
    });
}
