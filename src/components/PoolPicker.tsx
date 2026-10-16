import { POOLS, poolIds } from '../lib/quiz';
import { useProgress } from '../lib/store';

/** Pilih sumber item untuk latihan. */
export function PoolPicker({ value, onChange, types }: { value: string; onChange: (v: string) => void; types: string }) {
  const p = useProgress();
  const opts = POOLS.filter((o) => Array.from(o.types).some((t) => types.includes(t)));
  return (
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {opts.map((o) => {
        const n = poolIds(o.id, p, types).length;
        return (
          <option key={o.id} value={o.id} disabled={n === 0}>
            {o.label} ({n})
          </option>
        );
      })}
    </select>
  );
}

/** Sumber bawaan: item yang sudah dipelajari bila ada, kalau tidak hiragana. */
export function defaultPool(types: string, hasLearned: boolean): string {
  if (hasLearned) return 'learned';
  if (types.includes('h')) return 'hira';
  if (types.includes('v')) return 'vocab-n5';
  if (types.includes('j')) return 'kanji-n5';
  if (types.includes('g')) return 'gram-n5';
  return 'rad';
}
