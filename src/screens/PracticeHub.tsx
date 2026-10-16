import { go } from '../lib/router';
import { Header } from '../components/ui';

export const METHODS: { id: string; ic: string; t: string; s: string; route?: string }[] = [
  { id: 'flash', ic: '🃏', t: 'Kartu hafalan', s: 'Tebak, balik kartu, tandai ingat atau lupa.' },
  { id: 'quiz', ic: '❓', t: 'Kuis pilihan ganda', s: 'Arti, bacaan, dan huruf secara acak.' },
  { id: 'type', ic: '⌨️', t: 'Ketik jawaban', s: 'Ketik bacaan pakai romaji, otomatis jadi kana.' },
  { id: 'listen', ic: '👂', t: 'Dengar & pilih', s: 'Dengarkan, lalu pilih huruf atau arti yang tepat.' },
  { id: 'dict', ic: '📝', t: 'Dikte', s: 'Dengarkan kata, lalu ketik apa yang kamu dengar.' },
  { id: 'match', ic: '🧩', t: 'Cocokkan pasangan', s: 'Game mencocokkan huruf/kata dengan artinya.' },
  { id: 'speed', ic: '⚡', t: 'Kilat 60 detik', s: 'Jawab sebanyak mungkin dalam satu menit.' },
  { id: 'write', ic: '✍️', t: 'Latihan menulis', s: 'Tulis dengan jari, setiap goresan dicek otomatis.' },
  { id: 'build', ic: '🧱', t: 'Susun kalimat', s: 'Urutkan potongan kata menjadi kalimat yang benar.' },
  { id: 'fill', ic: '🕳️', t: 'Isi bagian kosong', s: 'Pilih partikel atau bentuk kata yang tepat.' },
  { id: 'shadow', ic: '🗣️', t: 'Shadowing', s: 'Dengarkan kalimat lalu tirukan pengucapannya.' },
  { id: 'stories', ic: '📖', t: 'Baca cerita pendek', s: 'Cerita singkat dengan suara dan kuis pemahaman.', route: 'stories?t=pendek' },
  { id: 'stories-long', ic: '📚', t: 'Baca cerita panjang', s: 'Cerita panjang per paragraf, N5 sampai N1. Posisi baca tersimpan.', route: 'stories?t=panjang' },
  { id: 'radical', ic: '🧬', t: 'Radikal', s: 'Kenali bagian-bagian pembentuk kanji.' },
  { id: 'exams', ic: '🏁', t: 'Ujian level', s: 'Ujian kana & simulasi mini JLPT N5–N1.', route: 'exams' },
];

export function PracticeHub() {
  return (
    <div>
      <Header title="Latihan" noBack />
      <p className="pad muted small" style={{ marginTop: 0 }}>
        Latihan bebas tidak mengubah jadwal review, jadi aman dipakai sesering mungkin.
      </p>
      <div className="list">
        {METHODS.map((m) => (
          <button key={m.id} className="li" onClick={() => go(m.route ?? `p/${m.id}`)}>
            <span className="face">{m.ic}</span>
            <span className="grow">
              <div className="t">{m.t}</div>
              <div className="s" style={{ whiteSpace: 'normal' }}>
                {m.s}
              </div>
            </span>
            <span className="muted">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
