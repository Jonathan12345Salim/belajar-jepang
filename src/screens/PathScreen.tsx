import { useState } from 'react';
import { db } from '../lib/data';
import { getPath, lessonDone, lessonUnlocked, nextLesson, type Lesson } from '../lib/path';
import { enc, go } from '../lib/router';
import { useProgress } from '../lib/store';
import { cls } from '../lib/util';
import { Bar, Header, toast } from '../components/ui';

const ICON: Record<string, string> = { info: '📘', story: '📖', exam: '🏁' };
const TYPE_ICON: Record<string, string> = { h: 'あ', k: 'ア', j: '字', v: '語', g: '文' };

export function PathScreen({ open }: { open?: string }) {
  const p = useProgress();
  const { stages, lessons } = getPath(db());
  const next = nextLesson(lessons, p);
  const [openId, setOpenId] = useState<string | null>(open ?? next?.stage ?? stages[0].id);

  const openLesson = (l: Lesson) => {
    if (!lessonUnlocked(l, lessons, p)) {
      toast('Selesaikan pelajaran sebelumnya dulu (atau aktifkan "Buka semua pelajaran" di Pengaturan).');
      return;
    }
    go(`lesson/${enc(l.id)}`);
  };

  return (
    <div>
      <Header title="Jalur Belajar" noBack />
      {stages.map((st, si) => {
        const done = st.lessons.filter((l) => lessonDone(l, p)).length;
        const isOpen = openId === st.id;
        return (
          <div key={st.id}>
            <button className="stage-head" onClick={() => setOpenId(isOpen ? null : st.id)}>
              <span className="num">{si < 2 ? (si === 0 ? 'あ' : 'ア') : st.id.toUpperCase()}</span>
              <span className="grow">
                <b>{st.title}</b>
                <div className="small muted">{st.sub}</div>
                <div className="row mt" style={{ gap: 8 }}>
                  <div className="grow">
                    <Bar value={done} max={st.lessons.length} />
                  </div>
                  <span className="small muted">
                    {done}/{st.lessons.length}
                  </span>
                </div>
              </span>
              <span className="muted">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div style={{ marginBottom: 14 }}>
                {st.lessons.map((l) => {
                  const d = lessonDone(l, p);
                  const un = lessonUnlocked(l, lessons, p);
                  const isNext = next?.id === l.id;
                  return (
                    <button key={l.id} className={cls('lesson', d && 'done', isNext && 'next', !un && 'locked')} onClick={() => openLesson(l)}>
                      <span className="dot jp" lang="ja">
                        {d ? '✓' : !un ? '🔒' : ICON[l.kind] ?? TYPE_ICON[l.type ?? ''] ?? '•'}
                      </span>
                      <span className="grow">
                        <div className="t" style={{ fontWeight: 600 }}>
                          {l.title}
                        </div>
                        {l.sub && <div className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.sub}</div>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
