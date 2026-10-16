import { Capacitor } from '@capacitor/core';
import { TextToSpeech, QueueStrategy } from '@capacitor-community/text-to-speech';
import { getState } from './store';

const native = Capacitor.isNativePlatform();
let webVoice: SpeechSynthesisVoice | null = null;

function pickWebVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  webVoice = voices.find((v) => v.lang === 'ja-JP') || voices.find((v) => v.lang.startsWith('ja')) || null;
}
if (!native && 'speechSynthesis' in window) {
  pickWebVoice();
  window.speechSynthesis.onvoiceschanged = pickWebVoice;
}

let seq = 0;

/** Ucapkan teks Jepang. Promise selesai setelah suara berhenti. */
export async function speak(text: string, rateMul = 1): Promise<void> {
  const clean = text.replace(/[～~]/g, '').trim();
  if (!clean) return;
  const rate = Math.max(0.3, Math.min(1.5, getState().settings.rate * rateMul));
  const my = ++seq;
  try {
    if (native) {
      await TextToSpeech.speak({
        text: clean,
        lang: 'ja-JP',
        rate,
        pitch: 1,
        volume: 1,
        category: 'playback',
        queueStrategy: QueueStrategy.Flush,
      });
      return;
    }
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    await new Promise<void>((resolve) => {
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = 'ja-JP';
      if (webVoice) u.voice = webVoice;
      u.rate = rate;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
      // pengaman bila event tidak pernah terpanggil
      setTimeout(resolve, 1500 + clean.length * 400);
    });
  } catch {
    /* suara tidak tersedia */
  } finally {
    void my;
  }
}

export async function stopSpeak() {
  seq++;
  try {
    if (native) await TextToSpeech.stop();
    else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  } catch {
    /* abaikan */
  }
}

/** Browser memuat daftar suara secara bertahap; tunggu sebentar bila masih kosong. */
async function waitWebVoices(): Promise<void> {
  const s = window.speechSynthesis;
  if (s.getVoices().length) return;
  await new Promise<void>((resolve) => {
    const t = setTimeout(resolve, 2000);
    s.addEventListener(
      'voiceschanged',
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

/** Cek apakah suara bahasa Jepang tersedia di perangkat. */
export async function japaneseVoiceAvailable(): Promise<boolean> {
  try {
    if (native) return (await TextToSpeech.isLanguageSupported({ lang: 'ja-JP' })).supported;
    if (!('speechSynthesis' in window)) return false;
    await waitWebVoices();
    pickWebVoice();
    return !!webVoice;
  } catch {
    return false;
  }
}

/** Petunjuk memasang suara bahasa Jepang, sesuai platform. */
export const VOICE_HELP = native
  ? 'Pengaturan HP → Sistem → Bahasa → Keluaran text-to-speech → Mesin Google → ⚙️ → Instal data suara → Jepang (日本語). Gratis dan bisa dipakai offline.'
  : 'Android: pasang data suara Jepang di Google Text-to-speech (Pengaturan → Bahasa → Keluaran text-to-speech). iPhone/iPad: Pengaturan → Aksesibilitas → Konten Lisan → Suara → Jepang. Windows: Pengaturan → Waktu & bahasa → Ucapan → tambah suara Jepang. Setelah itu muat ulang halaman ini.';

/** Buka layar pemasangan data suara (Android). */
export async function openVoiceInstall() {
  try {
    if (native) await TextToSpeech.openInstall();
  } catch {
    /* abaikan */
  }
}

export const isNative = native;
