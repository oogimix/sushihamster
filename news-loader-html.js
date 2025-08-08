(() => {
  const NEWS_LIST_ID = "news-list";
  const FILES_JSON = "news/files-html.json";

  function tryRenderNewsList(attempt = 0) {
    const container = document.getElementById(NEWS_LIST_ID);
    if (!container) {
      if (attempt > 20) return console.error("❌ news-list が見つかりません");
      return setTimeout(() => tryRenderNewsList(attempt + 1), 100);
    }

    fetch(FILES_JSON)
      .then(res => res.json())
      .then(files => {
        const sortedFiles = files
          .filter(file => file.endsWith(".html"))
          .map(filename => {
            const dateStr = filename.split("-").slice(0, 3).join("-");
            return { filename, date: new Date(dateStr) };
          })
          .sort((a, b) => b.date - a.date);

        const renderPosts = async () => {
          const results = [];

          for (const { filename } of sortedFiles) {
            try {
              const res = await fetch(`news/${filename}`);
              const html = await res.text();

              const parser = new DOMParser();
              const doc = parser.parseFromString(html, "text/html");

              const title = doc.querySelector("title")?.textContent ?? filename;
              const date = doc.querySelector("small")?.textContent ?? "";
              const preview =
                    doc.querySelector(".news-preview")?.textContent?.trim() ||
                    doc.querySelector("p:nth-of-type(2)")?.textContent?.trim() ||
                    doc.querySelector("p")?.textContent?.trim() ||
                     "（本文なし）";
              const imageUrl = doc.querySelector("img")?.getAttribute("src") ?? null;

              const url = `news/${filename}`;

              const postHTML = `
                <a class="news-post-link" href="${url}" onclick="loadPage('${url}'); return false;">
                  <div class="news-post">
                    ${imageUrl ? `<img src="${imageUrl}" alt="" class="news-thumb" />` : ''}
                    <div class="news-text">
                      <h2 class="news-title">${title}</h2>
                      <small class="news-date">${date}</small>
                      <p class="news-preview">${preview}</p>
                    </div>
                  </div>
                </a>
              `;

              results.push(postHTML);
            } catch (err) {
              console.error(`🛑 ${filename} の読み込み失敗:`, err);
            }
          }

          container.innerHTML = results.join('');
        };

        renderPosts();
      })
      .catch(err => {
        console.error("お知らせ一覧の読み込み失敗:", err);
        container.innerHTML = "<p>お知らせを読み込めませんでした。</p>";
      });
  }

  tryRenderNewsList();
})();
