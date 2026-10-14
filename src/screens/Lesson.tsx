import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/data';
import { INFO } from '../lib/info';
import { getPath, lessonDone, type Lesson } from '../lib/path';
import { gramFill, makeQuestion, type Mode, type Question } from '../lib/quiz';
import { enc, go, replace } from '../lib/router';
import { addXp, getState, learnItems, markDone, useProgress } from '../lib/store';
import { shuffle } from '../lib/util';
import { Header, Bar, Empty } from '../components/ui';
import { QuizView } from '../components/QuizView';
import { Teach } from '../components/Teach';
import { Rich, Ruby } from '../components/Ruby';
import { AudioBtn } from '../components/Ruby';
import { kanaOf } from '../lib/text';

function lessonMode(id: string, round: number): Mode {
  switch (id[0]) {
    case 'h':
    case 'k':
      return round === 0 ? 'kana-ro' : 'kana-char';
    case 'j':
      return round === 0 ? 'kanji-mean' : 'kanji-char';
    case 'v':
      return round === 0 ? 'vocab-mean' : 'vocab-word';
    case 'g':
      return 'gram-fill';
    default:
      return 'rad-mean';
  }
}

function lessonQuestions(items: string[]): Question[] {
  const qs: Question[] = [];
  for (const id of items) {
    if (id[0] === 'g') {
      const g = db().grammarMap.get(id.slice(2));
      if (!g) continue;
      g.ex.forEach((e, i) => {
        if (e.k !== undefined && qs.filter((q) => q.id === id).length < 2) {
          const d = gramFill(g, { id, mode: 'gram-fill', note: [] }, i);
          if (d) qs.push({ ...d, key: `${id}#${i}` });
        }
      });
    } else {
      const q = makeQuestion(id, 'choice', lessonMode(id, 0));
      if (q) qs.push(q);
    }
  }
  return shuffle(qs);
}

export function LessonScreen({ id }: { id: string }) {
  const { lessons } = getPath(db());
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) return <Empty icon="🤔" title="Pelajaran tidak ditemukan" />;
  if (lesson.kind === 'info') return <InfoLesson lesson={lesson} />;
  if (lesson.kind === 'story') return <Redirect to={`story/${enc(lesson.ref!)}`} />;
  if (lesson.kind === 'exam') return <Redirect to={`exam/${enc(lesson.ref!)}?l=${enc(lesson.id)}`} />;
  return <ItemsLesson lesson={lesson} />;
}

function Redirect({ to }: { to: string }) {
  useEffect(() => replace(to), [to]);
  return null;
}

function nextAfter(l: Lesson): Lesson | null {
  const { lessons } = getPath(db());
  const p = getState();
  return lessons.slice(l.index + 1).find((x) => !lessonDone(x, p)) ?? null;
}

function Finish({ lesson, children }: { lesson: Lesson; children?: React.ReactNode }) {
  const nx = nextAfter(lesson);
  return (
    <div className="pad" style={{ paddingTop: 30 }}>
      <div className="card center" style={{ margin: 0 }}>
        <div style={{ fontSize: 60 }}>🎉</div>
        <h2>Pelajaran selesai!</h2>
        {children}
      </div>
      {nx && (
        <button className="btn block mt" onClick={() => replace(`lesson/${enc(nx.id)}`)}>
          Lanjut: {nx.title} →
        </button>
      )}
      <button className="btn block ghost mt" onClick={() => go('')}>
        Ke beranda
      </button>
    </div>
  );
}

function InfoLesson({ lesson }: { lesson: Lesson }) {
  const info = INFO[lesson.ref!];
  const [i, setI] = useState(0);
  const [fin, setFin] = useState(false);
  if (!info) return <Empty icon="🤔" title="Halaman tidak ditemukan" />;
  if (fin) return <Finish lesson={lesson} />;
  const page = info.pages[i];
  const last = i === info.pages.length - 1;
  return (
    <div>
      <Header title={info.title} />
      <div className="pad mb">
        <Bar value={i + 1} max={info.pages.length} />
      </div>
      <div className="card">
        <h2>{page.title}</h2>
        {page.body.map((b, k) => (
          <p key={k}>
            <Rich text={b} />
          </p>
        ))}
      </div>
      {page.examples && (
        <div className="card">
          <h3>Contoh</h3>
          {page.examples.map((e, k) => (
            <div key={k} className="ex-word">
              <span className="w">
                <Ruby text={e.jp} show />
              </span>
              <span className="grow small">
                <span className="romaji">{e.ro}</span> · {e.id}
              </span>
              <AudioBtn text={kanaOf(e.jp)} />
            </div>
          ))}
        </div>
      )}
      <div className="sticky-bottom row">
        {i > 0 && (
          <button className="btn ghost" onClick={() => setI(i - 1)}>
            ←
          </button>
        )}
        <button
          className="btn grow"
          onClick={() => {
            if (!last) setI(i + 1);
            else {
              markDone(lesson.id);
              addXp(5);
              setFin(true);
            }
          }}
        >
          {last ? 'Selesai ✓' : 'Lanjut →'}
        </button>
      </div>
    </div>
  );
}

function ItemsLesson({ lesson }: { lesson: Lesson }) {
  const p = useProgress();
  const already = lessonDone(lesson, p);
  const [phase, setPhase] = useState<'learn' | 'quiz' | 'done'>('learn');
  const [i, setI] = useState(0);
  const initialQs = useMemo(() => lessonQuestions(lesson.items), [lesson.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [queue, setQueue] = useState<Question[]>(initialQs);
  const [qi, setQi] = useState(0);
  const [wrong, setWrong] = useState(0);
  const items = lesson.items;

  if (phase === 'done')
    return (
      <Finish lesson={lesson}>
        <p>
          {already ? 'Kamu sudah mengulang pelajaran ini.' : `${items.length} item baru masuk ke Review.`}
          {wrong > 0 && ` Salah ${wrong} kali, tidak apa-apa!`}
        </p>
        {!already && <p className="small muted">Review pertama sekitar 4 jam lagi. Kembali nanti, ya!</p>}
      </Finish>
    );

  if (phase === 'learn') {
    const last = i === items.length - 1;
    return (
      <div>
        <Header title={lesson.title} />
        <div className="pad mb row">
          <div className="grow">
            <Bar value={i + 1} max={items.length} />
          </div>
          <span className="small muted">
            {i + 1}/{items.length}
          </span>
        </div>
        <Teach key={items[i]} id={items[i]} />
        <div className="sticky-bottom row">
          {i > 0 && (
            <button className="btn ghost" onClick={() => setI(i - 1)}>
              ←
            </button>
          )}
          <button className="btn grow" onClick={() => (last ? setPhase('quiz') : setI(i + 1))}>
            {last ? 'Mulai kuis ✓' : 'Berikutnya →'}
          </button>
        </div>
      </div>
    );
  }

  const q = queue[qi];
  if (!q) {
    // semua soal terjawab benar
    return <QuizEnd onEnd={() => {
      if (!already) learnItems(items);
      else addXp(2);
      setPhase('done');
    }} />;
  }
  const remaining = queue.length - qi;
  return (
    <div>
      <Header title="Kuis pelajaran" />
      <div className="pad mb row">
        <div className="grow">
          <Bar value={qi} max={queue.length} />
        </div>
        <span className="small muted">sisa {remaining}</span>
      </div>
      <QuizView
        q={q}
        onDone={(ok) => {
          if (!ok) {
            setWrong((w) => w + 1);
            const again = q.mode === 'gram-fill' ? { ...q, key: q.key + 'r' } : makeQuestion(q.id, 'choice', lessonMode(q.id, 1)) ?? q;
            setQueue((qs) => [...qs, { ...again, key: again.key + '-' + qs.length }]);
          }
          setQi((x) => x + 1);
        }}
      />
    </div>
  );
}

function QuizEnd({ onEnd }: { onEnd: () => void }) {
  useEffect(() => {
    onEnd();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
