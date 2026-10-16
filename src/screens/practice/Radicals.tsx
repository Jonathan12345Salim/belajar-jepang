import { db } from '../../lib/data';
import { enc, go } from '../../lib/router';
import { useSettings } from '../../lib/store';
import { Header } from '../../components/ui';

export function Radicals() {
  const s = useSettings();
  const rads = db().radicals;
  return (
    <div>
      <Header title="Radikal" />
      <div className="card">
        <p style={{ marginTop: 0 }}>
          Radikal adalah <b>bagian pembentuk kanji</b>. Kalau kamu kenal radikalnya, kanji baru lebih mudah ditebak artinya dan diingat. Contoh: 氵 (air) ada di 海 (laut), 洗 (mencuci), dan 泳 (berenang).
        </p>
        <button className="btn block" onClick={() => go('p/pool?pool=rad')}>
          🎯 Kuis radikal
        </button>
      </div>
      <div className="list">
        {rads.map((r) => (
          <button key={r.c} className="li" onClick={() => go(`item/${enc('r:' + r.c)}`)}>
            <span className="face jp" lang="ja" style={{ fontSize: 30 }}>
              {r.c}
            </span>
            <span className="grow">
              <div className="t">{s.lang === 'en' ? r.en : r.id}</div>
              <div className="s" lang="ja">
                {Array.from(r.ex).join(' ')}
              </div>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
