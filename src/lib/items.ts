import { db } from './data';
import { kanaById } from './kana';
import type { Settings } from './store';
import type { Grammar, ItemType, Kana, Kanji, Radical, Vocab } from './types';
import { furigana, romaji, toHiragana } from './text';

export const typeOf = (id: string) => id[0] as ItemType;
export const keyOf = (id: string) => id.slice(2);

export const idKana = (k: Kana) => `${k.sc}:${k.c}`;
export const idKanji = (k: Kanji) => `j:${k.c}`;
export const idVocab = (v: Vocab) => `v:${v.key}`;
export const idGrammar = (g: Grammar) => `g:${g.id}`;
export const idRadical = (r: Radical) => `r:${r.c}`;

export type AnyItem =
  | { type: 'h' | 'k'; kana: Kana }
  | { type: 'j'; kanji: Kanji }
  | { type: 'v'; vocab: Vocab }
  | { type: 'g'; grammar: Grammar }
  | { type: 'r'; radical: Radical };

export function getItem(id: string): AnyItem | null {
  const t = typeOf(id);
  const k = keyOf(id);
  const d = db();
  switch (t) {
    case 'h':
    case 'k': {
      const kana = kanaById(id);
      return kana ? { type: t, kana } : null;
    }
    case 'j': {
      const kanji = d.kanjiMap.get(k);
      return kanji ? { type: 'j', kanji } : null;
    }
    case 'v': {
      const vocab = d.vocabMap.get(k);
      return vocab ? { type: 'v', vocab } : null;
    }
    case 'g': {
      const grammar = d.grammarMap.get(k);
      return grammar ? { type: 'g', grammar } : null;
    }
    case 'r': {
      const radical = d.radicalMap.get(k);
      return radical ? { type: 'r', radical } : null;
    }
  }
  return null;
}

export const TYPE_NAME: Record<ItemType, string> = {
  h: 'Hiragana',
  k: 'Katakana',
  j: 'Kanji',
  v: 'Kosakata',
  g: 'Tata bahasa',
  r: 'Radikal',
};

// ---------------------------------------------------------------- arti
const firstSenses = (s: string, n: number) =>
  s
    .split(/;\s*/)
    .slice(0, n)
    .join('; ');

/** Arti utama yang singkat (untuk pilihan jawaban). */
export function shortMeaning(it: AnyItem, lang: Settings['lang']): string {
  switch (it.type) {
    case 'h':
    case 'k':
      return it.kana.ro;
    case 'j': {
      const k = it.kanji;
      if (lang !== 'en' && k.id?.length) return k.id.slice(0, 2).join('; ');
      return k.en.slice(0, 2).join('; ').toLowerCase();
    }
    case 'v': {
      const v = it.vocab;
      if (lang !== 'en' && v.id) return firstSenses(v.id, 2);
      return firstSenses(v.en, 2);
    }
    case 'g':
      return it.grammar.m;
    case 'r':
      return lang === 'en' ? it.radical.en : it.radical.id;
  }
}

/** Arti lengkap: [utama, sekunder (bahasa Inggris)] */
export function fullMeaning(it: AnyItem, lang: Settings['lang']): [string, string | null] {
  if (it.type === 'j') {
    const k = it.kanji;
    const en = k.en.join(', ').toLowerCase();
    if (lang === 'en' || !k.id?.length) return [en, null];
    return [k.id.join('; '), lang === 'both' ? en : null];
  }
  if (it.type === 'v') {
    const v = it.vocab;
    if (lang === 'en' || !v.id) return [v.en, null];
    return [v.id, lang === 'both' ? v.en : null];
  }
  if (it.type === 'r') return [lang === 'en' ? it.radical.en : it.radical.id, lang === 'both' ? it.radical.en : null];
  return [shortMeaning(it, lang), null];
}

/** Teks utama yang mewakili item (huruf/kata). */
export function itemFace(it: AnyItem): string {
  switch (it.type) {
    case 'h':
    case 'k':
      return it.kana.c;
    case 'j':
      return it.kanji.c;
    case 'v':
      return it.vocab.w;
    case 'g':
      return it.grammar.t;
    case 'r':
      return it.radical.c;
  }
}

/** Bacaan kana untuk diucapkan TTS. */
export function itemSpeech(it: AnyItem): string | null {
  switch (it.type) {
    case 'h':
    case 'k':
      return it.kana.c;
    case 'v':
      return it.vocab.r.replace(/～/g, '');
    case 'j':
      return null;
    default:
      return null;
  }
}

export const vocabRuby = (v: Vocab) => furigana(v.w, v.r);
export const vocabRomaji = (v: Vocab) => romaji(toHiragana(v.r.replace(/～/g, '')));

/** Bacaan kanji dalam bentuk ringkas (tanpa tanda titik okurigana). */
export const cleanKun = (r: string) => r.replace(/\./g, '').replace(/-/g, '');
export const kunDisplay = (r: string) => {
  const [stem, oku] = r.replace(/-/g, '').split('.');
  return oku ? `${stem}(${oku})` : stem;
};

/** Contoh kosakata yang memakai kanji, urut dari level termudah. */
export function vocabForKanji(c: string, max = 6): Vocab[] {
  const list = db().vocabByKanji.get(c) || [];
  return list
    .slice()
    .sort((a, b) => b.lv - a.lv || (a.o ?? 9999) - (b.o ?? 9999) || a.w.length - b.w.length)
    .slice(0, max);
}

/** Nama komponen kanji dalam bahasa Indonesia / Inggris. */
export function componentName(c: string): string | null {
  const d = db();
  const r = d.radicalMap.get(c);
  if (r) return r.id;
  const k = d.kanjiMap.get(c);
  if (k) return k.id?.[0] ?? k.en[0]?.toLowerCase() ?? null;
  return null;
}
