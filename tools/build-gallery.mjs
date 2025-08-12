// Robust gallery builder: sharp失敗・0枚でも空配列を書き出し、最悪はno-thumbsでフォールバック
import fg from 'fast-glob';
import sharp from 'sharp';
import { promisify } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
import sizeOfCb from 'image-size';
const sizeOf = promisify(sizeOfCb);

const SRC = 'asset/gallery/original';     // 単数 asset！
const OUT_THUMB_DIR = 'asset/gallery/thumb';
const OUT_JSON = 'asset/gallery/images.json';
const GLOB = `${SRC}/**/*.{jpg,jpeg,png,webp,gif,JPG,JPEG,PNG,WEBP,GIF}`;

// 出力サイズ（必要に応じて調整OK）
const sizes = [
  { key: 'thumb',  w: 480 },
  { key: 'medium', w: 960 },
  { key: 'full',   w: 1600 },
];

async function writeJSON(list, note) {
  await writeFile(OUT_JSON, JSON.stringify(list, null, 2), 'utf8');
  console.log(`Wrote: ${OUT_JSON} with ${list.length} items ${note ? `(${note})` : ''}`);
}

async function main() {
  await mkdir(OUT_THUMB_DIR, { recursive: true });

  const files = await fg(GLOB, { dot: false });
  console.log('Found originals:', files.length);

  // 画像が0でも空配列を必ず書く（ブランク化を防止）
  if (!files.length) {
    await writeJSON([], 'no originals');
    return;
  }

  const list = [];

  try {
    // 通常ルート: sharpでwebpサムネ生成
    for (const f of files) {
      try {
        const { width, height } = await sizeOf(f);
        const base = f.split('/').pop().replace(/\.[^.]+$/, '');
        const entry = { id: base, w: width, h: height, alt: base, src: {} };

        for (const s of sizes) {
          const out = `${OUT_THUMB_DIR}/${base}-${s.key}.webp`;
          await sharp(f)
            .rotate()
            .resize({ width: s.w, withoutEnlargement: true })
            .webp({ quality: 78 })
            .toFile(out);
          entry.src[s.key] = out;
        }

        list.push(entry);
      } catch (e) {
        console.error('Per-file build error:', f, e?.message || e);
      }
    }

    // sharpが全部こけた等でlistが空ならフォールバックへ
    if (!list.length) throw new Error('sharp build produced 0 items');
    await writeJSON(list, 'sharp thumbs');
  } catch (e) {
    console.warn('Sharp route failed, fallback to no-thumbs:', e?.message || e);

    // フォールバック：originalそのままをすべてのサイズに流用
    const fallback = files.map(f => {
      const base = f.split('/').pop().replace(/\.[^.]+$/, '');
      return {
        id: base,
        alt: base,
        src: { thumb: f, medium: f, full: f }
      };
    });
    await writeJSON(fallback, 'fallback no-thumbs');
  }
}

main().catch(async (e) => {
  console.error('Fatal builder error:', e);
  // それでも壊れたら最低限の空配列を出力（前回の内容を消しっぱなしにしない）
  try { await writeJSON([], 'fatal'); } catch {}
  process.exit(1);
});
