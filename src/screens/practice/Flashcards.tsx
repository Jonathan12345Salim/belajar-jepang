import { useState } from 'react';
import { fullMeaning, getItem, itemFace, itemSpeech, kunDisplay, vocabRomaji, vocabRuby } from '../../lib/items';
import { go } from '../../lib/router';
import { getState, practiceAnswer, useSettings } from '../../lib/store';
import { speak } from '../../lib/tts';
import { shuffle } from '../../lib/util';
import { Bar, Header, Seg } from '../../components/ui';
import { AudioBtn, Ruby } from '../../components/Ruby';
import { Setup } from './PracticeRouter';

function Back({ id }: { id: string }) {
  const s = useSettings();
  const it = getItem(id);
  if (!it) return null;
  const [m1, m2] = fullMeaning(it, s.lang);
  return (
    <div className="center stack">
      {it.type === 'v' && (
        <div className="big sm">
          <Ruby text={vocabRuby(it.vocab)} show />
        </div>
      )}
      {it.type === 'v' && <div className="romaji">{vocabRomaji(it.vocab)}</div>}
      {it.type === 'j' && (
        <div className="small">
          <span lang="ja">{it.kanji.on.slice(0, 3).join('、')}</span>
          {it.kanji.on.length && it.kanji.kun.length ? ' / ' : ''}
          <span lang="ja">{it.kanji.kun.slice(0, 3).map(kunDisplay).join('、')}</span>
        </div>
      )}
      <div style={{ fontSize: 22, fontWeight: 800 }}>{m1}</div>
      {m2 && <div className="muted small">{m2}</div>}
      {it.type === 'j' && it.kanji.mn && <div className="mnemonic" style={{ textAlign: 'left' }}>{it.kanji.mn}</div>}
      {(it.type === 'h' || it.type === 'k') && it.kana.mn && <div className="mnemonic" style={{ textAlign: 'left' }}>{it.kana.mn}</div>}
      {it.type === 'g' && <div className="note-box" lang="ja">{it.grammar.p}</div>}
    </div>
  );
}

export function Flashcards() {
  const [deck, setDeck] = useState<string[] | null>(null);
  const [dir, setDir] = useState<'jp' | 'mean'>('jp');
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const [known, setKnown] = useState(0);
  const [total, setTotal] = useState(0);
  const s = useSettings();

  if (!deck)
    return (
      <Setup
        method="flash"
        types="hkjvgr"
        onStart={(ids, n) => {
          const d = shuffle(ids).slice(0, n);
          setDeck(d);
          setTotal(d.length);
          setI(0);
          setKnown(0);
          setFlip(false);
        }}
      >
        <div className="mt small" style={{ fontWeight: 700 }}>
          Sisi depan kartu
        </div>
        <div className="mt">
          <Seg
            value={dir}
            onChange={setDir}
            options={[
              ['jp', 'Jepang → arti'],
              ['mean', 'Arti → Jepang'],
            ]}
          />
        </div>
      </Setup>
    );

  const id = deck[i];
  if (!id)
    return (
      <div>
        <Header title="Kartu hafalan" />
        <div className="card center">
          <div style={{ fontSize: 54 }}>🃏</div>
          <h2>Selesai!</h2>
          <div className="muted">
            Langsung ingat: {known}/{total} kartu
          </div>
        </div>
        <div className="pad stack">
          <button className="btn block" onClick={() => setDeck(null)}>
            Latihan lagi
          </button>
          <button className="btn block ghost" onClick={() => go('practice')}>
            Menu latihan
          </button>
        </div>
      </div>
    );

  const it = getItem(id)!;
  const face = itemFace(it);
  const speech = itemSpeech(it);
  const answer = (ok: boolean) => {
    practiceAnswer(getState().cards[id] ? id : null, ok);
    if (ok && !deck.slice(0, i).includes(id)) setKnown((k) => k + 1);
    if (!ok) setDeck([...deck, id]);
    setFlip(false);
    setI(i + 1);
  };
  const front =
    dir === 'jp' ? (
      <div className={face.length > 3 ? 'big sm' : 'big'}>{it.type === 'g' ? <span lang="ja">{face}</span> : <Ruby text={face} />}</div>
    ) : (
      <div style={{ fontSize: 24, fontWeight: 800 }} className="center">
        {fullMeaning(it, s.lang)[0]}
      </div>
    );

  return (
    <div>
      <Header title="Kartu hafalan" right={<span className="small muted">{Math.min(i + 1, deck.length)}/{deck.length}</span>} />
      <div className="pad mb">
        <Bar value={i} max={deck.length} />
      </div>
      <div
        className="prompt flash-card"
        style={{ margin: '0 14px 14px' }}
        onClick={() => {
          if (!flip && speech) void speak(speech);
          setFlip(true);
        }}
      >
        {speech && flip && (
          <span className="corner">
            <AudioBtn text={speech} />
          </span>
        )}
        {front}
        {dir === 'mean' && flip && (
          <div className="big md mt">
            <Ruby text={it.type === 'v' ? vocabRuby(it.vocab) : face} show />
          </div>
        )}
        {flip ? <div className="mt" style={{ width: '100%' }}>{dir === 'jp' ? <Back id={id} /> : null}</div> : <div className="hint mt">Ketuk kartu untuk melihat jawaban</div>}
      </div>
      {flip && (
        <div className="pad row">
          <button className="btn grow ghost" onClick={() => answer(false)}>
            😕 Lupa
          </button>
          <button className="btn grow ok" onClick={() => answer(true)}>
            😊 Ingat
          </button>
        </div>
      )}
    </div>
  );
}
