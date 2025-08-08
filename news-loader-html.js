(() => {
  const container = document.getElementById('news-list');

  fetch('news/files-html.json')
    .then(res => res.json())
    .then(files => {
      const sortedFiles = files.slice().reverse(); // 新しい順

      return Promise.all(
        sortedFiles.map(filename =>
          fetch(`news/${filename}`)
            .then(res => res.text())
            .then(html => {
              const title = html.match(/<title>(.*?)<\/title>/i)?.[1] ?? filename;
              const dateMatch = html.match(/<small[^>]*>(\d{4}-\d{2}-\d{2})<\/small>/);
              const date = dateMatch?.[1] ?? '';
              const preview = html.match(/<p>(.*?)<\/p>/is)?.[1]?.replace(/<[^>]+>/g, '') ?? '（本文なし）';
              const thumbMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*class=["'][^"']*news-thumb[^"']*["']/i);
              const imageUrl = thumbMatch?.[1] ?? null;

              const url = `news/${filename}`;

              return `
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
            })
        )
      );
    })
    .then(posts => {
      container.innerHTML = posts.join('');
    })
    .catch(err => {
      console.error("お知らせ一覧の読み込み失敗:", err);
      container.innerHTML = "<p>お知らせを読み込めませんでした。</p>";
    });
})();
