import { useEffect, useState } from 'react';
import { getItem, itemFace, itemSpeech, shortMeaning } from '../../lib/items';
import { buzz } from '../../lib/native';
import { go } from '../../lib/router';
import { getState, practiceAnswer, saveBest, useSettings } from '../../lib/store';
import { speak } from '../../lib/tts';
import { chunk, cls, shuffle } from '../../lib/util';
import { Header } from '../../components/ui';
import { Ruby } from '../../components/Ruby';
import { Setup } from './PracticeRouter';

interface Pair {
  id: string;
  face: string;
  ans: string;
}

export function Matching() {
  const s = useSettings();
  const [rounds, setRounds] = useState<Pair[][] | null>(null);
  const [r, setR] = useState(0);
  const [left, setLeft] = useState<Pair[]>([]);
  const [right, setRight] = useState<Pair[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [bad, setBad] = useState<string | null>(null);
  const [miss, setMiss] = useState(0);
  const [t0, setT0] = useState(0);
  const [end, setEnd] = useState<number | null>(null);

  useEffect(() => {
    if (!rounds?.[r]) return;
    setLeft(shuffle(rounds[r]));
    setRight(shuffle(rounds[r]));
    setGone(new Set());
    setSel(null);
  }, [rounds, r]);

  if (!rounds)
    return (
      <Setup
        method="match"
        types="hkjvr"
        counts={[1, 3, 5]}
        onStart={(ids, n) => {
          const seenAns = new Set<string>();
          const pairs: Pair[] = [];
          for (const id of shuffle(ids)) {
            if (pairs.length >= n * 5) break;
            const it = getItem(id);
            if (!it) continue;
            const ans = shortMeaning(it, s.lang);
            if (seenAns.has(ans)) continue;
            seenAns.add(ans);
            pairs.push({ id, face: it.type === 'v' ? itemFace(it) : itemFace(it), ans });
          }
          setRounds(chunk(pairs, 5).filter((c) => c.length >= 3));
          setR(0);
          setMiss(0);
          setT0(Date.now());
          setEnd(null);
        }}
      >
        <div className="small muted mt">Jumlah ronde di atas (1 ronde = 5 pasang).</div>
      </Setup>
    );

  if (end !== null || !rounds[r]) {
    const secs = Math.round(((end ?? Date.now()) - t0) / 1000);
    return (
      <div>
        <Header title="Cocokkan pasangan" />
        <div className="card center">
          <div style={{ fontSize: 54 }}>🧩</div>
          <h2>Selesai dalam {secs} detik</h2>
          <div className="muted">Salah pasang: {miss} kali</div>
        </div>
        <div className="pad stack">
          <button className="btn block" onClick={() => setRounds(null)}>
            Main lagi
          </button>
          <button className="btn block ghost" onClick={() => go('practice')}>
            Menu latihan
          </button>
        </div>
      </div>
    );
  }

  const tapLeft = (p: Pair) => {
    if (gone.has(p.id)) return;
    setSel(p.id);
    buzz('tap');
    const sp = itemSpeech(getItem(p.id)!);
    if (sp) void speak(sp);
  };
  const tapRight = (p: Pair) => {
    if (!sel || gone.has(p.id)) return;
    const st = getState();
    if (p.id === sel) {
      const g = new Set(gone);
      g.add(p.id);
      setGone(g);
      setSel(null);
      buzz('ok');
      practiceAnswer(st.cards[p.id] ? p.id : null, true);
      if (g.size === rounds[r].length) {
        if (r + 1 >= rounds.length) {
          const t = Date.now();
          setEnd(t);
          saveBest('match', Math.max(0, 1000 - Math.round((t - t0) / 1000) - miss * 10));
        } else setTimeout(() => setR(r + 1), 350);
      }
    } else {
      setBad(p.id);
      setMiss((m) => m + 1);
      buzz('ng');
      practiceAnswer(st.cards[sel] ? sel : null, false);
      setTimeout(() => setBad(null), 350);
    }
  };

  return (
    <div>
      <Header title={`Cocokkan · ronde ${r + 1}/${rounds.length}`} right={<span className="small muted">salah {miss}</span>} />
      <p className="pad small muted" style={{ marginTop: 0 }}>
        Ketuk item di kiri, lalu pasangannya di kanan.
      </p>
      <div className="match">
        <div className="col">
          {left.map((p) => (
            <button key={p.id} className={cls('mcard jp', sel === p.id && 'sel', gone.has(p.id) && 'gone')} onClick={() => tapLeft(p)}>
              <Ruby text={p.face} show={false} />
            </button>
          ))}
        </div>
        <div className="col">
          {right.map((p) => (
            <button key={p.id} className={cls('mcard', gone.has(p.id) && 'gone', bad === p.id && 'ng')} onClick={() => tapRight(p)}>
              {p.ans}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
