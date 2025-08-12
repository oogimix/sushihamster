import fg from 'fast-glob';
import sharp from 'sharp';
import { promisify } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
import sizeOfCb from 'image-size';
const sizeOf = promisify(sizeOfCb);

const SRC = 'asset/gallery/original';
const OUT_THUMB = 'asset/gallery/thumb';
const OUT_JSON = 'asset/gallery/images.json';

const sizes = [
  { key: 'thumb',  w: 480 },
  { key: 'medium', w: 960 },
  { key: 'full',   w: 1600 }
];

await mkdir(OUT_THUMB, { recursive: true });

const files = await fg(`${SRC}/**/*.{jpg,jpeg,png,webp,gif}`, { dot:false });
const list = [];

for (const f of files) {
  const { width, height } = await sizeOf(f);
  const base = f.split('/').slice(-1)[0].replace(/\.(\w+)$/, '');
  const entry = { id: base, w: width, h: height, alt: base, src: {} };

  for (const s of sizes) {
    const out = `${OUT_THUMB}/${base}-${s.key}.webp`;
    await sharp(f)
      .resize({ width: s.w, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(out);
    entry.src[s.key] = out;
  }

  // 元画像を使いたければ以下を有効化
  // entry.src.full = f;

  list.push(entry);
}

await writeFile(OUT_JSON, JSON.stringify(list, null, 2), 'utf8');
console.log(`Wrote: ${OUT_JSON} with ${list.length} items`);
