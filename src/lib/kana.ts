import type { Kana } from './types';

/** [id kelompok, judul, hiragana, romaji] */
type Row = [string, string, string[], string[]];

const H_ROWS: Row[] = [
  ['a', 'Vokal', ['あ', 'い', 'う', 'え', 'お'], ['a', 'i', 'u', 'e', 'o']],
  ['k', 'Baris K', ['か', 'き', 'く', 'け', 'こ'], ['ka', 'ki', 'ku', 'ke', 'ko']],
  ['s', 'Baris S', ['さ', 'し', 'す', 'せ', 'そ'], ['sa', 'shi', 'su', 'se', 'so']],
  ['t', 'Baris T', ['た', 'ち', 'つ', 'て', 'と'], ['ta', 'chi', 'tsu', 'te', 'to']],
  ['n', 'Baris N', ['な', 'に', 'ぬ', 'ね', 'の'], ['na', 'ni', 'nu', 'ne', 'no']],
  ['h', 'Baris H', ['は', 'ひ', 'ふ', 'へ', 'ほ'], ['ha', 'hi', 'fu', 'he', 'ho']],
  ['m', 'Baris M', ['ま', 'み', 'む', 'め', 'も'], ['ma', 'mi', 'mu', 'me', 'mo']],
  ['y', 'Baris Y', ['や', 'ゆ', 'よ'], ['ya', 'yu', 'yo']],
  ['r', 'Baris R', ['ら', 'り', 'る', 'れ', 'ろ'], ['ra', 'ri', 'ru', 're', 'ro']],
  ['w', 'Baris W & N', ['わ', 'を', 'ん'], ['wa', 'wo', 'n']],
  ['g', 'Tenten G', ['が', 'ぎ', 'ぐ', 'げ', 'ご'], ['ga', 'gi', 'gu', 'ge', 'go']],
  ['z', 'Tenten Z', ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'], ['za', 'ji', 'zu', 'ze', 'zo']],
  ['d', 'Tenten D', ['だ', 'ぢ', 'づ', 'で', 'ど'], ['da', 'ji', 'zu', 'de', 'do']],
  ['b', 'Tenten B', ['ば', 'び', 'ぶ', 'べ', 'ぼ'], ['ba', 'bi', 'bu', 'be', 'bo']],
  ['p', 'Maru P', ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'], ['pa', 'pi', 'pu', 'pe', 'po']],
  ['ky', 'Gabungan K', ['きゃ', 'きゅ', 'きょ'], ['kya', 'kyu', 'kyo']],
  ['sh', 'Gabungan SH', ['しゃ', 'しゅ', 'しょ'], ['sha', 'shu', 'sho']],
  ['ch', 'Gabungan CH', ['ちゃ', 'ちゅ', 'ちょ'], ['cha', 'chu', 'cho']],
  ['ny', 'Gabungan NY', ['にゃ', 'にゅ', 'にょ'], ['nya', 'nyu', 'nyo']],
  ['hy', 'Gabungan HY', ['ひゃ', 'ひゅ', 'ひょ'], ['hya', 'hyu', 'hyo']],
  ['my', 'Gabungan MY', ['みゃ', 'みゅ', 'みょ'], ['mya', 'myu', 'myo']],
  ['ry', 'Gabungan RY', ['りゃ', 'りゅ', 'りょ'], ['rya', 'ryu', 'ryo']],
  ['gy', 'Gabungan GY', ['ぎゃ', 'ぎゅ', 'ぎょ'], ['gya', 'gyu', 'gyo']],
  ['j', 'Gabungan J', ['じゃ', 'じゅ', 'じょ'], ['ja', 'ju', 'jo']],
  ['by', 'Gabungan BY', ['びゃ', 'びゅ', 'びょ'], ['bya', 'byu', 'byo']],
  ['py', 'Gabungan PY', ['ぴゃ', 'ぴゅ', 'ぴょ'], ['pya', 'pyu', 'pyo']],
];

const K_EXT: Row = [
  'x',
  'Bunyi asing',
  ['ファ', 'フィ', 'フェ', 'フォ', 'ティ', 'ディ', 'シェ', 'チェ', 'ジェ', 'ウィ', 'ウェ', 'ウォ', 'ヴ'],
  ['fa', 'fi', 'fe', 'fo', 'ti', 'di', 'she', 'che', 'je', 'wi', 'we', 'wo', 'vu'],
];

export const toKata = (s: string) =>
  Array.from(s)
    .map((ch) => {
      const c = ch.codePointAt(0)!;
      return c >= 0x3041 && c <= 0x3096 ? String.fromCodePoint(c + 0x60) : ch;
    })
    .join('');

export const KANA_GROUPS: { id: string; title: string; sc: 'h' | 'k'; chars: string[] }[] = [];
export const KANA: Kana[] = [];

for (const sc of ['h', 'k'] as const) {
  const rows = sc === 'h' ? H_ROWS : [...H_ROWS, K_EXT];
  for (const [g, title, chars, ro] of rows) {
    const cs = g === 'x' ? chars : sc === 'h' ? chars : chars.map(toKata);
    KANA_GROUPS.push({ id: `${sc}-${g}`, title, sc, chars: cs });
    cs.forEach((c, i) => KANA.push({ c, ro: ro[i], sc, g: `${sc}-${g}` }));
  }
}

export const KANA_MAP = new Map(KANA.map((k) => [k.sc + ':' + k.c, k]));
export const kanaById = (id: string) => KANA_MAP.get(id.slice(0, 1) + ':' + id.slice(2));

/** Romaji alternatif yang juga diterima saat mengetik. */
export const KANA_ALT: Record<string, string[]> = {
  を: ['o', 'wo'],
  ヲ: ['o', 'wo'],
  ぢ: ['ji', 'di', 'dzi'],
  ヂ: ['ji', 'di', 'dzi'],
  づ: ['zu', 'du', 'dzu'],
  ヅ: ['zu', 'du', 'dzu'],
  ん: ['n', 'nn'],
  ン: ['n', 'nn'],
  し: ['shi', 'si'],
  シ: ['shi', 'si'],
  ち: ['chi', 'ti'],
  チ: ['chi', 'ti'],
  つ: ['tsu', 'tu'],
  ツ: ['tsu', 'tu'],
  ふ: ['fu', 'hu'],
  フ: ['fu', 'hu'],
  じ: ['ji', 'zi'],
  ジ: ['ji', 'zi'],
};
