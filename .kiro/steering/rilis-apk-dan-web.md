# Rilis: APK dan web selalu diperbarui bersamaan

- Aplikasi ini terbit dalam dua bentuk dari kode yang sama: **APK Android** (GitHub Releases) dan **versi web**
  (GitHub Pages: https://jonathan12345salim.github.io/belajar-jepang/).
- Workflow `.github/workflows/android.yml` membangun keduanya dalam satu job:
  build web → APK → rilis APK → terbitkan web ke branch `gh-pages`.
  Jangan memisahkan, menonaktifkan, atau menghapus salah satu langkah. Setiap perubahan yang memperbarui APK
  juga harus memperbarui web, dan sebaliknya.
- Setelah push, periksa keduanya: rilis terbaru punya file APK, dan versi web menampilkan nomor versi yang sama
  (Profil → Tentang aplikasi). Laporkan ke pengguna link APK dan link web.
- Fitur khusus Android (getaran, share, tombol kembali, pemasangan suara) harus punya cadangan di web.
  Fitur khusus web (service worker untuk offline) tidak boleh aktif di APK.
- Branch `gh-pages` hanya berisi hasil build otomatis. Jangan mengeditnya manual.
