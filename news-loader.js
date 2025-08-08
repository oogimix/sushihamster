const container = document.getElementById('news-list');
const files = [
  '2025-08-08-homepage.md',
  '2025-07-31-mixrelease.md',
  '2025-07-25-instagramopen.md'
];

Promise.all(
  files.map(filename =>
    fetch(`news/${filename}`)
      .then(res => res.text())
      .then(text => {
        const title = text.match(/title:\s*(.+)/)?.[1] ?? filename;
        const date = text.match(/date:\s*(.+)/)?.[1] ?? '';
        const url = `news/${filename.replace('.md', '.html')}`;
        const preview = text.split('---')[2]?.trim().split('\n')[0] ?? '...';

return `
  <div class="news-post">
    <h2>
      <a href="${url}" onclick="loadPage('${url}'); return false;">${title}</a>
    </h2>
    <small>${date}</small>
    <p>${preview}</p>
  </div>
`;
      })
  )
).then(posts => {
  container.innerHTML = posts.reverse().join('');
});
