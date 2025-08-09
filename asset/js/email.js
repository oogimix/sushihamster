(() => {
  // "sush1h4mst3r@gmail.com" を Base64化した文字列
  const b64 = "c3VzaDFoNG1zdDNyQGdtYWlsLmNvbQ==";
  const email = atob(b64);

  const a = document.createElement("a");
  a.href = `mailto:${email}`;
  a.textContent = email;

  const target = document.getElementById("email-link");
  if (target) target.appendChild(a);
})();
