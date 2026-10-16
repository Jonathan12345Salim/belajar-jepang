import { db } from './data';
import { KANA, KANA_ALT } from './kana';
import {
  type AnyItem,
  getItem,
  idGrammar,
  idKana,
  idKanji,
  idVocab,
  idRadical,
  shortMeaning,
  vocabForKanji,
  vocabRuby,
  vocabRomaji,
  fullMeaning,
  kunDisplay,
  cleanKun,
} from './items';
import { getState, type Progress } from './store';
import { cmpKana, finalKana, hasKanji, normKana, plain, romaji, sentPlain, toHiragana, tokText } from './text';
import type { Grammar, Kanji, Level, Vocab } from './types';
import { pick, sample, shuffle } from './util';

export type Mode =
  | 'kana-ro'
  | 'kana-type'
  | 'kana-char'
  | 'kana-listen'
  | 'kanji-mean'
  | 'kanji-char'
  | 'kanji-read'
  | 'vocab-mean'
  | 'vocab-word'
  | 'vocab-read'
  | 'vocab-type'
  | 'vocab-listen'
  | 'vocab-dict'
  | 'gram-fill'
  | 'gram-mean'
  | 'rad-mean';

export type Filter = 'any' | 'choice' | 'type' | 'listen' | 'dict';

export interface Choice {
  label: string;
  jp?: boolean;
}

export interface Question {
  key: string;
  id: string;
  mode: Mode;
  kind: 'choice' | 'type';
  ask: string;
  big?: string;
  bigJp?: boolean;
  text?: string;
  sentence?: { toks: string[]; blank: number; tr: string };
  audio?: string;
  listen?: boolean;
  choices?: Choice[];
  correct: number;
  accept?: (input: string) => boolean;
  inputKana?: boolean;
  placeholder?: string;
  answer: string;
  answerJp?: boolean;
  note: string[];
  section?: string;
}

const TYPING: Mode[] = ['kana-type', 'vocab-type', 'vocab-dict'];
const LISTEN: Mode[] = ['kana-listen', 'vocab-listen', 'vocab-dict'];

export function modesFor(id: string): Mode[] {
  switch (id[0]) {
    case 'h':
    case 'k':
      return ['kana-ro', 'kana-type', 'kana-char', 'kana-listen'];
    case 'j':
      return ['kanji-mean', 'kanji-char', 'kanji-read'];
    case 'v':
      return ['vocab-mean', 'vocab-word', 'vocab-read', 'vocab-type', 'vocab-listen', 'vocab-dict'];
    case 'g':
      return ['gram-fill', 'gram-mean'];
    case 'r':
      return ['rad-mean'];
  }
  return [];
}

function filterModes(modes: Mode[], f: Filter): Mode[] {
  const mode = getState().settings.answerMode;
  let m = modes;
  if (f === 'choice') m = m.filter((x) => !TYPING.includes(x));
  else if (f === 'type') m = m.filter((x) => TYPING.includes(x) && x !== 'vocab-dict');
  else if (f === 'listen') m = m.filter((x) => LISTEN.includes(x) && !TYPING.includes(x));
  else if (f === 'dict') m = m.filter((x) => x === 'vocab-dict' || x === 'kana-listen');
  else if (mode === 'choice') m = m.filter((x) => !TYPING.includes(x));
  else if (mode === 'type') {
    const t = m.filter((x) => TYPING.includes(x));
    if (t.length) m = [...t, ...m.filter((x) => x === 'kanji-mean' || x === 'gram-fill')];
  }
  return m;
}

let qCounter = 0;

/** Buat satu soal untuk item SRS. */
export function makeQuestion(id: string, filter: Filter = 'any', forced?: Mode): Question | null {
  const it = getItem(id);
  if (!it) return null;
  let modes = forced ? [forced] : filterModes(modesFor(id), filter);
  if (!modes.length) modes = filter === 'any' ? modesFor(id) : [];
  const tried = new Set<Mode>();
  while (modes.length) {
    const m = pick(modes);
    const q = build(it, id, m);
    if (q) return { ...q, key: `${id}#${m}#${qCounter++}` };
    tried.add(m);
    modes = modes.filter((x) => !tried.has(x));
  }
  return null;
}

type QDraft = Omit<Question, 'key'>;

function choiceSet<T>(correct: T, pool: readonly T[], label: (x: T) => string, n = 3): { items: T[]; correct: number } {
  const seen = new Set([label(correct)]);
  const ds = sample(pool, n, (x) => {
    const l = label(x);
    if (!l || seen.has(l)) return false;
    seen.add(l);
    return true;
  });
  const items = shuffle([correct, ...ds]);
  return { items, correct: items.indexOf(correct) };
}

const lang = () => getState().settings.lang;
const showFuri = () => getState().settings.furigana;

function kanaPool(sc: 'h' | 'k', len: number) {
  const p = KANA.filter((k) => k.sc === sc && k.c.length === len);
  return p.length > 4 ? p : KANA.filter((k) => k.sc === sc);
}

function levelPool<T extends { lv: Level }>(all: readonly T[], lv: Level, min = 8): T[] {
  const p = all.filter((x) => x.lv === lv);
  return p.length >= min ? p : (all as T[]);
}

function vocabPool(v: Vocab): Vocab[] {
  const lvPool = levelPool(db().vocab, v.lv);
  if (v.cat && Math.random() < 0.5) {
    const c = lvPool.filter((x) => x.cat === v.cat);
    if (c.length >= 6) return c;
  }
  return lvPool;
}

function kanaNote(it: AnyItem): string[] {
  if (it.type !== 'h' && it.type !== 'k') return [];
  return [`${it.kana.c} = ${it.kana.ro}`, ...(it.kana.mn ? [it.kana.mn] : [])];
}

function vocabNote(v: Vocab): string[] {
  const [m1, m2] = fullMeaning({ type: 'v', vocab: v }, lang());
  return [`${v.r} · ${vocabRomaji(v)}`, m1, ...(m2 ? [m2] : [])];
}

function kanjiNote(k: Kanji): string[] {
  const [m1, m2] = fullMeaning({ type: 'j', kanji: k }, lang());
  const rd = [k.on.slice(0, 3).join('、'), k.kun.slice(0, 3).map(kunDisplay).join('、')].filter(Boolean).join(' / ');
  return [m1, ...(m2 ? [m2] : []), ...(rd ? [`Bacaan: ${rd}`] : [])];
}

function kanaAccept(c: string, ro: string) {
  return (input: string) => {
    const s = input.trim().toLowerCase().replace(/\s/g, '');
    if (!s) return false;
    if (s === ro || KANA_ALT[c]?.includes(s)) return true;
    if (normKana(toHiragana(s)) === normKana(c)) return true;
    return false;
  };
}

function vocabAccept(v: Vocab) {
  const targets = [v.r, ...(v.alt || []).filter((a) => !hasKanji(a))].map(cmpKana);
  return (input: string) => {
    const s = cmpKana(finalKana(input.trim()));
    return !!s && targets.includes(s);
  };
}

function build(it: AnyItem, id: string, m: Mode): QDraft | null {
  const base = { id, mode: m, note: [] as string[] };
  switch (m) {
    // ------------------------------------------------ kana
    case 'kana-ro': {
      if (it.type !== 'h' && it.type !== 'k') return null;
      const k = it.kana;
      const cs = choiceSet(k, kanaPool(k.sc, k.c.length), (x) => x.ro);
      return {
        ...base,
        kind: 'choice',
        ask: 'Bagaimana cara membaca huruf ini?',
        big: k.c,
        bigJp: true,
        choices: cs.items.map((x) => ({ label: x.ro })),
        correct: cs.correct,
        answer: k.ro,
        audio: k.c,
        note: kanaNote(it),
      };
    }
    case 'kana-type': {
      if (it.type !== 'h' && it.type !== 'k') return null;
      const k = it.kana;
      return {
        ...base,
        kind: 'type',
        ask: 'Ketik cara bacanya (romaji)',
        big: k.c,
        bigJp: true,
        correct: 0,
        accept: kanaAccept(k.c, k.ro),
        placeholder: 'contoh: ka',
        answer: k.ro,
        audio: k.c,
        note: kanaNote(it),
      };
    }
    case 'kana-char':
    case 'kana-listen': {
      if (it.type !== 'h' && it.type !== 'k') return null;
      const k = it.kana;
      const cs = choiceSet(k, kanaPool(k.sc, k.c.length), (x) => x.ro + '|' + x.c);
      const listen = m === 'kana-listen';
      return {
        ...base,
        kind: 'choice',
        ask: listen ? 'Dengarkan, lalu pilih hurufnya' : 'Pilih huruf untuk bunyi ini',
        text: listen ? undefined : k.ro,
        audio: k.c,
        listen,
        choices: cs.items.map((x) => ({ label: x.c, jp: true })),
        correct: cs.correct,
        answer: k.c,
        answerJp: true,
        note: kanaNote(it),
      };
    }
    // ------------------------------------------------ kanji
    case 'kanji-mean': {
      if (it.type !== 'j') return null;
      const k = it.kanji;
      const l = lang();
      const cs = choiceSet(k, levelPool(db().kanji, k.lv), (x) => shortMeaning({ type: 'j', kanji: x }, l));
      return {
        ...base,
        kind: 'choice',
        ask: 'Apa arti kanji ini?',
        big: k.c,
        bigJp: true,
        choices: cs.items.map((x) => ({ label: shortMeaning({ type: 'j', kanji: x }, l) })),
        correct: cs.correct,
        answer: shortMeaning(it, l),
        note: kanjiNote(k),
      };
    }
    case 'kanji-char': {
      if (it.type !== 'j') return null;
      const k = it.kanji;
      const cs = choiceSet(k, levelPool(db().kanji, k.lv), (x) => x.c);
      return {
        ...base,
        kind: 'choice',
        ask: 'Kanji mana yang artinya:',
        text: shortMeaning(it, lang()),
        choices: cs.items.map((x) => ({ label: x.c, jp: true })),
        correct: cs.correct,
        answer: k.c,
        answerJp: true,
        note: kanjiNote(k),
      };
    }
    case 'kanji-read': {
      if (it.type !== 'j') return null;
      const k = it.kanji;
      const ex = vocabForKanji(k.c, 8).filter((v) => v.lv >= k.lv && !v.w.includes('～'));
      if (ex.length) {
        const v = pick(ex);
        const pool = levelPool(db().vocab, v.lv).filter((x) => hasKanji(x.w) && Math.abs(x.r.length - v.r.length) <= 1);
        const cs = choiceSet(v, pool, (x) => normKana(x.r));
        return {
          ...base,
          kind: 'choice',
          ask: `Bagaimana membaca kata ini? (kanji ${k.c})`,
          big: v.w,
          bigJp: true,
          text: shortMeaning({ type: 'v', vocab: v }, lang()),
          choices: cs.items.map((x) => ({ label: x.r, jp: true })),
          correct: cs.correct,
          answer: vocabRuby(v),
          answerJp: true,
          audio: v.r,
          note: [...vocabNote(v), `Kanji ${k.c}: ${shortMeaning(it, lang())}`],
        };
      }
      const reads = [...k.on, ...k.kun.map(cleanKun)];
      if (!reads.length) return null;
      const r = reads[0];
      const others = db()
        .kanji.filter((x) => x.c !== k.c && x.lv === k.lv)
        .map((x) => x.on[0] || (x.kun[0] && cleanKun(x.kun[0])))
        .filter((x): x is string => !!x && !reads.includes(x));
      const cs = choiceSet(r, others, (x) => x);
      return {
        ...base,
        kind: 'choice',
        ask: 'Mana bacaan kanji ini?',
        big: k.c,
        bigJp: true,
        choices: cs.items.map((x) => ({ label: x, jp: true })),
        correct: cs.correct,
        answer: r,
        answerJp: true,
        note: kanjiNote(k),
      };
    }
    // ------------------------------------------------ kosakata
    case 'vocab-mean':
    case 'vocab-listen': {
      if (it.type !== 'v') return null;
      const v = it.vocab;
      const l = lang();
      const listen = m === 'vocab-listen';
      const cs = choiceSet(v, vocabPool(v), (x) => shortMeaning({ type: 'v', vocab: x }, l));
      return {
        ...base,
        kind: 'choice',
        ask: listen ? 'Dengarkan. Apa artinya?' : 'Apa arti kata ini?',
        big: listen ? undefined : showFuri() ? vocabRuby(v) : v.w,
        bigJp: true,
        audio: v.r,
        listen,
        choices: cs.items.map((x) => ({ label: shortMeaning({ type: 'v', vocab: x }, l) })),
        correct: cs.correct,
        answer: vocabRuby(v),
        answerJp: true,
        note: vocabNote(v),
      };
    }
    case 'vocab-word': {
      if (it.type !== 'v') return null;
      const v = it.vocab;
      const cs = choiceSet(v, vocabPool(v), (x) => x.w);
      return {
        ...base,
        kind: 'choice',
        ask: 'Pilih kata Jepang yang artinya:',
        text: shortMeaning(it, lang()),
        choices: cs.items.map((x) => ({ label: showFuri() ? vocabRuby(x) : x.w, jp: true })),
        correct: cs.correct,
        answer: vocabRuby(v),
        answerJp: true,
        audio: v.r,
        note: vocabNote(v),
      };
    }
    case 'vocab-read': {
      if (it.type !== 'v') return null;
      const v = it.vocab;
      if (!hasKanji(v.w)) return null;
      const pool = levelPool(db().vocab, v.lv).filter((x) => Math.abs(x.r.length - v.r.length) <= 1);
      const cs = choiceSet(v, pool, (x) => normKana(x.r));
      return {
        ...base,
        kind: 'choice',
        ask: 'Bagaimana membaca kata ini?',
        big: v.w,
        bigJp: true,
        text: shortMeaning(it, lang()),
        choices: cs.items.map((x) => ({ label: x.r, jp: true })),
        correct: cs.correct,
        answer: vocabRuby(v),
        answerJp: true,
        audio: v.r,
        note: vocabNote(v),
      };
    }
    case 'vocab-type': {
      if (it.type !== 'v') return null;
      const v = it.vocab;
      const k = hasKanji(v.w);
      return {
        ...base,
        kind: 'type',
        ask: k ? 'Ketik cara bacanya (romaji otomatis jadi kana)' : 'Ketik kata Jepang untuk arti ini',
        big: k ? v.w : undefined,
        bigJp: true,
        text: k ? shortMeaning(it, lang()) : `${shortMeaning(it, lang())}${/[ァ-ヶ]/.test(v.w) ? ' (katakana)' : ''}`,
        correct: 0,
        accept: vocabAccept(v),
        inputKana: true,
        placeholder: 'ketik romaji, mis. taberu',
        answer: vocabRuby(v),
        answerJp: true,
        audio: v.r,
        note: vocabNote(v),
      };
    }
    case 'vocab-dict': {
      if (it.type !== 'v') return null;
      const v = it.vocab;
      return {
        ...base,
        kind: 'type',
        ask: 'Dengarkan, lalu ketik kata yang kamu dengar',
        audio: v.r,
        listen: true,
        correct: 0,
        accept: vocabAccept(v),
        inputKana: true,
        placeholder: 'ketik romaji, mis. sakana',
        answer: vocabRuby(v),
        answerJp: true,
        note: vocabNote(v),
      };
    }
    // ------------------------------------------------ tata bahasa
    case 'gram-fill': {
      if (it.type !== 'g') return null;
      return gramFill(it.grammar, base);
    }
    case 'gram-mean': {
      if (it.type !== 'g') return null;
      const g = it.grammar;
      const cs = choiceSet(g, levelPool(db().grammar, g.lv, 4), (x) => x.m);
      return {
        ...base,
        kind: 'choice',
        ask: 'Apa arti / fungsi pola ini?',
        big: g.t,
        bigJp: true,
        choices: cs.items.map((x) => ({ label: x.m })),
        correct: cs.correct,
        answer: g.m,
        note: [g.p, ...g.x.slice(0, 1)],
      };
    }
    case 'rad-mean': {
      if (it.type !== 'r') return null;
      const r = it.radical;
      const l = lang();
      const cs = choiceSet(r, db().radicals, (x) => (l === 'en' ? x.en : x.id));
      return {
        ...base,
        kind: 'choice',
        ask: 'Apa arti radikal (komponen) ini?',
        big: r.c,
        bigJp: true,
        choices: cs.items.map((x) => ({ label: l === 'en' ? x.en : x.id })),
        correct: cs.correct,
        answer: l === 'en' ? r.en : r.id,
        note: [`Contoh: ${r.ex.split('').join(' ')}`],
      };
    }
  }
  return null;
}

/** Soal isi-kosong dari contoh kalimat tata bahasa. */
export function gramFill(g: Grammar, base: { id: string; mode: Mode; note: string[] }, exIndex?: number): QDraft | null {
  const exs = g.ex.map((e, i) => ({ e, i })).filter((x) => x.e.k !== undefined);
  if (!exs.length) return null;
  const { e } = exIndex !== undefined ? exs.find((x) => x.i === exIndex) || pick(exs) : pick(exs);
  const k = e.k!;
  const right = tokText(e.t[k]);
  const wrong = (e.o?.length ? e.o : g.o).filter((o) => plain(o) !== plain(right));
  const opts = shuffle([right, ...shuffle(wrong).slice(0, 3)]);
  return {
    ...base,
    kind: 'choice',
    ask: 'Lengkapi kalimat ini',
    sentence: { toks: e.t, blank: k, tr: e.id },
    choices: opts.map((o) => ({ label: o, jp: true })),
    correct: opts.indexOf(right),
    answer: e.t.map(tokText).join(''),
    answerJp: true,
    audio: sentPlain(e.t),
    note: [e.id, `Pola: ${g.t} — ${g.m}`],
  };
}

// ---------------------------------------------------------------- kumpulan item
export const POOLS: { id: string; label: string; types: string }[] = [
  { id: 'learned', label: 'Semua yang sudah dipelajari', types: 'hkjvgr' },
  { id: 'hard', label: 'Item sulit (sering salah)', types: 'hkjvgr' },
  { id: 'hira', label: 'Hiragana (semua)', types: 'h' },
  { id: 'kata', label: 'Katakana (semua)', types: 'k' },
  ...([5, 4, 3, 2, 1] as const).flatMap((lv) => [
    { id: `kanji-n${lv}`, label: `Kanji N${lv}`, types: 'j' },
    { id: `vocab-n${lv}`, label: `Kosakata N${lv}`, types: 'v' },
  ]),
  { id: 'gram-n5', label: 'Tata bahasa N5', types: 'g' },
  { id: 'gram-n4', label: 'Tata bahasa N4', types: 'g' },
  { id: 'rad', label: 'Radikal', types: 'r' },
];

export function poolIds(pool: string, p: Progress, types = 'hkjvgr'): string[] {
  const d = db();
  let ids: string[];
  if (pool === 'learned') ids = Object.keys(p.cards);
  else if (pool === 'hard')
    ids = Object.entries(p.cards)
      .filter(([, c]) => c.ng > 0)
      .sort((a, b) => b[1].ng / (b[1].ok + b[1].ng) - a[1].ng / (a[1].ok + a[1].ng) || b[1].ng - a[1].ng)
      .slice(0, 60)
      .map(([id]) => id);
  else if (pool === 'hira' || pool === 'kata') {
    const sc = pool === 'hira' ? 'h' : 'k';
    ids = KANA.filter((k) => k.sc === sc).map(idKana);
  } else if (pool === 'rad') ids = d.radicals.map(idRadical);
  else {
    const [kind, lvs] = pool.split('-');
    const lv = Number(lvs?.slice(1)) as Level;
    if (kind === 'kanji') ids = d.kanji.filter((k) => k.lv === lv).map(idKanji);
    else if (kind === 'vocab') ids = d.vocab.filter((v) => v.lv === lv).map(idVocab);
    else if (kind === 'gram') ids = d.grammar.filter((g) => g.lv === lv).map(idGrammar);
    else ids = [];
  }
  return ids.filter((id) => types.includes(id[0]) && getItem(id));
}

// ---------------------------------------------------------------- ujian
export function examQuestions(scope: string): Question[] {
  const d = db();
  const out: Question[] = [];
  const add = (ids: string[], mode: Mode, n: number, section: string) => {
    for (const id of shuffle(ids)) {
      if (out.filter((q) => q.section === section).length >= n) break;
      const q = makeQuestion(id, 'any', mode);
      if (q) out.push({ ...q, section });
    }
  };
  if (scope === 'hira' || scope === 'kata') {
    const sc = scope === 'hira' ? 'h' : 'k';
    const ids = KANA.filter((k) => k.sc === sc).map(idKana);
    add(ids, 'kana-ro', 10, 'Membaca huruf');
    add(ids, 'kana-char', 5, 'Memilih huruf');
    add(ids, 'kana-listen', 5, 'Mendengar');
    return out;
  }
  const lv = Number(scope.slice(1)) as Level;
  const kanji = d.kanji.filter((k) => k.lv === lv).map(idKanji);
  const vocab = d.vocab.filter((v) => v.lv === lv && !v.w.includes('～'));
  const gram = d.grammar.filter((g) => g.lv === lv).map(idGrammar);
  add(kanji, 'kanji-read', 7, 'Bacaan kanji');
  add(kanji, 'kanji-mean', 5, 'Arti kanji');
  add(vocab.map(idVocab), 'vocab-mean', 6, 'Kosakata');
  if (gram.length) add(gram, 'gram-fill', 5, 'Tata bahasa');
  else add(vocab.map(idVocab), 'vocab-word', 5, 'Pemakaian kata');
  add(vocab.filter((v) => v.r.length <= 6).map(idVocab), 'vocab-listen', 5, 'Mendengar');
  return out;
}

export const EXAMS: { id: string; title: string; sub: string }[] = [
  { id: 'hira', title: 'Ujian Hiragana', sub: '20 soal membaca & mendengar' },
  { id: 'kata', title: 'Ujian Katakana', sub: '20 soal membaca & mendengar' },
  ...([5, 4, 3, 2, 1] as const).map((lv) => ({
    id: `n${lv}`,
    title: `Simulasi mini JLPT N${lv}`,
    sub: 'Kanji, kosakata, tata bahasa & mendengar',
  })),
];

export const PASS_MARK = 0.7;
export { romaji };
