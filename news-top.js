const NEWS_LIST_SELECTOR = ".news ul";
const FILES_JSON = "news/files-html.json";

function waitForNewsListAndRender(attempt = 0) {
  const container = document.querySelector(NEWS_LIST_SELECTOR);
  if (!container) {
    if (attempt > 30) {
      console.error("❌ .news ul が見つかりませんでした（リトライ失敗）");
      return;
    }
    // 少し待って再試行（100msごと）
    setTimeout(() => waitForNewsListAndRender(attempt + 1), 100);
    return;
  }

  // すでに描画済みの場合は一度クリア
  container.innerHTML = "";

  fetch(FILES_JSON)
    .then(res => res.json())
    .then(files => {
      const now = new Date();
      const items = files
        .filter(file => file.endsWith(".html"))
        .map(filename => {
          const dateStr = filename.split("-").slice(0, 3).join("-");
          const title = filename
            .replace(/^\d{4}-\d{2}-\d{2}-/, "")
            .replace(/\.html$/, "")
            .replace(/-/g, " ");
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
    })
    .catch(err => {
      console.error("🛑 news-top.js error:", err);
    });
}

// 🔁 実行開始（初回 or 戻り時でも確実に実行される）
waitForNewsListAndRender();
