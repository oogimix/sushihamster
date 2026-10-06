// movie.js — すしハムシアター（asset/movie/movies.json を読んで上映）
(function () {
  const DATA_URL = "asset/movie/movies.json";
  const MODAL_ID = "movie-theater-modal";

  const t = (key, fallback) => {
    const v = window.i18nGet ? window.i18nGet(key) : key;
    return v === key ? fallback : v;
  };
  const lang = () => (window.getCurrentLang ? window.getCurrentLang() : "ja");
  // 文字列 or {ja, en, ...} のどちらでもOK
  const pick = (v) => {
    if (v == null) return "";
    if (typeof v === "string") return v;
    return v[lang()] ?? v.ja ?? Object.values(v)[0] ?? "";
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, c => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
  const validId = (id) => /^[A-Za-z0-9_-]{6,20}$/.test(id || "");
  const thumbUrl = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const watchUrl = (m) => m.type === "wide"
    ? `https://www.youtube.com/watch?v=${m.id}`
    : `https://www.youtube.com/shorts/${m.id}`;

  // ===== 上映モーダル =====
  function closeTheater() {
    const modal = document.getElementById(MODAL_ID);
    if (!modal) return;
    document.body.classList.remove("movie-showing");
    modal.classList.remove("is-open");
    // カーテンが閉じてから iframe ごと破棄（音を確実に止める）
    setTimeout(() => modal.remove(), 450);
  }

  function openTheater(m) {
    document.getElementById(MODAL_ID)?.remove();

    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.className = `theater-modal ${m.type === "wide" ? "is-wide" : "is-short"}`;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", pick(m.title));

    const src = `https://www.youtube-nocookie.com/embed/${m.id}?autoplay=1&playsinline=1&rel=0`;
    const seats = Array.from({ length: 9 }, () => "<span>🐹</span>").join("");

    modal.innerHTML = `
      <div class="theater-room">
        <button type="button" class="theater-close" aria-label="close">✕</button>
        <p class="theater-now">${esc(t("movie.now_showing", "🎞️ 上映中 🎞️"))}</p>
        <div class="theater-stage">
          <div class="theater-screen">
            <iframe src="${src}" title="${esc(pick(m.title))}"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowfullscreen></iframe>
          </div>
          <div class="curtain curtain-left" aria-hidden="true"></div>
          <div class="curtain curtain-right" aria-hidden="true"></div>
          <div class="curtain-valance" aria-hidden="true"></div>
        </div>
        <p class="theater-caption">${esc(pick(m.title))}</p>
        <div class="theater-seats" aria-hidden="true">${seats}</div>
      </div>`;

    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.closest(".theater-close")) closeTheater();
    });

    document.body.appendChild(modal);
    document.body.classList.add("movie-showing");
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("is-open")));
    modal.querySelector(".theater-close").focus();
  }

  // ページ遷移・Escで閉じる（リスナーは一度だけ登録）
  if (!window.__movieTheaterBound) {
    window.__movieTheaterBound = true;
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeTheater(); });
    window.addEventListener("hashchange", closeTheater);
  }

  // ===== 一覧 =====
  function ticketHtml(m, i) {
    const title = esc(pick(m.title));
    const desc = m.desc ? `<p class="ticket-desc">${esc(pick(m.desc))}</p>` : "";
    const ig = m.instagram && /^https:\/\/(www\.)?instagram\.com\//.test(m.instagram)
      ? `<a class="ticket-link" href="${esc(m.instagram)}" target="_blank" rel="noopener">Instagram</a>` : "";
    return `
      <div class="ticket ${m.type === "wide" ? "is-wide" : "is-short"}">
        <button type="button" class="ticket-play" data-idx="${i}" aria-label="${title}">
          <span class="ticket-thumb"><img src="${thumbUrl(m.id)}" alt="" loading="lazy"></span>
          <span class="ticket-play-icon" aria-hidden="true">▶</span>
        </button>
        <div class="ticket-stub">
          <p class="ticket-no">No.${String(i + 1).padStart(3, "0")}${m.date ? ` ・ ${esc(m.date)}` : ""}</p>
          <p class="ticket-title">${title}</p>
          ${desc}
          <p class="ticket-links">
            <a class="ticket-link" href="${watchUrl(m)}" target="_blank" rel="noopener">YouTube</a>${ig}
          </p>
        </div>
      </div>`;
  }

  function comingSoonHtml() {
    return Array.from({ length: 3 }, () => `
      <div class="ticket is-short is-soon">
        <div class="ticket-thumb ticket-thumb-soon" aria-hidden="true">🍿</div>
        <div class="ticket-stub">
          <p class="ticket-no">No.???</p>
          <p class="ticket-title" data-i18n="movie.coming_soon">🍿 COMING SOON 🍿</p>
        </div>
      </div>`).join("");
  }

  function renderFeature(m, host) {
    host.innerHTML = `
      <button type="button" class="feature-btn ${m.type === "wide" ? "is-wide" : "is-short"}" aria-label="${esc(pick(m.title))}">
        <img src="${thumbUrl(m.id)}" alt="">
        <span class="feature-play" aria-hidden="true">▶</span>
        <span class="feature-label">${esc(t("movie.latest", "NEW!"))} ${esc(pick(m.title))}</span>
      </button>`;
    host.querySelector(".feature-btn").addEventListener("click", () => openTheater(m));
  }

  async function init() {
    const page = document.getElementById("movie-page");
    if (!page) return;
    const list = page.querySelector("#movie-list");
    const feature = page.querySelector("#movie-feature");
    const stage = page.querySelector("#movie-stage");

    let movies = [];
    try {
      const res = await fetch(`${DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      movies = ((await res.json()).movies || []).filter(m => validId(m.id));
    } catch (e) {
      console.error("[movie] movies.json load failed", e);
    }

    if (movies.length) {
      list.innerHTML = movies.map(ticketHtml).join("");
      list.addEventListener("click", (e) => {
        const btn = e.target.closest(".ticket-play");
        if (btn) openTheater(movies[Number(btn.dataset.idx)]);
      });
      renderFeature(movies[0], feature);
    } else {
      list.innerHTML = comingSoonHtml();
    }
    if (window.applyI18n) window.applyI18n(page);

    // ページ表示時にステージのカーテンを開ける
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.add("is-open")));
  }

  init();
})();
