// js/i18n.js
(function () {
  const DEFAULT = "ja";
  const SUPPORTED = ["ja", "en", "ko"];

  let dict = {};
  // ← これで「辞書準備OK」を他から待てる
  let resolveReady;
  window.__i18nReady = new Promise(res => (resolveReady = res));

  function detectLang() {
    const p = new URLSearchParams(location.search);
    const url = (p.get("lang") || "").toLowerCase();
    const saved = (localStorage.getItem("lang") || "").toLowerCase();
    const nav = (navigator.language || "").slice(0, 2).toLowerCase();
    return [url, saved, nav, DEFAULT].find(l => SUPPORTED.includes(l)) || DEFAULT;
  }

  function get(obj, path) {
    return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), obj);
  }

  async function loadDict(lang) {
    // 相対パス（ローカル/サブディレクトリでも404になりにくい）
    const res = await fetch(`i18n/${lang}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    dict = await res.json();
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("lang", lang);
    if (resolveReady) { resolveReady(); resolveReady = null; }
  }

  function translateElement(el) {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const val = get(dict, key);
    if (val == null) return;

    if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
    else el.textContent = val;

    const attrMap = el.getAttribute("data-i18n-attr"); // 例: "placeholder|form.name_placeholder, title|contact.tooltip"
    if (attrMap) {
      attrMap.split(",").forEach(pair => {
        const [attr, k = key] = pair.split("|").map(s => s.trim());
        const v = get(dict, k);
        if (v != null) el.setAttribute(attr, v);
      });
    }
  }

  function applyI18n(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(translateElement);
  }
  window.applyI18n = applyI18n;

  async function setLang(lang) {
    await loadDict(lang);
    applyI18n(document);
  }

  // 公開API（ボタンから呼ぶ用）
  window.changeLang = async (lang) => {
    const url = new URL(location.href);
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
    await setLang(lang);
  };

  // 初期化：辞書ロード完了後に index 側へ適用
  (async () => {
    const lang = detectLang();
    try { await setLang(lang); }
    catch (e) {
      console.error("[i18n] load failed:", e);
      if (lang !== DEFAULT) await setLang(DEFAULT);
    }
  })();
})();
