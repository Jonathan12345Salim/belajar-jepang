import { useState, type ReactNode } from 'react';
import { makeQuestion, poolIds, type Filter, type Mode, type Question } from '../../lib/quiz';
import { go } from '../../lib/router';
import { getState, practiceAnswer, useProgress } from '../../lib/store';
import { shuffle } from '../../lib/util';
import { Bar, Empty, Header, Seg } from '../../components/ui';
import { PoolPicker, defaultPool } from '../../components/PoolPicker';
import { QuizView } from '../../components/QuizView';
import { METHODS } from '../PracticeHub';
import { Flashcards } from './Flashcards';
import { Matching } from './Matching';
import { Lightning } from './Lightning';
import { Writing } from './Writing';
import { SentenceBuild, Shadowing } from './Sentences';
import { Radicals } from './Radicals';

export function PracticeRouter({ method, q }: { method: string; q: URLSearchParams }) {
  switch (method) {
    case 'flash':
      return <Flashcards />;
    case 'quiz':
      return <QuizPractice method="quiz" filter="choice" types="hkjvgr" />;
    case 'type':
      return <QuizPractice method="type" filter="type" types="hkv" />;
    case 'listen':
      return <QuizPractice method="listen" filter="listen" types="hkv" />;
    case 'dict':
      return <QuizPractice method="dict" filter="dict" types="v" />;
    case 'fill':
      return <QuizPractice method="fill" filter="choice" forced="gram-fill" types="g" />;
    case 'match':
      return <Matching />;
    case 'speed':
      return <Lightning />;
    case 'write':
      return <Writing initial={q.get('c') ?? undefined} />;
    case 'build':
      return <SentenceBuild />;
    case 'shadow':
      return <Shadowing />;
    case 'radical':
      return <Radicals />;
    case 'pool':
      return <QuizPractice method="quiz" filter="any" types="hkjvgr" presetPool={q.get('pool') ?? undefined} />;
  }
  return <Empty icon="🤔" title="Metode tidak ditemukan" />;
}

/** Layar persiapan: pilih sumber & jumlah soal. */
export function Setup({
  method,
  types,
  onStart,
  children,
  counts = [10, 20, 30],
  presetPool,
}: {
  method: string;
  types: string;
  onStart: (ids: string[], count: number, pool: string) => void;
  children?: ReactNode;
  counts?: number[];
  presetPool?: string;
}) {
  const p = useProgress();
  const m = METHODS.find((x) => x.id === method);
  const hasLearned = poolIds('learned', p, types).length >= 4;
  const [pool, setPool] = useState(presetPool ?? defaultPool(types, hasLearned));
  const [count, setCount] = useState(counts[0]);
  const ids = poolIds(pool, p, types);
  return (
    <div>
      <Header title={m?.t ?? 'Latihan'} />
      <div className="card">
        <div className="muted">{m?.s}</div>
        <div className="mt small" style={{ fontWeight: 700 }}>
          Sumber latihan
        </div>
        <div className="mt">
          <PoolPicker value={pool} onChange={setPool} types={types} />
        </div>
        {counts.length > 1 && (
          <>
            <div className="mt small" style={{ fontWeight: 700 }}>
              Jumlah soal
            </div>
            <div className="mt">
              <Seg value={count} options={counts.map((c) => [c, String(c)] as [number, string])} onChange={setCount} />
            </div>
          </>
        )}
        {children}
        {ids.length < 4 && <div className="note-box mt">Item di sumber ini masih terlalu sedikit. Pilih sumber lain atau pelajari lebih banyak item dulu.</div>}
        <button className="btn block mt" disabled={ids.length < 4} onClick={() => onStart(ids, count, pool)}>
          Mulai ▶
        </button>
      </div>
    </div>
  );
}

function QuizPractice({ method, filter, types, forced, presetPool }: { method: string; filter: Filter; types: string; forced?: Mode; presetPool?: string }) {
  const [qs, setQs] = useState<Question[] | null>(null);
  const [qi, setQi] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongIds, setWrongIds] = useState<string[]>([]);

  const start = (ids: string[], count: number) => {
    const out: Question[] = [];
    for (const id of shuffle(ids)) {
      if (out.length >= count) break;
      const q = makeQuestion(id, filter, forced);
      if (q) out.push(q);
    }
    setQs(out);
    setQi(0);
    setScore(0);
    setWrongIds([]);
  };

  if (!qs) return <Setup method={method} types={types} onStart={start} presetPool={presetPool} />;
  if (!qs.length) return <Empty icon="🤔" title="Tidak ada soal yang cocok untuk sumber ini" />;
  const q = qs[qi];
  if (!q) {
    const pct = Math.round((score / qs.length) * 100);
    return (
      <div>
        <Header title="Hasil latihan" />
        <div className="card center">
          <div style={{ fontSize: 54 }}>{pct >= 80 ? '🌟' : pct >= 50 ? '👍' : '💪'}</div>
          <h2>
            {score}/{qs.length} benar ({pct}%)
          </h2>
          {wrongIds.length > 0 && <div className="muted small">{wrongIds.length} item salah tercatat di daftar "Item sulit".</div>}
        </div>
        <div className="pad stack">
          <button className="btn block" onClick={() => setQs(null)}>
            Latihan lagi
          </button>
          <button className="btn block ghost" onClick={() => go('practice')}>
            Kembali ke menu latihan
          </button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <Header title={METHODS.find((m) => m.id === method)?.t ?? 'Latihan'} right={<span className="small muted">{score} ✓</span>} />
      <div className="pad mb">
        <Bar value={qi} max={qs.length} />
      </div>
      <QuizView
        q={q}
        onDone={(ok) => {
          practiceAnswer(getState().cards[q.id] ? q.id : null, ok);
          if (ok) setScore((s) => s + 1);
          else setWrongIds((w) => [...w, q.id]);
          setQi((x) => x + 1);
        }}
      />
    </div>
  );
}
