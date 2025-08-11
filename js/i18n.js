// js/i18n.js (zh を単一辞書で運用する完全版)
(function () {
  const DEFAULT = "ja";
  const SUPPORTED = ["ja", "en", "ko", "zh"]; // ← zh 追加

  let dict = {};
  let currentLang = DEFAULT;

  // 「辞書準備OK」を待てる Promise を公開
  let resolveReady;
  window.__i18nReady = new Promise(res => (resolveReady = res));

  // 入力言語コード正規化:
  // - zh / zh-* はすべて "zh" に寄せる（繁体のみで運用）
  // - "_" を "-" に揃え、小文字化
  function normalizeLang(input) {
    if (!input) return "";
    const raw = String(input).replace("_", "-").toLowerCase().trim();

    // ショートハンド（過去互換）や地域別 zh-* を全部 zh に集約
    const short = { tc: "zh", tw: "zh", hk: "zh", sc: "zh", cn: "zh", sg: "zh" };
    if (short[raw]) return short[raw];
    if (raw.startsWith("zh")) return "zh";
    return raw;
  }

  function detectLang() {
    const p = new URLSearchParams(location.search);
    const url   = normalizeLang(p.get("lang") || "");
    const saved = normalizeLang(localStorage.getItem("lang") || "");
    const nav   = normalizeLang((navigator.language || "").replace("_", "-"));

    // navigator.languages も一応見る（最初にサポート言語があれば採用）
    const navList = Array.isArray(navigator.languages)
      ? navigator.languages.map(l => normalizeLang(l))
      : [];

    const candidates = [
      url,
      saved,
      ...navList,
      nav,
      DEFAULT
    ];

    return candidates.find(l => SUPPORTED.includes(l)) || DEFAULT;
  }

  function get(obj, path) {
    return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), obj);
  }

  async function loadDict(lang) {
    // もし zh-* が来ても zh に寄せる（公開APIからの直接指定対策）
    const useLang = normalizeLang(lang);
    const res = await fetch(`i18n/${useLang}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    dict = await res.json();

    currentLang = useLang;
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
    const useLang = normalizeLang(lang);
    const url = new URL(location.href);
    url.searchParams.set("lang", useLang);
    history.replaceState(null, "", url);
    await setLang(useLang);
  };

  // 現在の言語を取得したいとき用（任意）
  window.getCurrentLang = () => currentLang;

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
