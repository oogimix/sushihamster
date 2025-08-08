// ✅ 完全統合版 main.js - SPA + ハッシュルーティング + 最新情報一覧描画 + シェア対応
(function () {
  const CONTENT_ID = "page-content";
  const SCRIPT_IDS = ["news-loader-script", "share-script"]; // ← news-nav-script 削除済
  const FILES_JSON = "news/files-html.json";
  const NEWS_LIST_SELECTOR = ".news ul";

  function addScript(src, id, callback) {
    const old = document.getElementById(id);
    if (old) old.remove();

    const script = document.createElement("script");
    script.src = src + "?" + Date.now(); // キャッシュバスター
    script.id = id;
    script.onload = callback;
    script.onerror = () => console.error(`❌ ${src} failed to load`);
    document.body.appendChild(script);
  }

  function clearExtraScripts() {
    SCRIPT_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  function renderNewsList() {
    const container = document.querySelector(NEWS_LIST_SELECTOR);
    if (!container) {
      console.warn("📭 .news ul not found, skip rendering.");
      return;
    }

    fetch(FILES_JSON)
      .then(res => res.json())
      .then(files => {
        const sortedFiles = files
          .filter(file => file.endsWith(".html"))
          .map(filename => {
            const dateStr = filename.split("-").slice(0, 3).join("-");
            return { filename, date: new Date(dateStr) };
          })
          .sort((a, b) => b.date - a.date);

        container.innerHTML = ""; // ←これ重要！

        sortedFiles.forEach(({ filename, date }) => {
          fetch(`news/${filename}`)
            .then(res => res.text())
            .then(html => {
              const titleRaw = html.match(/<title>(.*?)<\/title>/i)?.[1] ?? filename;
              const titleMatch = titleRaw.match(/^(\d{4}\/\d{2}\/\d{2})\s+(.+)$/);
              const titleDate = titleMatch?.[1] ?? "";
              const titleText = titleMatch?.[2] ?? titleRaw;
              const url = `news/${filename}`;

              const li = document.createElement("li");
              const link = document.createElement("a");
              link.href = `#${url}`;
              link.textContent = `${titleDate} - ${titleText}`;
              li.appendChild(link);

              const now = new Date();
              const daysAgo = (now - date) / (1000 * 60 * 60 * 24);
              if (daysAgo <= 30) {
                const newSpan = document.createElement("span");
                newSpan.style.color = "red";
                newSpan.textContent = " New!";
                li.appendChild(newSpan);
              }

              container.appendChild(li);
            })
            .catch(err => console.error(`🛑 記事 ${filename} の読み込み失敗:`, err));
        });
      })
      .catch(err => {
        console.error("🛑 最新情報の読み込み失敗:", err);
        container.innerHTML = "<li>読み込みに失敗しました。</li>";
      });
  }

  function loadPageFromHash(push = false) {
    const hash = location.hash.slice(1);
    const page = hash || "home.html";
    loadPage(page, push);
  }

  function loadPage(page, pushState = true) {
    fetch(page)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.text();
      })
      .then(html => {
        const container = document.getElementById(CONTENT_ID);
        container.innerHTML = html;
        window.scrollTo(0, 0);

        if (pushState) {
          history.pushState({ page }, '', `#${page}`);
        }

        clearExtraScripts();

        if (page.includes("information.html")) {
          addScript("/news-loader-html.js", "news-loader-script");
        } else if (page.includes("home.html")) {
          renderNewsList();
        } else if (page.startsWith("news/") && page.endsWith(".html")) {
          const filename = page.split("/").pop();

          // ✅ ナビゲーション生成（main.jsに統合済み）
          const nav = document.querySelector(".news-nav");
          if (nav) {
            fetch("/news/files-html.json?nocache=" + Date.now())
              .then(res => {
                if (!res.ok) throw new Error("ファイル取得エラー");
                return res.json();
              })
              .then(files => {
                const index = files.indexOf(filename);
                if (index === -1) return;

                const prev = files[index + 1];
                const next = files[index - 1];

                const createLink = (file, text) => {
                  const a = document.createElement("a");
                  a.href = `#news/${file}`;
                  a.textContent = text;
                  return a;
                };

                nav.innerHTML = "";
                nav.appendChild(prev ? createLink(prev, "← 前の記事へ") : document.createElement("span"));

                const infoLink = document.createElement("a");
                infoLink.href = "#information.html";
                infoLink.textContent = "お知らせ一覧へ戻る";
                nav.appendChild(infoLink);

                nav.appendChild(next ? createLink(next, "次の記事へ →") : document.createElement("span"));
              })
              .catch(err => {
                console.error("ナビゲーション生成エラー:", err);
                nav.innerHTML = "<span style='color: red;'>記事ナビの読み込みに失敗しました。</span>";
              });
          }

          // ✅ シェアボタンJS読み込み（関数定義保証＆初期化）
          addScript("/share.js", "share-script", () => {
            if (typeof initShareButtons === "function") {
              initShareButtons();
            } else {
              console.warn("⚠ initShareButtons not defined after share.js load.");
            }
          });
        }
      })
      .catch(err => {
        console.error("ページ読み込みエラー:", err);
        document.getElementById(CONTENT_ID).innerHTML = "<p>読み込みに失敗しました。</p>";
      });
  }

  window.loadPage = loadPage;

  window.addEventListener("popstate", () => {
    loadPageFromHash(false);
  });

  window.addEventListener("hashchange", () => {
    loadPageFromHash(true);
  });

  document.addEventListener("DOMContentLoaded", () => {
    loadPageFromHash(false);
  });
})();
