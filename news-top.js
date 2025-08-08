(() => {
  const listEl = document.querySelector('.news.kinsoku.prose ul');

  fetch('news/files.json')
    .then(res => res.json())
    .then(files => {
      const sortedFiles = files.slice().reverse();

      return Promise.all(
        sortedFiles.map(filename =>
          fetch(`news/${filename}`)
            .then(res => res.text())
            .then(text => {
              const title = text.match(/title:\s*(.+)/)?.[1] ?? filename;
              const url = `/news/${filename.replace('.md', '.html')}`;
              return `<li><a href="${url}" onclick="loadPage('${url}'); return false;">「${title}」</a> <span style="color: red;">New!</span></li>`;
            })
        )
      );
    })
    .then(items => {
      listEl.innerHTML = items.join('');
    })
    .catch(err => {
      console.error('最新情報の読み込み失敗:', err);
    });
})();
