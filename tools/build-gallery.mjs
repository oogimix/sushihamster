// tools/build-gallery.mjs  (sharp版: サムネ/中/大をWebPで生成)
// 依存: sharp, fast-glob, image-size
import fg from 'fast-glob';
import sharp from 'sharp';
import { promisify } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
import sizeOfCb from 'image-size';
const sizeOf = promisify(sizeOfCb);

// すべて「asset/」（単数）に統一
const SRC = 'asset/gallery/original';
const OUT_THUMB_DIR = 'asset/gallery/thumb';
const OUT_JSON = 'asset/gallery/images.json';

// 生成する出力サイズ（必要なら調整OK）
const sizes = [
  { key: 'thumb',  w: 480 },   // ギャラリーに並べる軽量版
  { key: 'medium', w: 960 },   // 少し大きい表示用
  { key: 'full',   w: 1600 },  // フル相当（過度に大きい原稿はここまでに縮小）
];

await mkdir(OUT_THUMB_DIR, { recursive: true });

// original配下の画像を拾う（大文字拡張子もOK）
const files = await fg(`${SRC}/**/*.{jpg,jpeg,png,webp,gif,JPG,JPEG,PNG,WEBP,GIF}`, { dot:false });
const list = [];

for (const f of files) {
  try {
    const { width, height } = await sizeOf(f);
    const base = f.split('/').pop().replace(/\.[^.]+$/, ''); // 拡張子除去
    const entry = { id: base, w: width, h: height, alt: base, src: {} };

    // 各サイズを生成（元が小さい時は拡大しない）
    for (const s of sizes) {
      const out = `${OUT_THUMB_DIR}/${base}-${s.key}.webp`;
      await sharp(f)
        .rotate() // EXIF回転を正規化
        .resize({ width: s.w, withoutEnlargement: true })
        .webp({ quality: 78 })   // 画質はお好みで（70-82くらいが無難）
        .toFile(out);
      entry.src[s.key] = out;
    }

    list.push(entry);
  } catch (e) {
    console.error('Build error for', f, e);
  }
}

// JSONを書き出し
await writeFile(OUT_JSON, JSON.stringify(list, null, 2), 'utf8');
console.log(`Wrote: ${OUT_JSON} with ${list.length} items`);
