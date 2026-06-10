// tools/convert.js
// MD(frontmatter付き) → HTML 変換スクリプト（安定版）
// - summary: 複数行文字列(|)でも配列でもOK
// - 生成後に <ul> を <ul class="no-scroll"> に置換（renderer不使用で安定）
// 実行: node tools/convert.js

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

// 入出力パス
const inputDir = path.join(__dirname, '../news-md');
const outputDir = path.join(__dirname, '../news');
const jsonPath  = path.join(__dirname, '../news/files-html.json');

// ===== marked 基本設定 =====
marked.setOptions({
  gfm: true,
  breaks: false, // 行末スペース2つでの改行のみ
});

// ===== ユーティリティ =====
/** 複数行文字列(|)の共通インデントを除去 */
function dedent(str) {
  const lines = String(str ?? '').replace(/\r\n?/g, '\n').split('\n');
  const indents = lines
    .filter(l => l.trim().length)
    .map(l => (l.match(/^(\s*)/)?.[1] ?? '').length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map(l => l.slice(min)).join('\n').trim();
}

/** summary を Markdown 文字列に正規化（配列にも対応） */
function normalizeSummary(raw) {
  if (!raw) return '';
  if (Array.isArray(raw)) {
    // YAMLで summary: [a, b, c] や 複数行リストが来たとき
    return raw.map(s => `- ${String(s)}`).join('\n');
  }
  return dedent(String(raw));
}

/** 出力HTML内の <ul> に class を付与（既に class がある <ul> は無視） */
function addUlClass(html) {
  // <ul> のみを <ul class="no-scroll"> に置換（class属性なしの場合だけ）
  return String(html).replace(/<ul(?![^>]*\bclass=)([^>]*)>/g, '<ul class="no-scroll"$1>');
}

/** ディレクトリ作成 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** 最低限のHTMLエスケープ */
function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
const escapeAttr = escapeHtml;

// ===== 変換メイン =====
function convertAll() {
  ensureDir(outputDir);

  const entries = fs.readdirSync(inputDir, { withFileTypes: true });
  const files = entries
    .filter(d => d.isFile() && d.name.toLowerCase().endsWith('.md'))
    .map(d => d.name)
    .sort();

  const htmlFiles = [];

  for (const mdFile of files) {
    const fullPath = path.join(inputDir, mdFile);

    try {
      const { content, data } = matter.read(fullPath);

      const title = data.title || '記事タイトルなし';
      const rawDate = data.date || '日付未設定';
      const date =
        rawDate !== '日付未設定'
          ? new Date(rawDate).toISOString().split('T')[0]
          : rawDate;

      const image = data.image || '';
      const summarySrc = normalizeSummary(data.summary);

      // Markdown → HTML（rendererは使わない）
      const bodyHTML    = addUlClass(marked.parse(content));
      const summaryHTML = summarySrc ? addUlClass(marked.parse(summarySrc)) : '';

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
      console.log(`✔ Converted: ${mdFile} -> ${filename}`);
    } catch (err) {
      console.error(`❌ Failed to convert: ${mdFile}`, err);
    }
  }

  try {
    fs.writeFileSync(jsonPath, JSON.stringify(htmlFiles, null, 2) + '\n', 'utf8');
    console.log(`✅ Index written: ${jsonPath}`);
  } catch (err) {
    console.error('❌ Failed to write files-html.json', err);
  }
}

// 実行
convertAll();
