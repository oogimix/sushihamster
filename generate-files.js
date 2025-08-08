const fs = require('fs');
const path = './news';

const files = fs.readdirSync(path)
  .filter(name => name.endsWith('.md'))
  .sort();

fs.writeFileSync(`${path}/files.json`, JSON.stringify(files, null, 2));
console.log('✅ files.json を自動生成しました');
