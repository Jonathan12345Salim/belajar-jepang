# Belajar Jepang 🌸

Aplikasi Android (APK) untuk belajar bahasa Jepang **dari nol**, sepenuhnya **offline**.
Materi tersusun bertahap: Hiragana → Katakana → JLPT N5 → N4 → N3 → N2 → N1.

## Unduh & pasang

1. Buka halaman **[Releases](../../releases/latest)** dari HP.
2. Unduh file `BelajarJepang-x.y.z.apk` di bagian **Assets**.
3. Buka file tersebut, izinkan "Instal aplikasi tidak dikenal" bila diminta, lalu ketuk **Instal**.

APK dibuat otomatis oleh GitHub Actions setiap kali ada perubahan kode. Versi baru bisa
dipasang di atas versi lama tanpa kehilangan progres.

Supaya suara (text-to-speech) berfungsi, pastikan data suara **Jepang** terpasang di HP:
Pengaturan → Sistem → Bahasa → Keluaran text-to-speech → Mesin Google → Instal data suara → 日本語.

## Isi materi

| Level | Kanji | Kosakata | Tata bahasa | Arti Indonesia |
|---|---|---|---|---|
| Kana | 104 hiragana + 117 katakana (termasuk tenten & gabungan) | – | – | ✓ + mnemonik |
| N5 | 79 | 717 | 38 pola | ✓ (kanji, kosakata, tata bahasa, 5 cerita) |
| N4 | 166 | 665 | 30 pola | kanji, tata bahasa & 2 cerita ✓, kosakata Inggris |
| N3 | 367 | 2.139 | – | kanji ✓, kosakata Inggris |
| N2 | 367 | 1.804 | – | Inggris |
| N1 | 1.232 | 2.698 | – | Inggris |

Semua kanji dilengkapi data **urutan goresan** (animasi + latihan menulis).

## Metode belajar

- **Jalur belajar terpandu**: pelajaran berurutan (kana, kanji, kosakata per tema, tata bahasa, cerita, ujian).
- **Review SRS** (pengulangan berjarak: 4 jam → 8 jam → 1 hari → 2 hari → 1 minggu → … → tuntas).
- Kartu hafalan, kuis pilihan ganda, ketik jawaban (romaji otomatis jadi kana), dengar & pilih, dikte.
- Cocokkan pasangan, kilat 60 detik.
- Animasi urutan goresan & **latihan menulis** dengan pemeriksaan tiap goresan.
- Susun kalimat, isi bagian kosong, shadowing.
- Baca cerita pendek + kuis pemahaman.
- Belajar radikal (komponen kanji), ujian kana & simulasi mini JLPT.
- Statistik, streak harian, daftar item sulit, cadangan/pulihkan progres.
- Pengaturan: arti Indonesia/Inggris, romaji, furigana, spasi antar kata, tema gelap, kecepatan suara.

## Pengembangan

Kebutuhan: Node.js 22+, Java 21, Android SDK (untuk build APK lokal), Python 3 (untuk membangun data).

```bash
npm install
npm run dev            # jalankan versi web di browser
npm run build          # build web ke folder dist/
npx cap sync android   # salin ke proyek Android
cd android && ./gradlew assembleRelease   # APK di android/app/build/outputs/apk/release/
```

Struktur:

- `src/`: kode aplikasi (React + TypeScript + Vite, dibungkus Capacitor).
- `content/`: materi buatan sendiri dalam bahasa Indonesia (terjemahan, mnemonik, tata bahasa, cerita).
- `scripts/build_data.py`: menggabungkan sumber data terbuka + `content/` menjadi `public/data/*.json`.
- `scripts/make_icons.py`: membuat ikon & layar pembuka Android (butuh Pillow).
- `android/`: proyek Android (Capacitor).

Menambah atau memperbaiki materi: edit file di `content/`, lalu jalankan `python3 scripts/build_data.py`.

### Tanda tangan APK

APK ditandatangani dengan `android/keystore/belajar-jepang.jks` (kunci pribadi aplikasi ini,
disimpan di repo supaya setiap build memakai kunci yang sama dan pembaruan bisa langsung dipasang).
Untuk memakai kunci rahasia sendiri, atur environment variable `KEYSTORE_FILE`, `KEYSTORE_PASSWORD`,
`KEY_ALIAS`, dan `KEY_PASSWORD` saat build.

## Sumber data & lisensi

- **KanjiVG** © Ulrich Apel, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/), <https://kanjivg.tagaini.net>: urutan goresan kana & kanji.
- **KANJIDIC2** © [EDRDG](https://www.edrdg.org/), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), melalui [kanji-data](https://github.com/davidluzgouveia/kanji-data) (MIT): arti & bacaan kanji, level JLPT.
- **Daftar kosakata JLPT**: [open-anki-jlpt-decks](https://github.com/jamsinclair/open-anki-jlpt-decks) (MIT), berdasarkan daftar Jonathan Waller ([tanos.co.uk](http://www.tanos.co.uk/jlpt/), CC BY).
- Sejak 2010 JLPT tidak menerbitkan daftar kanji/kosakata resmi; level di sini adalah perkiraan komunitas.
- Terjemahan Indonesia, mnemonik, materi tata bahasa, dan cerita di `content/` dibuat untuk proyek ini.
  Karena digabung dengan data CC BY-SA di atas, file data di `public/data/` dibagikan dengan lisensi CC BY-SA 4.0.
