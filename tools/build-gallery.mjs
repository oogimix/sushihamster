import fg from 'fast-glob';
import { writeFile } from 'node:fs/promises';

const SRC = 'asset/gallery/original';
const OUT_JSON = 'asset/gallery/images.json';

const files = await fg(`${SRC}/**/*.{jpg,jpeg,png,webp,gif,JPG,JPEG,PNG,WEBP,GIF}`, { dot:false });

const list = files.map(f => {
  const base = f.split('/').pop().replace(/\.[^.]+$/, '');
  return {
    id: base,
    alt: base,
    src: {
      thumb: f,
      medium: f,
      full: f
    }
  };
});

await writeFile(OUT_JSON, JSON.stringify(list, null, 2), 'utf8');
console.log(`Wrote: ${OUT_JSON} with ${list.length} items (no thumbs mode)`);
