import { useMemo, useRef, useState } from 'react';
import { getItem, itemFace, shortMeaning } from '../lib/items';
import { makeQuestion, type Question } from '../lib/quiz';
import { enc, go, replace } from '../lib/router';
import { dueIds, getState, reviewAnswer, stageInfo, useProgress } from '../lib/store';
import { shuffle } from '../lib/util';
import { Bar, Empty, Header } from '../components/ui';
import { QuizView } from '../components/QuizView';
import { Ruby } from '../components/Ruby';

export function ReviewScreen() {
  const p = useProgress();
  const initial = useMemo(() => {
    const st = getState();
    const ids = shuffle(dueIds(st).slice(0, st.settings.batch));
    return ids.map((id) => makeQuestion(id)).filter((q): q is Question => !!q);
  }, []);
  const [queue, setQueue] = useState(initial);
  const [qi, setQi] = useState(0);
  const answered = useRef(new Map<string, boolean>());
  const [, force] = useState(0);

  if (!initial.length)
    return (
      <div>
        <Header title="Review" />
        <Empty icon="✅" title="Tidak ada review sekarang">
          Semua sudah diulang. Lanjutkan pelajaran baru atau latihan bebas.
        </Empty>
        <div className="pad">
          <button className="btn block" onClick={() => go('path')}>
            Ke jalur belajar
          </button>
        </div>
      </div>
    );

  const q = queue[qi];
  if (!q) {
    const res = Array.from(answered.current.entries());
    const ok = res.filter(([, v]) => v).length;
    const left = dueIds(p).length;
    return (
      <div>
        <Header title="Hasil review" />
        <div className="card center">
          <div style={{ fontSize: 54 }}>{ok / res.length >= 0.8 ? '🌟' : '💪'}</div>
          <h2>
            {ok}/{res.length} benar ({Math.round((ok / res.length) * 100)}%)
          </h2>
          <div className="muted small">Item yang benar naik tahap dan diulang lebih jarang. Yang salah akan muncul lebih cepat.</div>
        </div>
        {res.some(([, v]) => !v) && (
          <>
            <h2 className="sec">Perlu diulang</h2>
            <div className="list">
              {res
                .filter(([, v]) => !v)
                .map(([id]) => {
                  const it = getItem(id)!;
                  const c = p.cards[id];
                  return (
                    <button key={id} className="li" onClick={() => go(`item/${enc(id)}`)}>
                      <span className="face jp" lang="ja">
                        {it.type === 'v' ? <Ruby text={itemFace(it)} /> : itemFace(it)}
                      </span>
                      <span className="grow">
                        <div className="t">{shortMeaning(it, p.settings.lang)}</div>
                        {c && <div className="s" style={{ color: stageInfo(c.s).color }}>{stageInfo(c.s).name}</div>}
                      </span>
                    </button>
                  );
                })}
            </div>
          </>
        )}
        <div className="pad stack">
          {left > 0 && (
            <button className="btn block" onClick={() => replace('review?again=' + Date.now())}>
              Review lagi ({left} tersisa)
            </button>
          )}
          <button className="btn block ghost" onClick={() => go('')}>
            Ke beranda
          </button>
        </div>
      </div>
    );
  }

  const total = answered.current.size + new Set(queue.slice(qi).map((x) => x.id).filter((id) => !answered.current.has(id))).size;
  return (
    <div>
      <Header title="Review" right={<span className="small muted">{answered.current.size}/{total}</span>} />
      <div className="pad mb">
        <Bar value={answered.current.size} max={total} />
      </div>
      <QuizView
        q={q}
        onDone={(ok) => {
          if (!answered.current.has(q.id)) {
            answered.current.set(q.id, ok);
            reviewAnswer(q.id, ok);
          }
          if (!ok) {
            const again = makeQuestion(q.id) ?? q;
            setQueue((qs) => {
              const rest = qs.length - (qi + 1);
              const pos = qi + 1 + Math.min(rest, 2 + Math.floor(Math.random() * 4));
              const copy = qs.slice();
              copy.splice(pos, 0, { ...again, key: again.key + 'r' });
              return copy;
            });
          }
          setQi((x) => x + 1);
          force((n) => n + 1);
        }}
      />
    </div>
  );
}
