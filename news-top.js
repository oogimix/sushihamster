const NEWS_LIST_SELECTOR = ".news ul";
const FILES_JSON = "news/files-html.json";

// 描画関数を別に切り出し
function renderNewsList(container, files) {
  container.innerHTML = ""; // 二重描画防止

  const now = new Date();
  const items = files
    .filter(file => file.endsWith(".html"))
    .map(filename => {
      const dateStr = filename.split("-").slice(0, 3).join("-");
      const title = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.html$/, "");
      const url = `./news/${filename}`;
      const postDate = new Date(dateStr);
      const daysAgo = (now - postDate) / (1000 * 60 * 60 * 24);
      const isNew = daysAgo <= 30;
      return { title, url, isNew, date: dateStr };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // 新しい順

  for (const item of items) {
    const li = document.createElement("li");
    const link = document.createElement("a");

    link.href = "#";
    link.textContent = `「${item.title}」`;
    link.onclick = () => loadPage(item.url);

    li.appendChild(link);

    if (item.isNew) {
      const newSpan = document.createElement("span");
      newSpan.style.color = "red";
      newSpan.textContent = " New!";
      li.appendChild(newSpan);
    }

    container.appendChild(li);
  }
}

// DOM が整うまでリトライしながら待つ
function waitForContainerAndRender() {
  const container = document.querySelector(NEWS_LIST_SELECTOR);
  if (!container) {
    setTimeout(waitForContainerAndRender, 100); // 100msおきにリトライ
    return;
  }

  fetch(FILES_JSON)
    .then(res => res.json())
    .then(files => renderNewsList(container, files))
    .catch(err => {
      console.error("🛑 news-top.js error:", err);
    });
}

// 初期化実行
waitForContainerAndRender();
