// main.js (final)
(function () {
  // ========= 設定 =========
  const CONTENT_ID = "page-content";
  const SCRIPT_IDS = ["news-loader-script", "share-script"];
  const FILES_JSON = "news/files-html.json";
  // information.html は #news-list（div）、旧構成は .news ul にも対応
  const NEWS_LIST_SELECTOR = "#news-list, .news ul";

  // BBS（スマホは外部タブで開く）
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

  // ========= 一覧描画（home / information 共通）=========
  async function renderNewsList() {
    const container = document.querySelector(NEWS_LIST_SELECTOR);
    if (!container) {
      console.warn("📭 NEWS_LIST_SELECTOR not found:", NEWS_LIST_SELECTOR);
      return;
    }
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

          // タイトル
          const title = safeText(doc.querySelector("h2")) || filename;

          // 日付（ファイル名 → .news-date → <title>）←必ず出す
          let dateText = fmtDate(date); // まずファイル名由来
          const inDoc = safeText(doc.querySelector(".news-date"));
          if (inDoc) dateText = inDoc;
          const t = safeText(doc.querySelector("title"));
          const fromTitle = firstMatch(/\d{4}[\/-]\d{2}[\/-]\d{2}/, t);
          if (fromTitle) dateText = fromTitle.replace(/\//g, "-");

          // サムネ
          const imgEl = doc.querySelector(".news-feature img, .news-thumb");
          const thumb = imgEl?.getAttribute("src") || "";

          // 概要（.news-embed があればそれを優先、無ければ .news-preview）
          let summary = "";
          const embedEl = doc.querySelector(".news-embed");
          const previewEl = embedEl ? null : doc.querySelector(".news-preview");

          const pickSummary = (root) => {
            if (!root) return "";
            const list = root.querySelector("ul, ol");
            if (list) {
              const items = Array.from(list.querySelectorAll("li"))
                .map(li => safeText(li))
                .filter(Boolean)
                .slice(0, 3);
              return items.join(" / ");
            }
            return safeText(root.querySelector("p")) || safeText(root);
          };

          summary = truncate(pickSummary(embedEl) || pickSummary(previewEl), 140);

          // --- DOM構築 ---
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

          // New!（30日以内）
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
      const c = document.querySelector(NEWS_LIST_SELECTOR);
      if (c) c.textContent = "読み込みに失敗しました。";
    }
  }

  // ========= ページ読み込み（SPA）=========
  function loadPageFromHash(push = false) {
    const hash = location.hash.slice(1);
    const page = hash || "home.html";
    loadPage(page, push);
  }

  function loadPage(page, pushState = true) {
    // スマホでBBSは外部タブ
    if (page === BBS_PAGE && isMobile()) {
      window.open(BBS_EXTERNAL_URL, "_blank", "noopener");
      const container = document.getElementById(CONTENT_ID);
      container.innerHTML =
        `<p>スマホでは掲示板を別タブで開きました。<br>` +
        `<a href="${BBS_EXTERNAL_URL}" target="_blank" rel="noopener">開けない場合はこちら</a></p>`;
      if (pushState) history.pushState({ page }, "", `#${page}`);
      return;
    }

    fetch(page)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(html => {
        const container = document.getElementById(CONTENT_ID);
        container.innerHTML = html;
        window.scrollTo(0, 0);
        if (pushState) history.pushState({ page }, "", `#${page}`);

        clearExtraScripts();

        if (page.includes("information.html") || page.includes("home.html")) {
          // 一覧を描画
          renderNewsList();
        } else if (page.startsWith("news/") && page.endsWith(".html")) {
          // ===== 記事ページ：前後ナビ + シェア =====
          const filename = page.split("/").pop();

          // .news-nav が無ければ作成
          let nav = document.querySelector(".news-nav");
          if (!nav) {
            nav = document.createElement("div");
            nav.className = "news-nav";
            const host = document.querySelector(".news") || container;
            host.appendChild(nav);
          }

          // 前後ナビ生成（files-html.json の順序に従う）
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
                const prev = files[idx + 1]; // 配列後方 = 前の記事
                const next = files[idx - 1]; // 配列前方 = 次の記事
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

          // シェアボタン（存在すれば初期化）
          addScript("/share.js", "share-script", () => {
            if (typeof initShareButtons === "function") initShareButtons();
          });
        }
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
