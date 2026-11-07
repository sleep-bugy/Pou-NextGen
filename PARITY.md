# Acuan kesamaan

Sumber: `pou-1-4-138.apk`, package `me.pou.app`, version `1.4.138`, versionCode `287`.

| Bagian | Implementasi saat ini | Status terhadap APK |
| --- | --- | --- |
| Font | Pou.ttf asli | Aset sama |
| Gambar | Aset APK tersedia sebagai WebP lossless; ikon UI dan 104 makanan memakai SVG kustom | Tampilan disesuaikan permintaan pengguna; pakaian memakai aset APK |
| Audio | 63 musik/efek; OGG dikonversi AAC | Sumber asli; encoding Safari berbeda |
| Karakter | Vector Canvas, blink, tatapan, makan, tidur, kotor | Digambar ulang; belum diverifikasi terhadap path Android |
| Ruangan | 7 area lokal | Layout dan urutan belum diverifikasi persis |
| Makanan | Katalog 104 item, pembelian dan inventaris | Nutrisi/harga disusun ulang; belum cocok dengan bytecode asli |
| Ramuan | 8 jenis dasar + 6 ramuan tambahan (racun, penawar, energi unlimited) | Efek/harga web; tambahan sesuai permintaan pengguna |
| Pakaian | Warna, topi, kacamata, baju sederhana, wallpaper | Sebagian katalog; tidak seluruh outfit/layer asli |
| Eek | Penghitung waktu kotor dan peluang 50%; ketuk eek untuk 5 koin | Konversi penghitung waktu ke waktu nyata masih perkiraan; perlu verifikasi seluruh jalur update APK |
| Statistik/level | Decay waktu, tidur, kelelahan otomatis <10%, pulih ≥20%, XP | Rumus web; belum rumus asli |
| Save | IndexedDB, snapshot sebelumnya, cadangan lokal, JSON | Format web mandiri; bukan format save APK |
| Mikrofon | Rekam maksimal 5 detik dan playback pitch 1,35 | Perlu perbandingan pitch/timing di Safari |
| Minigame | 16 implementasi lokal di bawah | Aturan, AI, physics, progression belum diverifikasi identik |
| Pasangan/kematian | Pasangan lokal, interaksi, racun, revive gratis | Fitur tambahan web; bukan klaim kesamaan APK |
| Profil/teman/chat | Profil perangkat, pertemanan, presence, chat publik, undangan, kunjungan rumah dan reaksi | Implementasi web mandiri; login akun belum tersedia |
| Multiplayer | Food Drop dan Petualangan Co-op 2–4 pemain, kebun bersama, leaderboard server | Implementasi web mandiri; server perlu dijalankan/di-host |
| Rumah/Lab/kepribadian | Furnitur geser, campuran empat resep, kebiasaan dan makanan favorit | Fitur tambahan sesuai permintaan pengguna |
| Bluetooth/IAP | Belum tersedia | Belum diimplementasikan |
| Pengujian Safari A16 | Belum di perangkat fisik | Wajib sebelum menyatakan kompatibilitas terverifikasi |

Minigame yang sudah memiliki implementasi: Food Drop, Sky Jump, Free Fall, Jet Pou, Cliff Jump, Memory, Find Pou, Tic Tac Pou, Four Pous, Color Tap, Sad Tap, Pou Sounds, Match Tap, Food Swap, Goal, Hoops.

Ikon minigame lain yang ditemukan di APK tetapi belum memiliki implementasi: Beach Volley, Cliff Dash, Cloud Pass, Color Match, Connect, Connect 2, Hill Drive, Pet Walk, Pool, Pou Popper, Sky Hop, Star Popper, Sudoku, Tumble, Water Hop, Word Find.

Untuk mengklaim 100% identik, masih diperlukan port logika dan rumus asli, perakitan seluruh katalog, implementasi fitur yang hilang, serta perbandingan screenshot/interaksi/audio pada versi APK acuan dengan hasil Safari. Berkas APK dan aset saja belum membuktikan kesamaan perilaku.

## Audit logika saat ini

Audit ini membaca implementasi web dan memeriksa nama aset serta string dalam `classes2.dex` APK 1.4.138. APK belum dijalankan untuk mengamati perilaku. Keberadaan gambar atau nama di DEX bukan bukti aturan, angka hadiah, atau kapan suatu efek muncul.

| Mekanisme | Perilaku web saat ini | Yang perlu dibandingkan pada APK |
| --- | --- | --- |
| Eek | Penghitung waktu awal 30 menit, lalu 6 jam; 50% kemungkinan eek muncul, ketuk memberi 5 koin sekali. Disimpan dalam save. | Timer dan peluang berdasarkan APK; konversi ke waktu nyata masih perlu diverifikasi. |
| Mandi | Gosok sabun menghasilkan busa; shower membilasnya dan menyelesaikan mandi ketika semua busa habis. Mandi yang memenuhi syarat memberi 5 koin dan 15 XP. | Jumlah gosokan yang dibutuhkan dan kondisi persis untuk hadiah masih berbeda dari APK. |
| Makan | Item dikonsumsi, kenyang naik menurut kategori, timer kotor dipercepat 30 menit dan ukuran bertambah; XP naik 5; cabai menurunkan kesehatan 10. Harga dan nutrisi memakai kategori. | Harga dan efek tiap makanan, penolakan, obesitas, serta konversi timer ke waktu nyata. |
| Kebutuhan | Per jam lapar −4, senang −3, bersih −2, energi terjaga −2,5; tidur +0,8 energi/detik. Energi di bawah 10 memaksa tidur dan bangun diizinkan mulai 20. | Rumus APK; kelelahan otomatis adalah permintaan khusus proyek dan tidak boleh dianggap berasal dari APK. |
| Hadiah minigame | Food Drop, Sky Jump, Free Fall, Jet Pou dan Memory memberi koin saat dikumpulkan dan XP sesuai koin saat selesai; game lainnya masih membayar berdasarkan skor akhir. | Pembayaran koin, pencapaian, waktu pemberian dan apakah keluar menyimpan hasil pada tiap permainan. |
| Sky Jump | Pou otomatis memantul saat mendarat; kamera naik; koin muncul di sebagian platform; skor dari ketinggian. Jarak platform dibatasi. | Logika lompatan dan objek asli. APK memuat gambar pegas, latar langit/angkasa, fosil, planet dan pesawat; cara pemakaiannya belum diverifikasi. |
| Free Fall | Pou bergerak kiri/kanan menghindari awan yang naik; melewati awan menambah skor, mengambil koin menambah saldo dan 5 tabrakan mengakhiri permainan. | Kecepatan, tabrakan, batas bawah arena, waktu dan potensi objek lain; APK memuat gambar jam. |
| Food Drop | Makanan memberi skor dan koin berkala; delapan makanan terlewat atau satu benda berbahaya tertangkap mengakhiri permainan. | Jenis item, laju jatuh, perubahan kesulitan, nyawa dan perolehan koin. |
| Hoops dan Goal | Tarik/geser bola; Hoops 3 poin per keranjang, Goal 1 poin; keduanya memakai waktu dan nyawa. | Fisika, poin, kesempatan, durasi dan umpan balik masing-masing game APK. |
| Food Swap | Tukar dua makanan lalu cocokkan 3; kombo memberi poin. APK memuat gambar bom, es, kunci dan laser yang belum dipakai di web. | Aturan pembentukan dan efek power-up, level, batas waktu dan skor. |
| Kebun | Siram, tunggu satu jam, panen 20 koin dan 5 XP. | Lama tumbuh, hadiah dan variasi tanaman asli. |

Urutan verifikasi yang paling berguna: rekam satu putaran aplikasi asli untuk masing-masing mekanisme di atas, termasuk nilai sebelum/sesudah, interaksi gagal dan kondisi akhir. Bandingkan dengan hasil web pada ukuran layar yang sama sebelum mengubah rumus; pertahankan fitur tambahan yang diminta pengguna sebagai opsi terpisah.
