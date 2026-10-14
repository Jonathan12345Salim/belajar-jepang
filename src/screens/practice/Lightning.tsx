import { useEffect, useRef, useState } from 'react';
import { makeQuestion, type Question } from '../../lib/quiz';
import { buzz } from '../../lib/native';
import { go } from '../../lib/router';
import { getState, practiceAnswer, saveBest, useProgress } from '../../lib/store';
import { speak } from '../../lib/tts';
import { cls, pick } from '../../lib/util';
import { Header } from '../../components/ui';
import { Ruby, Sentence } from '../../components/Ruby';
import { Setup } from './PracticeRouter';

const DURATION = 60;

export function Lightning() {
  const p = useProgress();
  const [ids, setIds] = useState<string[] | null>(null);
  const [poolKey, setPoolKey] = useState('');
  const [q, setQ] = useState<Question | null>(null);
  const [left, setLeft] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const nextQ = (list: string[]) => {
    for (let t = 0; t < 10; t++) {
      const nq = makeQuestion(pick(list), 'choice');
      if (nq && nq.mode !== 'gram-fill' && !nq.listen) {
        setQ(nq);
        setPicked(null);
        return;
      }
    }
  };

  useEffect(() => {
    if (!ids) return;
    setLeft(DURATION);
    timer.current = window.setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(timer.current);
  }, [ids]);

  useEffect(() => {
    if (left <= 0) {
      clearInterval(timer.current);
      saveBest('speed-' + poolKey, score);
    }
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ids)
    return (
      <Setup
        method="speed"
        types="hkjvr"
        counts={[DURATION]}
        onStart={(list, _n, pool) => {
          setPoolKey(pool);
          setScore(0);
          setWrong(0);
          setIds(list);
          nextQ(list);
        }}
      >
        <div className="small muted mt">Waktu: 60 detik. Jawab cepat, salah tidak mengurangi skor.</div>
      </Setup>
    );

  if (left <= 0)
    return (
      <div>
        <Header title="Kilat 60 detik" />
        <div className="card center">
          <div style={{ fontSize: 54 }}>⚡</div>
          <h2>{score} jawaban benar</h2>
          <div className="muted">Salah {wrong} · Rekor: {Math.max(score, p.best['speed-' + poolKey] ?? 0)}</div>
        </div>
        <div className="pad stack">
          <button className="btn block" onClick={() => setIds(null)}>
            Main lagi
          </button>
          <button className="btn block ghost" onClick={() => go('practice')}>
            Menu latihan
          </button>
        </div>
      </div>
    );

  if (!q) return null;
  const choose = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    const ok = i === q.correct;
    buzz(ok ? 'ok' : 'ng');
    practiceAnswer(getState().cards[q.id] ? q.id : null, ok);
    if (ok) setScore((s) => s + 1);
    else {
      setWrong((w) => w + 1);
      if (q.audio) void speak(q.audio);
    }
    setTimeout(() => nextQ(ids), ok ? 250 : 900);
  };

  return (
    <div>
      <Header title="Kilat 60 detik" right={<span className="timer" style={{ color: left <= 10 ? 'var(--ng)' : undefined }}>⏱ {left}s</span>} />
      <div className="quiz">
        <div className="spread mb">
          <span className="small muted">{q.ask}</span>
          <b>✓ {score}</b>
        </div>
        <div className="prompt">
          {q.big && <div className={cls('big', q.big.length > 4 ? 'sm' : q.big.length > 2 ? 'md' : '')}>{q.bigJp ? <Ruby text={q.big} /> : q.big}</div>}
          {q.sentence && <Sentence toks={q.sentence.toks} blank={q.sentence.blank} />}
          {q.text && <div className={q.big ? 'hint' : 'text'}>{q.text}</div>}
        </div>
        <div className="choices two">
          {q.choices!.map((c, i) => (
            <button key={q.key + i} className={cls('choice', c.jp && 'jp', picked !== null && (i === q.correct ? 'ok' : i === picked ? 'ng' : 'dim'))} onClick={() => choose(i)}>
              {c.jp ? <Ruby text={c.label} /> : c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
