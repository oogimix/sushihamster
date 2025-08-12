// tools/build-gallery.mjs  (no-thumbs version / depsなし)
import { readdir, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SRC = 'asset/gallery/original';
const OUT_JSON = 'asset/gallery/images.json';
const exts = new Set(['.jpg','.jpeg','.png','.webp','.gif','.JPG','.JPEG','.PNG','.WEBP','.GIF']);

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (exts.has(extname(e.name))) out.push(p);
  }
  return out;
}

async function main() {
  // SRCが無い場合でも空配列で images.json を作る
  let files = [];
  try { files = await walk(SRC); } catch (_) {}

  // original をそのまま thumb/medium/full に使う簡易版
  const list = files.map(f => {
    const base = f.split('/').pop().replace(/\.[^.]+$/, '');
    return {
      id: base,
      alt: base,
      src: { thumb: f, medium: f, full: f }
    };
  });

  await writeFile(OUT_JSON, JSON.stringify(list, null, 2), 'utf8');
  console.log(`Wrote: ${OUT_JSON} with ${list.length} items (no thumbs mode)`);
}

main().catch(e => { console.error(e); process.exit(1); });
