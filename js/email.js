(() => {
  const b64 = "c3VzaDFoNG1zdDNyQGdtYWlsLmNvbQ=="; // sush1h4mst3r@gmail.com
  const email = atob(b64);

  function mount(selector = "#email-link") {
    const el = document.querySelector(selector);
    if (!el || el.dataset.bound) return false;
    const a = document.createElement("a");
    a.href = `mailto:${email}`;
    a.textContent = email;
    a.style.color = "deeppink"; // ← 任意の色指定
    el.appendChild(a);
    el.dataset.bound = "1";
    return true;
  }

  // 1回試す
  if (!mount()) {
    // 出るまで監視
    const mo = new MutationObserver(() => {
      if (mount()) mo.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // SPA用：外部から再呼び出し可能に
  window.initEmail = (selector) => mount(selector);
})();
