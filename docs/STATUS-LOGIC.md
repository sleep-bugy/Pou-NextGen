# Status implementasi LOGIC.md

Audit ini membandingkan setiap bagian `LOGIC.md` dengan implementasi web saat ini. “Sebagian” berarti ada fungsi yang dapat dimainkan, tetapi rincian dalam dokumen belum semuanya diterapkan. Fitur tambahan yang diminta pemain, seperti racun dan multiplayer, tetap dipertahankan.

| Bagian LOGIC.md | Status di web | Pekerjaan tersisa |
| --- | --- | --- |
| 1. Game loop dan offline | Sebagian | `advance` memakai waktu nyata dan batas 48 jam; belum menggunakan semua aturan tick dan catch-up APK. Saat kembali setelah lebih dari 48 jam, sisa waktu di luar batas tidak diproses. |
| 2. Kebutuhan dan elusan | Sebagian | Web mengurangi kenyang 4, senang 3 dan energi terjaga 2,5 poin/jam serta memulihkan tidur 0,8 poin/detik. Kesehatan hanya turun saat kebutuhan tertentu sangat rendah; belum sama dengan rumus APK. Tidak ada status obesitas, bobot kebahagiaan atau nilai elusan asli. Web tidak membangunkan Pou saat energi penuh. Tidur paksa di bawah 10% adalah tambahan yang diminta pemain. |
| 3. Ruangan | Sebagian | Tersedia tujuh area lokal; navigasi indoor/outdoor, Hall, Pet, House, dan Garage belum sama dengan susunan dokumen. |
| 4. Mandi dan kotoran | Sebagian | Sabun, busa, bilas, koin mandi, timer kotor, peluang eek, dan koin eek tersedia. Syarat cakupan busa, timer dan perilaku detail masih perlu disamakan. |
| 5. Makan dan pertumbuhan | Sebagian | Makanan menambah kenyang, mempercepat timer kotor, dan menumbuhkan ukuran. Web mengelompokkan nutrisi berdasarkan nama, menolak semua makanan di atas 95% kenyang, dan cabai mengurangi kesehatan 10; atribut per item, obesitas, dan penolakan asli belum lengkap. |
| 6. Ramuan | Sebagian | Ramuan bayi/dewasa mengubah ukuran; syarat penolakan, harga koin, dan 100 XP mengikuti kelas APK yang diperiksa. Misalnya Health Potion di web +30 kesehatan seharga 20, sedangkan kelas APK `tu0` memberi +50 seharga 10 dan menolak pada kesehatan ≥90. ID dan efek ramuan lain juga belum sesuai; ramuan tambahan tetap tersedia. |
| 7. Level dan XP | Belum sesuai | Kurva level web masih rumus lama; hadiah setiap naik level dan batas level belum mengikuti dokumen. Perlu migrasi agar save lama tidak kehilangan progres. |
| 8. Kebun bunga | Belum sesuai | Kebun lokal memakai mekanisme tanam/panen; lima bunga tetap, layu, dan hadiah siram belum diterapkan. Kebun bersama online merupakan fitur tambahan. |
| 9. Minigame | Sebagian | Enam belas permainan tersedia; lima di antaranya memakai koin yang dikumpulkan. Game lain memakai rumus hadiah berdasarkan skor, termasuk Cliff Jump. Enam belas permainan lainnya belum tersedia dan detail fisika, progresi, serta hadiah perlu dicocokkan per game. |
| 10. Pet outdoor | Belum tersedia | Enam spesies dan kustomisasi pet perlu dibuat. Fitur pasangan Pou saat ini adalah fitur berbeda. |
| 11. Garasi | Belum tersedia | Area garasi, mobil, kustomisasi, upgrade, dan Hill Drive perlu dibuat. |
| 12. Mikrofon | Sebagian | Perekaman maksimal 5 detik dan playback rate 1,35 tersedia; dokumen merinci 10 detik dan pitch 2×. Deteksi suara, pitch shifting yang menjaga durasi, dan sinkronisasi mulut belum sesuai. |
| 13. Prestasi | Sebagian | Ada daftar pencapaian sederhana; katalog dan klaim hadiah sesuai APK belum lengkap. |
| 14. Kostum | Sebagian | Warna, topi, kacamata, dan pakaian sederhana tersedia; seluruh kategori dan urutan layer belum diterapkan. |
| 15. Save | Format web | Save memakai format web, bukan impor/ekspor langsung `me.pou.app_preferences.xml`. Migrasi menjaga save web lama, termasuk ukuran tubuh yang belum tersimpan. |

Fitur campur ramuan, ledakan saat gagal, Pou gosong, racun, pasangan, dan multiplayer merupakan fitur tambahan yang diminta pemain; jangan dihapus ketika aturan asli disesuaikan. Resep campuran yang sudah ditemukan sebelum fitur ledakan tetap dikenali.

## Urutan implementasi

1. Tetapkan model kebutuhan, timer, makanan dan migrasi save yang bisa diuji bersama.
2. Pindahkan level dan penghargaan tanpa menghapus level atau inventaris pemain yang sudah ada.
3. Samakan ramuan resmi, mandi dan kebun; pertahankan ramuan dan kebun online tambahan.
4. Tambahkan ruangan indoor/outdoor, pet dan garasi.
5. Sesuaikan permainan satu per satu dan tambahkan permainan yang belum tersedia.
6. Lengkapi mikrofon, pencapaian, kostum dan kompatibilitas save APK sesuai kebutuhan.
