import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { loadStrokes } from '../lib/data';
import { buzz } from '../lib/native';

type Pt = [number, number];
const NS = 'http://www.w3.org/2000/svg';

function useStrokes(char: string) {
  const [paths, setPaths] = useState<string[] | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    setPaths(undefined);
    loadStrokes(char).then((p) => alive && setPaths(p));
    return () => {
      alive = false;
    };
  }, [char]);
  return paths;
}

function Grid() {
  return (
    <g className="grid">
      <line x1="54.5" y1="2" x2="54.5" y2="107" />
      <line x1="2" y1="54.5" x2="107" y2="54.5" />
    </g>
  );
}

const startOf = (d: string): Pt | null => {
  const m = d.match(/^[Mm]\s*(-?[\d.]+)[,\s]+(-?[\d.]+)/);
  return m ? [+m[1], +m[2]] : null;
};

/** Posisi nomor goresan di dekat titik awal, digeser bila bertumpuk. */
function numberPositions(paths: string[]): Pt[] {
  const placed: Pt[] = [];
  for (const d of paths) {
    const s = startOf(d) ?? [0, 0];
    let p: Pt = [s[0] - 6, s[1] - 1];
    for (let k = 0; k < 6 && placed.some((q) => Math.abs(q[0] - p[0]) < 6 && Math.abs(q[1] - p[1]) < 6); k++) {
      p = [p[0] + 6, p[1]];
    }
    placed.push(p);
  }
  return placed;
}

/** Animasi urutan goresan dari data KanjiVG. */
export function StrokeAnim({ char, max = 240, numbers = true, autoplay = true }: { char: string; max?: number; numbers?: boolean; autoplay?: boolean }) {
  const paths = useStrokes(char);
  const [run, setRun] = useState(autoplay ? 1 : 0);
  if (paths === null) return null;
  const dur = paths && paths.length > 12 ? 0.4 : 0.55;
  return (
    <div className="stroke-box" style={{ maxWidth: max }}>
      <svg className="stroke-svg" viewBox="0 0 109 109" key={run}>
        <Grid />
        {paths?.map((d, i) => <path key={'g' + i} d={d} className="ghost" />)}
        {paths?.map((d, i) => (
          <path
            key={i}
            d={d}
            className={run ? 'ink anim' : 'ink'}
            pathLength={1}
            style={{ animationDelay: `${i * dur}s`, '--dur': `${dur}s` } as CSSProperties}
          />
        ))}
        {numbers && paths && numberPositions(paths).map(([x, y], i) => (
          <text key={'n' + i} x={x} y={y} className="num">
            {i + 1}
          </text>
        ))}
      </svg>
      <div className="row mt" style={{ justifyContent: 'center' }}>
        <button className="btn sm ghost" onClick={() => setRun((r) => r + 1)}>
          ▶ Animasi goresan
        </button>
        {paths && <span className="small muted">{paths.length} goresan</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- pencocokan goresan
let measSvg: SVGSVGElement | null = null;
function samplePath(d: string, n = 20): Pt[] {
  if (!measSvg) {
    measSvg = document.createElementNS(NS, 'svg') as SVGSVGElement;
    measSvg.setAttribute('width', '0');
    measSvg.setAttribute('height', '0');
    measSvg.style.position = 'absolute';
    measSvg.style.visibility = 'hidden';
    document.body.appendChild(measSvg);
  }
  const p = document.createElementNS(NS, 'path') as SVGPathElement;
  p.setAttribute('d', d);
  measSvg.appendChild(p);
  const L = p.getTotalLength();
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const q = p.getPointAtLength((L * i) / (n - 1));
    pts.push([q.x, q.y]);
  }
  measSvg.removeChild(p);
  return pts;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const polyLen = (p: Pt[]) => p.reduce((s, q, i) => (i ? s + dist(p[i - 1], q) : 0), 0);

function resample(p: Pt[], n: number): Pt[] {
  if (p.length === 1) return Array(n).fill(p[0]);
  const total = polyLen(p);
  if (total === 0) return Array(n).fill(p[0]);
  const out: Pt[] = [p[0]];
  let acc = 0;
  let seg = 1;
  for (let k = 1; k < n - 1; k++) {
    const target = (total * k) / (n - 1);
    while (seg < p.length && acc + dist(p[seg - 1], p[seg]) < target) {
      acc += dist(p[seg - 1], p[seg]);
      seg++;
    }
    if (seg >= p.length) {
      out.push(p[p.length - 1]);
      continue;
    }
    const a = p[seg - 1];
    const b = p[seg];
    const sl = dist(a, b) || 1;
    const t = (target - acc) / sl;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  out.push(p[p.length - 1]);
  return out;
}

const centroid = (p: Pt[]): Pt => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];

function matchStroke(user: Pt[], exp: Pt[]): 'ok' | 'reverse' | 'bad' {
  const n = exp.length;
  const expLen = polyLen(exp);
  if (expLen < 12) return dist(centroid(user), centroid(exp)) < 15 && polyLen(user) < 45 ? 'ok' : 'bad';
  const u = resample(user, n);
  let avg = 0;
  let rev = 0;
  for (let i = 0; i < n; i++) {
    avg += dist(u[i], exp[i]);
    rev += dist(u[n - 1 - i], exp[i]);
  }
  avg /= n;
  rev /= n;
  const uLen = polyLen(user);
  if (avg < 17 && dist(u[0], exp[0]) < 25 && dist(u[n - 1], exp[n - 1]) < 25 && uLen > expLen * 0.35) return 'ok';
  if (rev < 17 && uLen > expLen * 0.35) return 'reverse';
  return 'bad';
}

/** Papan latihan menulis dengan pemeriksaan tiap goresan. */
export function WritePad({ char, mode, onDone }: { char: string; mode: 'guide' | 'memory'; onDone?: (mistakes: number) => void }) {
  const paths = useStrokes(char);
  const [samples, setSamples] = useState<Pt[][]>([]);
  const [done, setDone] = useState(0);
  const [user, setUser] = useState<Pt[]>([]);
  const [bad, setBad] = useState<Pt[] | null>(null);
  const [miss, setMiss] = useState(0);
  const [total, setTotal] = useState(0);
  const [hint, setHint] = useState(0);
  const [msg, setMsg] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);
  const drawing = useRef<Pt[] | null>(null);

  useEffect(() => {
    setDone(0);
    setUser([]);
    setBad(null);
    setMiss(0);
    setTotal(0);
    setHint(0);
    setMsg('');
    setSamples(paths ? paths.map((d) => samplePath(d)) : []);
  }, [paths, char, mode]);

  if (paths === null) return <div className="note-box">Data goresan untuk karakter ini belum tersedia.</div>;
  const n = paths?.length ?? 0;
  const finished = n > 0 && done >= n;

  const toPt = (e: PointerEvent): Pt => {
    const r = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) * 109) / r.width, ((e.clientY - r.top) * 109) / r.height];
  };

  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (finished || !samples.length) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = [toPt(e)];
    setUser([...drawing.current]);
    setBad(null);
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const cur = drawing.current;
    if (!cur) return;
    const p = toPt(e);
    if (dist(p, cur[cur.length - 1]) < 0.8) return;
    cur.push(p);
    setUser([...cur]);
  };
  const up = () => {
    const pts = drawing.current;
    drawing.current = null;
    if (!pts || !samples[done]) return;
    const res = matchStroke(pts, samples[done]);
    setUser([]);
    if (res === 'ok') {
      const nd = done + 1;
      setDone(nd);
      setMiss(0);
      setMsg('');
      buzz('ok');
      if (nd >= n) onDone?.(total);
    } else {
      setBad(pts);
      setMiss(miss + 1);
      setTotal(total + 1);
      setMsg(res === 'reverse' ? 'Arah goresan terbalik. Perhatikan titik awalnya.' : 'Belum tepat. Lihat petunjuk lalu coba lagi.');
      buzz('ng');
      if (miss + 1 >= 2) setHint((h) => h + 1);
    }
  };

  const next = paths && done < n ? paths[done] : null;
  const st = next ? startOf(next) : null;

  return (
    <div className="stroke-box write-box">
      <svg ref={svgRef} className="stroke-svg" viewBox="0 0 109 109" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <Grid />
        {mode === 'guide' && paths?.map((d, i) => <path key={'g' + i} d={d} className="ghost" />)}
        {paths?.slice(0, done).map((d, i) => <path key={'d' + i} d={d} className="ink" />)}
        {next && hint > 0 && <path key={'h' + hint} d={next} className="hintp anim" pathLength={1} style={{ '--dur': '0.9s' } as CSSProperties} />}
        {mode === 'guide' && st && <circle cx={st[0]} cy={st[1]} r={3} fill="var(--accent)" opacity={0.7} />}
        {bad && <polyline points={bad.map((p) => p.join(',')).join(' ')} className="user bad" />}
        {user.length > 0 && <polyline points={user.map((p) => p.join(',')).join(' ')} className="user" />}
      </svg>
      <div className="spread mt">
        <span className="small muted">
          Goresan {Math.min(done + (finished ? 0 : 1), n)}/{n} · salah {total}
        </span>
        <div className="row">
          <button className="btn sm ghost" disabled={finished} onClick={() => setHint((h) => h + 1)}>
            💡 Petunjuk
          </button>
          <button
            className="btn sm ghost"
            onClick={() => {
              setDone(0);
              setTotal(0);
              setMiss(0);
              setBad(null);
              setMsg('');
              setHint(0);
            }}
          >
            ↺ Ulang
          </button>
        </div>
      </div>
      {msg && <div className="small mt" style={{ color: 'var(--ng)' }}>{msg}</div>}
    </div>
  );
}
