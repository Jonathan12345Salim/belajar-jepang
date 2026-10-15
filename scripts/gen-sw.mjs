// Membuat dist/sw.js (service worker) agar versi web bisa dipakai offline.
// Daftar file & nomor versi dibuat otomatis dari isi folder dist setelah build.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIST = path.resolve('dist');
const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(DIST);

const hash = crypto.createHash('sha256');
const urls = [];
for (const p of files.sort()) {
  const rel = path.relative(DIST, p).split(path.sep).join('/');
  if (rel === 'sw.js') continue;
  hash.update(rel).update(fs.readFileSync(p));
  urls.push('./' + (rel === 'index.html' ? '' : rel));
}
const version = hash.digest('hex').slice(0, 12);

const sw = `// Dibuat otomatis oleh scripts/gen-sw.mjs. Jangan diedit manual.
const CACHE = 'belajar-jepang-${version}';
const FILES = ${JSON.stringify(urls)};

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
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
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Halaman utama: coba internet dulu supaya versi baru cepat masuk, kalau offline pakai cache.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
`;
fs.writeFileSync(path.join(DIST, 'sw.js'), sw);
console.log(`sw.js: ${urls.length} file, versi ${version}`);
