export function shuffle<T>(a: readonly T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

export const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

/** Ambil n elemen acak yang berbeda dari pool yang lolos filter. */
export function sample<T>(pool: readonly T[], n: number, ok: (x: T) => boolean = () => true): T[] {
  const res: T[] = [];
  if (!pool.length || n <= 0) return res;
  const seen = new Set<number>();
  const maxTries = Math.min(pool.length * 3, 4000);
  for (let t = 0; t < maxTries && res.length < n; t++) {
    const i = Math.floor(Math.random() * pool.length);
    if (seen.has(i)) continue;
    seen.add(i);
    if (ok(pool[i])) res.push(pool[i]);
  }
  // cadangan linear bila pengambilan acak belum cukup
  for (let i = 0; i < pool.length && res.length < n; i++) {
    if (!seen.has(i) && ok(pool[i])) res.push(pool[i]);
  }
  return res;
}

export function chunk<T>(a: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

export function dayKey(t = Date.now()): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtWait(ms: number): string {
  if (ms <= 0) return 'sekarang';
  const m = Math.round(ms / 60000);
  if (m < 60) return `${Math.max(1, m)} menit lagi`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lagi`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} hari lagi`;
  return `${Math.round(d / 30)} bulan lagi`;
}

export const cls = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');
