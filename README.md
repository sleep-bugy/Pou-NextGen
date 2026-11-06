# Pou untuk iPad

Panduan deployment dan backup: [DEPLOY.md](DEPLOY.md).

Game web dengan **Svelte 5 + TypeScript + Canvas 2D + Vite**, memakai aset dari `pou-1-4-138.apk` yang disediakan di workspace. Tampilan menu memakai Svelte; rendering karakter dan minigame memakai Canvas. Permainan lokal dan penyimpanan progress tidak memerlukan backend. Mabar memerlukan server Node/WebSocket yang disertakan.

## Menjalankan

```sh
npm ci
npm run dev
```

Buka alamat yang dicetak Vite. Untuk mencoba di iPad melalui Wi-Fi yang sama, gunakan alamat IP komputer beserta port Vite. Akses HTTP jaringan lokal cukup untuk mencoba permainan; instalasi PWA, mikrofon, dan service worker memerlukan hosting HTTPS.

```sh
npm run build
npm run preview
```

Upload isi `dist/` ke hosting statis dengan HTTPS. Buka URL tersebut di Safari iPad, lalu **Bagikan → Tambahkan ke Layar Utama**. Root hosting harus menunjuk langsung ke `dist/`; aplikasi saat ini menggunakan path absolut dari `/`.

Tampilan ruangan memenuhi viewport pada ponsel, tablet dan laptop, baik portrait maupun landscape. Tombol **Fullscreen** memakai API browser standar atau prefiks Safari bila tersedia; browser yang tidak mendukung menampilkan petunjuk memasang aplikasi lewat layar utama. Arena minigame melebar mengikuti ukuran layar: area bergerak, lokasi muncul objek, lantai, dan input memakai seluruh lebar. Kartu/puzzle disusun ulang mengikuti rasio layar, sementara sprite dan koordinat sentuhan tetap proporsional.

## Mandi dan interaksi

Ketuk **Soap**, lalu usap badan Pou untuk membuat busa. Ketuk **Shower** untuk aliran air terus-menerus; ketuk lagi untuk berhenti, atau seret shower untuk mengarahkannya. Air memiliki tetesan, cipratan, aliran pada badan dan genangan; busa yang terkena aliran terbilas. Memindahkan kursor atau menyentuh area samping ruangan juga menggerakkan mata Pou. Suara tap tetap memakai tiga suara versi awal.

Aliran berhenti ketika gesture dibatalkan, tab masuk background, atau pindah ruangan. Penyelesaian satu mandi memberi hadiah satu kali. Preferensi reduce motion mengganti tetesan bergerak dengan semprotan statis.

## Progress

- Setiap aksi disimpan ke IndexedDB, dengan salinan save sebelumnya.
- Cadangan lokal ditulis segera, termasuk saat halaman masuk background atau ditutup.
- Save dengan timestamp terbaru yang valid dipilih saat game dibuka kembali.
- Status lapar, kebersihan, dan energi memperhitungkan waktu sejak permainan terakhir. Tidur memulihkan energi.
- **Settings → Ekspor Save / Impor Save** memindahkan progress dalam file JSON. Impor memvalidasi data dan meminta konfirmasi sebelum mengganti progress.
- Save terikat ke alamat situs dan perangkat. Ini belum memiliki sinkronisasi cloud dan belum mengimpor save Android/iOS asli. Menghapus data situs dapat menghapus progress; simpan ekspor untuk cadangan.

## Tidur, ramuan, dan pasangan

Tidur memulihkan **0,8% energi per detik**, maksimal 100%. Angka energi diperbarui setiap detik. Tiga huruf Z membesar, melayang naik, dan memudar dalam siklus 2,8 detik dengan jeda antarahuruf. Suara berupa hembusan napas lembut dengan jeda tenang, mengikuti pengaturan Sound; browser membutuhkan satu interaksi pengguna sebelum audio dapat berjalan. Suara berhenti saat bangun atau tab masuk background. Reduce motion dari game atau perangkat menampilkan Z statis.

Energi **di bawah 10%** memaksa Pou beristirahat di Bedroom. Pou memiliki kelopak mata berat, kantung mata, dan animasi menguap; makan, mandi, bermain, dan upaya membangunkannya ditolak sampai energi **minimal 20%**. Shower dan permainan yang masih berjalan dihentikan. Ramuan Energizer, Max Potion, dan Energi Unlimited tetap bisa diberikan selama pemulihan. Penawar menghentikan racun, tetapi tidak melewati kebutuhan energi. Setelah 20%, Pou boleh dibangunkan; tidur tetap berlanjut bila kamu membiarkannya. Perhitungan offline membagi waktu terjaga dan tidur pada ambang kelelahan, sehingga membuka kembali game tidak membuat Pou terus kehabisan energi. Status kelelahan tersimpan tanpa mengganti format save lama.

Di Lab, ramuan yang sudah dibeli langsung diminum saat diketuk atau diseret ke Pou. Stok kosong membuka toko. Menu **Eksperimen** juga menyediakan daftar ramuan dan tindakan hidupkan kembali.

| Ramuan | Harga koin | Efek |
| --- | ---: | --- |
| Racun Alien | 15 | Kesehatan turun selama 120 detik; dapat mematikan karakter |
| Racun Pusaran | 40 | Tampilan berputar selama 5 detik; waktu tersisa bertahan saat reload |
| Racun Kantuk | 25 | Energi menjadi 5% dan Pou tidur |
| Penawar | 20 | Hentikan racun/pusaran, bangunkan Pou, pulihkan 25 kesehatan |
| Penawar Maksimal | 60 | Hentikan racun/pusaran dan pulihkan kesehatan penuh |
| Energi Unlimited | 9.999 | Setelah diminum, energi selalu 100% secara permanen |

Energi Unlimited tersimpan dalam save, melindungi dari Racun Kantuk, dan indikator energi berubah menjadi ∞. Efek putaran mengikuti preferensi Reduce motion. Kematian karakter hanya menghentikan aktivitas; hidupkan kembali gratis tanpa kehilangan koin, level, inventaris, atau pasangan.

**Phone → Pasangan Pou** mengundang pasangan dengan nama/warna pilihan seharga 50 koin. Ngobrol, beri bunga, dan jalan bersama meningkatkan kedekatan. Save lama mendapatkan field tambahan tanpa menghapus progress.

## Dekorasi, kepribadian, dan campuran Lab

**Phone → Dekorasi** atau **Profil → Dekorasi rumah** membuka editor. Enam furnitur tersedia: sofa, tanaman, karpet, meja, rak buku, dan akuarium. Pembelian berlaku sekali per jenis; furnitur dapat dipindah antar ruangan, diseret di pratinjau, atau disimpan kembali. Posisi dipakai di ruangan permainan dan tersimpan lokal. Saat terhubung, susunan rumah dan warna Pou dibagikan ke teman; di **Mabar → Teman → Kunjungi**, teman memilih ruangan dan memberi reaksi Suka/Keren/Nyaman. Satu teman mempunyai satu reaksi yang bisa diganti.

Kepribadian di Profil terbentuk dari kebiasaan makan, bermain, mandi, dan dielus. Makanan yang paling sering diberikan menjadi favorit setelah minimal tiga kali; sebelum itu favorit awalnya apel. Makanan favorit menambah 3 kesenangan. Kedekatan meningkat melalui perawatan; pada 40%, pipi Pou merona. Kebiasaan dan kedekatan tersimpan dalam save.

**Lab → Eksperimen → Meja campur ramuan** menggunakan satu botol dari masing-masing bahan. Kombinasi salah tidak menghabiskan bahan. Empat resep dapat ditemukan lewat petunjuk: Energizer + Fun Potion menghasilkan Mini; Health + Max menghasilkan Transparan; Fun + Penawar menghasilkan Pelangi; Energizer + Racun Pusaran menghasilkan Suara Cempreng. Efek berjalan 15 detik, berakhir otomatis, dan tidak menumpuk. Efek suara tetap memakai suara tap asli dengan perubahan pitch sementara.

## Mabar online

Food Drop dan Petualangan Co-op mendukung **2–4 pemain** melalui kode ruangan enam karakter. Host memilih mode saat membuat ruangan. Food Drop berlangsung 60 detik; server menghitung gerak, tangkapan, dan skor. Makanan memberi satu poin; benda berbahaya mengurangi dua poin. Hasil memberi hadiah lokal satu kali per ronde.

Petualangan Co-op berlangsung hingga 3 menit. Tim mengumpulkan minimal lima permata dan mencapai pintu keluar bersama. A D / ← → menggerakkan Pou; Spasi/W/↑ melompat; E menolong teman yang jatuh di dekatmu. Tombol layar tersedia untuk iPad. Jatuh memerlukan bantuan teman atau kembali ke checkpoint setelah delapan detik. Jika pemain tersisa kurang dari dua, permainan kembali ke lobby. Kemenangan memberi 50 koin, makanan, XP, dan topi penjelajah eksklusif pada kemenangan pertama. Hadiah dikirim melalui antrean server dan baru dikonfirmasi setelah save lokal berhasil ditulis; reload tidak memberi hadiah dua kali.

Masuk melalui **Phone → Mabar** atau tombol Mabar di daftar Games. Area Mabar memiliki tiga tab:

- **Ruangan**: buat/gabung ruangan, lihat pemain, dan mulai pertandingan.
- **Teman**: bagikan kode teman delapan karakter, kirim/terima permintaan, lihat status online, hapus teman, dan undang bermain. Mengundang otomatis membuat ruangan jika belum ada. Undangan berlaku 60 detik dan bisa diterima dari notifikasi di ruangan Pou.
- **Chat publik**: pesan teks untuk semua pemain pada server yang sama, maksimal 240 karakter; 60 pesan terbaru tersedia selama server berjalan. Server membatasi laju kirim pesan.
- **Kebun**: empat petak milikmu atau teman. Wortel, beri, dan gandum tumbuh dalam 2–3 menit menurut waktu server. Setiap perawat tambahan mempercepat tumbuh 20 detik, hingga empat perawat. Pemilik, penanam/perawat, dan pemanen menerima hasil; petak tidak dapat dipanen dua kali. Bahan masuk dapur panen untuk membuat sup/kue yang dikirim ke inventaris makanan.
- **Peringkat**: leaderboard Global atau Teman untuk Food Drop Online, Petualangan Co-op, dan jumlah panen. Hanya hasil server yang masuk kategori ini; skor minigame lokal tetap di perangkat. Peringkat disimpan bersama profil server, termasuk peringkat pribadi di luar 50 teratas.
- **Rumah**: lihat kunjungan yang dipilih dari daftar teman dan beri reaksi.

Koneksi sosial tetap aktif ketika keluar dari area Mabar, sehingga undangan tetap diterima saat merawat Pou. Profil perangkat dipulihkan memakai token lokal; server hanya menyimpan hash token. Daftar teman dan permintaan disimpan secara atomik di `.pou-data/social.json`. Untuk hosting, gunakan penyimpanan persisten yang dapat ditulis; `POU_DATA_DIR` dapat menunjuk direktori data lain. Profil online terpisah dari ekspor progress karakter. Chat dan ruangan bersifat sementara, sedangkan daftar teman bertahan setelah server restart. Ini adalah profil perangkat, tanpa login akun atau pemulihan lewat email.

Untuk pengembangan jalankan Vite dan server bersama:

```sh
npm run dev:online
```

Jika Vite sudah berjalan di port 5173, cukup jalankan `npm run multiplayer` di terminal lain. Server memakai port 3001; proxy Vite meneruskan `/multiplayer` dan `/api/health`. Semua pemain membuka alamat Vite komputer yang sama, membuat/gabung kode ruangan, lalu host menekan Mulai. Kedua perangkat harus mencapai server yang sama; kode tidak dapat menghubungkan dua server lokal terpisah.

Untuk hosting dengan mabar:

```sh
npm run build
PORT=3001 npm start
```

Server menyajikan `dist/` dan WebSocket pada alamat yang sama. Gunakan Node 22.18+ pada hosting dengan HTTPS/WSS dan dukungan WebSocket untuk bermain melalui internet. Hosting statis tetap mendukung permainan offline, tetapi tidak menjalankan server mabar. Ruangan bersifat sementara dan hilang jika server restart; kebun, peringkat, publikasi rumah, dan hadiah tertunda disimpan di direktori data server. Progress karakter tetap lokal. Ini belum mencakup login akun, cloud save seluruh karakter, atau semua minigame dalam mode online. Restart proses Node setelah memperbarui kode server.

## Ringan dan offline

Gambar APK dioptimalkan menjadi WebP lossless. Versi PNG asli tetap di `public/` sebagai referensi, sedangkan build mengirim WebP dan ikon antarmuka/makanan SVG kustom. Suara OGG dikonversi ke AAC untuk Safari; MP3 asli dipertahankan.

Ikon antarmuka memakai satu tema SVG dengan garis gelap 4px, gradasi lembut, dan kanvas 128×128, mengikuti ikon ramuan kustom. Tema mencakup status, navigasi, fitur ruangan, menu Phone, ramuan dasar, achievement, fullscreen, 16 minigame, dan ikon instalasi PWA. Seluruh 104 makanan/minuman juga digambar ulang dalam tema yang sama, termasuk tampilan toko, kulkas, drag, dan sprite minigame. Aset pakaian tetap memakai gambar item asli. ID aset lama dipetakan melalui `src/lib/icon-theme.ts`, sehingga referensi Canvas dan save tetap cocok. Seluruh ikon tema masuk cache dasar offline. `npm run build:icons` membuat ulang set dari `scripts/build-icons.mjs` dan `scripts/food-icons.mjs`; proses build dan persiapan media juga menjalankannya otomatis.

Service worker menyimpan shell dan aset dasar. Aset yang dipakai berikutnya disimpan sesuai kebutuhan. Untuk seluruh aset tersedia offline sebelum bermain, pilih **Settings → Unduh semua aset offline** ketika terhubung internet. Penyimpanan tetap mengikuti kuota dan keputusan browser. Save tidak disimpan di cache service worker, sehingga pembaruan cache game tidak menghapus save.

## Fitur yang sudah diimplementasikan

Kitchen, Bathroom, Lab, Game Room, Bedroom, Garden, Playground; makan melalui tap/drag; sabun dan shower; tidur; lempar bola; inventaris dan pembelian makanan/ramuan; warna tubuh/mata, topi, kacamata, baju sederhana, wallpaper; level, koin, pencapaian lokal; rekam dan putar ulang suara dengan nada lebih tinggi; 16 minigame lokal dengan skor terbaik dan hadiah.

Sky Jump menyusun platform berdasarkan jangkauan lompatan. Hoops memiliki lintasan bidik bertitik, indikator Power, dan deteksi tarikan dari bola. Puzzle memastikan ada aksi berikutnya; skor, pendaratan, tembakan masuk, dan kegagalan memiliki feedback visual.

Cliff Jump hanya dapat mendarat ketika melintasi permukaan tanah dari atas. Setelah jatuh ke celah, Pou terus jatuh sampai Game Over meskipun celah sudah bergerak melewatinya; karakter tidak dikembalikan ke permukaan.

## Batas kesamaan dengan APK

**Ini belum port 100% identik.** Font, gambar, dan suara berasal dari APK. Renderer karakter, posisi menu, harga, statistik, progression, hadiah, AI, dan aturan minigame adalah implementasi web yang belum dibandingkan frame demi frame terhadap aplikasi asli. Sebagian katalog pakaian asli terdiri dari potongan grafis dan belum dirakit ulang. Layanan akun/teman/kunjungan, pembelian dalam aplikasi, Bluetooth, dan sejumlah minigame asli belum diimplementasikan. Lihat `PARITY.md` untuk rincian.

## Memperbarui aset

Hanya diperlukan bila mengganti APK atau mengekstrak ulang aset. Memerlukan Python, Android SDK `aapt`, dan `ffmpeg`.

```sh
python3 scripts/extract-assets.py pou-1-4-138.apk --aapt /path/to/android-sdk/build-tools/36.0.0/aapt
npm run prepare:media
npm run build
```

## Verifikasi

```sh
npm run check
npm test
npm run build
npm run test:e2e
```

Pengujian unit menggunakan Node dengan dukungan TypeScript strip types (Node 22.18+). Playwright memerlukan browser terpasang (`npx playwright install chromium`). Pengujian perangkat fisik Safari/iPad masih perlu dilakukan. Lingkungan pengembangan agent memblokir socket browser dan server lokal, sehingga smoke test Playwright tidak bisa dijalankan di lingkungan tersebut.
