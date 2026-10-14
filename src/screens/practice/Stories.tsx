import { useEffect, useRef, useState } from 'react';
import { db } from '../../lib/data';
import { buzz } from '../../lib/native';
import { enc, go } from '../../lib/router';
import { addXp, markDone, useProgress } from '../../lib/store';
import { sentPlain } from '../../lib/text';
import { speak, stopSpeak } from '../../lib/tts';
import { cls } from '../../lib/util';
import { Empty, Header, Toggle } from '../../components/ui';
import { AudioBtn, Sentence } from '../../components/Ruby';

export function StoryList() {
  const p = useProgress();
  const stories = db().stories;
  return (
    <div>
      <Header title="Baca cerita" />
      {!stories.length && <Empty icon="📖" title="Belum ada cerita" />}
      <div className="list">
        {stories.map((s) => (
          <button key={s.id} className="li" onClick={() => go(`story/${enc(s.id)}`)}>
            <span className="face">{p.done['story-' + s.id] ? '✅' : '📖'}</span>
            <span className="grow">
              <div className="t" lang="ja">
                {s.t}
              </div>
              <div className="s">
                {s.ti} · N{s.lv} · {s.s.length} kalimat
              </div>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function StoryReader({ id }: { id: string }) {
  const story = db().stories.find((s) => s.id === id);
  const [showTr, setShowTr] = useState(false);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const stopRef = useRef(false);

  useEffect(
    () => () => {
      stopRef.current = true;
      void stopSpeak();
    },
    [],
  );

  if (!story) return <Empty icon="🤔" title="Cerita tidak ditemukan" />;

  const playAll = async () => {
    stopRef.current = false;
    for (let i = 0; i < story.s.length; i++) {
      if (stopRef.current) break;
      setPlaying(i);
      await speak(sentPlain(story.s[i].t));
      await new Promise((r) => setTimeout(r, 400));
    }
    setPlaying(null);
  };

  if (quiz !== null) {
    const q = story.q[quiz];
    if (!q) {
      return (
        <div>
          <Header title="Hasil kuis cerita" />
          <div className="card center">
            <div style={{ fontSize: 54 }}>📖</div>
            <h2>
              {score}/{story.q.length} benar
            </h2>
            <div className="muted">Cerita ditandai sudah dibaca.</div>
          </div>
          <div className="pad stack">
            <button className="btn block" onClick={() => go('path')}>
              Ke jalur belajar
            </button>
            <button className="btn block ghost" onClick={() => go('stories')}>
              Cerita lainnya
            </button>
          </div>
        </div>
      );
    }
    return (
      <div>
        <Header title={`Kuis ${quiz + 1}/${story.q.length}`} onBack={() => setQuiz(null)} />
        <div className="quiz">
          <div className="prompt">
            <div className="text">{q.q}</div>
          </div>
          <div className="choices">
            {q.o.map((o, i) => (
              <button
                key={i}
                className={cls('choice', picked !== null && (i === q.a ? 'ok' : i === picked ? 'ng' : 'dim'))}
                onClick={() => {
                  if (picked !== null) return;
                  setPicked(i);
                  buzz(i === q.a ? 'ok' : 'ng');
                  if (i === q.a) setScore((s) => s + 1);
                }}
              >
                {o}
              </button>
            ))}
          </div>
          {picked !== null && (
            <button
              className="btn block mt"
              onClick={() => {
                const nx = quiz + 1;
                setPicked(null);
                if (nx >= story.q.length) {
                  markDone('story-' + story.id);
                  addXp(10);
                }
                setQuiz(nx);
              }}
            >
              Lanjut →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={story.ti} />
      <div className="card">
        <div className="big xs" style={{ textAlign: 'left' }} lang="ja">
          {story.t}
        </div>
        <div className="spread mt">
          <span className="small">Tampilkan semua terjemahan</span>
          <Toggle on={showTr} onChange={setShowTr} />
        </div>
        <div className="row mt">
          {playing === null ? (
            <button className="btn sm" onClick={playAll}>
              ▶ Putar semua
            </button>
          ) : (
            <button
              className="btn sm ghost"
              onClick={() => {
                stopRef.current = true;
                void stopSpeak();
                setPlaying(null);
              }}
            >
              ■ Berhenti
            </button>
          )}
          <span className="small muted">Ketuk kalimat untuk melihat artinya.</span>
        </div>
      </div>
      <div className="card">
        {story.s.map((x, i) => (
          <div
            key={i}
            className="row"
            style={{
              alignItems: 'flex-start',
              padding: '6px 4px',
              borderRadius: 10,
              background: playing === i ? 'var(--accent-2)' : undefined,
              borderBottom: i < story.s.length - 1 ? '1px solid var(--line)' : 0,
            }}
            onClick={() => {
              const n = new Set(open);
              if (n.has(i)) n.delete(i);
              else n.add(i);
              setOpen(n);
            }}
          >
            <Sentence toks={x.t} tr={x.id} showTr={showTr || open.has(i)} speaker={x.sp} className="grow" />
            <AudioBtn text={sentPlain(x.t)} />
          </div>
        ))}
      </div>
      {story.q.length > 0 && (
        <div className="pad">
          <button className="btn block" onClick={() => (setQuiz(0), setScore(0))}>
            Kuis pemahaman ({story.q.length} soal) →
          </button>
        </div>
      )}
    </div>
  );
}
