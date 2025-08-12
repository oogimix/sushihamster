import fg from 'fast-glob';
import sharp from 'sharp';
import { promisify } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
import sizeOfCb from 'image-size';
const sizeOf = promisify(sizeOfCb);

// すべて「asset/」（単数）に合わせる
const SRC = 'asset/gallery/original';
const OUT_THUMB = 'asset/gallery/thumb';
const OUT_JSON = 'asset/gallery/images.json';

// 出力するサイズ（必要に応じて調整）
const sizes = [
  { key: 'thumb',  w: 480 },
  { key: 'medium', w: 960 },
  { key: 'full',   w: 1600 }
];

await mkdir(OUT_THUMB, { recursive: true });

const files = await fg(`${SRC}/**/*.{jpg,jpeg,png,webp,gif,JPG,JPEG,PNG,WEBP,GIF}`, { dot:false });
const list = [];

for (const f of files) {
  const { width, height, type } = await sizeOf(f);
  const base = f.split('/').pop().replace(/\.[^.]+$/, ''); // 拡張子除去
  const entry = { id: base, w: width, h: height, alt: base, src: {} };

  for (const s of sizes) {
    const out = `${OUT_THUMB}/${base}-${s.key}.webp`;
    await sharp(f)
      .rotate() // EXIFを正規化
      .resize({ width: s.w, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(out);
    entry.src[s.key] = out;
  }

  list.push(entry);
}

await writeFile(OUT_JSON, JSON.stringify(list, null, 2), 'utf8');
console.log(`Wrote: ${OUT_JSON} with ${list.length} items`);
