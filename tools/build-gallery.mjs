// tools/build-gallery.mjs
import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';

const ORIG_DIR = 'asset/gallery/original';
const THUMB_DIR = 'asset/gallery/thumb';
const JSON_PATH = 'asset/gallery/images.json';

const exts = /\.(jpe?g|png|webp|gif)$/i;

// 出力サイズと画質（お好みで調整OK）
const sizes = {
  thumb: 480,
  medium: 960,
  full: 1600,
};
const quality = 78;

await fs.ensureDir(THUMB_DIR);

// 元画像一覧を取得
const all = (await fs.readdir(ORIG_DIR)).filter(f => exts.test(f));

// mtime（更新時刻）を取って「追加順（古→新）」にソート
const files = await Promise.all(
  all.map(async (f) => {
    const st = await fs.stat(path.join(ORIG_DIR, f));
    return { file: f, ts: st.mtimeMs };
  })
);
files.sort((a, b) => a.ts - b.ts); // ★ 昇順＝追加順を維持（表示時は ts 降順で並べ替える前提）

const items = [];

for (const { file, ts } of files) {
  const base = path.parse(file).name;
  const inputPath = path.join(ORIG_DIR, file);

  try {
    // 画像メタ（元の幅・高さ）
    const meta = await sharp(inputPath).metadata();
    const srcSet = {};

    // 各サイズをWebPで生成（EXIF回転を正規化、拡大しない）
    for (const [label, width] of Object.entries(sizes)) {
      const outFile = `${base}-${label}.webp`;
      const outPath = path.join(THUMB_DIR, outFile);

      await sharp(inputPath)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toFile(outPath);

      srcSet[label] = `${THUMB_DIR}/${outFile}`;
    }

    items.push({
      id: base,
      title: base,
      w: meta.width ?? undefined,
      h: meta.height ?? undefined,
      ts,                    // ★ 追加（更新時刻ms）
      src: srcSet,
    });

    console.log(`Processed: ${file}`);
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
}

// JSON書き出し
await fs.writeJson(JSON_PATH, items, { spaces: 2 });
console.log(`Wrote: ${JSON_PATH} with ${items.length} items (sharp thumbs, with ts)`);
