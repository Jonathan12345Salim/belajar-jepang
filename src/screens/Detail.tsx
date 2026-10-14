import { getItem, TYPE_NAME, typeOf } from '../lib/items';
import { enc, go } from '../lib/router';
import { INTERVAL_H, learnItems, stageInfo, useProgress } from '../lib/store';
import { fmtWait } from '../lib/util';
import { Empty, Header, toast } from '../components/ui';
import { Teach } from '../components/Teach';

export function Detail({ id }: { id: string }) {
  const p = useProgress();
  const it = getItem(id);
  if (!it) return <Empty icon="🤔" title="Item tidak ditemukan" />;
  const c = p.cards[id];
  const t = typeOf(id);
  const writable = (t === 'h' || t === 'k' || t === 'j') && id.length === 3;
  return (
    <div>
      <Header title={TYPE_NAME[t]} />
      <Teach id={id} />
      <div className="card">
        {c ? (
          <div className="spread">
            <div>
              <div style={{ fontWeight: 800, color: stageInfo(c.s).color }}>
                {stageInfo(c.s).name} · tahap {c.s}/9
              </div>
              <div className="small muted">
                {c.s >= 9 ? 'Sudah tuntas, tidak perlu diulang lagi.' : `Review ${fmtWait(c.d - Date.now())}`} · benar {c.ok} · salah {c.ng}
              </div>
            </div>
          </div>
        ) : (
          <div className="spread">
            <span className="small muted">Belum masuk jadwal review.</span>
            <button
              className="btn sm sec"
              onClick={() => {
                learnItems([id]);
                toast(`Ditambahkan ke review (pertama ${INTERVAL_H[1]} jam lagi).`);
              }}
            >
              + Pelajari
            </button>
          </div>
        )}
        {writable && (
          <button className="btn block ghost mt" onClick={() => go(`p/write?c=${enc(id)}`)}>
            ✍️ Latihan menulis
          </button>
        )}
      </div>
    </div>
  );
}
