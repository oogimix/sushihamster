(() => {
  const b64 = "c3VzaDFoNG1zdDNyQGdtYWlsLmNvbQ=="; // sush1h4mst3r@gmail.com
  const email = atob(b64);

  function mount(selector = "#email-link") {
    const el = document.querySelector(selector);
    if (!el || el.dataset.bound) return false;
    const a = document.createElement("a");
    a.href = `mailto:${email}`;
    a.textContent = email;
    el.appendChild(a);
    el.dataset.bound = "1";
    return true;
  }

  // 1) DOM完成時に試す
  if (!mount()) {
    // 2) SPAで後から出てきたら自動でマウント
    const mo = new MutationObserver(() => {
      if (mount()) mo.disconnect();
    });
    mo.observe(document, { childList: true, subtree: true });
  }

  // 3) 手動でも呼べるように（SPAのページ切替後に明示的に実行可）
  window.initEmail = (selector) => mount(selector);
})();
