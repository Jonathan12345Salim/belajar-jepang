import { db } from '../lib/data';
import { KANA } from '../lib/kana';
import { getItem, itemFace, shortMeaning } from '../lib/items';
import { enc, go } from '../lib/router';
import { stageInfo, streak, useProgress } from '../lib/store';
import { LEVELS } from '../lib/types';
import { dayKey } from '../lib/util';
import { Bar, Header } from '../components/ui';

export function Stats() {
  const p = useProgress();
  const d = db();
  const cards = Object.entries(p.cards);
  const days = Object.values(p.days);
  const xp = days.reduce((s, x) => s + x.xp, 0);
  const rev = days.reduce((s, x) => s + x.rev, 0);
  const ok = days.reduce((s, x) => s + x.ok, 0);
  const active = Object.values(p.days).filter((x) => x.xp > 0).length;

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const t = Date.now() - (13 - i) * 86400_000;
    const k = dayKey(t);
    return { k, xp: p.days[k]?.xp ?? 0, label: new Date(t).getDate() };
  });
  const maxXp = Math.max(10, ...last14.map((x) => x.xp));

  const groups = ['Pemula', 'Paham', 'Mahir', 'Hafal', 'Tuntas'].map((name) => {
    const n = cards.filter(([, c]) => stageInfo(c.s).name === name).length;
    return { name, n, color: stageInfo(name === 'Pemula' ? 1 : name === 'Paham' ? 5 : name === 'Mahir' ? 7 : name === 'Hafal' ? 8 : 9).color };
  });

  const has = (id: string) => !!p.cards[id];
  const rows: { label: string; parts: [string, number, number][] }[] = [
    {
      label: 'Kana',
      parts: [
        ['Hiragana', KANA.filter((k) => k.sc === 'h' && has(`h:${k.c}`)).length, KANA.filter((k) => k.sc === 'h').length],
        ['Katakana', KANA.filter((k) => k.sc === 'k' && has(`k:${k.c}`)).length, KANA.filter((k) => k.sc === 'k').length],
      ],
    },
    ...LEVELS.map((lv) => {
      const ks = d.kanji.filter((k) => k.lv === lv);
      const vs = d.vocab.filter((v) => v.lv === lv);
      const gs = d.grammar.filter((g) => g.lv === lv);
      const parts: [string, number, number][] = [
        ['Kanji', ks.filter((k) => has('j:' + k.c)).length, ks.length],
        ['Kosakata', vs.filter((v) => has('v:' + v.key)).length, vs.length],
      ];
      if (gs.length) parts.push(['Tata bahasa', gs.filter((g) => has('g:' + g.id)).length, gs.length]);
      return { label: `N${lv}`, parts };
    }),
  ];

  const hard = cards
    .filter(([, c]) => c.ng > 0)
    .sort((a, b) => b[1].ng / (b[1].ok + b[1].ng) - a[1].ng / (a[1].ok + a[1].ng) || b[1].ng - a[1].ng)
    .slice(0, 8);

  return (
    <div>
      <Header
        title="Profil & statistik"
        noBack
        right={
          <button className="icon-btn" onClick={() => go('settings')} aria-label="Pengaturan">
            ⚙️
          </button>
        }
      />
      <div className="card">
        <div className="stat-grid">
          <div>
            <b>🔥 {streak(p)}</b>
            <span>hari beruntun</span>
          </div>
          <div>
            <b>{xp}</b>
            <span>total XP</span>
          </div>
          <div>
            <b>{active}</b>
            <span>hari aktif</span>
          </div>
          <div>
            <b>{cards.length}</b>
            <span>item dipelajari</span>
          </div>
          <div>
            <b>{rev}</b>
            <span>review</span>
          </div>
          <div>
            <b>{rev ? Math.round((ok / rev) * 100) : 0}%</b>
            <span>akurasi review</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>XP 14 hari terakhir</h3>
        <div className="bars">
          {last14.map((x) => (
            <div key={x.k} style={{ height: `${(x.xp / maxXp) * 100}%`, opacity: x.xp ? 1 : 0.25 }} title={`${x.xp} XP`} />
          ))}
        </div>
        <div className="bar-labels">
          {last14.map((x) => (
            <span key={x.k}>{x.label}</span>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Tahap hafalan (SRS)</h3>
        {groups.map((g) => (
          <div key={g.name} className="mt">
            <div className="spread small">
              <span style={{ color: g.color, fontWeight: 700 }}>{g.name}</span>
              <b>{g.n}</b>
            </div>
            <Bar value={g.n} max={Math.max(1, cards.length)} color={g.color} />
          </div>
        ))}
        <div className="small muted mt">Pemula → Paham → Mahir → Hafal → Tuntas. Setiap jawaban benar di review menaikkan tahap.</div>
      </div>

      <div className="card">
        <h3>Progres per level</h3>
        {rows.map((r) => (
          <div key={r.label} className="mt">
            <b>{r.label}</b>
            {r.parts.map(([name, n, total]) => (
              <div key={name} className="mt">
                <div className="spread small">
                  <span>{name}</span>
                  <span className="muted">
                    {n}/{total}
                  </span>
                </div>
                <Bar value={n} max={total} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {hard.length > 0 && (
        <>
          <h2 className="sec">Item paling sulit</h2>
          <div className="list">
            {hard.map(([id, c]) => {
              const it = getItem(id);
              if (!it) return null;
              return (
                <button key={id} className="li" onClick={() => go(`item/${enc(id)}`)}>
                  <span className="face jp" lang="ja">
                    {itemFace(it)}
                  </span>
                  <span className="grow">
                    <div className="t">{shortMeaning(it, p.settings.lang)}</div>
                    <div className="s">
                      salah {c.ng}× · benar {c.ok}×
                    </div>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="pad">
            <button className="btn block sec" onClick={() => go('p/pool?pool=hard')}>
              🎯 Latih item sulit
            </button>
          </div>
        </>
      )}

      <div className="list mt">
        <button className="li" onClick={() => go('settings')}>
          <span className="face">⚙️</span>
          <span className="grow t">Pengaturan</span>
        </button>
        <button className="li" onClick={() => go('about')}>
          <span className="face">ℹ️</span>
          <span className="grow t">Tentang & sumber data</span>
        </button>
      </div>
    </div>
  );
}
