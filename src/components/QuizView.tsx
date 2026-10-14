import { useEffect, useRef, useState } from 'react';
import type { Question } from '../lib/quiz';
import { buzz } from '../lib/native';
import { useSettings } from '../lib/store';
import { finalKana, imeKana } from '../lib/text';
import { speak } from '../lib/tts';
import { cls } from '../lib/util';
import { Ruby, Sentence } from './Ruby';

interface Props {
  q: Question;
  /** Dipanggil sekali saat pindah ke soal berikutnya, dengan hasil akhirnya. */
  onDone: (correct: boolean) => void;
  /** Dipanggil segera setelah menjawab (opsional, mis. untuk skor langsung). */
  onAnswer?: (correct: boolean) => void;
  /** Lanjut otomatis setelah jawaban benar (ms); 0 = tidak. */
  autoNext?: number;
  allowOverride?: boolean;
  quick?: boolean;
}

/** Menampilkan satu soal (pilihan ganda / ketik) beserta umpan baliknya. */
export function QuizView({ q, onDone, onAnswer, autoNext = 1100, allowOverride = true, quick }: Props) {
  const s = useSettings();
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const sent = useRef(false);
  const onNext = () => {
    if (sent.current || result === null) return;
    sent.current = true;
    onDone(result);
  };

  useEffect(() => {
    setPicked(null);
    setTyped('');
    setResult(null);
    sent.current = false;
    if (q.listen && q.audio) void speak(q.audio);
    if (q.kind === 'type') setTimeout(() => inputRef.current?.focus(), 50);
  }, [q.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (result === null) return;
    if (q.audio && s.autoAudio && !q.listen && !quick) void speak(q.audio);
    if (result && autoNext > 0) {
      const t = setTimeout(() => {
        if (!sent.current) {
          sent.current = true;
          onDone(true);
        }
      }, autoNext);
      return () => clearTimeout(t);
    }
    nextRef.current?.focus();
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = (ok: boolean) => {
    setResult(ok);
    buzz(ok ? 'ok' : 'ng');
    if (!ok) {
      setShake(true);
      setTimeout(() => setShake(false), 300);
    }
    onAnswer?.(ok);
  };

  const choose = (i: number) => {
    if (result !== null) return;
    setPicked(i);
    finish(i === q.correct);
  };

  const submit = () => {
    if (result !== null || !typed.trim()) return;
    const val = q.inputKana ? finalKana(typed) : typed;
    setTyped(val);
    finish(!!q.accept?.(val));
  };

  const long = q.choices?.some((c) => c.label.replace(/\{[^|]+\|([^}]+)\}/g, '$1').length > 9) ?? false;

  return (
    <div className="quiz">
      <div className="ask">{q.ask}</div>
      <div className={cls('prompt', shake && 'shake')}>
        {q.listen ? (
          <button className="listen-btn" onClick={() => q.audio && speak(q.audio)} aria-label="Dengarkan lagi">
            🔊
          </button>
        ) : (
          q.audio &&
          result !== null && (
            <span className="corner">
              <button className="icon-btn" onClick={() => speak(q.audio!)}>
                🔊
              </button>
            </span>
          )
        )}
        {q.big && <div className={cls('big', q.big.length > 4 ? 'sm' : q.big.length > 2 ? 'md' : '')}>{q.bigJp ? <Ruby text={q.big} /> : q.big}</div>}
        {q.sentence && (
          <Sentence
            toks={q.sentence.toks}
            blank={q.sentence.blank}
            fill={picked !== null && q.choices ? q.choices[picked].label : undefined}
            fillState={result === null ? undefined : result ? 'ok' : 'ng'}
            tr={q.sentence.tr}
            className="center"
          />
        )}
        {q.text && <div className={q.big ? 'hint' : 'text'}>{q.text}</div>}
        {q.listen && result === null && <div className="hint mt">Ketuk untuk mendengar lagi</div>}
      </div>

      {q.kind === 'choice' && q.choices && (
        <div className={cls('choices', !long && q.choices.length === 4 && 'two')}>
          {q.choices.map((c, i) => {
            const state = result === null ? '' : i === q.correct ? 'ok' : i === picked ? 'ng' : 'dim';
            return (
              <button key={i} className={cls('choice', c.jp && 'jp', state)} data-k={i === q.correct ? 1 : undefined} onClick={() => choose(i)}>
                {c.jp ? <Ruby text={c.label} /> : c.label}
              </button>
            );
          })}
        </div>
      )}

      {q.kind === 'type' && (
        <div className="stack">
          <input
            ref={inputRef}
            className={cls('field type-input', result !== null && (result ? 'ok' : 'ng'))}
            value={typed}
            lang={q.inputKana ? 'ja' : undefined}
            placeholder={q.placeholder}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            readOnly={result !== null}
            onChange={(e) => setTyped(q.inputKana ? imeKana(e.target.value) : e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (result === null ? submit() : onNext())}
          />
          {result === null && (
            <button className="btn block" onClick={submit} disabled={!typed.trim()}>
              Periksa
            </button>
          )}
        </div>
      )}

      {result !== null && (
        <div className={cls('feedback', result ? 'ok' : 'ng')}>
          <div className="spread">
            <span className="verdict">{result ? 'Benar! 🎉' : 'Belum tepat'}</span>
            {!result && q.kind === 'type' && allowOverride && (
              <button
                className="btn sm ghost"
                onClick={() => {
                  setResult(true);
                  onAnswer?.(true);
                }}
              >
                Anggap benar
              </button>
            )}
          </div>
          {!quick && (
            <>
              <div className={cls(q.answerJp && 'big xs')} style={{ textAlign: 'left', marginTop: 4 }}>
                {q.answerJp ? <Ruby text={q.answer} show /> : <b>{q.answer}</b>}
              </div>
              {q.note.map((n, i) => (
                <div key={i} className="small">
                  {n}
                </div>
              ))}
            </>
          )}
          {!(result && autoNext > 0) && (
            <button ref={nextRef} className="btn block mt" onClick={onNext}>
              Lanjut →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
