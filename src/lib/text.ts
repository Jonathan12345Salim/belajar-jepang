import { toKana, toHiragana, toRomaji } from 'wanakana';

/** Segmen teks berfurigana: {漢字|かんじ} */
export interface Seg {
  t: string;
  r?: string;
}

const RUBY_RE = /\{([^|}]+)\|([^}]+)\}/g;

export function parseRuby(s: string): Seg[] {
  const out: Seg[] = [];
  let last = 0;
  RUBY_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RUBY_RE.exec(s))) {
    if (m.index > last) out.push({ t: s.slice(last, m.index) });
    out.push({ t: m[1], r: m[2] });
    last = RUBY_RE.lastIndex;
  }
  if (last < s.length) out.push({ t: s.slice(last) });
  return out;
}

/** Teks tanpa furigana (kanji). */
export const plain = (s: string) => s.replace(/\{([^|}]+)\|[^}]+\}/g, '$1');
/** Teks dengan bacaan kana saja. */
export const kanaOf = (s: string) => s.replace(/\{[^|}]+\|([^}]+)\}/g, '$1');
/** Hapus penanda tempel (+ / ~) dari token. */
export const tokText = (t: string) => t.replace(/^[+~]/, '');
export const isAttached = (t: string) => t[0] === '+' || t[0] === '~';
export const sentPlain = (toks: string[]) => toks.map((t) => plain(tokText(t))).join('');
export const sentKana = (toks: string[]) => toks.map((t) => kanaOf(tokText(t))).join('');

const SPECIAL_RO: Record<string, string> = {
  は: 'wa',
  へ: 'e',
  を: 'o',
  には: 'niwa',
  では: 'dewa',
  とは: 'towa',
  からは: 'karawa',
  までは: 'madewa',
  へは: 'ewa',
  こんにちは: 'konnichiwa',
  こんばんは: 'konbanwa',
};

/** Romaji untuk satu kata/token (dalam kana). */
export function romaji(kana: string): string {
  const m = kana.match(/^(.*?)([、。！？!?,.\s]*)$/);
  const core = m ? m[1] : kana;
  const punct = m ? m[2] : '';
  let r = SPECIAL_RO[core];
  if (r === undefined) {
    const hon = core.length > 2 ? core.match(/^(.+?)(さん|ちゃん|くん|さま)$/) : null;
    r = hon ? `${toRomaji(hon[1])}-${toRomaji(hon[2])}` : toRomaji(core);
  }
  return r + toRomaji(punct).replace(/\s/g, '');
}

export function sentRomaji(toks: string[]): string {
  let out = '';
  toks.forEach((tk, i) => {
    const r = romaji(kanaOf(tokText(tk)));
    out += (i === 0 || tk[0] === '~' ? '' : ' ') + r;
  });
  return out.replace(/\s+([.,!?])/g, '$1').trim();
}

const KANJI_RE = /[\u3400-\u9fff\uf900-\ufaff々〆ヶ]/;
export const hasKanji = (s: string) => KANJI_RE.test(s);
export const kanjiIn = (s: string) => Array.from(s).filter((c) => KANJI_RE.test(c) && c !== '々');

/** Katakana → hiragana (tanpa mengubah tanda panjang ー). */
export function normKana(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    out += c >= 0x30a1 && c <= 0x30f6 ? String.fromCodePoint(c - 0x60) : ch;
  }
  return out;
}

const VOWEL_KANA: Record<string, string> = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' };

/** Ganti ー dengan vokal sebelumnya: こーひー → こおひい */
export function expandLong(s: string): string {
  let out = '';
  for (const ch of s) {
    if (ch === 'ー' && out) {
      const ro = toRomaji(out.slice(-1));
      out += VOWEL_KANA[ro.slice(-1)] ?? ch;
    } else out += ch;
  }
  return out;
}

/** Bentuk pembanding untuk jawaban bacaan. */
export const cmpKana = (s: string) =>
  expandLong(normKana(s.replace(/[～~\s・。、.]/g, '').trim()));

/** Ubah ketikan romaji menjadi kana secara langsung (mode IME). */
export const imeKana = (s: string) => toKana(s, { IMEMode: true });
/** Selesaikan ketikan (n di akhir → ん). */
export const finalKana = (s: string) => toKana(s);

export { toHiragana, toRomaji };

/** Susun furigana otomatis untuk kosakata: 食べ物 + たべもの → {食|た}べ{物|もの} */
export function furigana(word: string, reading: string): string {
  if (!hasKanji(word)) return word;
  const pre = word.startsWith('～') ? '～' : '';
  const suf = word.length > 1 && word.endsWith('～') ? '～' : '';
  const w = word.replace(/～/g, '');
  const r = reading.replace(/～/g, '');
  const runs = w.match(/[\u3400-\u9fff\uf900-\ufaff々〆ヶ]+|[^\u3400-\u9fff\uf900-\ufaff々〆ヶ]+/g) || [w];
  const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = '^' + runs.map((run) => (hasKanji(run) ? '(.+?)' : esc(normKana(run)))).join('') + '$';
  const m = normKana(r).match(new RegExp(pattern));
  if (!m) return `${pre}{${w}|${r}}${suf}`;
  let gi = 1;
  return pre + runs.map((run) => (hasKanji(run) ? `{${run}|${m[gi++]}}` : run)).join('') + suf;
}
