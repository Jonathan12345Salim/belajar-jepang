import { useState } from 'react';
import { getItem, itemFace, shortMeaning, kunDisplay } from '../../lib/items';
import { go } from '../../lib/router';
import { addXp, useSettings } from '../../lib/store';
import { shuffle } from '../../lib/util';
import { Header, Seg } from '../../components/ui';
import { WritePad, StrokeAnim } from '../../components/Stroke';
import { AudioBtn } from '../../components/Ruby';
import { Setup } from './PracticeRouter';

export function Writing({ initial }: { initial?: string }) {
  const s = useSettings();
  const [list, setList] = useState<string[] | null>(initial ? [initial] : null);
  const [mode, setMode] = useState<'guide' | 'memory'>('guide');
  const [i, setI] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [showAnim, setShowAnim] = useState(false);

  if (!list)
    return (
      <Setup
        method="write"
        types="hkj"
        counts={[5, 10, 20]}
        onStart={(ids, n) => {
          const chars = ids.filter((id) => id.length === 3); // 1 karakter saja
          setList(shuffle(chars).slice(0, n));
          setI(0);
          setResult(null);
        }}
      >
        <div className="mt small" style={{ fontWeight: 700 }}>
          Mode
        </div>
        <div className="mt">
          <Seg
            value={mode}
            onChange={setMode}
            options={[
              ['guide', 'Dengan panduan'],
              ['memory', 'Dari ingatan'],
            ]}
          />
        </div>
        <div className="small muted mt">Dengan panduan: bentuk huruf terlihat samar. Dari ingatan: tulis tanpa contoh, ada petunjuk bila salah 2×.</div>
      </Setup>
    );

  const id = list[i];
  if (!id)
    return (
      <div>
        <Header title="Latihan menulis" />
        <div className="card center">
          <div style={{ fontSize: 54 }}>✍️</div>
          <h2>Latihan selesai!</h2>
        </div>
        <div className="pad stack">
          <button className="btn block" onClick={() => (initial ? history.back() : setList(null))}>
            {initial ? 'Kembali' : 'Latihan lagi'}
          </button>
          <button className="btn block ghost" onClick={() => go('practice')}>
            Menu latihan
          </button>
        </div>
      </div>
    );

  const it = getItem(id);
  if (!it) return null;
  const ch = itemFace(it);
  const isKana = it.type === 'h' || it.type === 'k';
  const hint = isKana ? `bacaan "${it.type === 'h' || it.type === 'k' ? it.kana.ro : ''}"` : shortMeaning(it, s.lang);
  const reading = it.type === 'j' ? [it.kanji.on[0], it.kanji.kun[0] && kunDisplay(it.kanji.kun[0])].filter(Boolean).join(' / ') : '';

  return (
    <div>
      <Header title={`Menulis ${i + 1}/${list.length}`} />
      <div className="card center">
        {mode === 'guide' ? (
          <div className="row" style={{ justifyContent: 'center' }}>
            <span className="big md jp" lang="ja">
              {ch}
            </span>
            <span className="grow" style={{ textAlign: 'left' }}>
              <b>{hint}</b>
              {reading && (
                <div className="small muted" lang="ja">
                  {reading}
                </div>
              )}
            </span>
            {isKana && <AudioBtn text={ch} />}
          </div>
        ) : (
          <div>
            Tulis {isKana ? (it.type === 'h' ? 'hiragana' : 'katakana') : 'kanji'} untuk: <b>{hint}</b>
            {reading && (
              <div className="small muted" lang="ja">
                {reading}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="pad">
        <WritePad key={id + mode} char={ch} mode={mode} onDone={(m) => {
          setResult(m);
          addXp(m === 0 ? 3 : 1);
        }} />
      </div>
      {result !== null && (
        <div className={`feedback ${result === 0 ? 'ok' : 'ng'}`} style={{ margin: '14px' }}>
          <div className="verdict">{result === 0 ? 'Sempurna! 🎉' : `Selesai dengan ${result} kesalahan`}</div>
          <button
            className="btn block mt"
            onClick={() => {
              setResult(null);
              setShowAnim(false);
              setI(i + 1);
            }}
          >
            Berikutnya →
          </button>
        </div>
      )}
      <div className="pad mt">
        <button className="btn block ghost" onClick={() => setShowAnim(!showAnim)}>
          {showAnim ? 'Sembunyikan contoh' : '👀 Lihat animasi contoh'}
        </button>
        {showAnim && (
          <div className="mt">
            <StrokeAnim char={ch} max={200} />
          </div>
        )}
      </div>
    </div>
  );
}
