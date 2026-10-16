import { useEffect } from 'react';
import { db } from '../lib/data';
import {
  componentName,
  fullMeaning,
  getItem,
  kunDisplay,
  vocabForKanji,
  vocabRomaji,
  vocabRuby,
  shortMeaning,
  cleanKun,
} from '../lib/items';
import { CAT_NAME } from '../lib/path';
import { enc, go } from '../lib/router';
import { useSettings } from '../lib/store';
import { kanjiIn, normKana, romaji, sentPlain, toHiragana } from '../lib/text';
import { speak } from '../lib/tts';
import type { Grammar, Kana, Kanji, Radical, Vocab } from '../lib/types';
import { AudioBtn, Rich, Ruby, Sentence } from './Ruby';
import { StrokeAnim } from './Stroke';

export function Teach({ id }: { id: string }) {
  const it = getItem(id);
  if (!it) return <div className="card">Item tidak ditemukan.</div>;
  switch (it.type) {
    case 'h':
    case 'k':
      return <KanaTeach k={it.kana} />;
    case 'j':
      return <KanjiTeach k={it.kanji} />;
    case 'v':
      return <VocabTeach v={it.vocab} />;
    case 'g':
      return <GrammarTeach g={it.grammar} />;
    case 'r':
      return <RadicalTeach r={it.radical} />;
  }
}

function useAutoSpeak(text: string | null) {
  const s = useSettings();
  useEffect(() => {
    if (text && s.autoAudio) {
      const t = setTimeout(() => void speak(text), 250);
      return () => clearTimeout(t);
    }
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
}

function Meaning({ id }: { id: string }) {
  const s = useSettings();
  const it = getItem(id);
  if (!it) return null;
  const [m1, m2] = fullMeaning(it, s.lang);
  return (
    <div className="center">
      <div style={{ fontSize: 20, fontWeight: 700 }}>{m1}</div>
      {m2 && <div className="muted small">{m2}</div>}
    </div>
  );
}

function ExampleWords({ words }: { words: Vocab[] }) {
  const s = useSettings();
  if (!words.length) return null;
  return (
    <div className="card">
      <h3>Contoh kata</h3>
      {words.map((v) => (
        <button key={v.key} className="ex-word" onClick={() => go(`item/${enc('v:' + v.key)}`)}>
          <span className="w">
            <Ruby text={vocabRuby(v)} show />
          </span>
          <span className="grow small">
            {s.romaji && <span className="romaji">{vocabRomaji(v)} · </span>}
            {shortMeaning({ type: 'v', vocab: v }, s.lang)}
          </span>
          <span className="tag">N{v.lv}</span>
          <AudioBtn text={v.r} />
        </button>
      ))}
    </div>
  );
}

function KanaTeach({ k }: { k: Kana }) {
  useAutoSpeak(k.c);
  const hira = normKana(k.c);
  const words = db()
    .vocab.filter((v) => v.lv === 5 && (k.sc === 'k' ? v.w.startsWith(k.c) : normKana(v.r).startsWith(hira) && v.w === v.r))
    .slice(0, 3);
  const words2 = words.length
    ? words
    : db()
        .vocab.filter((v) => v.lv === 5 && (k.sc === 'k' ? v.w.includes(k.c) : normKana(v.r).startsWith(hira)))
        .slice(0, 3);
  return (
    <>
      <div className="card center">
        <div className="big jp" lang="ja" style={{ fontSize: 96 }}>
          {k.c}
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <span style={{ fontSize: 30, fontWeight: 800 }}>{k.ro}</span>
          <AudioBtn text={k.c} />
        </div>
        <div className="muted small">{k.sc === 'h' ? 'Hiragana' : 'Katakana'}</div>
        {k.mn && <div className="mnemonic mt" style={{ textAlign: 'left' }}>{k.mn}</div>}
      </div>
      {k.c.length === 1 && (
        <div className="card">
          <h3>Cara menulis</h3>
          <StrokeAnim char={k.c} />
        </div>
      )}
      <ExampleWords words={words2} />
    </>
  );
}

function KanjiTeach({ k }: { k: Kanji }) {
  const s = useSettings();
  const words = vocabForKanji(k.c, 6);
  return (
    <>
      <div className="card center">
        <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
          <span className="tag">N{k.lv}</span>
          <span className="tag">{k.s} goresan</span>
        </div>
        <div className="big jp" lang="ja" style={{ fontSize: 110, lineHeight: 1.15 }}>
          {k.c}
        </div>
        <Meaning id={`j:${k.c}`} />
      </div>
      <div className="card">
        <div className="readings">
          {k.on.length > 0 && (
            <>
              <span className="lbl">On'yomi</span>
              <span>
                <span lang="ja" className="jp">
                  {k.on.slice(0, 4).join('、')}
                </span>
                {s.romaji && <span className="romaji"> · {k.on.slice(0, 4).map((r) => romaji(toHiragana(r))).join(', ')}</span>}
              </span>
            </>
          )}
          {k.kun.length > 0 && (
            <>
              <span className="lbl">Kun'yomi</span>
              <span>
                <span lang="ja" className="jp">
                  {k.kun.slice(0, 4).map(kunDisplay).join('、')}
                </span>
                {s.romaji && <span className="romaji"> · {k.kun.slice(0, 4).map((r) => romaji(cleanKun(r))).join(', ')}</span>}
              </span>
            </>
          )}
        </div>
        {k.cp && k.cp.length > 0 && (
          <div className="mt">
            <div className="lbl small muted" style={{ fontWeight: 700 }}>
              Komponen
            </div>
            <div className="row wrap mt" style={{ gap: 6 }}>
              {k.cp.map((c) => {
                const name = componentName(c);
                const target = db().kanjiMap.has(c) ? `j:${c}` : db().radicalMap.has(c) ? `r:${c}` : null;
                return (
                  <button key={c} className="chip" onClick={() => target && go(`item/${enc(target)}`)}>
                    <span lang="ja" className="jp" style={{ fontSize: 18 }}>
                      {c}
                    </span>
                    {name ? ` ${name}` : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {k.mn && <div className="mnemonic mt">{k.mn}</div>}
      </div>
      <div className="card">
        <h3>Urutan goresan</h3>
        <StrokeAnim char={k.c} />
      </div>
      <ExampleWords words={words} />
    </>
  );
}

function VocabTeach({ v }: { v: Vocab }) {
  const s = useSettings();
  useAutoSpeak(v.r);
  const ks = Array.from(new Set(kanjiIn(v.w)));
  return (
    <>
      <div className="card center">
        <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
          <span className="tag">N{v.lv}</span>
          {v.cat && CAT_NAME[v.cat] && <span className="tag">{CAT_NAME[v.cat]}</span>}
        </div>
        <div className={v.w.length > 4 ? 'big sm' : 'big md'} style={{ marginTop: 8 }}>
          <Ruby text={vocabRuby(v)} show />
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <span lang="ja" className="jp" style={{ fontSize: 18 }}>
            {v.r}
          </span>
          {s.romaji && <span className="romaji">{vocabRomaji(v)}</span>}
          <AudioBtn text={v.r} />
          <AudioBtn text={v.r} slow />
        </div>
        <div className="mt">
          <Meaning id={`v:${v.key}`} />
        </div>
        {v.nt && <div className="small muted mt">Catatan: {v.nt}</div>}
        {v.alt && <div className="small muted">Bentuk lain: {v.alt.join('、')}</div>}
      </div>
      {ks.length > 0 && (
        <div className="card">
          <h3>Kanji di kata ini</h3>
          {ks.map((c) => {
            const k = db().kanjiMap.get(c);
            return (
              <button key={c} className="ex-word" onClick={() => k && go(`item/${enc('j:' + c)}`)}>
                <span className="w jp" lang="ja" style={{ fontSize: 30 }}>
                  {c}
                </span>
                <span className="grow small">{k ? shortMeaning({ type: 'j', kanji: k }, s.lang) : 'kanji di luar daftar JLPT'}</span>
                {k && <span className="tag">N{k.lv}</span>}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

export function GrammarTeach({ g }: { g: Grammar }) {
  return (
    <>
      <div className="card">
        <span className="tag">Tata bahasa N{g.lv}</span>
        <div className="big xs mt" style={{ textAlign: 'left' }} lang="ja">
          {g.t}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{g.m}</div>
        <div className="note-box mt" lang="ja">
          {g.p}
        </div>
        {g.x.map((x, i) => (
          <p key={i} style={{ marginBottom: 0 }}>
            <Rich text={x} />
          </p>
        ))}
      </div>
      <div className="card">
        <h3>Contoh</h3>
        {g.ex.map((e, i) => (
          <div key={i} className="row" style={{ alignItems: 'flex-start', padding: '8px 0', borderBottom: i < g.ex.length - 1 ? '1px solid var(--line)' : 0 }}>
            <Sentence toks={e.t} tr={e.id} className="grow" />
            <AudioBtn text={sentPlain(e.t)} />
          </div>
        ))}
      </div>
    </>
  );
}

function RadicalTeach({ r }: { r: Radical }) {
  const s = useSettings();
  return (
    <>
      <div className="card center">
        <span className="tag">Radikal</span>
        <div className="big jp" lang="ja" style={{ fontSize: 100 }}>
          {r.c}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{s.lang === 'en' ? r.en : r.id}</div>
        {s.lang === 'both' && <div className="muted small">{r.en}</div>}
      </div>
      <div className="card">
        <h3>Contoh kanji</h3>
        <div className="row wrap">
          {Array.from(r.ex).map((c) => {
            const k = db().kanjiMap.get(c);
            return (
              <button key={c} className="chip" onClick={() => k && go(`item/${enc('j:' + c)}`)}>
                <span lang="ja" className="jp" style={{ fontSize: 22 }}>
                  {c}
                </span>
                {k ? ` ${shortMeaning({ type: 'j', kanji: k }, s.lang)}` : ''}
              </button>
            );
          })}
        </div>
      </div>
      <div className="card">
        <StrokeAnim char={r.c} />
      </div>
    </>
  );
}
