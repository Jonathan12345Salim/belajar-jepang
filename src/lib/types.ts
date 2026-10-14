export type Level = 5 | 4 | 3 | 2 | 1;
export const LEVELS: Level[] = [5, 4, 3, 2, 1];

export interface Kanji {
  c: string;
  lv: Level;
  s: number; // jumlah goresan
  on: string[];
  kun: string[];
  en: string[];
  id?: string[];
  mn?: string; // mnemonik
  cp?: string[]; // komponen
  f?: number; // peringkat frekuensi
  g?: number;
}

export interface Vocab {
  w: string;
  r: string;
  en: string;
  lv: Level;
  id?: string;
  cat?: string;
  o?: number;
  nt?: string;
  alt?: string[];
  key: string; // w|r
}

export interface GrammarEx {
  t: string[]; // token
  id: string; // terjemahan
  k?: number; // indeks token kosong
  o?: string[]; // pilihan salah khusus
}

export interface Grammar {
  id: string;
  lv: Level;
  t: string; // judul/pola singkat
  m: string; // arti singkat
  p: string; // rumus
  x: string[]; // penjelasan
  ex: GrammarEx[];
  o: string[]; // pilihan salah bawaan
}

export interface StorySentence {
  t: string[];
  id: string;
  sp?: string;
}

export interface Story {
  id: string;
  lv: Level;
  t: string;
  ti: string;
  s: StorySentence[];
  q: { q: string; o: string[]; a: number }[];
}

export interface Radical {
  c: string;
  id: string;
  en: string;
  ex: string;
}

export interface Kana {
  c: string;
  ro: string;
  sc: 'h' | 'k';
  g: string; // id kelompok (baris)
  mn?: string;
}

export type ItemType = 'h' | 'k' | 'j' | 'v' | 'g' | 'r';
