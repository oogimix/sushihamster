// generate-json.js
const fs = require('fs');
const path = './news';

const files = fs.readdirSync(path)
  .filter(name => name.endsWith('.html'))
  .sort()
  .reverse(); // 新しい順にするならここでreverse()

fs.writeFileSync('files-html.json', JSON.stringify(files, null, 2));
console.log('✅ files-html.json を自動生成しました');
