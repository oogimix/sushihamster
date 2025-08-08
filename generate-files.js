// ✅ generate-files.js
const fs = require('fs');
const path = './news';
const outFile = './news/files-html.json';

const files = fs.readdirSync(path)
  .filter(name => name.endsWith('.html'))
  .sort()
  .reverse(); // 新しい順にしたいなら

fs.writeFileSync(outFile, JSON.stringify(files, null, 2));
console.log('✅ news/files-html.json を自動生成しました');

