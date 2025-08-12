console.log('[gallery] init');

(async function () {
  const wrap = document.getElementById('gallery');
  if (!wrap) { console.warn('[gallery] no #gallery'); return; }

  // 二重実行ガード
  if (wrap.dataset.hydrated === '1') {
    console.log('[gallery] already hydrated, skip');
    return;
  }
  wrap.dataset.hydrated = '1';
  wrap.innerHTML = '';

  async function loadJSON(url) {
    const res = await fetch(url + '?' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(url + ' HTTP ' + res.status);
    const txt = await res.text();
    if (!txt || !txt.trim()) return [];
    try { return JSON.parse(txt); }
    catch (e) { console.error('[gallery] JSON parse error:', url, e); return []; }
  }

  // --- データ取得（画像＋動画） ---
  let items = [];
  try {
    // 画像: images.json は ts（mtimeMs）を含むようにビルダーを修正済み
    const imgsRaw = await loadJSON('asset/gallery/images.json');
    const imgs = imgsRaw.map((it, idx) => ({
      kind: 'img',
      ts: typeof it.ts === 'number' ? it.ts : idx, // 互換: tsが無い古いファイルでも順序維持
      data: it
    }));

    // 動画: videos.json は ts が無くてもOK（末尾に追加される運用 → idxを時刻代わりにする）
    const vidsRaw = await loadJSON('asset/gallery/videos.json');
    const vids = vidsRaw.map((v, idx) => ({
      kind: 'video',
      ts: v.ts ? Date.parse(v.ts) || +v.ts || idx : idx, // ISO/epoch/無ければidx
      data: v
    }));

    // マージして ts 降順（新しいほど上）
    items = imgs.concat(vids).sort((a, b) => b.ts - a.ts);
  } catch (e) {
    console.error('[gallery] load failed', e);
  }

  // --- 描画 ---
  const seenYT = new Set(); // 動画ID重複ガード
  const byImgId = new Set();

  for (const it of items) {
    if (it.kind === 'img') {
      const d = it.data;
      if (!d || !d.src) continue;
      if (d.id && byImgId.has(d.id)) continue;
      if (d.id) byImgId.add(d.id);

      const fig = document.createElement('figure');
      fig.className = 'card';

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = d.alt || '';
      if (d.w && d.h) { img.width = d.w; img.height = d.h; }

      img.src = d.src.thumb || d.src.medium || d.src.full;
      const srcset = [];
      if (d.src.thumb)  srcset.push(`${d.src.thumb} 480w`);
      if (d.src.medium) srcset.push(`${d.src.medium} 960w`);
      if (d.src.full)   srcset.push(`${d.src.full} 1600w`);
      if (srcset.length) {
        img.srcset = srcset.join(', ');
        img.sizes = '(max-width: 700px) 100vw, 50vw';
      }

      fig.appendChild(img);
      wrap.appendChild(fig);
    } else if (it.kind === 'video') {
      const v = it.data;
      if (!v || !v.id) continue;
      if (seenYT.has(v.id) || wrap.querySelector(`[data-ytid="${v.id}"]`)) continue;
      seenYT.add(v.id);

      const fig = document.createElement('figure');
      fig.className = 'card video';
      fig.setAttribute('data-ytid', v.id);
      fig.setAttribute('aria-label', v.title || 'YouTube video');

      const thumb = document.createElement('img');
      thumb.className = 'video-thumb';
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      thumb.alt = v.title || 'YouTube thumbnail';
      thumb.src = `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
      // 最低限の保険（CSS未読みでも崩れない）
      Object.assign(thumb.style, {
        width: '100%', display: 'block', aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: '10px'
      });

      const overlay = document.createElement('div');
      overlay.className = 'play-overlay';
      overlay.innerHTML = '<button class="play-button"><div class="triangle"></div></button>';

      fig.appendChild(thumb);
      fig.appendChild(overlay);

      fig.addEventListener('click', function () {
        const id = this.dataset.ytid;
        const box = document.createElement('div');
        box.className = 'video-box';
        Object.assign(box.style, {
          position: 'relative', width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: '10px'
        });

        const iframe = document.createElement('iframe');
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
        Object.assign(iframe.style, {
          position: 'absolute', inset: '0', width: '100%', height: '100%', border: '0', display: 'block'
        });

        box.appendChild(iframe);
        this.innerHTML = '';
        this.appendChild(box);
      });

      wrap.appendChild(fig);
    }
  }

  if (!wrap.children.length) {
    wrap.innerHTML = '<p style="opacity:.6">ギャラリーに表示できる項目がありません</p>';
  }

  // フェードイン（IO）
  try {
    const cards = Array.from(document.querySelectorAll('#gallery .card'));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    }, { root: null, rootMargin: '80px 0px', threshold: 0.01 });
    cards.forEach(c => io.observe(c));
  } catch {
    document.querySelectorAll('#gallery .card').forEach(c => c.classList.add('is-in'));
  }
})();
