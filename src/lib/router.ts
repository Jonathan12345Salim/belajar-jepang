import { useEffect, useState } from 'react';

export interface Route {
  parts: string[];
  q: URLSearchParams;
  raw: string;
}

function parse(): Route {
  const raw = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const parts = path
    .split('/')
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  return { parts, q: new URLSearchParams(query), raw };
}

export function useRoute(): Route {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const on = () => {
      setR(parse());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

export function go(path: string) {
  location.hash = '#/' + path.replace(/^\//, '');
}

/** Ganti rute tanpa menambah riwayat. */
export function replace(path: string) {
  const url = location.href.split('#')[0] + '#/' + path.replace(/^\//, '');
  location.replace(url);
}

export function back(fallback = '') {
  if (history.length > 1) history.back();
  else go(fallback);
}

export const enc = encodeURIComponent;
