import type { DB } from './data';
import { KANA_GROUPS } from './kana';
import type { Progress } from './store';
import type { ItemType, Level, Vocab } from './types';
import { LEVELS } from './types';
import { chunk } from './util';
import { hasKanji, kanjiIn } from './text';

export interface Lesson {
  id: string;
  stage: string;
  kind: 'info' | 'items' | 'exam' | 'story';
  type?: ItemType;
  title: string;
  sub?: string;
  items: string[];
  ref?: string;
  index: number; // posisi global
}

export interface Stage {
  id: string;
  title: string;
  sub: string;
  lessons: Lesson[];
}

export const CAT_NAME: Record<string, string> = {
  sapa: 'Salam & ungkapan',
  tanya: 'Kata tanya & penunjuk',
  angka: 'Angka & satuan',
  org: 'Orang & keluarga',
  waktu: 'Waktu & kalender',
  kk: 'Kata kerja',
  ksi: 'Kata sifat -i',
  ksna: 'Kata sifat -na',
  makan: 'Makanan & minuman',
  kota: 'Tempat & kota',
  arah: 'Arah & posisi',
  rumah: 'Rumah & barang',
  sekolah: 'Sekolah & pekerjaan',
  trans: 'Transportasi',
  tubuh: 'Tubuh & kesehatan',
  alam: 'Alam, cuaca & hewan',
  baju: 'Pakaian',
  hobi: 'Hobi & kegiatan',
  warna: 'Warna',
  kket: 'Kata keterangan & sambung',
  akhiran: 'Awalan & akhiran',
  lain: 'Lain-lain',
};
const CAT_ORDER = Object.keys(CAT_NAME);
const CAT_FIRST = ['sapa', 'tanya', 'angka', 'org'];

let cache: { db: DB; stages: Stage[]; lessons: Lesson[] } | null = null;

export function getPath(db: DB): { stages: Stage[]; lessons: Lesson[] } {
  if (cache && cache.db === db) return cache;
  const stages = buildStages(db);
  const lessons: Lesson[] = [];
  for (const s of stages) for (const l of s.lessons) {
    l.index = lessons.length;
    lessons.push(l);
  }
  cache = { db, stages, lessons };
  return cache;
}

function L(stage: string, kind: Lesson['kind'], id: string, title: string, items: string[] = [], extra: Partial<Lesson> = {}): Lesson {
  return { id, stage, kind, title, items, index: 0, ...extra };
}

function kanaStage(sc: 'h' | 'k'): Stage {
  const st = sc === 'h' ? 'hira' : 'kata';
  const name = sc === 'h' ? 'Hiragana' : 'Katakana';
  const g = (ids: string[]) => {
    const groups = ids.map((x) => KANA_GROUPS.find((k) => k.id === `${sc}-${x}`)!).filter(Boolean);
    const chars = groups.flatMap((x) => x.chars);
    return L(st, 'items', `${st}-${ids.join('')}`, `${name}: ${chars.slice(0, 5).join(' ')}${chars.length > 5 ? ' …' : ''}`, chars.map((c) => `${sc}:${c}`), {
      type: sc,
      sub: groups.map((x) => x.title).join(' · '),
    });
  };
  const info = (id: string, title: string) => L(st, 'info', `info-${id}`, title, [], { ref: id });
  const lessons: Lesson[] =
    sc === 'h'
      ? [
          info('welcome', 'Selamat datang & cara belajar'),
          g(['a']), g(['k']), g(['s']), g(['t']), g(['n']), g(['h']), g(['m']), g(['y', 'w']), g(['r']),
          info('dakuten', 'Tenten & maru'),
          g(['g', 'z']), g(['d', 'b']), g(['p']),
          info('youon', 'Bunyi gabungan (ゃ ゅ ょ)'),
          g(['ky', 'sh', 'ch', 'ny']), g(['hy', 'my', 'ry']), g(['gy', 'j', 'by', 'py']),
          info('sokuon', 'Tsu kecil & vokal panjang'),
          info('particles', 'Partikel は, へ, を'),
          L(st, 'exam', 'exam-hira', 'Ujian Hiragana', [], { ref: 'hira' }),
        ]
      : [
          info('katakana', 'Mengenal katakana'),
          g(['a']), g(['k']), g(['s']), g(['t']), g(['n']), g(['h']), g(['m']), g(['y', 'w']), g(['r']),
          g(['g', 'z']), g(['d', 'b']), g(['p']),
          g(['ky', 'sh', 'ch', 'ny']), g(['hy', 'my', 'ry']), g(['gy', 'j', 'by', 'py']),
          info('kata-ext', 'Bunyi asing'),
          g(['x']),
          L(st, 'exam', 'exam-kata', 'Ujian Katakana', [], { ref: 'kata' }),
        ];
  return {
    id: st,
    title: name,
    sub: sc === 'h' ? 'Huruf dasar pertama. Wajib dikuasai dulu!' : 'Huruf untuk kata serapan asing.',
    lessons,
  };
}

/** Urutan kosakata berdasarkan kanji yang sudah dipelajari (untuk level tanpa kategori). */
function orderByKanji(words: Vocab[], kanjiPos: Map<string, number>, lvStart: number, lvEnd: number): Vocab[] {
  const kanaOnly = words.filter((v) => !hasKanji(v.w));
  const withK = words.filter((v) => hasKanji(v.w));
  const pos = new Map<Vocab, number>();
  for (const v of withK) {
    const ps = kanjiIn(v.w).map((c) => kanjiPos.get(c) ?? 1e6);
    pos.set(v, Math.max(lvStart, ...ps));
  }
  kanaOnly.forEach((v, i) => pos.set(v, lvStart + ((i + 0.5) / kanaOnly.length) * (lvEnd - lvStart)));
  return words.slice().sort((a, b) => pos.get(a)! - pos.get(b)!);
}

function interleave(lists: Lesson[][]): Lesson[] {
  const tagged: { k: number; p: number; l: Lesson }[] = [];
  lists.forEach((ls, p) => ls.forEach((l, i) => tagged.push({ k: (i + 0.5) / ls.length, p, l })));
  return tagged.sort((a, b) => a.k - b.k || a.p - b.p).map((t) => t.l);
}

function levelStage(db: DB, lv: Level, kanjiPos: Map<string, number>, posRange: [number, number]): Stage {
  const st = `n${lv}`;
  const kanji = db.kanji.filter((k) => k.lv === lv);
  // --- kanji
  const groups = db.kanjiGroups[String(lv)];
  const size = lv >= 4 ? 5 : lv === 3 ? 6 : 8;
  const kChunks: string[][] = groups?.length ? groups.map((g) => Array.from(g)) : chunk(kanji.map((k) => k.c), size);
  const kL = kChunks.map((cs, i) =>
    L(st, 'items', `${st}-k${i + 1}`, `Kanji: ${cs.join(' ')}`, cs.map((c) => `j:${c}`), { type: 'j', sub: `Kanji ${st.toUpperCase()} · bagian ${i + 1}` }),
  );
  // --- kosakata
  const words = db.vocab.filter((v) => v.lv === lv);
  let vL: Lesson[] = [];
  if (words.some((v) => v.cat)) {
    const byCat = new Map<string, Vocab[]>();
    for (const v of words) {
      const c = v.cat && CAT_NAME[v.cat] ? v.cat : 'lain';
      if (!byCat.has(c)) byCat.set(c, []);
      byCat.get(c)!.push(v);
    }
    const entries: { k: number; p: number; l: Lesson }[] = [];
    for (const [cat, list] of byCat) {
      list.sort((a, b) => (a.o ?? 1e6) - (b.o ?? 1e6));
      const n = Math.ceil(list.length / 10);
      const per = Math.ceil(list.length / n);
      const parts = chunk(list, per);
      parts.forEach((part, i) => {
        const first = CAT_FIRST.indexOf(cat);
        const k = i === 0 && first >= 0 ? -1 + first * 0.01 : (i + 0.5) / parts.length;
        entries.push({
          k,
          p: CAT_ORDER.indexOf(cat),
          l: L(st, 'items', `${st}-v-${cat}${i + 1}`, `Kosakata: ${CAT_NAME[cat]}${parts.length > 1 ? ` (${i + 1})` : ''}`, part.map((v) => `v:${v.key}`), {
            type: 'v',
            sub: part.slice(0, 4).map((v) => v.w).join('、') + (part.length > 4 ? ' …' : ''),
          }),
        });
      });
    }
    vL = entries.sort((a, b) => a.k - b.k || a.p - b.p).map((e) => e.l);
  } else {
    const ordered = orderByKanji(words, kanjiPos, posRange[0], posRange[1]);
    vL = chunk(ordered, 12).map((part, i) =>
      L(st, 'items', `${st}-v${i + 1}`, `Kosakata ${st.toUpperCase()} (${i + 1})`, part.map((v) => `v:${v.key}`), {
        type: 'v',
        sub: part.slice(0, 4).map((v) => v.w).join('、') + ' …',
      }),
    );
  }
  // --- tata bahasa (2 pola per pelajaran)
  const gram = db.grammar.filter((g) => g.lv === lv);
  const gL = chunk(gram, 2).map((gs, i) =>
    L(st, 'items', `${st}-g${i + 1}`, `Tata bahasa: ${gs.map((g) => g.t).join(' · ')}`, gs.map((g) => `g:${g.id}`), {
      type: 'g',
      sub: gs.map((g) => g.m).join(' · '),
    }),
  );
  // --- cerita
  const sL = db.stories
    .filter((s) => s.lv === lv)
    .map((s) => L(st, 'story', `story-${s.id}`, `Baca cerita: ${s.ti}`, [], { ref: s.id, sub: s.t }));

  const main = interleave([gL, kL, vL]);
  // sisipkan cerita merata
  const out: Lesson[] = [];
  const step = main.length / (sL.length + 1);
  let si = 0;
  main.forEach((l, i) => {
    out.push(l);
    while (si < sL.length && i + 1 >= Math.round(step * (si + 1))) out.push(sL[si++]);
  });
  while (si < sL.length) out.push(sL[si++]);
  const lessons = [
    ...(lv === 5 ? [L(st, 'info', 'info-kanji', 'Mengenal kanji', [], { ref: 'kanji' })] : []),
    ...out,
    L(st, 'exam', `exam-${st}`, `Ujian ${st.toUpperCase()}`, [], { ref: st }),
  ];
  const sub: Record<Level, string> = {
    5: 'Dasar: salam, angka, kalimat sederhana sehari-hari.',
    4: 'Percakapan sehari-hari yang lebih luas.',
    3: 'Menengah: bacaan & percakapan umum.',
    2: 'Menengah atas: berita & bacaan umum.',
    1: 'Mahir: bacaan kompleks.',
  };
  return { id: st, title: `JLPT N${lv}`, sub: `${sub[lv]} ${kanji.length} kanji · ${words.length} kata${gram.length ? ` · ${gram.length} pola` : ''}`, lessons };
}

function buildStages(db: DB): Stage[] {
  // posisi global kanji (dipakai untuk mengurutkan kosakata N4 ke atas)
  const kanjiPos = new Map<string, number>();
  const ranges = new Map<Level, [number, number]>();
  let i = 0;
  for (const lv of LEVELS) {
    const start = i;
    const groups = db.kanjiGroups[String(lv)];
    const list = groups?.length ? groups.join('').split('') : db.kanji.filter((k) => k.lv === lv).map((k) => k.c);
    for (const c of list) kanjiPos.set(c, i++);
    ranges.set(lv, [start, i]);
  }
  return [kanaStage('h'), kanaStage('k'), ...LEVELS.map((lv) => levelStage(db, lv, kanjiPos, ranges.get(lv)!))];
}

export function lessonDone(l: Lesson, p: Progress): boolean {
  if (l.kind === 'items') return l.items.length > 0 && l.items.every((id) => !!p.cards[id]);
  return !!p.done[l.id];
}

/** Pelajaran pertama yang belum selesai. */
export function nextLesson(lessons: Lesson[], p: Progress): Lesson | null {
  return lessons.find((l) => !lessonDone(l, p)) ?? null;
}

export function lessonUnlocked(l: Lesson, lessons: Lesson[], p: Progress): boolean {
  if (p.settings.unlockAll || l.index === 0) return true;
  if (lessonDone(l, p)) return true;
  return lessonDone(lessons[l.index - 1], p);
}
