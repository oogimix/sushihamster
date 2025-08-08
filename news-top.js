// news-top.js

const NEWS_LIST_SELECTOR = ".news ul";

fetch("news/files.json")
  .then(res => res.json())
  .then(files => {
    const container = document.querySelector(NEWS_LIST_SELECTOR);
    if (!container) return;

    const now = new Date();
    const items = files
      .filter(file => file.endsWith(".md"))
      .map(filename => {
        const dateStr = filename.split("-").slice(0, 3).join("-");
        const title = filename.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
        const url = `./news/${filename.replace(".md", ".html")}`;

        // 日付差分
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
