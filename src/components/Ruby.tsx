import { Fragment, type ReactNode } from 'react';
import { useSettings } from '../lib/store';
import { isAttached, parseRuby, sentRomaji, tokText } from '../lib/text';
import { speak } from '../lib/tts';
import { cls } from '../lib/util';

/** Teks Jepang dengan furigana {漢字|かな}. */
export function Ruby({ text, show, className }: { text: string; show?: boolean; className?: string }) {
  const s = useSettings();
  const vis = show ?? s.furigana;
  return (
    <span lang="ja" className={cls('jp', className)}>
      {parseRuby(text).map((g, i) =>
        g.r && vis ? (
          <ruby key={i}>
            {g.t}
            <rt>{g.r}</rt>
          </ruby>
        ) : (
          <Fragment key={i}>{g.t}</Fragment>
        ),
      )}
    </span>
  );
}

/** Paragraf dengan **tebal** dan furigana. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*/);
  return (
    <>
      {parts.map((p, i) => (i % 2 ? <b key={i}>{renderJp(p)}</b> : <Fragment key={i}>{renderJp(p)}</Fragment>))}
    </>
  );
}

function renderJp(s: string): ReactNode {
  if (!s.includes('{')) return s;
  return <Ruby text={s} show />;
}

export function AudioBtn({ text, slow, label }: { text: string; slow?: boolean; label?: string }) {
  return (
    <button
      className="icon-btn"
      aria-label={label ?? 'Putar suara'}
      onClick={(e) => {
        e.stopPropagation();
        void speak(text, slow ? 0.6 : 1);
      }}
    >
      {slow ? '🐢' : '🔊'}
    </button>
  );
}

/** Kalimat bertoken: spasi antar kata, kotak kosong, romaji, terjemahan. */
export function Sentence({
  toks,
  blank,
  fill,
  fillState,
  tr,
  showTr = true,
  romaji,
  className,
  speaker,
}: {
  toks: string[];
  blank?: number;
  fill?: string;
  fillState?: 'ok' | 'ng';
  tr?: string;
  showTr?: boolean;
  romaji?: boolean;
  className?: string;
  speaker?: string;
}) {
  const s = useSettings();
  const showRo = romaji ?? s.romaji;
  return (
    <div className={className}>
      <div className={cls('sentence', s.spacing && 'spaced')} lang="ja">
        {speaker && <span className="speaker">{speaker}</span>}
        {toks.map((t, i) => {
          const gap = i > 0 && !isAttached(t);
          if (i === blank) {
            return (
              <span key={i} className={cls('tok', gap && 'gap')}>
                <span className={cls('blank', fillState && `filled-${fillState}`)}>{fill ? <Ruby text={fill} /> : '\u00a0'}</span>
              </span>
            );
          }
          return (
            <span key={i} className={cls('tok', gap && 'gap')}>
              <Ruby text={tokText(t)} />
            </span>
          );
        })}
      </div>
      {showRo && blank === undefined && <div className="romaji">{sentRomaji(toks)}</div>}
      {tr && showTr && <div className="trans">{tr}</div>}
    </div>
  );
}
