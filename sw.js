// sushihamster clicker - Service Worker
const CACHE_NAME = 'sushihamster-v13';
const ASSETS = [
  './sushihamster_clicker.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// インストール時：ファイルをキャッシュに保存
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// アクティベート時：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// フェッチ時：キャッシュ優先、なければネットワーク
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => {
        // オフラインでHTMLリクエストが来たらメインページを返す
        if (event.request.mode === 'navigate') {
          return caches.match('./sushihamster_clicker.html');
        }
      });
    })
  );
});
