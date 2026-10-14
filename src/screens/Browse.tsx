import { useMemo, useState } from 'react';
import { db } from '../lib/data';
import { KANA_GROUPS } from '../lib/kana';
import { shortMeaning, vocabRomaji, vocabRuby } from '../lib/items';
import { enc, go, replace } from '../lib/router';
import { useProgress } from '../lib/store';
import { normKana, toHiragana, toRomaji } from '../lib/text';
import { LEVELS, type Level } from '../lib/types';
import { cls } from '../lib/util';
import { Header, Seg } from '../components/ui';
import { Ruby } from '../components/Ruby';

const TABS: [string, string][] = [
  ['kana', 'Kana'],
  ['kanji', 'Kanji'],
  ['vocab', 'Kosakata'],
  ['gram', 'Tata bahasa'],
];

export function Browse({ q }: { q: URLSearchParams }) {
  const tab = q.get('t') ?? 'kana';
  const lv = (Number(q.get('lv')) || 5) as Level;
  const setQ = (k: string, v: string) => {
    const n = new URLSearchParams(q);
    n.set(k, v);
    replace(`browse?${n.toString()}`);
  };
  const [search, setSearch] = useState('');
  return (
    <div>
      <Header title="Kamus" noBack />
      <div className="chips">
        {TABS.map(([t, l]) => (
          <button key={t} className={cls('chip', tab === t && 'on')} onClick={() => setQ('t', t)}>
            {l}
          </button>
        ))}
      </div>
      {tab !== 'kana' && (
        <>
          <div className="pad mb">
            <input className="field" placeholder="Cari: arti, bacaan, romaji, atau kanji…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {!search && (
            <div className="chips">
              {LEVELS.map((l) => (
                <button key={l} className={cls('chip', lv === l && 'on')} onClick={() => setQ('lv', String(l))}>
                  N{l}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      {tab === 'kana' && <KanaChart sc={q.get('sc') === 'k' ? 'k' : 'h'} setSc={(v) => setQ('sc', v)} />}
      {tab === 'kanji' && <KanjiList lv={lv} search={search} />}
      {tab === 'vocab' && <VocabList lv={lv} search={search} />}
      {tab === 'gram' && <GrammarList lv={lv} search={search} />}
    </div>
  );
}

function KanaChart({ sc, setSc }: { sc: 'h' | 'k'; setSc: (v: string) => void }) {
  const p = useProgress();
  const groups = KANA_GROUPS.filter((g) => g.sc === sc);
  return (
    <div className="pad">
      <Seg
        value={sc}
        onChange={setSc}
        options={[
          ['h', 'Hiragana'],
          ['k', 'Katakana'],
        ]}
      />
      {groups.map((g) => (
        <div key={g.id} className="mt">
          <div className="small muted" style={{ fontWeight: 700, marginBottom: 4 }}>
            {g.title}
          </div>
          <div className="kana-grid">
            {g.chars.map((c) => {
              const id = `${sc}:${c}`;
              const k = db().kana.find((x) => x.sc === sc && x.c === c);
              return (
                <button key={c} className={cls('kana-cell', p.cards[id] && 'learned')} onClick={() => go(`item/${enc(id)}`)}>
                  <span className="c jp" lang="ja">
                    {c}
                  </span>
                  <span className="r">{k?.ro}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const norm = (s: string) => s.toLowerCase().trim();

function KanjiList({ lv, search }: { lv: Level; search: string }) {
  const p = useProgress();
  const list = useMemo(() => {
    const s = norm(search);
    const all = db().kanji;
    if (!s) return all.filter((k) => k.lv === lv);
    const hira = normKana(toHiragana(s));
    return all.filter(
      (k) =>
        k.c === s ||
        k.id?.some((m) => m.toLowerCase().includes(s)) ||
        k.en.some((m) => m.toLowerCase().includes(s)) ||
        k.on.some((r) => normKana(r) === hira) ||
        k.kun.some((r) => r.replace(/[.-]/g, '').startsWith(hira)),
    );
  }, [lv, search]);
  const [limit, setLimit] = useState(200);
  return (
    <>
      <div className="pad small muted mb">
        {list.length} kanji · hijau = sudah dipelajari
      </div>
      <div className="kgrid">
        {list.slice(0, limit).map((k) => (
          <button key={k.c} className={cls('kcell jp', p.cards['j:' + k.c] && 'learned')} lang="ja" onClick={() => go(`item/${enc('j:' + k.c)}`)}>
            {k.c}
          </button>
        ))}
      </div>
      {list.length > limit && (
        <div className="pad mt">
          <button className="btn block ghost" onClick={() => setLimit(limit + 400)}>
            Tampilkan lebih banyak
          </button>
        </div>
      )}
    </>
  );
}

function VocabList({ lv, search }: { lv: Level; search: string }) {
  const p = useProgress();
  const s = p.settings;
  const list = useMemo(() => {
    const q = norm(search);
    const all = db().vocab;
    if (!q) return all.filter((v) => v.lv === lv).sort((a, b) => (a.o ?? 1e6) - (b.o ?? 1e6));
    const hira = normKana(toHiragana(q));
    return all.filter(
      (v) =>
        v.w.includes(q) ||
        normKana(v.r).includes(hira) ||
        toRomaji(v.r).includes(q) ||
        (v.id && v.id.toLowerCase().includes(q)) ||
        v.en.toLowerCase().includes(q),
    );
  }, [lv, search]);
  const [limit, setLimit] = useState(80);
  return (
    <>
      <div className="pad small muted mb">{list.length} kata</div>
      <div className="list">
        {list.slice(0, limit).map((v) => (
          <button key={v.key} className="li" onClick={() => go(`item/${enc('v:' + v.key)}`)}>
            <span className="face" style={{ fontSize: 20, minWidth: 80, textAlign: 'left' }}>
              <Ruby text={vocabRuby(v)} />
            </span>
            <span className="grow">
              <div className="t">{shortMeaning({ type: 'v', vocab: v }, s.lang)}</div>
              <div className="s">
                {s.romaji ? vocabRomaji(v) : v.r} · N{v.lv}
                {p.cards['v:' + v.key] ? ' · ✓' : ''}
              </div>
            </span>
          </button>
        ))}
      </div>
      {list.length > limit && (
        <div className="pad">
          <button className="btn block ghost" onClick={() => setLimit(limit + 150)}>
            Tampilkan lebih banyak
          </button>
        </div>
      )}
    </>
  );
}

function GrammarList({ lv, search }: { lv: Level; search: string }) {
  const p = useProgress();
  const q = norm(search);
  const list = db().grammar.filter((g) => (q ? (g.t + g.m + g.p + g.x.join(' ')).toLowerCase().includes(q) : g.lv === lv));
  if (!list.length)
    return <div className="card muted">Materi tata bahasa untuk level ini akan ditambahkan. Saat ini tersedia N5{db().grammar.some((g) => g.lv === 4) ? ' dan N4' : ''}.</div>;
  return (
    <div className="list">
      {list.map((g) => (
        <button key={g.id} className="li" onClick={() => go(`item/${enc('g:' + g.id)}`)}>
          <span className="grow">
            <div className="t" lang="ja">
              {g.t}
            </div>
            <div className="s">
              {g.m}
              {p.cards['g:' + g.id] ? ' · ✓' : ''}
            </div>
          </span>
        </button>
      ))}
    </div>
  );
}
