// main.js (final, BBSは同一タブ遷移版 / body抽出＆i18n対応 + Gallery安定化)
(function () {
  // ========= 設定 =========
  const CONTENT_ID = "page-content";
  const SCRIPT_IDS = ["news-loader-script", "share-script", "gallery-runtime"];
  const FILES_JSON = "news/files-html.json";
  const NEWS_LIST_SELECTOR = "#news-list, .news ul";

  const BBS_PAGE = "hamham_bbs.html";
  const BBS_EXTERNAL_URL = "https://sush1h4mst3r.stars.ne.jp/clipbbs/clipbbs.cgi";
  const MOBILE_BP = 768;

  // ========= ヘルパ =========
  const isMobile = () => window.innerWidth < MOBILE_BP;
  const safeText = el => (el?.textContent || "").trim();
  const firstMatch = (re, s) => (s || "").match(re)?.[0] || "";
  const truncate = (s, n = 140) => (s || "").length > n ? s.slice(0, n - 1) + "…" : (s || "");
  const addScript = (src, id, onload) => {
    const old = document.getElementById(id);
    if (old) old.remove();
    const s = document.createElement("script");
    s.src = src + "?" + Date.now();
    s.id = id;
    if (onload) s.onload = onload;
    s.onerror = () => console.error(`❌ ${src} failed to load`);
    document.body.appendChild(s);
  };
  const clearExtraScripts = () => {
    SCRIPT_IDS.forEach(id => document.getElementById(id)?.remove());
  };
  const dateFromFilename = (filename) => {
    const m = filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`) : new Date(0);
  };
  const fmtDate = (d) => {
    if (!(d instanceof Date) || isNaN(d)) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  // ========= ギャラリー初期化フック =========
  // #gallery が DOM に現れるのを待ってから、gallery.js を script タグで注入
  async function onPageLoadedHook(pagePath) {
    const isGalleryPage =
      (pagePath && /(?:^|\/|^)gallery\.html$/i.test(pagePath)) ||
      /#gallery\.html(?:$|[?#])/i.test(location.hash);
    if (!isGalleryPage) return;

    const container = document.getElementById(CONTENT_ID);
    if (!container) return;

    // 既存のランタイムは必ず除去（再遷移時の二重実行を防ぐ）
    document.getElementById("gallery-runtime")?.remove();

    // #gallery 出現待ち（i18n等の後段差し替えにも対応）
    const waitForGallery = () =>
      new Promise((resolve) => {
        const now = container.querySelector("#gallery");
        if (now) return resolve(now);

        const obs = new MutationObserver(() => {
          const el = container.querySelector("#gallery");
          if (el) {
            obs.disconnect();
            resolve(el);
          }
        });
        obs.observe(container, { childList: true, subtree: true });

        // 念のためのタイムアウト
        setTimeout(() => {
          obs.disconnect();
          resolve(container.querySelector("#gallery") || null);
        }, 3000);
      });

    const galleryEl = await waitForGallery();
    if (!galleryEl) {
      console.warn("[gallery] #gallery not found after wait");
      return;
    }

    // gallery.js を確実にロード
    const s = document.createElement("script");
    s.src = "js/gallery.js?v=" + Date.now();
    s.id = "gallery-runtime";
    s.onload = () => console.log("[gallery] runtime loaded");
    s.onerror = (e) => console.error("[gallery] runtime load failed", e);
    document.body.appendChild(s);
  }

  // ========= contactリンク初期化 =========
  function initContactLink() {
    const link = document.getElementById('contact-link');
    if (!link) return;
    if (link.__mailtoInit) return;
    link.__mailtoInit = true;

    const email = `${link.dataset.u}@${link.dataset.d}`;
    const params = new URLSearchParams({ subject: '【sushihamster】お問い合わせ' });
    link.href = `mailto:${email}?${params.toString()}`;
    link.rel = 'noopener';
    link.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // ========= 一覧描画 =========
  async function renderNewsList() {
    const container = document.querySelector(NEWS_LIST_SELECTOR);
    if (!container) return;
    container.textContent = "読み込み中...";

    try {
      const files = await (await fetch(FILES_JSON + "?" + Date.now())).json();
      const sorted = files
        .filter(f => f.endsWith(".html"))
        .map(filename => ({ filename, date: dateFromFilename(filename) }))
        .sort((a, b) => b.date - a.date);

      const isUL = container.tagName.toLowerCase() === "ul";
      container.innerHTML = "";

      for (const { filename, date } of sorted) {
        const url = `news/${filename}`;
        try {
          const html = await (await fetch(url + "?" + Date.now())).text();
          const doc = new DOMParser().parseFromString(html, "text/html");

          const title = safeText(doc.querySelector("h2")) || filename;
          let dateText = fmtDate(date);
          const inDoc = safeText(doc.querySelector(".news-date"));
          if (inDoc) dateText = inDoc;
          const t = safeText(doc.querySelector("title"));
          const fromTitle = firstMatch(/\d{4}[\/-]\d{2}[\/-]\d{2}/, t);
          if (fromTitle) dateText = fromTitle.replace(/\//g, "-");

          const imgEl = doc.querySelector(".news-feature img, .news-thumb");
          const thumb = imgEl?.getAttribute("src") || "";

          let summary = "";
          const embedEl = doc.querySelector(".news-embed");
          const previewEl = embedEl ? null : doc.querySelector(".news-preview");
          const pickSummary = (root) => {
            if (!root) return "";
            const list = root.querySelector("ul, ol");
            if (list) {
              return Array.from(list.querySelectorAll("li"))
                .map(li => safeText(li))
                .filter(Boolean)
                .slice(0, 3)
                .join(" / ");
            }
            return safeText(root.querySelector("p")) || safeText(root);
          };
          summary = truncate(pickSummary(embedEl) || pickSummary(previewEl), 140);

          const a = document.createElement("a");
          a.href = `#news/${filename}`;
          a.className = "news-post-link";

          const post = document.createElement("div");
          post.className = "news-post";

          if (thumb) {
            const img = document.createElement("img");
            img.className = "news-thumb";
            img.src = thumb;
            img.alt = title;
            post.appendChild(img);
          }

          const text = document.createElement("div");
          text.className = "news-text";

          const titleEl = document.createElement("div");
          titleEl.className = "news-title";
          titleEl.textContent = title;
          text.appendChild(titleEl);

          if (dateText) {
            const dateEl = document.createElement("div");
            dateEl.className = "news-date";
            dateEl.textContent = dateText;
            text.appendChild(dateEl);
          }

          if (summary) {
            const prev = document.createElement("p");
            prev.className = "news-preview";
            prev.textContent = summary;
            text.appendChild(prev);
          }

          const daysAgo = (Date.now() - date.getTime()) / 86400000;
          if (daysAgo <= 30) {
            const badge = document.createElement("span");
            badge.className = "new-label";
            badge.textContent = "New!";
            titleEl.appendChild(document.createTextNode(" "));
            titleEl.appendChild(badge);
          }

          post.appendChild(text);
          a.appendChild(post);

          const wrapper = document.createElement(isUL ? "li" : "div");
          if (!isUL) wrapper.className = "news-item";
          wrapper.appendChild(a);
          container.appendChild(wrapper);
        } catch (e) {
          console.error("🛑 記事取得失敗:", url, e);
        }
      }

      if (!container.children.length) {
        container.textContent = "記事が見つかりませんでした。";
      }
    } catch (e) {
      console.error("🛑 files-html.json 取得失敗:", e);
      container.textContent = "読み込みに失敗しました。";
    }
  }

  // ========= ページ読み込み =========
  function loadPageFromHash(push = false) {
    const hash = location.hash.slice(1);
    const page = hash || "home.html";
    loadPage(page, push);
  }

  function loadPage(page, pushState = true) {
    // ★ BBS は常に同一タブで外部URLへ遷移
    if (page === BBS_PAGE) {
      location.href = BBS_EXTERNAL_URL;
      return;
    }

    fetch(`${page}?v=${Date.now()}`, { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(html => {
        const container = document.getElementById(CONTENT_ID);

        // ★ フルHTMLでも body 中だけ抽出して差し込み
        const doc = new DOMParser().parseFromString(html, "text/html");
        const fragment = doc.body ? doc.body.innerHTML : html;
        container.innerHTML = fragment;

        // ★ i18n: __i18nReady を待ってから適用
        if (window.__i18nReady) {
          window.__i18nReady.then(() => window.applyI18n && applyI18n(container));
        } else if (window.applyI18n) {
          applyI18n(container);
        }

        initContactLink();

        window.scrollTo(0, 0);
        if (pushState) history.pushState({ page }, "", `#${page}`);

        clearExtraScripts();

        if (page.includes("information.html") || page.includes("home.html")) {
          renderNewsList();
        } else if (page.startsWith("news/") && page.endsWith(".html")) {
          const filename = page.split("/").pop();

          let nav = document.querySelector(".news-nav");
          if (!nav) {
            nav = document.createElement("div");
            nav.className = "news-nav";
            const host = document.querySelector(".news") || container;
            host.appendChild(nav);
          }

          fetch("news/files-html.json?nocache=" + Date.now())
            .then(r => { if (!r.ok) throw new Error("files-html.json 取得失敗"); return r.json(); })
            .then(files => {
              const idx = files.indexOf(filename);
              const mk = (file, text) => {
                const a = document.createElement("a");
                a.href = `#news/${file}`;
                a.textContent = text;
                return a;
              };

              nav.innerHTML = "";
              if (idx !== -1) {
                const prev = files[idx + 1];
                const next = files[idx - 1];
                nav.appendChild(prev ? mk(prev, "← 前の記事へ") : document.createElement("span"));

                const back = document.createElement("a");
                back.href = "#information.html";
                back.textContent = "お知らせ一覧へ戻る";
                nav.appendChild(back);

                nav.appendChild(next ? mk(next, "次の記事へ →") : document.createElement("span"));
              } else {
                nav.textContent = "ナビゲーションを生成できませんでした。";
              }
            })
            .catch(e => {
              console.error("ナビ生成エラー:", e);
              nav.innerHTML = "<span style='color:red;'>記事ナビの読み込みに失敗しました。</span>";
            });

          addScript("/share.js", "share-script", () => {
            if (typeof initShareButtons === "function") initShareButtons();
          });
        }

        // ▼ ギャラリー初期化フック（#gallery出現を待ってから実行）
        onPageLoadedHook(page);
      })
      .catch(e => {
        console.error("ページ読み込みエラー:", e);
        document.getElementById(CONTENT_ID).innerHTML = "<p>読み込みに失敗しました。</p>";
      });
  }

  // ========= ルーター =========
  window.loadPage = loadPage;
  window.addEventListener("popstate", () => loadPageFromHash(false));
  window.addEventListener("hashchange", () => loadPageFromHash(true));
  document.addEventListener("DOMContentLoaded", () => loadPageFromHash(false));
})();
