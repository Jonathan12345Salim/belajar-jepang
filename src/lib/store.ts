import { useSyncExternalStore } from 'react';
import { dayKey } from './util';

export interface Card {
  s: number; // tahap SRS 1..9
  d: number; // jatuh tempo (ms)
  ok: number; // jumlah benar
  ng: number; // jumlah salah
  t: number; // terakhir dijawab
}

export interface Settings {
  lang: 'both' | 'id' | 'en';
  romaji: boolean;
  furigana: boolean;
  spacing: boolean;
  answerMode: 'mix' | 'choice' | 'type';
  rate: number;
  theme: 'auto' | 'light' | 'dark';
  haptics: boolean;
  autoAudio: boolean;
  dailyGoal: number;
  unlockAll: boolean;
  batch: number;
  autoUpdate: boolean;
}

export interface DayStat {
  xp: number;
  rev: number;
  ok: number;
  nw: number;
}

export interface Progress {
  v: 1;
  cards: Record<string, Card>;
  done: Record<string, number>;
  days: Record<string, DayStat>;
  exams: Record<string, { best: number; last: number; at: number }>;
  best: Record<string, number>;
  settings: Settings;
  onboarded: boolean;
  created: number;
}

export const DEFAULT_SETTINGS: Settings = {
  lang: 'both',
  romaji: true,
  furigana: true,
  spacing: true,
  answerMode: 'mix',
  rate: 0.9,
  theme: 'auto',
  haptics: true,
  autoAudio: true,
  dailyGoal: 30,
  unlockAll: false,
  batch: 25,
  autoUpdate: true,
};

const KEY = 'belajar-jepang-v1';

function fresh(): Progress {
  return {
    v: 1,
    cards: {},
    done: {},
    days: {},
    exams: {},
    best: {},
    settings: { ...DEFAULT_SETTINGS },
    onboarded: false,
    created: Date.now(),
  };
}

function normalize(p: Partial<Progress>): Progress {
  const f = fresh();
  return {
    ...f,
    ...p,
    v: 1,
    settings: { ...DEFAULT_SETTINGS, ...(p.settings || {}) },
    cards: p.cards || {},
    done: p.done || {},
    days: p.days || {},
    exams: p.exams || {},
    best: p.best || {},
  };
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    /* data rusak: mulai baru */
  }
  return fresh();
}

let state: Progress = load();
const listeners = new Set<() => void>();
let saveTimer: number | undefined;

function save() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* penyimpanan penuh */
    }
  }, 300);
}

export function flushSave() {
  if (saveTimer) clearTimeout(saveTimer);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* abaikan */
  }
}

window.addEventListener('pagehide', flushSave);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushSave();
});

export function getState() {
  return state;
}

// Kait kecil untuk pengujian otomatis (tidak dipakai aplikasi).
(window as unknown as { __bj: unknown }).__bj = { getState: () => state, setState: (p: Progress) => setState(p) };

export function setState(next: Progress) {
  state = next;
  save();
  listeners.forEach((l) => l());
}

export function update(fn: (p: Progress) => Partial<Progress>) {
  setState({ ...state, ...fn(state) });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getState);
}

export function useSettings(): Settings {
  return useProgress().settings;
}

export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  update((p) => ({ settings: { ...p.settings, [k]: v } }));
}

// ---------------------------------------------------------------- SRS
/** Jeda (jam) setelah mencapai tahap n. Tahap 9 = tuntas. */
export const INTERVAL_H = [0, 4, 8, 24, 48, 168, 336, 720, 2880];
export const MAX_STAGE = 9;

export function stageInfo(s: number): { name: string; color: string } {
  if (s >= 9) return { name: 'Tuntas', color: 'var(--c-burn)' };
  if (s >= 8) return { name: 'Hafal', color: 'var(--c-enl)' };
  if (s >= 7) return { name: 'Mahir', color: 'var(--c-master)' };
  if (s >= 5) return { name: 'Paham', color: 'var(--c-guru)' };
  return { name: 'Pemula', color: 'var(--c-appr)' };
}

const dueAt = (stage: number, now: number) =>
  stage >= MAX_STAGE ? Number.MAX_SAFE_INTEGER : now + INTERVAL_H[stage] * 3600_000;

function bumpDay(p: Progress, d: Partial<DayStat>): Record<string, DayStat> {
  const k = dayKey();
  const cur = p.days[k] || { xp: 0, rev: 0, ok: 0, nw: 0 };
  return {
    ...p.days,
    [k]: {
      xp: cur.xp + (d.xp || 0),
      rev: cur.rev + (d.rev || 0),
      ok: cur.ok + (d.ok || 0),
      nw: cur.nw + (d.nw || 0),
    },
  };
}

/** Tambahkan item baru ke SRS (setelah pelajaran). */
export function learnItems(ids: string[], xpEach = 3) {
  const now = Date.now();
  update((p) => {
    const cards = { ...p.cards };
    let nw = 0;
    for (const id of ids) {
      if (!cards[id]) {
        cards[id] = { s: 1, d: dueAt(1, now), ok: 0, ng: 0, t: now };
        nw++;
      }
    }
    return { cards, days: bumpDay(p, { nw, xp: nw * xpEach }) };
  });
}

/** Catat jawaban review SRS. */
export function reviewAnswer(id: string, correct: boolean) {
  const now = Date.now();
  update((p) => {
    const c = p.cards[id];
    if (!c) return {};
    const s = correct ? Math.min(MAX_STAGE, c.s + 1) : Math.max(1, c.s - (c.s >= 5 ? 2 : 1));
    const card: Card = {
      s,
      d: dueAt(s, now),
      ok: c.ok + (correct ? 1 : 0),
      ng: c.ng + (correct ? 0 : 1),
      t: now,
    };
    return {
      cards: { ...p.cards, [id]: card },
      days: bumpDay(p, { rev: 1, ok: correct ? 1 : 0, xp: correct ? 2 : 0 }),
    };
  });
}

/** Catat jawaban latihan (tidak mengubah jadwal SRS). */
export function practiceAnswer(id: string | null, correct: boolean) {
  update((p) => {
    const out: Partial<Progress> = { days: bumpDay(p, { xp: correct ? 1 : 0 }) };
    if (id && p.cards[id] && !correct) {
      out.cards = { ...p.cards, [id]: { ...p.cards[id], ng: p.cards[id].ng + 1 } };
    }
    return out;
  });
}

export function addXp(xp: number) {
  update((p) => ({ days: bumpDay(p, { xp }) }));
}

export function markDone(id: string) {
  update((p) => ({ done: { ...p.done, [id]: Date.now() } }));
}

export function saveExam(id: string, score: number) {
  update((p) => {
    const prev = p.exams[id];
    return {
      exams: { ...p.exams, [id]: { best: Math.max(prev?.best ?? 0, score), last: score, at: Date.now() } },
    };
  });
}

export function saveBest(id: string, score: number) {
  update((p) => (score > (p.best[id] ?? 0) ? { best: { ...p.best, [id]: score } } : {}));
}

export function dueIds(p: Progress, now = Date.now()): string[] {
  return Object.entries(p.cards)
    .filter(([, c]) => c.d <= now)
    .sort((a, b) => a[1].d - b[1].d)
    .map(([id]) => id);
}

export function nextDue(p: Progress): number | null {
  let min = Infinity;
  for (const c of Object.values(p.cards)) if (c.s < MAX_STAGE && c.d < min) min = c.d;
  return min === Infinity ? null : min;
}

export function streak(p: Progress): number {
  let n = 0;
  const d = new Date();
  if (!(p.days[dayKey(d.getTime())]?.xp > 0)) d.setDate(d.getDate() - 1);
  while (p.days[dayKey(d.getTime())]?.xp > 0) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function today(p: Progress): DayStat {
  return p.days[dayKey()] || { xp: 0, rev: 0, ok: 0, nw: 0 };
}

// ---------------------------------------------------------------- cadangan
export function exportBackup(): string {
  flushSave();
  return JSON.stringify({ app: 'belajar-jepang', at: new Date().toISOString(), data: state });
}

export function importBackup(text: string): boolean {
  try {
    const obj = JSON.parse(text.trim());
    const data = obj && obj.app === 'belajar-jepang' ? obj.data : obj;
    if (!data || typeof data !== 'object' || !data.cards) return false;
    setState(normalize(data));
    flushSave();
    return true;
  } catch {
    return false;
  }
}

export function resetAll() {
  const settings = state.settings;
  setState({ ...fresh(), settings, onboarded: true });
  flushSave();
}
