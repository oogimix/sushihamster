(() => {
  const container = document.getElementById('news-list');
  const files = [
    '2025-07-25-instagramopen.md',
    '2025-07-31-mixrelease.md',
    '2025-08-08-homepage.md',
  ];

  const sortedFiles = files.slice().reverse();

  Promise.all(
    sortedFiles.map(filename =>
      fetch(`news/${filename}`)
        .then(res => res.text())
        .then(text => {
          const title = text.match(/title:\s*(.+)/)?.[1] ?? filename;
          const date = text.match(/date:\s*(.+)/)?.[1] ?? '';
          const url = `/news/${filename.replace('.md', '.html')}`;

          // YAMLを除いた本文だけを安全に取得
          const parts = text.split('---');
          const body = parts.length >= 3 ? parts.slice(2).join('---').trim() : '';

          const imageRegex = /!\[.*?\]\(([^)]+)\)/;
          const imageMatch = body.match(imageRegex);
          const imageUrl = imageMatch ? imageMatch[1] : null;

          // 本文プレビュー行を抽出：空行・画像を除外
          const preview = body
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !imageRegex.test(line))[0] ?? '（本文なし）';

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
  ).then(posts => {
    container.innerHTML = posts.join('');
  }).catch(err => {
    console.error("お知らせ一覧の読み込み失敗:", err);
    container.innerHTML = "<p>お知らせを読み込めませんでした。</p>";
  });
})();
