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
