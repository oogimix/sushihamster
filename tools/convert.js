const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked'); // ← markedの名前付きimport推奨

const inputDir = path.join(__dirname, '../news-md');
const outputDir = path.join(__dirname, '../news');
const jsonPath = path.join(__dirname, '../files-html.json');

// ▼ ここを追加：<ul> の出力をカスタム
const renderer = new marked.Renderer();
renderer.list = function (body, ordered, start) {
  if (ordered) return `<ol>${body}</ol>`;
  return `<ul class="no-scroll">${body}</ul>`;
};
// 必要なら他のレンダリングもここで拡張できる
// renderer.listitem = ...

function convertAll() {
  const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.md'));
  const htmlFiles = [];

  for (const file of files) {
    const fullPath = path.join(inputDir, file);
    const { content, data } = matter.read(fullPath);

    const title = data.title || '記事タイトルなし';
    const rawDate = data.date || '日付未設定';
    const date = rawDate !== '日付未設定'
      ? new Date(rawDate).toISOString().split('T')[0]
      : rawDate;
    const image = data.image || '';
    const summary = data.summary || '';

    // ▼ カスタムrendererを使ってパース
    const bodyHTML = marked.parse(content, { renderer });
    const summaryHTML = marked.parse(summary, { renderer });

    const filename = file.replace(/\.md$/, '.html');
    htmlFiles.push(filename);

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="stylesheet" href="../style.css" />
</head>
<body>
  <div class="news kinsoku prose">
    <h2>${title}</h2>
    <p class="news-date">${date}</p>

    <div class="news-feature">
      ${image ? `<img src="${image}" alt="${title}" class="news-thumb" style="width: 100%; height: auto; border-radius: 12px; margin-bottom: 16px;">` : ''}
      <div class="news-preview">
        ${bodyHTML}
      </div>
    </div>

    <div class="news-embed" style="margin: 24px 0;">
      <h3 style="margin-bottom: 8px;">🎉 Event Summary</h3>
      <div style="background-color: #f6fcff; border: 1px solid #ccc; padding: 12px; border-radius: 8px;">
        ${summaryHTML}
      </div>
    </div>

    <div class="article-share-button">
      <a href="javascript:void(0)" id="twitter-share-btn">
        <img src="/asset/img/icon_twitter.jpg" alt="Twitter" class="tiny-icon" />
        シェアする
      </a>
    </div>

    <div class="news-nav"
      style="display: flex; justify-content: space-between; align-items: center; margin-top: 40px; flex-wrap: wrap; gap: 10px; text-align: center;">
      <span>読み込み中...</span>
    </div>
  </div>

  <script src="../share.js"></script>
  <script>initShareButtons();</script>
</body>
</html>`;

    fs.writeFileSync(path.join(outputDir, filename), html, 'utf8');
  }

  fs.writeFileSync(jsonPath, JSON.stringify(htmlFiles, null, 2));
}

convertAll();
