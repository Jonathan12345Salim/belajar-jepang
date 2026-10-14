import { useEffect, useState } from 'react';
import { shareText } from '../lib/native';
import { exportBackup, importBackup, resetAll, setSetting, useSettings } from '../lib/store';
import { isNative, japaneseVoiceAvailable, openVoiceInstall, speak } from '../lib/tts';
import { Header, Seg, Toggle, toast } from '../components/ui';

function Row({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="set-row">
      <div className="grow">
        <div style={{ fontWeight: 600 }}>{title}</div>
        {sub && <div className="small muted">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

export function SettingsScreen() {
  const s = useSettings();
  const [voice, setVoice] = useState<boolean | null>(null);
  const [restore, setRestore] = useState('');
  useEffect(() => {
    japaneseVoiceAvailable().then(setVoice);
  }, []);

  return (
    <div>
      <Header title="Pengaturan" />
      <h2 className="sec">Tampilan belajar</h2>
      <div className="card">
        <div className="set-row" style={{ display: 'block' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Bahasa arti</div>
          <Seg
            value={s.lang}
            onChange={(v) => setSetting('lang', v)}
            options={[
              ['both', 'Indonesia + Inggris'],
              ['id', 'Indonesia'],
              ['en', 'Inggris'],
            ]}
          />
          <div className="small muted mt">Bila arti Indonesia belum tersedia (level tinggi), arti Inggris dipakai.</div>
        </div>
        <Row title="Tampilkan romaji" sub="Tulisan latin di bawah teks Jepang. Matikan setelah lancar membaca kana.">
          <Toggle on={s.romaji} onChange={(v) => setSetting('romaji', v)} />
        </Row>
        <Row title="Tampilkan furigana" sub="Cara baca kecil di atas kanji.">
          <Toggle on={s.furigana} onChange={(v) => setSetting('furigana', v)} />
        </Row>
        <Row title="Spasi antar kata" sub="Memudahkan pemula memisahkan kata dalam kalimat.">
          <Toggle on={s.spacing} onChange={(v) => setSetting('spacing', v)} />
        </Row>
        <div className="set-row" style={{ display: 'block' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Tema</div>
          <Seg
            value={s.theme}
            onChange={(v) => setSetting('theme', v)}
            options={[
              ['auto', 'Otomatis'],
              ['light', 'Terang'],
              ['dark', 'Gelap'],
            ]}
          />
        </div>
      </div>

      <h2 className="sec">Review & latihan</h2>
      <div className="card">
        <div className="set-row" style={{ display: 'block' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Jenis jawaban di review</div>
          <Seg
            value={s.answerMode}
            onChange={(v) => setSetting('answerMode', v)}
            options={[
              ['mix', 'Campur'],
              ['choice', 'Pilihan ganda'],
              ['type', 'Lebih banyak ketik'],
            ]}
          />
        </div>
        <div className="set-row" style={{ display: 'block' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Jumlah item per sesi review</div>
          <Seg value={s.batch} onChange={(v) => setSetting('batch', v)} options={[[15, '15'], [25, '25'], [50, '50'], [100, '100']]} />
        </div>
        <div className="set-row" style={{ display: 'block' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Target XP harian</div>
          <Seg value={s.dailyGoal} onChange={(v) => setSetting('dailyGoal', v)} options={[[20, 'Santai 20'], [30, 'Normal 30'], [60, 'Serius 60'], [100, 'Ngebut 100']]} />
        </div>
        <Row title="Getar saat menjawab" sub="Getaran pendek untuk benar/salah.">
          <Toggle on={s.haptics} onChange={(v) => setSetting('haptics', v)} />
        </Row>
        <Row title="Buka semua pelajaran" sub="Untuk yang sudah bisa sebagian materi (misalnya hiragana). Pelajaran tidak perlu berurutan.">
          <Toggle on={s.unlockAll} onChange={(v) => setSetting('unlockAll', v)} />
        </Row>
      </div>

      <h2 className="sec">Suara</h2>
      <div className="card">
        <Row title="Putar suara otomatis" sub="Membacakan kata saat kartu baru muncul dan setelah menjawab.">
          <Toggle on={s.autoAudio} onChange={(v) => setSetting('autoAudio', v)} />
        </Row>
        <div className="set-row" style={{ display: 'block' }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Kecepatan suara</div>
          <Seg value={s.rate} onChange={(v) => setSetting('rate', v)} options={[[0.6, 'Lambat'], [0.8, 'Agak lambat'], [0.9, 'Normal'], [1.1, 'Cepat']]} />
        </div>
        <div className="set-row">
          <div className="grow">
            <div style={{ fontWeight: 600 }}>Suara bahasa Jepang</div>
            <div className="small muted">{voice === null ? 'Memeriksa…' : voice ? 'Tersedia ✓' : 'Belum terpasang'}</div>
          </div>
          <button className="btn sm sec" onClick={() => speak('こんにちは。にほんごを べんきょうしましょう。')}>
            🔊 Tes
          </button>
        </div>
        {isNative && (
          <button className="btn block ghost mt" onClick={() => openVoiceInstall()}>
            Pasang / perbarui data suara Jepang
          </button>
        )}
        <div className="small muted mt">
          Jika suara tidak keluar: buka Pengaturan HP → Sistem → Bahasa → Keluaran text-to-speech → pilih mesin Google → ⚙️ → Instal data suara → Jepang (日本語). Data suara gratis dan bisa dipakai offline.
        </div>
      </div>

      <h2 className="sec">Cadangan progres</h2>
      <div className="card">
        <div className="small muted">Progres tersimpan di HP ini. Simpan kode cadangan (misalnya kirim ke WhatsApp/Drive sendiri) supaya tidak hilang saat ganti HP atau instal ulang.</div>
        <button
          className="btn block mt"
          onClick={async () => {
            const r = await shareText('Cadangan Belajar Jepang', exportBackup());
            toast(r === 'copied' ? 'Kode cadangan disalin ke clipboard.' : r === 'shared' ? 'Silakan simpan kode cadangannya.' : 'Gagal membagikan cadangan.');
          }}
        >
          📤 Bagikan / salin kode cadangan
        </button>
        <div className="mt small" style={{ fontWeight: 700 }}>
          Pulihkan dari kode cadangan
        </div>
        <textarea className="field mt" rows={3} placeholder="Tempel kode cadangan di sini…" value={restore} onChange={(e) => setRestore(e.target.value)} />
        <button
          className="btn block sec mt"
          disabled={!restore.trim()}
          onClick={() => {
            if (!confirm('Progres saat ini akan diganti dengan data cadangan. Lanjutkan?')) return;
            toast(importBackup(restore) ? 'Progres berhasil dipulihkan ✓' : 'Kode cadangan tidak valid.');
            setRestore('');
          }}
        >
          📥 Pulihkan
        </button>
        <button
          className="btn block ghost mt"
          style={{ color: 'var(--ng)' }}
          onClick={() => {
            if (confirm('Hapus SEMUA progres belajar? Tindakan ini tidak bisa dibatalkan.')) {
              resetAll();
              toast('Progres sudah dihapus.');
            }
          }}
        >
          🗑️ Hapus semua progres
        </button>
      </div>
    </div>
  );
}
