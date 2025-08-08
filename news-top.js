(() => {
  const container = document.querySelector('.news ul');

  fetch('/news/files.json')
    .then(res => res.json())
    .then(files => {
      const sorted = files.sort().reverse();

      const now = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(now.getMonth() - 1);

      const listItems = sorted.map(filename => {
        const dateMatch = filename.match(/^(\d{4}-\d{2}-\d{2})/);
        const dateStr = dateMatch ? dateMatch[1] : '';
        const dateObj = new Date(dateStr);
        const isNew = dateObj >= oneMonthAgo;

        const title = filename.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
        const htmlPath = `news/${filename.replace('.md', '.html')}`;

        return `
          <li>
            <a href="#" onclick="loadPage('${htmlPath}'); return false;">
              「${title}」
            </a>
            ${isNew ? `<span style="color: red;">New!</span>` : ''}
          </li>
        `;
      });

      container.innerHTML = listItems.join('');
    })
    .catch(err => {
      console.error('最新情報の取得に失敗:', err);
      container.innerHTML = '<li>情報を取得できませんでした。</li>';
    });
})();
