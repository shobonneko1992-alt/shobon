// 座席表アプリ用 Service Worker
// 方針：ネットワーク優先。つながっていれば常に最新を取得し、
//       オフラインの時だけキャッシュ（直前に開いた版）を使う。
// ※ このファイルを変更すると、ブラウザが自動で新しい版に切り替える。
const CACHE_NAME = 'seat-planner-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // 1つ失敗しても全体の登録は失敗させない／HTTPキャッシュを避けて最新を取得
      Promise.all(ASSETS.map(url =>
        fetch(url, { cache: 'reload' }).then(res => res.ok && cache.put(url, res)).catch(() => {})
      ))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // 他サイト（Firebaseなど）のリクエストにはかかわらない
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then(cached => cached || caches.match('./index.html'))
      )
  );
});
