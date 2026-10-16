// Dijalankan setelah `vite build`:
//  - dist/version.json : nomor versi build (dipakai untuk memberi tahu ada pembaruan)
//  - dist/sw.js        : service worker agar versi web bisa dipakai offline
// Daftar file & nomor cache dibuat otomatis dari isi folder dist.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIST = path.resolve('dist');
const VERSION = process.env.VITE_APP_VERSION || 'dev';
const REPO = 'https://github.com/Jonathan12345Salim/belajar-jepang';

fs.writeFileSync(
  path.join(DIST, 'version.json'),
  JSON.stringify({
    version: VERSION,
    built: new Date().toISOString(),
    apk: VERSION === 'dev' ? `${REPO}/releases/latest` : `${REPO}/releases/download/v${VERSION}/BelajarJepang-${VERSION}.apk`,
    releases: `${REPO}/releases/latest`,
  }),
);

const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(DIST);

const SKIP = new Set(['sw.js', 'version.json']);
const hash = crypto.createHash('sha256');
const urls = [];
for (const p of files.sort()) {
  const rel = path.relative(DIST, p).split(path.sep).join('/');
  if (SKIP.has(rel)) continue;
  hash.update(rel).update(fs.readFileSync(p));
  urls.push('./' + (rel === 'index.html' ? '' : rel));
}
const cacheId = hash.digest('hex').slice(0, 12);

const sw = `// Dibuat otomatis oleh scripts/gen-sw.mjs. Jangan diedit manual.
// Versi aplikasi: ${VERSION}
const CACHE = 'belajar-jepang-${cacheId}';
const FILES = ${JSON.stringify(urls)};

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
`;
fs.writeFileSync(path.join(DIST, 'sw.js'), sw);
console.log(`sw.js: ${urls.length} file, cache ${cacheId}, versi ${VERSION}`);
