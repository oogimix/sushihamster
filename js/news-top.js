(() => {
  const NEWS_LIST_SELECTOR = ".news ul";
  const FILES_JSON = "news/files-html.json";

  function tryRenderNewsList(attempt = 0) {
    const container = document.querySelector(NEWS_LIST_SELECTOR);
    if (!container) {
      if (attempt > 30) {
        console.error("❌ .news ul が見つかりません（最大リトライ）");
        return;
      }
      setTimeout(() => tryRenderNewsList(attempt + 1), 100);
      return;
    }

    container.innerHTML = "";

    fetch(FILES_JSON)
      .then(res => res.json())
      .then(files => {
        const sortedFiles = files
          .filter(file => file.endsWith(".html"))
          .map(filename => {
            const dateStr = filename.split("-").slice(0, 3).join("-");
            return { filename, date: new Date(dateStr) };
          })
          .sort((a, b) => b.date - a.date); // 新しい順

        const render = async () => {
          for (const { filename, date } of sortedFiles) {
            try {
              const res = await fetch(`news/${filename}`);
              const html = await res.text();

              const titleRaw = html.match(/<title>(.*?)<\/title>/i)?.[1] ?? filename;

              // タイトルから日付と本文を分離
              const titleMatch = titleRaw.match(/^(\d{4}\/\d{2}\/\d{2})\s+(.+)$/);
              const titleDate = titleMatch?.[1] ?? "";
              const titleText = titleMatch?.[2] ?? titleRaw;

              const url = `./news/${filename}`;

              const li = document.createElement("li");
              const link = document.createElement("a");
              link.href = "#";
              link.textContent = `${titleDate} - ${titleText}`;
              link.onclick = () => loadPage(url);

              li.appendChild(link);

              const now = new Date();
              const daysAgo = (now - date) / (1000 * 60 * 60 * 24);
              if (daysAgo <= 30) {
                const newSpan = document.createElement("span");
                newSpan.style.color = "red";
                newSpan.textContent = " New!";
                li.appendChild(newSpan);
              }

              container.appendChild(li);
            } catch (err) {
              console.error(`🛑 ${filename} 読み込み失敗:`, err);
            }
          }
        };

        render();
      })
      .catch(err => {
        console.error("🛑 最新情報の読み込み失敗:", err);
        container.innerHTML = "<li>読み込みに失敗しました。</li>";
      });
  }

  tryRenderNewsList();
})();
