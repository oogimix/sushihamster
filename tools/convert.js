// convert.js
// MD(frontmatter付き) → HTML 変換スクリプト
// - summary は YAML の複数行文字列(|)でも配列でもOK
// - <ul> は .no-scroll を付けて出力（ニュース用）
//
// 実行: node convert.js

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

// 入出力パス
const inputDir = path.join(__dirname, '../news-md');
const outputDir = path.join(__dirname, '../news');
const jsonPath  = path.join(__dirname, '../files-html.json');

// ============== marked 設定 & レンダラ ==============
marked.setOptions({
  gfm: true,
  breaks: false, // 行末スペース2個での改行のみ許容（必要なら true）
});

// <ul> を .no-scroll にする（ニュース一覧と整合）
const renderer = new marked.Renderer();
renderer.list = function (body, ordered, start) {
  if (ordered) return `<ol>${body}</ol>`;
  return `<ul class="no-scroll">${body}</ul>`;
};
// 必要に応じて他の要素もカスタム可能
// renderer.link = ...

// ============== ユーティリティ ==============
/** frontmatterの複数行文字列(|)に付く共通インデントを削る */
function dedent(str) {
  const lines = String(str ?? '').replace(/\r\n?/g, '\n').split('\n');
  const indents = lines
    .filter(l => l.trim().length)
    .map(l => (l.match(/^(\s*)/)?.[1] ?? '').length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map(l => l.slice(min)).join('\n').trim();
}

/** summary を文字列に正規化（配列にも対応） */
function normalizeSummary(raw) {
  if (!raw) return '';
  if (Array.isArray(raw)) {
    // YAMLで summary: [a, b, c] のように来た場合
    return raw.map(s => `- ${String(s)}`).join('\n');
  }
  // 複数行文字列 (|) はデデントしてマークダウンへ
  return dedent(String(raw));
}

/** ディレクトリ確保 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ============== 変換メイン ==============
function convertAll() {
  ensureDir(outputDir);

  const files = fs
    .readdirSync(inputDir, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.toLowerCase().endsWith('.md'))
    .map(d => d.name);

  const htmlFiles = [];

  for (const mdFile of files) {
    const fullPath = path.join(inputDir, mdFile);

    try {
      const { content, data } = matter.read(fullPath);

      const title   = data.title || '記事タイトルなし';
      const rawDate = data.date  || '日付未設定';
      const date    =
        rawDate !== '日付未設定'
          ? new Date(rawDate).toISOString().split('T')[0]
          : rawDate;

      const image   = data.image   || '';
      const summarySrc = normalizeSummary(data.summary);

      // 本文＆サマリーの Markdown → HTML
      const bodyHTML    = marked.parse(content, { renderer });
      const summaryHTML = summarySrc ? marked.parse(summarySrc, { renderer }) : '';

      const filename = mdFile.replace(/\.md$/i, '.html');
      htmlFiles.push(filename);

      // HTML テンプレート
      const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="../style.css" />
</head>
<body>
  <div class="news kinsoku prose">
    <h2>${escapeHtml(title)}</h2>
    <p class="news-date">${escapeHtml(date)}</p>

    <div class="news-feature">
      ${image ? `<img src="${escapeAttr(image)}" alt="${escapeAttr(title)}" class="news-thumb" style="width:100%;height:auto;border-radius:12px;margin-bottom:16px;">` : ''}
      <div class="news-preview">
        ${bodyHTML}
      </div>
    </div>

    ${summaryHTML ? `
    <div class="news-embed" style="margin:24px 0;">
      <h3 style="margin-bottom:8px;">🎉 Event Summary</h3>
      <div style="background-color:#f6fcff;border:1px solid #ccc;padding:12px;border-radius:8px;">
        ${summaryHTML}
      </div>
    </div>` : ''}

    <div class="article-share-button">
      <a href="javascript:void(0)" id="twitter-share-btn">
        <img src="/asset/img/icon_twitter.jpg" alt="Twitter" class="tiny-icon" />
        シェアする
      </a>
    </div>

    <div class="news-nav"
      style="display:flex;justify-content:space-between;align-items:center;margin-top:40px;flex-wrap:wrap;gap:10px;text-align:center;">
      <span>読み込み中...</span>
    </div>
  </div>

  <script src="../share.js"></script>
  <script>
    if (typeof initShareButtons === 'function') { initShareButtons(); }
  </script>
</body>
</html>`;

      fs.writeFileSync(path.join(outputDir, filename), html, 'utf8');
    } catch (err) {
      console.error(`❌ Failed to convert: ${mdFile}`, err);
    }
  }

  try {
    fs.writeFileSync(jsonPath, JSON.stringify(htmlFiles, null, 2) + '\n', 'utf8');
    console.log(`✅ Converted ${htmlFiles.length} file(s). Index: ${jsonPath}`);
  } catch (err) {
    console.error('❌ Failed to write files-html.json', err);
  }
}

// ============== ちょいユーティリティ ==============
function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }

// 実行
convertAll();
