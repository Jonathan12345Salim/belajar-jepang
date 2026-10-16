// Dibuat otomatis oleh scripts/gen-sw.mjs. Jangan diedit manual.
// Versi aplikasi: 1.0.4
const CACHE = 'belajar-jepang-1b1f4a100ff0';
const FILES = ["./assets/grammar-B6mPyXlX.json","./assets/index-DZ6DhbGW.js","./assets/index-vvsnG5L_.css","./assets/kana-mn-CJ9c0zIh.json","./assets/kanji-Bb0Zs4eB.json","./assets/stories-BU63lvbE.json","./assets/strokes-kana-BUpcNZdz.json","./assets/strokes-n1-DhOsAIAb.json","./assets/strokes-n2-4gfszsmm.json","./assets/strokes-n3-zbij71St.json","./assets/strokes-n4-e1Q297Dn.json","./assets/strokes-n5-DDCvqUqg.json","./assets/strokes-rad-C-NYtez6.json","./assets/vocab-CFqPUzys.json","./assets/web-A-jIuLtk.js","./assets/web-B4zXxbfb.js","./assets/web-C4O31l4A.js","./assets/web-reBQyKCZ.js","./icon-180.png","./icon-192.png","./icon-512.png","./icon.svg","./","./manifest.webmanifest"];

self.addEventListener('install', (e) => {
  // cache: 'reload' = selalu ambil dari server, bukan dari cache HTTP browser yang mungkin masih versi lama
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('belajar-jepang-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Info versi: selalu dari internet (tidak pernah dari cache).
  if (url.pathname.endsWith('/version.json')) return;
  // Halaman utama: internet dulu (supaya versi baru langsung terpakai), kalau offline pakai cache.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).catch(() => caches.match('./')));
    return;
  }
  // File lain (nama ber-hash): cache dulu, kalau belum ada ambil dari internet.
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
