import { useState } from 'react';
import { EXAMS, PASS_MARK, examQuestions, type Question } from '../../lib/quiz';
import { enc, go } from '../../lib/router';
import { addXp, markDone, saveExam, useProgress } from '../../lib/store';
import { Bar, Empty, Header } from '../../components/ui';
import { QuizView } from '../../components/QuizView';

export function ExamList() {
  const p = useProgress();
  return (
    <div>
      <Header title="Ujian level" />
      <p className="pad small muted" style={{ marginTop: 0 }}>
        Lulus jika benar minimal {Math.round(PASS_MARK * 100)}%. Ujian di akhir tiap tahap Jalur Belajar menandai tahap itu selesai.
      </p>
      <div className="list">
        {EXAMS.map((e) => {
          const r = p.exams[e.id];
          return (
            <button key={e.id} className="li" onClick={() => go(`exam/${enc(e.id)}`)}>
              <span className="face">{r && r.best >= PASS_MARK * 100 ? '🏅' : '🏁'}</span>
              <span className="grow">
                <div className="t">{e.title}</div>
                <div className="s">{r ? `Nilai terbaik ${r.best}% · terakhir ${r.last}%` : e.sub}</div>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ExamScreen({ scope, lesson }: { scope: string; lesson?: string }) {
  const meta = EXAMS.find((e) => e.id === scope);
  const [qs, setQs] = useState<Question[] | null>(null);
  const [qi, setQi] = useState(0);
  const [res, setRes] = useState<{ section: string; ok: boolean }[]>([]);

  if (!meta) return <Empty icon="🤔" title="Ujian tidak ditemukan" />;

  if (!qs)
    return (
      <div>
        <Header title={meta.title} />
        <div className="card center">
          <div style={{ fontSize: 54 }}>🏁</div>
          <h2>{meta.title}</h2>
          <p className="muted">{meta.sub}</p>
          <p>
            Nilai lulus: <b>{Math.round(PASS_MARK * 100)}%</b>
          </p>
          <p className="small muted">Soal diambil acak dari seluruh materi level ini, jadi bisa muncul item yang belum kamu pelajari. Tidak apa-apa, ini untuk mengukur kesiapanmu.</p>
          <button
            className="btn block"
            onClick={() => {
              setQs(examQuestions(scope));
              setQi(0);
              setRes([]);
            }}
          >
            Mulai ujian
          </button>
        </div>
      </div>
    );

  const q = qs[qi];
  if (!q) {
    const ok = res.filter((r) => r.ok).length;
    const pct = Math.round((ok / Math.max(1, res.length)) * 100);
    const pass = pct >= PASS_MARK * 100;
    const sections = Array.from(new Set(res.map((r) => r.section)));
    return (
      <div>
        <Header title="Hasil ujian" />
        <div className="card center">
          <div style={{ fontSize: 60 }}>{pass ? '🏅' : '📚'}</div>
          <h2>{pct}%</h2>
          <div style={{ fontWeight: 800, color: pass ? 'var(--ok)' : 'var(--ng)' }}>{pass ? 'LULUS! Selamat!' : 'Belum lulus, ayo ulangi materinya'}</div>
          <div className="muted small">
            {ok}/{res.length} benar
          </div>
        </div>
        <div className="card">
          <h3>Per bagian</h3>
          {sections.map((s) => {
            const rs = res.filter((r) => r.section === s);
            const k = rs.filter((r) => r.ok).length;
            return (
              <div key={s} className="mt">
                <div className="spread small">
                  <span>{s}</span>
                  <b>
                    {k}/{rs.length}
                  </b>
                </div>
                <Bar value={k} max={rs.length} color={k / rs.length >= PASS_MARK ? 'var(--ok)' : 'var(--ng)'} />
              </div>
            );
          })}
        </div>
        <div className="pad stack">
          <button className="btn block" onClick={() => setQs(null)}>
            Ulangi ujian
          </button>
          <button className="btn block ghost" onClick={() => go(lesson ? 'path' : 'exams')}>
            {lesson ? 'Ke jalur belajar' : 'Daftar ujian'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={`${meta.title} · ${qi + 1}/${qs.length}`} />
      <div className="pad mb">
        <Bar value={qi} max={qs.length} />
        <div className="small muted mt">{q.section}</div>
      </div>
      <QuizView
        q={q}
        autoNext={700}
        allowOverride={false}
        onDone={(ok) => {
          const nr = [...res, { section: q.section ?? '', ok }];
          setRes(nr);
          if (qi + 1 >= qs.length) {
            const pct = Math.round((nr.filter((r) => r.ok).length / nr.length) * 100);
            saveExam(scope, pct);
            if (pct >= PASS_MARK * 100) {
              markDone(`exam-${scope}`);
              if (lesson) markDone(lesson);
              addXp(20);
            }
          }
          setQi(qi + 1);
        }}
      />
    </div>
  );
}
