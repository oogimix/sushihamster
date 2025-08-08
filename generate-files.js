// ✅ generate-files.js（決定版）
// newsディレクトリ内の.htmlファイルだけを抽出して files-html.json を生成

const fs = require('fs');
const path = './news';
const outFile = './news/files-html.json'; // ✅ ここが重要！

const files = fs.readdirSync(path)
  .filter(name => name.endsWith('.html'))
  .sort()
  .reverse(); // 新しい順にしたい場合

fs.writeFileSync(outFile, JSON.stringify(files, null, 2));
console.log('✅ news/files-html.json を自動生成しました');
