// js/i18n.js (zh単一・fr/pt-BR/es追加 対応版)
(function () {
  const DEFAULT = "ja";
  // 追加: fr, pt-br, es
  const SUPPORTED = ["ja", "en", "ko", "zh", "fr", "pt-br", "es"];

  let dict = {};
  let currentLang = DEFAULT;

  // 「辞書準備OK」を待てる Promise を公開
  let resolveReady;
  window.__i18nReady = new Promise(res => (resolveReady = res));

  // 入力言語コード正規化
  // - zh / zh-* は "zh" に集約（サイトでは繁体のみ運用）
  // - pt / pt-* は "pt-br" に寄せる（ブラジル優先）
  // - es / es-* は "es" に寄せる（中立寄り）
  // - fr / fr-* は "fr"
  function normalizeLang(input) {
    if (!input) return "";
    const raw = String(input).replace("_", "-").toLowerCase().trim();

    // 過去ショートハンドや地域別 → 代表コードへ
    const short = {
      // Chinese
      tc: "zh", tw: "zh", hk: "zh", sc: "zh", cn: "zh", sg: "zh",
      // Portuguese
      br: "pt-br", "pt-br": "pt-br", pt: "pt-br",
      // Spanish
      la: "es", mx: "es", ar: "es", cl: "es", es: "es",
      // French
      fr: "fr", ca: "fr" // fr-CAは fr に寄せる（必要なら分岐可）
    };
    if (short[raw]) return short[raw];

    if (raw.startsWith("zh")) return "zh";
    if (raw.startsWith("pt")) return "pt-br";
    if (raw.startsWith("es")) return "es";
    if (raw.startsWith("fr")) return "fr";

    return raw;
  }

  function detectLang() {
    const p = new URLSearchParams(location.search);
    const url   = normalizeLang(p.get("lang") || "");
    const saved = normalizeLang(localStorage.getItem("lang") || "");
    const nav   = normalizeLang((navigator.language || "").replace("_", "-"));
    const navList = Array.isArray(navigator.languages)
      ? navigator.languages.map(l => normalizeLang(l))
      : [];

    const candidates = [url, saved, ...navList, nav, DEFAULT];
    return candidates.find(l => SUPPORTED.includes(l)) || DEFAULT;
  }

  function get(obj, path) {
    return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), obj);
  }

  async function loadDict(lang) {
    const useLang = normalizeLang(lang);
    const res = await fetch(`i18n/${useLang}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    dict = await res.json();

    currentLang = useLang;
    // lang属性は見た目のコードをそのまま使う（pt-br 等）
    document.documentElement.setAttribute("lang", currentLang);
    localStorage.setItem("lang", currentLang);

    if (resolveReady) { resolveReady(); resolveReady = null; }
  }

  function translateElement(el) {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const val = get(dict, key);
    if (val == null) return;

    if (el.hasAttribute("data-i18n-html")) el.innerHTML = val;
    else el.textContent = val;

    const attrMap = el.getAttribute("data-i18n-attr");
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
    // data-i18n なしで data-i18n-attr だけ持つ要素（input placeholder 等）も処理
    root.querySelectorAll("[data-i18n-attr]:not([data-i18n])").forEach(el => {
      const attrMap = el.getAttribute("data-i18n-attr");
      if (!attrMap) return;
      attrMap.split(",").forEach(pair => {
        const [attr, k] = pair.split("|").map(s => s.trim());
        if (!k) return;
        const v = get(dict, k);
        if (v != null) el.setAttribute(attr, v);
      });
    });
  }
  window.applyI18n = applyI18n;
  window.i18nGet = key => get(dict, key) ?? key;

  async function setLang(lang) {
    await loadDict(lang);
    applyI18n(document);
  }

  // 公開API（ボタンから呼ぶ用）
  window.changeLang = async (lang) => {
    const useLang = normalizeLang(lang);
    const url = new URL(location.href);
    url.searchParams.set("lang", useLang);
    history.replaceState(null, "", url);
    await setLang(useLang);
  };

  // 現在の言語を取得
  window.getCurrentLang = () => currentLang;

  // 初期化
  (async () => {
    const lang = detectLang();
    try { await setLang(lang); }
    catch (e) {
      console.error("[i18n] load failed:", e);
      if (lang !== DEFAULT) await setLang(DEFAULT);
    }
  })();
})();
