/** Halaman penjelasan di Jalur Belajar. Mendukung **tebal** dan {漢字|かな}. */
export interface InfoPage {
  title: string;
  body: string[];
  examples?: { jp: string; ro: string; id: string }[];
}

export const INFO: Record<string, { title: string; pages: InfoPage[] }> = {
  welcome: {
    title: 'Selamat datang!',
    pages: [
      {
        title: 'Tiga jenis huruf Jepang',
        body: [
          'Bahasa Jepang memakai **tiga** jenis huruf sekaligus:',
          '**Hiragana** (あいう) untuk kata asli Jepang dan akhiran kata.',
          '**Katakana** (アイウ) untuk kata serapan asing, misalnya コーヒー (kopi).',
          '**Kanji** ({日本|にほん}) yaitu huruf dari Tiongkok yang masing-masing punya arti.',
        ],
        examples: [
          { jp: 'わたし', ro: 'watashi', id: 'saya (hiragana)' },
          { jp: 'テレビ', ro: 'terebi', id: 'televisi (katakana)' },
          { jp: '{日本|にほん}', ro: 'nihon', id: 'Jepang (kanji)' },
        ],
      },
      {
        title: 'Mulai dari hiragana',
        body: [
          'Setiap huruf hiragana mewakili satu suku kata: か = ka, さ = sa, の = no.',
          'Vokalnya hanya lima: **a, i, u, e, o**, dan dibaca persis seperti bahasa Indonesia. Kabar baik: pengucapan bahasa Jepang mudah bagi penutur bahasa Indonesia!',
        ],
      },
      {
        title: 'Cara belajar di aplikasi ini',
        body: [
          '1. **Pelajaran** memperkenalkan beberapa item baru, lalu langsung ada kuis singkat.',
          '2. Item yang sudah dipelajari akan muncul lagi di **Review** pada waktu yang tepat: 4 jam, 8 jam, 1 hari, 2 hari, 1 minggu, dan seterusnya. Cara ini (SRS / pengulangan berjarak) membuat hafalan masuk ke ingatan jangka panjang.',
          '3. Kerjakan review setiap hari, lalu tambah 1–2 pelajaran baru. Sedikit tapi rutin jauh lebih efektif!',
        ],
      },
      {
        title: 'Tips',
        body: [
          'Tekan tombol 🔊 untuk mendengar pelafalan.',
          'Kalau suara tidak keluar, buka **Profil → Pengaturan → Suara** untuk memasang suara bahasa Jepang di HP.',
          'Romaji (tulisan latin) bisa dimatikan di Pengaturan setelah kamu lancar membaca kana.',
        ],
      },
    ],
  },
  dakuten: {
    title: 'Tenten & maru',
    pages: [
      {
        title: 'Tenten ( ゛) dan maru ( ゜)',
        body: [
          'Tanda dua garis kecil **゛ (tenten)** membuat bunyi menjadi "berat":',
          'か ka → が ga, さ sa → ざ za, た ta → だ da, は ha → ば ba.',
          'Tanda lingkaran kecil **゜ (maru)** hanya dipakai pada baris は: は ha → ぱ pa.',
          'Catatan: じ dan ぢ sama-sama dibaca "ji", ず dan づ sama-sama "zu". Yang paling sering dipakai adalah じ dan ず.',
        ],
        examples: [
          { jp: 'かぎ', ro: 'kagi', id: 'kunci' },
          { jp: 'ぶた', ro: 'buta', id: 'babi' },
          { jp: 'ぱん', ro: 'pan', id: 'roti' },
        ],
      },
    ],
  },
  youon: {
    title: 'Bunyi gabungan',
    pages: [
      {
        title: 'Yōon: ゃ ゅ ょ kecil',
        body: [
          'Huruf berakhiran bunyi -i (き, し, ち, に, ひ, み, り, ぎ, じ, び, ぴ) bisa digabung dengan **ゃ, ゅ, ょ yang ditulis kecil**.',
          'き + ゃ = きゃ (kya), し + ゅ = しゅ (shu), ち + ょ = ちょ (cho).',
          'Ukurannya penting! きや = ki-ya (dua suku kata), sedangkan きゃ = kya (satu suku kata).',
        ],
        examples: [
          { jp: 'おちゃ', ro: 'ocha', id: 'teh' },
          { jp: 'しゃしん', ro: 'shashin', id: 'foto' },
          { jp: 'きょう', ro: 'kyou', id: 'hari ini' },
        ],
      },
    ],
  },
  sokuon: {
    title: 'Tsu kecil & vokal panjang',
    pages: [
      {
        title: 'っ kecil = konsonan ganda',
        body: [
          '**っ kecil** tidak dibaca "tsu". Ia membuat konsonan berikutnya menjadi ganda, ada jeda singkat sebelum bunyi berikutnya.',
          'Bandingkan: かこ (kako, masa lalu) dan かっこ (kakko, tanda kurung).',
        ],
        examples: [
          { jp: 'きって', ro: 'kitte', id: 'perangko' },
          { jp: 'がっこう', ro: 'gakkou', id: 'sekolah' },
          { jp: 'ざっし', ro: 'zasshi', id: 'majalah' },
        ],
      },
      {
        title: 'Vokal panjang',
        body: [
          'Vokal yang ditulis dua kali dibaca **dua kali lebih lama**: おかあさん (o-kaa-san).',
          'えい biasanya dibaca "ee": せんせい = sensee. おう biasanya dibaca "oo": がっこう = gakkoo.',
          'Panjang-pendek vokal bisa mengubah arti: おばさん (bibi) vs おばあさん (nenek)!',
        ],
        examples: [
          { jp: 'おばさん', ro: 'obasan', id: 'bibi' },
          { jp: 'おばあさん', ro: 'obaasan', id: 'nenek' },
          { jp: 'せんせい', ro: 'sensei', id: 'guru' },
        ],
      },
    ],
  },
  particles: {
    title: 'Partikel は, へ, を',
    pages: [
      {
        title: 'Huruf yang dibaca berbeda',
        body: [
          'Tiga hiragana dibaca berbeda ketika menjadi **partikel** (kata bantu tata bahasa):',
          '**は** dibaca "wa", **へ** dibaca "e", **を** dibaca "o".',
          'Kamu akan sangat sering bertemu ketiganya di pelajaran tata bahasa.',
        ],
        examples: [
          { jp: 'わたしは', ro: 'watashi wa', id: 'saya (topik)' },
          { jp: 'にほんへ', ro: 'nihon e', id: 'ke Jepang' },
          { jp: 'みずを', ro: 'mizu o', id: 'air (objek)' },
        ],
      },
    ],
  },
  katakana: {
    title: 'Mengenal katakana',
    pages: [
      {
        title: 'Katakana',
        body: [
          'Bunyi katakana **sama persis** dengan hiragana, hanya bentuknya lebih kaku dan bersudut.',
          'Dipakai untuk kata serapan asing (テレビ = TV), nama negara/orang asing (インドネシア), dan efek suara.',
          'Tanda **ー** memanjangkan vokal: コーヒー = koohii (kopi), ケーキ = keeki (kue).',
        ],
        examples: [
          { jp: 'インドネシア', ro: 'indoneshia', id: 'Indonesia' },
          { jp: 'コーヒー', ro: 'koohii', id: 'kopi' },
          { jp: 'パン', ro: 'pan', id: 'roti' },
        ],
      },
      {
        title: 'Hati-hati yang mirip',
        body: [
          '**シ (shi)** vs **ツ (tsu)**: titik シ berjajar ke samping dan garis panjangnya naik dari bawah; titik ツ berjajar di atas dan garisnya turun.',
          '**ソ (so)** vs **ン (n)**: garis panjang ソ turun dari atas; garis panjang ン naik dari bawah.',
          'Latihan menulis akan membantu membedakan arah goresannya.',
        ],
      },
    ],
  },
  'kata-ext': {
    title: 'Bunyi asing',
    pages: [
      {
        title: 'Kombinasi khusus katakana',
        body: [
          'Untuk meniru bunyi asing, katakana memakai kombinasi dengan vokal kecil ァ ィ ゥ ェ ォ:',
          'ファ (fa), フィ (fi), ティ (ti), ディ (di), シェ (she), チェ (che), ジェ (je), ウィ (wi), ヴ (vu).',
        ],
        examples: [
          { jp: 'パーティー', ro: 'paatii', id: 'pesta' },
          { jp: 'フォーク', ro: 'fooku', id: 'garpu' },
          { jp: 'シェフ', ro: 'shefu', id: 'koki' },
        ],
      },
    ],
  },
  kanji: {
    title: 'Mengenal kanji',
    pages: [
      {
        title: 'Kanji punya arti',
        body: [
          'Kanji adalah huruf bergambar. Banyak kanji berasal dari gambar benda: 山 (gunung), 川 (sungai), 木 (pohon).',
          'Kanji yang rumit tersusun dari bagian-bagian kecil (radikal): 休 (istirahat) = 亻 (orang) + 木 (pohon), orang bersandar di pohon.',
        ],
      },
      {
        title: 'Dua jenis bacaan',
        body: [
          '**On\'yomi**: bacaan dari Tiongkok, ditulis katakana. Biasanya dipakai dalam kata gabungan: {日本|にほん} (ni-hon).',
          '**Kun\'yomi**: bacaan asli Jepang, ditulis hiragana. Biasanya untuk kata tunggal: {日|ひ} (hi, hari/matahari).',
          'Tidak perlu menghafal semua bacaan sekaligus. Pelajari lewat **contoh kata**, nanti akan hafal dengan sendirinya.',
        ],
      },
      {
        title: 'Urutan goresan',
        body: [
          'Aturan umum: dari **atas ke bawah**, dari **kiri ke kanan**, garis mendatar sebelum garis tegak yang memotongnya.',
          'Tekan ▶ pada kartu kanji untuk melihat animasi goresan, lalu coba di menu **Latihan → Menulis**.',
        ],
      },
    ],
  },
};
