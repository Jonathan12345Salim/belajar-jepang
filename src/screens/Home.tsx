import { useEffect, useState } from 'react';
import { db } from '../lib/data';
import { getPath, nextLesson } from '../lib/path';
import { enc, go } from '../lib/router';
import { dueIds, nextDue, streak, today, update, useProgress } from '../lib/store';
import { isNative, japaneseVoiceAvailable, openVoiceInstall } from '../lib/tts';
import { fmtWait } from '../lib/util';
import { Bar } from '../components/ui';

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return ['おはよう！', 'Selamat pagi'];
  if (h < 18) return ['こんにちは！', 'Selamat siang'];
  return ['こんばんは！', 'Selamat malam'];
}

export function Home() {
  const p = useProgress();
  const { lessons } = getPath(db());
  const next = nextLesson(lessons, p);
  const due = dueIds(p).length;
  const nd = nextDue(p);
  const t = today(p);
  const [jp, id] = greeting();
  const learned = Object.keys(p.cards).length;
  const [voiceOk, setVoiceOk] = useState(true);

  useEffect(() => {
    japaneseVoiceAvailable().then(setVoiceOk);
  }, []);

  if (!p.onboarded) {
    return (
      <div className="pad" style={{ paddingTop: 30 }}>
        <div className="center">
          <div style={{ fontSize: 72 }}>🌸</div>
          <h1 style={{ margin: '6px 0' }}>Belajar Jepang</h1>
          <p className="muted">Belajar bahasa Jepang dari nol: hiragana, katakana, kanji JLPT N5–N1, kosakata, tata bahasa, dan percakapan sehari-hari.</p>
        </div>
        <div className="card flat" style={{ margin: '16px 0' }}>
          <div className="stack">
            <div>📖 <b>Jalur belajar terpandu</b>: tinggal ikuti pelajaran berikutnya.</div>
            <div>🔁 <b>Review pintar (SRS)</b>: item diulang tepat sebelum kamu lupa.</div>
            <div>✍️ <b>Banyak cara latihan</b>: kuis, menulis, mendengar, menyusun kalimat, cerita, dan lainnya.</div>
            <div>📴 <b>Sepenuhnya offline.</b></div>
          </div>
        </div>
        <button
          className="btn block"
          onClick={() => {
            update(() => ({ onboarded: true }));
            go(`lesson/${enc(lessons[0].id)}`);
          }}
        >
          Mulai dari nol →
        </button>
        <button
          className="btn block ghost mt"
          onClick={() => {
            update(() => ({ onboarded: true }));
            go('path');
          }}
        >
          Lihat semua pelajaran dulu
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="topbar">
        <h1>Belajar Jepang</h1>
        <button className="icon-btn" onClick={() => go('settings')} aria-label="Pengaturan">
          ⚙️
        </button>
      </div>
      <div className="hero">
        <h2 lang="ja">{jp}</h2>
        <div style={{ opacity: 0.9 }}>{id}! Siap belajar hari ini?</div>
        <div className="stats">
          <div>
            <b>🔥 {streak(p)}</b>
            <span>hari berturut-turut</span>
          </div>
          <div>
            <b>{t.xp}</b>
            <span>XP hari ini / {p.settings.dailyGoal}</span>
          </div>
          <div>
            <b>{learned}</b>
            <span>item dipelajari</span>
          </div>
        </div>
        <Bar value={t.xp} max={p.settings.dailyGoal} />
      </div>

      {!voiceOk && (
        <div className="card flat note-box" style={{ margin: '0 14px 12px' }}>
          🔇 Suara bahasa Jepang belum tersedia di HP ini.
          {isNative ? (
            <button className="btn sm sec mt" onClick={() => openVoiceInstall()}>
              Pasang suara Jepang
            </button>
          ) : null}
          <div className="small muted mt">Pengaturan HP → Bahasa → Keluaran text-to-speech → Mesin Google → Instal data suara → Jepang.</div>
        </div>
      )}

      <div className="card">
        <div className="spread">
          <div>
            <div className="muted small" style={{ fontWeight: 700 }}>
              REVIEW
            </div>
            <div style={{ fontSize: 26, fontWeight: 800 }}>{due} item</div>
            <div className="small muted">
              {due ? 'Siap diulang sekarang' : nd ? `Review berikutnya ${fmtWait(nd - Date.now())}` : 'Pelajari item baru dulu'}
            </div>
          </div>
          <button className="btn" disabled={!due} onClick={() => go('review')}>
            Mulai review
          </button>
        </div>
      </div>

      {next && (
        <div className="card">
          <div className="muted small" style={{ fontWeight: 700 }}>
            PELAJARAN BERIKUTNYA
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{next.title}</div>
          {next.sub && <div className="small muted">{next.sub}</div>}
          {due > 60 && <div className="small mt" style={{ color: 'var(--ng)' }}>Tips: ada banyak review menumpuk. Selesaikan review dulu agar tidak kewalahan.</div>}
          <button className="btn block mt" onClick={() => go(`lesson/${enc(next.id)}`)}>
            Mulai pelajaran →
          </button>
          <button className="btn block ghost mt" onClick={() => go('path')}>
            Lihat jalur belajar
          </button>
        </div>
      )}

      <h2 className="sec">Latihan cepat</h2>
      <div className="tiles">
        <button className="tile" onClick={() => go('p/flash')}>
          <span className="ic">🃏</span>
          <b>Kartu hafalan</b>
          <small>Bolak-balik kartu</small>
        </button>
        <button className="tile" onClick={() => go('p/quiz')}>
          <span className="ic">❓</span>
          <b>Kuis</b>
          <small>Pilihan ganda campuran</small>
        </button>
        <button className="tile" onClick={() => go('p/write')}>
          <span className="ic">✍️</span>
          <b>Menulis</b>
          <small>Latih urutan goresan</small>
        </button>
        <button className="tile" onClick={() => go('stories')}>
          <span className="ic">📖</span>
          <b>Cerita</b>
          <small>Membaca & mendengar</small>
        </button>
      </div>
    </div>
  );
}
