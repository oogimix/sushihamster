import fs from 'fs-extra';
import path from 'path';
import sharp from 'sharp';

const ORIG_DIR = 'asset/gallery/original';
const THUMB_DIR = 'asset/gallery/thumb';
const JSON_PATH = 'asset/gallery/images.json';

// サムネサイズと画質
const sizes = {
  thumb: 480,
  medium: 960,
  full: 1600
};
const quality = 78;

await fs.ensureDir(THUMB_DIR);

const files = (await fs.readdir(ORIG_DIR))
  .filter(f => /\.(jpe?g|png|webp|gif)$/i.test(f))
  .sort((a, b) => fs.statSync(path.join(ORIG_DIR, b)).mtimeMs - fs.statSync(path.join(ORIG_DIR, b)).mtimeMs);

let items = [];

for (const file of files) {
  const base = path.parse(file).name;
  let srcSet = {};
  const inputPath = path.join(ORIG_DIR, file);

  try {
    for (const [label, width] of Object.entries(sizes)) {
      const outFile = `${base}-${label}.webp`;
      const outPath = path.join(THUMB_DIR, outFile);

      await sharp(inputPath)
        .resize(width)
        .webp({ quality })
        .toFile(outPath);

      srcSet[label] = `${THUMB_DIR}/${outFile}`;
    }

    items.push({
      src: srcSet,
      title: base
    });

    console.log(`Processed: ${file}`);
  } catch (err) {
    console.error(`Error processing ${file}:`, err);
  }
}

await fs.writeJson(JSON_PATH, items, { spaces: 2 });
console.log(`Wrote: ${JSON_PATH} with ${items.length} items (sharp thumbs)`);
