import { useMemo, useState } from 'react';
import { db } from '../../lib/data';
import { buzz } from '../../lib/native';
import { go } from '../../lib/router';
import { addXp, useProgress, type Progress } from '../../lib/store';
import { plain, sentPlain, tokText } from '../../lib/text';
import { speak } from '../../lib/tts';
import { cls, shuffle } from '../../lib/util';
import { Bar, Header, Seg } from '../../components/ui';
import { AudioBtn, Ruby, Sentence } from '../../components/Ruby';
import { METHODS } from '../PracticeHub';

interface Sent {
  toks: string[];
  tr: string;
  sp?: string;
}

function sentencePool(src: string, p: Progress, forBuild: boolean): Sent[] {
  const d = db();
  const out: Sent[] = [];
  for (const g of d.grammar) {
    if (src === 'learned' ? !p.cards['g:' + g.id] : `n${g.lv}` !== src) continue;
    for (const e of g.ex) out.push({ toks: e.t, tr: e.id });
  }
  for (const s of d.stories) {
    if (src === 'learned' ? !p.done['story-' + s.id] : `n${s.lv}` !== src) continue;
    for (const x of s.s) out.push({ toks: x.t, tr: x.id, sp: x.sp });
  }
  return forBuild ? out.filter((s) => s.toks.length >= 3 && s.toks.length <= 9) : out;
}

function SourcePicker({ method, onStart, forBuild }: { method: string; onStart: (list: Sent[]) => void; forBuild: boolean }) {
  const p = useProgress();
  const levels = Array.from(new Set([...db().grammar.map((g) => g.lv), ...db().stories.map((s) => s.lv)])).sort((a, b) => b - a);
  const learnedN = sentencePool('learned', p, forBuild).length;
  const [src, setSrc] = useState(learnedN >= 3 ? 'learned' : `n${levels[0] ?? 5}`);
  const list = sentencePool(src, p, forBuild);
  const m = METHODS.find((x) => x.id === method);
  return (
    <div>
      <Header title={m?.t ?? ''} />
      <div className="card">
        <div className="muted">{m?.s}</div>
        <div className="mt small" style={{ fontWeight: 700 }}>
          Sumber kalimat
        </div>
        <div className="mt">
          <Seg
            value={src}
            onChange={setSrc}
            options={[['learned', `Sudah dipelajari (${learnedN})`] as [string, string], ...levels.map((lv) => [`n${lv}`, `Semua N${lv}`] as [string, string])]}
          />
        </div>
        {list.length < 3 && <div className="note-box mt">Belum ada kalimat. Pelajari pola tata bahasa atau baca cerita dulu, atau pilih "Semua N5".</div>}
        <button className="btn block mt" disabled={list.length < 3} onClick={() => onStart(shuffle(list).slice(0, 10))}>
          Mulai ▶ (10 kalimat)
        </button>
      </div>
    </div>
  );
}

function Done({ title, again }: { title: string; again: () => void }) {
  return (
    <div>
      <Header title={title} />
      <div className="card center">
        <div style={{ fontSize: 54 }}>🎉</div>
        <h2>Selesai!</h2>
      </div>
      <div className="pad stack">
        <button className="btn block" onClick={again}>
          Latihan lagi
        </button>
        <button className="btn block ghost" onClick={() => go('practice')}>
          Menu latihan
        </button>
      </div>
    </div>
  );
}

/** Gabungkan token "~" ke token sebelumnya agar potongan kata terasa alami. */
function chipsOf(toks: string[]): string[] {
  const out: string[] = [];
  for (const t of toks) {
    if (t[0] === '~' && out.length) out[out.length - 1] += tokText(t);
    else out.push(tokText(t));
  }
  return out;
}

export function SentenceBuild() {
  const [list, setList] = useState<Sent[] | null>(null);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  if (!list) return <SourcePicker method="build" forBuild onStart={(l) => (setList(l), setI(0), setScore(0))} />;
  if (i >= list.length) return <Done title="Susun kalimat" again={() => setList(null)} />;
  return (
    <div>
      <Header title={`Susun kalimat ${i + 1}/${list.length}`} right={<span className="small muted">{score} ✓</span>} />
      <div className="pad mb">
        <Bar value={i} max={list.length} />
      </div>
      <BuildOne
        key={i}
        s={list[i]}
        onNext={(ok) => {
          if (ok) setScore((x) => x + 1);
          setI(i + 1);
        }}
      />
    </div>
  );
}

function BuildOne({ s, onNext }: { s: Sent; onNext: (ok: boolean) => void }) {
  const answer = useMemo(() => chipsOf(s.toks), [s]);
  const pool = useMemo(() => {
    let sh = shuffle(answer.map((t, i) => ({ t, i })));
    for (let k = 0; k < 5 && answer.length > 2 && sh.every((x, j) => x.i === j); k++) sh = shuffle(sh);
    return sh;
  }, [answer]);
  const [picked, setPicked] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const full = picked.length === answer.length;

  const check = () => {
    const built = picked.map((k) => pool[k].t).map(plain);
    const ok = built.join('') === answer.map(plain).join('');
    setResult(ok);
    buzz(ok ? 'ok' : 'ng');
    if (ok) addXp(2);
    void speak(sentPlain(s.toks));
  };

  return (
    <div className="pad">
      <div className="card" style={{ margin: '0 0 12px' }}>
        <div className="small muted">Susun kalimat yang artinya:</div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{s.tr}</div>
        <button className="btn sm ghost mt" onClick={() => speak(sentPlain(s.toks))}>
          🔊 Petunjuk suara
        </button>
      </div>
      <div className={cls('build-area', result === false && 'shake')} style={{ borderColor: result === null ? undefined : result ? 'var(--ok)' : 'var(--ng)' }}>
        {picked.map((k, j) => (
          <button key={j} className="wchip" onClick={() => result === null && setPicked(picked.filter((_, x) => x !== j))}>
            <Ruby text={pool[k].t} />
          </button>
        ))}
        {!picked.length && <span className="muted small">Ketuk potongan kata di bawah…</span>}
      </div>
      <div className="wchips mt">
        {pool.map((c, k) => (
          <button key={k} className={cls('wchip', picked.includes(k) && 'used')} disabled={picked.includes(k) || result !== null} onClick={() => setPicked([...picked, k])}>
            <Ruby text={c.t} />
          </button>
        ))}
      </div>
      {result === null ? (
        <button className="btn block mt" disabled={!full} onClick={check}>
          Periksa
        </button>
      ) : (
        <div className={cls('feedback', result ? 'ok' : 'ng')}>
          <div className="verdict">{result ? 'Benar! 🎉' : 'Urutannya belum tepat'}</div>
          <Sentence toks={s.toks} tr={s.tr} romaji />
          <button className="btn block mt" onClick={() => onNext(result)}>
            Lanjut →
          </button>
        </div>
      )}
    </div>
  );
}

export function Shadowing() {
  const [list, setList] = useState<Sent[] | null>(null);
  const [i, setI] = useState(0);
  const [showText, setShowText] = useState(true);
  const [reps, setReps] = useState(0);
  if (!list) return <SourcePicker method="shadow" forBuild={false} onStart={(l) => (setList(l), setI(0), setReps(0))} />;
  if (i >= list.length) return <Done title="Shadowing" again={() => setList(null)} />;
  const s = list[i];
  const text = sentPlain(s.toks);
  const repeat3 = async () => {
    for (let k = 0; k < 3; k++) {
      await speak(text);
      await new Promise((r) => setTimeout(r, 900 + text.length * 120));
      setReps((r) => r + 1);
    }
  };
  return (
    <div>
      <Header title={`Shadowing ${i + 1}/${list.length}`} />
      <div className="card">
        <ol className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Dengarkan kalimatnya.</li>
          <li>Ucapkan bersamaan dengan suara (atau setelahnya), tirukan irama dan intonasinya.</li>
          <li>Ulangi beberapa kali, lalu coba tanpa melihat teks.</li>
        </ol>
      </div>
      <div className="card center">
        {showText ? <Sentence toks={s.toks} tr={s.tr} speaker={s.sp} romaji /> : <div className="muted">(teks disembunyikan)</div>}
        <div className="row mt" style={{ justifyContent: 'center' }}>
          <AudioBtn text={text} />
          <AudioBtn text={text} slow />
          <button className="btn sm sec" onClick={repeat3}>
            🔁 Putar 3×
          </button>
        </div>
        <div className="small muted mt">Diulang: {reps}×</div>
      </div>
      <div className="pad row">
        <button className="btn ghost grow" onClick={() => setShowText(!showText)}>
          {showText ? '🙈 Sembunyikan teks' : '👀 Tampilkan teks'}
        </button>
        <button
          className="btn grow"
          onClick={() => {
            addXp(1);
            setReps(0);
            setI(i + 1);
          }}
        >
          Berikutnya →
        </button>
      </div>
    </div>
  );
}
