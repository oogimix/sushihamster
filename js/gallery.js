console.log('[gallery] init');

(async function () {
  const wrap = document.getElementById('gallery');
  if (!wrap) { console.warn('[gallery] no #gallery'); return; }

  // 同一DOMでの二重実行を抑止
  if (wrap.dataset.hydrated === '1') {
    console.log('[gallery] already hydrated, skip');
    return;
  }
  wrap.dataset.hydrated = '1';

  // 念のためクリア（途中で二重実行しても最終的に1セットに収束）
  wrap.innerHTML = '';

  // 汎用JSONローダ
  async function loadJSON(url) {
    const res = await fetch(url + '?' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(url + ' HTTP ' + res.status);
    const txt = await res.text();
    if (!txt || !txt.trim()) return [];
    try { return JSON.parse(txt); }
    catch (e) { console.error('[gallery] JSON parse error:', url, e); return []; }
  }

  // === 動画（新しい順にするため reverse） ===
  try {
    const videos = (await loadJSON('asset/gallery/videos.json')).reverse();
    const seen = new Set(); // ID重複防止
    for (const v of videos) {
      if (!v || !v.id) continue;
      if (seen.has(v.id) || wrap.querySelector(`[data-ytid="${v.id}"]`)) continue;
      seen.add(v.id);

      const fig = document.createElement('figure');
      fig.className = 'card video';
      fig.setAttribute('data-ytid', v.id);
      fig.setAttribute('aria-label', v.title || 'YouTube video');

      // サムネ（16:9を維持・CSS未読みでも崩れないよう最低限のinline style）
      const thumb = document.createElement('img');
      thumb.className = 'video-thumb';
      thumb.loading = 'lazy';
      thumb.decoding = 'async';
      thumb.alt = v.title || 'YouTube thumbnail';
      thumb.src = `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
      thumb.style.width = '100%';
      thumb.style.display = 'block';
      thumb.style.aspectRatio = '16 / 9';
      thumb.style.objectFit = 'cover';
      thumb.style.borderRadius = '10px';

      // 再生ボタンオーバーレイ
      const overlay = document.createElement('div');
      overlay.className = 'play-overlay';
      overlay.innerHTML = '<button class="play-button"><div class="triangle"></div></button>';

      fig.appendChild(thumb);
      fig.appendChild(overlay);

      // クリックで16:9ボックスにiframeをはめ込む（横長化を防ぐ）
      fig.addEventListener('click', function () {
        const id = this.dataset.ytid;

        const box = document.createElement('div');
        box.className = 'video-box';
        Object.assign(box.style, {
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          borderRadius: '10px'
        });

        const iframe = document.createElement('iframe');
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.loading = 'lazy';
        iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
        Object.assign(iframe.style, {
          position: 'absolute',
          inset: '0',
          width: '100%',
          height: '100%',
          border: '0',
          display: 'block'
        });

        box.appendChild(iframe);
        this.innerHTML = '';
        this.appendChild(box);
      });

      wrap.appendChild(fig);
    }
  } catch (e) {
    console.error('[gallery] videos load failed', e);
  }

  // === 画像（新しい順にするため reverse） ===
  try {
    const imgs = (await loadJSON('asset/gallery/images.json')).reverse();
    const byId = new Set();
    for (const it of imgs) {
      if (!it || !it.src) continue;
      if (it.id && byId.has(it.id)) continue;
      if (it.id) byId.add(it.id);

      const fig = document.createElement('figure');
      fig.className = 'card';

      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = it.alt || '';
      if (it.w && it.h) { img.width = it.w; img.height = it.h; }

      img.src = it.src.thumb || it.src.medium || it.src.full;
      const srcset = [];
      if (it.src.thumb)  srcset.push(`${it.src.thumb} 480w`);
      if (it.src.medium) srcset.push(`${it.src.medium} 960w`);
      if (it.src.full)   srcset.push(`${it.src.full} 1600w`);
      if (srcset.length) {
        img.srcset = srcset.join(', ');
        img.sizes = '(max-width: 700px) 100vw, 33vw';
      }

      fig.appendChild(img);
      wrap.appendChild(fig);
    }
  } catch (e) {
    console.error('[gallery] images load failed', e);
  }

  if (!wrap.children.length) {
    wrap.innerHTML = '<p style="opacity:.6">ギャラリーに表示できる項目がありません</p>';
  }

  // === リビール（IntersectionObserver） ===
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
  } catch (e) {
    // 古いブラウザは素直に全部表示に
    document.querySelectorAll('#gallery .card').forEach(c => c.classList.add('is-in'));
  }
})();
