import { useEffect, useState, type ReactNode } from 'react';
import { back } from '../lib/router';
import { cls } from '../lib/util';

export function Header({ title, onBack, right, noBack }: { title: ReactNode; onBack?: () => void; right?: ReactNode; noBack?: boolean }) {
  return (
    <div className="topbar">
      {!noBack && (
        <button className="icon-btn" aria-label="Kembali" onClick={onBack ?? (() => back())}>
          ←
        </button>
      )}
      <h1>{title}</h1>
      {right}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return <button className={cls('switch', on && 'on')} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

export function Seg<T extends string | number>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map(([v, l]) => (
        <button key={String(v)} className={cls(v === value && 'on')} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Bar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="progress">
      <div style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

let toastSetter: ((s: string | null) => void) | null = null;
export function toast(msg: string) {
  toastSetter?.(msg);
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    toastSetter = setMsg;
    return () => {
      toastSetter = null;
    };
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return msg ? <div className="toast">{msg}</div> : null;
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="card center">
      <div style={{ fontSize: 44 }}>{icon}</div>
      <h3>{title}</h3>
      <div className="muted">{children}</div>
    </div>
  );
}
