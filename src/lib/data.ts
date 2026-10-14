import type { Grammar, Kana, Kanji, Level, Radical, Story, Vocab } from './types';
import { KANA } from './kana';
import { kanjiIn } from './text';

export interface DB {
  kanji: Kanji[];
  kanjiMap: Map<string, Kanji>;
  vocab: Vocab[];
  vocabMap: Map<string, Vocab>;
  vocabByKanji: Map<string, Vocab[]>;
  grammar: Grammar[];
  grammarMap: Map<string, Grammar>;
  stories: Story[];
  radicals: Radical[];
  radicalMap: Map<string, Radical>;
  kana: Kana[];
  kanjiGroups: Record<string, string[]>;
}

let dbPromise: Promise<DB> | null = null;
let dbValue: DB | null = null;

async function getJSON<T>(name: string): Promise<T> {
  const res = await fetch(`./data/${name}`);
  if (!res.ok) throw new Error(`Gagal memuat ${name}`);
  return res.json() as Promise<T>;
}

export function loadDB(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const [kanji, vocabRaw, grammar, stories, radicals, kanaMn, kanjiGroups] = await Promise.all([
        getJSON<Kanji[]>('kanji.json'),
        getJSON<Omit<Vocab, 'key'>[]>('vocab.json'),
        getJSON<Grammar[]>('grammar.json'),
        getJSON<Story[]>('stories.json'),
        getJSON<Radical[]>('radicals.json'),
        getJSON<Record<string, string>>('kana-mn.json'),
        getJSON<Record<string, string[]>>('kanji-groups.json'),
      ]);
      const vocab: Vocab[] = vocabRaw.map((v) => ({ ...v, key: v.w + '|' + v.r }));
      const vocabByKanji = new Map<string, Vocab[]>();
      for (const v of vocab) {
        for (const c of new Set(kanjiIn(v.w))) {
          let a = vocabByKanji.get(c);
          if (!a) vocabByKanji.set(c, (a = []));
          a.push(v);
        }
      }
      for (const k of KANA) if (kanaMn[k.c]) k.mn = kanaMn[k.c];
      const db: DB = {
        kanji,
        kanjiMap: new Map(kanji.map((k) => [k.c, k])),
        vocab,
        vocabMap: new Map(vocab.map((v) => [v.key, v])),
        vocabByKanji,
        grammar,
        grammarMap: new Map(grammar.map((g) => [g.id, g])),
        stories,
        radicals,
        radicalMap: new Map(radicals.map((r) => [r.c, r])),
        kana: KANA,
        kanjiGroups,
      };
      dbValue = db;
      return db;
    })();
  }
  return dbPromise;
}

/** DB yang sudah dimuat (dipanggil setelah loadDB selesai). */
export function db(): DB {
  if (!dbValue) throw new Error('Data belum dimuat');
  return dbValue;
}

// ---------------------------------------------------------------- goresan
const strokeFiles = new Map<string, Promise<Record<string, string[]>>>();

function strokeFile(name: string) {
  let p = strokeFiles.get(name);
  if (!p) {
    p = getJSON<Record<string, string[]>>(name).catch(() => ({}));
    strokeFiles.set(name, p);
  }
  return p;
}

export async function loadStrokes(ch: string): Promise<string[] | null> {
  const code = ch.codePointAt(0)!;
  if (code >= 0x3041 && code <= 0x30ff) return (await strokeFile('strokes-kana.json'))[ch] ?? null;
  const k = dbValue?.kanjiMap.get(ch);
  if (k) {
    const s = (await strokeFile(`strokes-n${k.lv}.json`))[ch];
    if (s) return s;
  }
  return (await strokeFile('strokes-rad.json'))[ch] ?? null;
}

export const levelName = (lv: Level) => `N${lv}`;
