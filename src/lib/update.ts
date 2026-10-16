import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { getState } from './store';

/** Nomor versi build ini (diisi GitHub Actions; 'dev' untuk build lokal). */
export const APP_VERSION: string = import.meta.env.VITE_APP_VERSION ?? 'dev';
export const WEB_URL = 'https://jonathan12345salim.github.io/belajar-jepang/';
export const RELEASES_URL = 'https://github.com/Jonathan12345Salim/belajar-jepang/releases/latest';

const native = Capacitor.isNativePlatform();
const LAST_KEY = 'belajar-jepang-cek-update';
const DISMISS_KEY = 'belajar-jepang-tunda-update';
const INTERVAL = 6 * 3600_000; // cek otomatis paling sering 6 jam sekali

export interface UpdateInfo {
  version: string;
  apk: string;
}

let info: UpdateInfo | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const parts = (v: string) => v.split('.').map((x) => parseInt(x, 10) || 0);
/** true bila versi a lebih baru dari b (contoh: 1.0.10 > 1.0.9). */
export function isNewer(a: string, b: string): boolean {
  const x = parts(a);
  const y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
}

export type CheckResult = 'new' | 'latest' | 'offline' | 'dev' | 'skip';

/** Periksa versi terbaru (file kecil version.json di situs web aplikasi). */
export async function checkUpdate(manual = false): Promise<CheckResult> {
  if (APP_VERSION === 'dev') return 'dev';
  if (!manual) {
    if (!getState().settings.autoUpdate) return 'skip';
    const last = Number(localStorage.getItem(LAST_KEY) || 0);
    if (Date.now() - last < INTERVAL) return info ? 'new' : 'skip';
  }
  try {
    const res = await fetch(native ? `${WEB_URL}version.json` : './version.json', { cache: 'no-store' });
    if (!res.ok) return 'offline';
    const j = (await res.json()) as { version?: string; apk?: string; releases?: string };
    localStorage.setItem(LAST_KEY, String(Date.now()));
    if (j.version && isNewer(j.version, APP_VERSION)) {
      info = { version: j.version, apk: j.apk || j.releases || RELEASES_URL };
      emit();
      return 'new';
    }
    if (info) {
      info = null;
      emit();
    }
    return 'latest';
  } catch {
    return 'offline';
  }
}

/** Info pembaruan yang belum ditunda pengguna (null bila tidak ada). */
export function useUpdate(): UpdateInfo | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (info && localStorage.getItem(DISMISS_KEY) !== info.version ? info : null),
  );
}

export function dismissUpdate() {
  if (info) localStorage.setItem(DISMISS_KEY, info.version);
  emit();
}

/** Jalankan pemeriksaan otomatis: saat aplikasi dibuka & saat kembali dibuka dari latar belakang. */
export function initUpdateChecks() {
  void checkUpdate();
  if (native) {
    void App.addListener('resume', () => void checkUpdate());
    return;
  }
  // Versi web: service worker baru mengambil alih → periksa apakah halaman ini sudah usang.
  if ('serviceWorker' in navigator) {
    let hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) void checkUpdate(true);
      hadController = true;
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    navigator.serviceWorker?.getRegistration().then((r) => r?.update()).catch(() => {});
    void checkUpdate();
  });
}

export const isNativeApp = native;
