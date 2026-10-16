import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../../lib/data';
import { buzz } from '../../lib/native';
import { enc, go, replace } from '../../lib/router';
import { addXp, markDone, useProgress } from '../../lib/store';
import { plain, sentPlain } from '../../lib/text';
import { speak, stopSpeak } from '../../lib/tts';
import { LEVELS, type Story, type StorySentence } from '../../lib/types';
import { cls } from '../../lib/util';
import { Empty, Header, Toggle } from '../../components/ui';
import { AudioBtn, Ruby, Sentence } from '../../components/Ruby';

// ---------------------------------------------------------------- posisi baca
const POS_KEY = 'belajar-jepang-posisi-cerita';

function readPos(id: string): number {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) || '{}')[id] ?? 0;
  } catch {
    return 0;
  }
}

function savePos(id: string, i: number) {
  try {
    const all = JSON.parse(localStorage.getItem(POS_KEY) || '{}');
    all[id] = i;
    localStorage.setItem(POS_KEY, JSON.stringify(all));
  } catch {
    /* abaikan */
  }
}

/** Kelompokkan kalimat per paragraf (pb = awal paragraf). */
function paragraphs(s: StorySentence[]): { start: number; items: StorySentence[] }[] {
  const out: { start: number; items: StorySentence[] }[] = [];
  s.forEach((x, i) => {
    if (!out.length || x.pb) out.push({ start: i, items: [] });
    out[out.length - 1].items.push(x);
  });
  return out;
}

export const isLong = (s: Story) => !!s.pl;

// ---------------------------------------------------------------- daftar
export function StoryList({ tab }: { tab: 'pendek' | 'panjang' }) {
  const p = useProgress();
  const all = db().stories;
  const list = all.filter((s) => (tab === 'panjang') === isLong(s));
  const count = (long: boolean) => all.filter((s) => isLong(s) === long).length;
  return (
    <div>
      <Header title="Baca cerita" />
      <div className="chips">
        <button className={cls('chip', tab === 'pendek' && 'on')} onClick={() => replace('stories?t=pendek')}>
          📖 Cerita pendek ({count(false)})
        </button>
        <button className={cls('chip', tab === 'panjang' && 'on')} onClick={() => replace('stories?t=panjang')}>
          📚 Cerita panjang ({count(true)})
        </button>
      </div>
      <p className="pad small muted" style={{ marginTop: 0 }}>
        {tab === 'panjang'
          ? 'Cerita panjang per paragraf, dari N5 sampai N1. Posisi bacamu tersimpan, jadi bisa dilanjutkan kapan saja.'
          : 'Cerita singkat untuk pemanasan membaca dan mendengar.'}
      </p>
      {!list.length && <Empty icon="📖" title="Belum ada cerita" />}
      {LEVELS.map((lv) => {
        const ls = list.filter((s) => s.lv === lv);
        if (!ls.length) return null;
        return (
          <div key={lv}>
            <h2 className="sec">JLPT N{lv}</h2>
            <div className="list">
              {ls.map((s) => {
                const done = !!p.done['story-' + s.id];
                const pars = paragraphs(s.s).length;
                const pos = isLong(s) ? readPos(s.id) : 0;
                return (
                  <button key={s.id} className="li" onClick={() => go(`story/${enc(s.id)}`)}>
                    <span className="face">{done ? '✅' : isLong(s) ? '📚' : '📖'}</span>
                    <span className="grow">
                      <div className="t" lang="ja">
                        {plain(s.t)}
                      </div>
                      <div className="s" style={{ whiteSpace: 'normal' }}>
                        {s.ti} · {s.s.length} kalimat{pars > 1 ? ` · ${pars} paragraf` : ''}
                        {!done && pos > 0 ? ` · lanjut dari kalimat ${pos + 1}` : ''}
                      </div>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- pembaca
export function StoryReader({ id }: { id: string }) {
  const story = db().stories.find((s) => s.id === id);
  const [showTr, setShowTr] = useState(false);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState<number | null>(null);
  const [quiz, setQuiz] = useState<number | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [resume] = useState(() => (story && isLong(story) ? readPos(story.id) : 0));
  const stopRef = useRef(false);
  const pars = useMemo(() => (story ? paragraphs(story.s) : []), [story]);

  useEffect(
    () => () => {
      stopRef.current = true;
      void stopSpeak();
    },
    [],
  );

  if (!story) return <Empty icon="🤔" title="Cerita tidak ditemukan" />;
  const long = isLong(story);

  const mark = (i: number) => {
    if (long) savePos(story.id, i);
  };

  const play = async (from: number, to: number) => {
    stopRef.current = true;
    await stopSpeak();
    stopRef.current = false;
    for (let i = from; i < to; i++) {
      if (stopRef.current) break;
      setPlaying(i);
      mark(i);
      document.getElementById(`s-${i}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await speak(sentPlain(story.s[i].t));
      await new Promise((r) => setTimeout(r, 400));
    }
    if (!stopRef.current) setPlaying(null);
  };

  const stop = () => {
    stopRef.current = true;
    void stopSpeak();
    setPlaying(null);
  };

  if (quiz !== null) {
    const q = story.q[quiz];
    if (!q) {
      return (
        <div>
          <Header title="Hasil kuis cerita" />
          <div className="card center">
            <div style={{ fontSize: 54 }}>{long ? '📚' : '📖'}</div>
            <h2>
              {score}/{story.q.length} benar
            </h2>
            <div className="muted">Cerita ditandai sudah dibaca.</div>
          </div>
          <div className="pad stack">
            <button className="btn block" onClick={() => go('path')}>
              Ke jalur belajar
            </button>
            <button className="btn block ghost" onClick={() => go(`stories?t=${long ? 'panjang' : 'pendek'}`)}>
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
                  addXp(long ? 20 : 10);
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
        <div className="row" style={{ gap: 6 }}>
          <span className="tag">N{story.lv}</span>
          <span className="tag">{long ? 'Cerita panjang' : 'Cerita pendek'}</span>
          <span className="small muted">
            {story.s.length} kalimat{pars.length > 1 ? ` · ${pars.length} paragraf` : ''}
          </span>
        </div>
        <div className="big xs mt" style={{ textAlign: 'left' }}>
          <Ruby text={story.t} />
        </div>
        <div className="spread mt">
          <span className="small">Tampilkan semua terjemahan</span>
          <Toggle on={showTr} onChange={setShowTr} />
        </div>
        <div className="row wrap mt">
          {playing === null ? (
            <button className="btn sm" onClick={() => play(0, story.s.length)}>
              ▶ Putar semua
            </button>
          ) : (
            <button className="btn sm ghost" onClick={stop}>
              ■ Berhenti
            </button>
          )}
          {long && resume > 0 && playing === null && (
            <button
              className="btn sm sec"
              onClick={() => document.getElementById(`s-${resume}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
            >
              ↓ Lanjut dari kalimat {resume + 1}
            </button>
          )}
        </div>
        <div className="small muted mt">Ketuk kalimat untuk melihat artinya.</div>
      </div>
      {pars.map((par, pi) => (
        <div key={pi} className="card">
          {pars.length > 1 && (
            <div className="spread" style={{ marginBottom: 4 }}>
              <span className="small muted" style={{ fontWeight: 700 }}>
                Paragraf {pi + 1}/{pars.length}
              </span>
              <button
                className="icon-btn"
                aria-label="Putar paragraf ini"
                onClick={() => (playing === null ? play(par.start, par.start + par.items.length) : stop())}
              >
                {playing !== null && playing >= par.start && playing < par.start + par.items.length ? '■' : '▶'}
              </button>
            </div>
          )}
          {par.items.map((x, k) => {
            const i = par.start + k;
            return (
              <div
                key={i}
                id={`s-${i}`}
                className="row"
                style={{
                  alignItems: 'flex-start',
                  padding: '6px 4px',
                  borderRadius: 10,
                  background: playing === i ? 'var(--accent-2)' : undefined,
                  borderBottom: k < par.items.length - 1 ? '1px solid var(--line)' : 0,
                }}
                onClick={() => {
                  const n = new Set(open);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  setOpen(n);
                  mark(i);
                }}
              >
                <Sentence toks={x.t} tr={x.id} showTr={showTr || open.has(i)} speaker={x.sp} className="grow" />
                <AudioBtn text={sentPlain(x.t)} />
              </div>
            );
          })}
        </div>
      ))}
      {story.q.length > 0 && (
        <div className="pad">
          <button className="btn block" onClick={() => (stop(), setQuiz(0), setScore(0))}>
            Kuis pemahaman ({story.q.length} soal) →
          </button>
        </div>
      )}
    </div>
  );
}
