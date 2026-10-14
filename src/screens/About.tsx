import { db } from '../lib/data';
import { LEVELS } from '../lib/types';
import { Header } from '../components/ui';

export function About() {
  const d = db();
  return (
    <div>
      <Header title="Tentang aplikasi" />
      <div className="card">
        <h3>Belajar Jepang</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Aplikasi belajar bahasa Jepang dari nol, sepenuhnya offline.
        </p>
        <table className="small" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr className="muted">
              <th style={{ textAlign: 'left' }}>Level</th>
              <th>Kanji</th>
              <th>Kosakata</th>
              <th>Tata bahasa</th>
            </tr>
          </thead>
          <tbody>
            {LEVELS.map((lv) => (
              <tr key={lv}>
                <td>N{lv}</td>
                <td className="center">{d.kanji.filter((k) => k.lv === lv).length}</td>
                <td className="center">{d.vocab.filter((v) => v.lv === lv).length}</td>
                <td className="center">{d.grammar.filter((g) => g.lv === lv).length || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card small">
        <h3>Sumber data & lisensi</h3>
        <p>
          <b>KanjiVG</b> (urutan goresan) © Ulrich Apel, lisensi CC BY-SA 3.0, kanjivg.tagaini.net.
        </p>
        <p>
          <b>KANJIDIC2</b> (arti & bacaan kanji) © Electronic Dictionary Research and Development Group (EDRDG), lisensi CC BY-SA 4.0, melalui proyek kanji-data (David Luz Gouveia, MIT).
        </p>
        <p>
          <b>Daftar kosakata JLPT</b>: open-anki-jlpt-decks (MIT), berdasarkan daftar Jonathan Waller (tanos.co.uk, CC BY).
        </p>
        <p>
          Level JLPT pada daftar kanji dan kosakata adalah perkiraan komunitas. Sejak 2010 JLPT tidak menerbitkan daftar resmi.
        </p>
        <p>Terjemahan bahasa Indonesia, mnemonik, materi tata bahasa, dan cerita dibuat khusus untuk aplikasi ini dan dibagikan dengan lisensi CC BY-SA 4.0.</p>
        <p>Suara memakai mesin text-to-speech bawaan HP.</p>
      </div>
    </div>
  );
}
