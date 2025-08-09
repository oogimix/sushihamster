// main.js
(function () {
  // ========= 設定 =========
  const CONTENT_ID = "page-content";
  const SCRIPT_IDS = ["news-loader-script", "share-script"];
  const FILES_JSON = "news/files-html.json";
  const NEWS_LIST_SELECTOR = ".news ul";

  // BBS（スマホは外部タブで開く）
  const BBS_PAGE = "hamham_bbs.html";
  const BBS_EXTERNAL_URL = "https://sush1h4mst3r.stars.ne.jp/clipbbs/clipbbs.cgi";
  const MOBILE_BP = 768;

  // ========= ヘルパ =========
  const isMobile = () => window.innerWidth < MOBILE_BP;

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

  const truncate = (s, n = 140) =>
    (s || "").length > n ? s.slice(0, n - 1) + "…" : (s || "");

  const dateFromFilename = (filename) => {
    const m = filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(`${m[1]}-${m[2]}-${m[3]}`) : new Date(0);
  };

  const safeText = el => (el?.textContent || "").trim();
  const firstMatch = (re, s) => {
    const m = (s || "").match(re);
    return m ? m[0] : "";
  };

  // ========= 最新情報一覧（サムネ＋日付＋概要 を同時表示）=========
  async function renderNewsList() {
    const container = document.querySelector(NEWS_LIST_SELECTOR);
    if (!container) {
      console.warn("📭 .news ul not found, skip rendering.");
      return;
    }

    try {
      const files = await (await fetch(FILES_JSON + "?" + Date.now())).json();

      const sorted = files
        .filter(f => f.endsWith(".html"))
        .map(filename => ({ filename, date: dateFromFilename(filename) }))
        .sort((a, b) => b.date - a.date);

      container.innerHTML = "";

      for (const { filename, date } of sorted) {
        const url = `news/${filename}`;
        try {
          const html = await (await fetch(url + "?" + Date.now())).text();
          const doc = new DOMParser().parseFromString(html, "text/html");

          // タイトル
          const title = safeText(doc.querySelector("h2")) || filename;

          // ---- 日付（.news-date → <title> 先頭日付 → ファイル名）----
          let dateText = safeText(doc.querySelector(".news-date"));
          if (!dateText) {
            const t = safeText(doc.querySelector("title"));
            const fromTitle = firstMatch(/\d{4}[\/-]\d{2}[\/-]\d{2}/, t);
            if (fromTitle) {
              dateText = fromTitle.replace(/\//g, "-");
            } else {
              const m = filename.match(/^(\d{4})-(\d{2})-(\d{2})/);
              if (m) dateText = `${m[1]}-${m[2]}-${m[3]}`;
            }
          }

          // サムネ
          const imgEl = doc.querySelector(".news-feature img, .news-thumb");
          const thumb = imgEl?.getAttribute("src") || "";

          // ---- 概要（summary優先 → 本文先頭段落 → プレーンテキスト）----
          let summary = "";
          const summaryRoot =
            doc.querySelector(".news-embed") || doc.querySelector(".news-preview");

          if (summaryRoot) {
            const list = summaryRoot.querySelector("ul, ol");
            if (list) {
              const items = Array.from(list.querySelectorAll("li"))
                .map(li => safeText(li))
                .filter(Boolean)
                .slice(0, 3);
              summary = items.join(" / ");
            } else {
              summary = safeText(summaryRoot.querySelector("p")) || safeText(summaryRoot);
            }
          }
          summary = truncate(summary, 140);

          // New! 判定（30日以内）
          const daysAgo = (Date.now() - date.getTime()) / 86400000;
          const isNew = daysAgo <= 30;

          // === DOM構築（既存CSSに合わせる）===
          const a = document.createElement("a");
          a.href = `#${url}`;
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

          if (isNew) {
            const badge = document.createElement("span");
            badge.className = "new-label";
            badge.textContent = "New!";
            titleEl.appendChild(document.createTextNode(" "));
            titleEl.appendChild(badge);
          }

          post.appendChild(text);
          a.appendChild(post);

          const li = document.createElement("li");
          li.appendChild(a);
          container.appendChild(li);
        } catch (e) {
          console.error(`🛑 記事の取得に失敗: ${url}`, e);
        }
      }
    } catch (err) {
      console.error("🛑 最新情報の読み込み失敗:", err);
      container.innerHTML = "<li>読み込みに失敗しました。</li>";
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
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then(html => {
        const container = document.getElementById(CONTENT_ID);
        container.innerHTML = html;
        window.scrollTo(0, 0);

        if (pushState) history.pushState({ page }, "", `#${page}`);

        clearExtraScripts();

        if (page.includes("information.html")) {
          // 情報一覧ページ
          addScript("/news-loader-html.js", "news-loader-script");
        } else if (page.includes("home.html")) {
          // トップは最新情報の簡易リスト
          renderNewsList();
        } else if (page.startsWith("news/") && page.endsWith(".html")) {
          // 記事ページ：前後ナビとシェアボタン
          const filename = page.split("/").pop();
          const nav = document.querySelector(".news-nav");
          if (nav) {
            fetch("/news/files-html.json?nocache=" + Date.now())
              .then(r => {
                if (!r.ok) throw new Error("files-html.json 取得失敗");
                return r.json();
              })
              .then(files => {
                const idx = files.indexOf(filename);
                if (idx === -1) return;
                const prev = files[idx + 1];
                const next = files[idx - 1];

                const mk = (file, text) => {
                  const a = document.createElement("a");
                  a.href = `#news/${file}`;
                  a.textContent = text;
                  return a;
                };

                nav.innerHTML = "";
                nav.appendChild(prev ? mk(prev, "← 前の記事へ") : document.createElement("span"));

                const back = document.createElement("a");
                back.href = "#information.html";
                back.textContent = "お知らせ一覧へ戻る";
                nav.appendChild(back);

                nav.appendChild(next ? mk(next, "次の記事へ →") : document.createElement("span"));
              })
              .catch(err => {
                console.error("ナビ生成エラー:", err);
                nav.innerHTML = "<span style='color:red;'>記事ナビの読み込みに失敗しました。</span>";
              });
          }

          addScript("/share.js", "share-script", () => {
            if (typeof initShareButtons === "function") initShareButtons();
          });
        }
      })
      .catch(err => {
        console.error("ページ読み込みエラー:", err);
        document.getElementById(CONTENT_ID).innerHTML = "<p>読み込みに失敗しました。</p>";
      });
  }

  // iOS対策：クリック直下で外部タブを開く
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href="#hamham_bbs.html"]');
    if (!a) return;
    if (isMobile()) {
      e.preventDefault();
      window.open(BBS_EXTERNAL_URL, "_blank", "noopener");
    }
  });

  // ========= ルーター =========
  window.loadPage = loadPage;
  window.addEventListener("popstate", () => loadPageFromHash(false));
  window.addEventListener("hashchange", () => loadPageFromHash(true));
  document.addEventListener("DOMContentLoaded", () => loadPageFromHash(false));
})();
