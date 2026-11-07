# Catatan pembacaan logika Pou 1.4.138

Sumber: APK yang disediakan dan hasil JADX di `decompiled/sources`. Kode terobfuscate; nama seperti `zp2`, `r`, dan `N` dipertahankan agar dapat ditelusuri. Catatan ini membedakan perilaku yang benar-benar terlihat dalam kode dan hal yang masih perlu diuji. Ini bukan pernyataan bahwa seluruh APK sudah dipahami atau bahwa game web sudah identik.

## Model, waktu, dan penyimpanan

- `zp2` menyimpan kondisi karakter. `M()` menulis JSON: `fullness` = `k`, `obesity` = `l`, `light` = `w`, `energy` = `x`, `sleeping` = `y`, `health` = `p`, `dirty` = `t`, `fun` = `u`, `nDM` = `r`, `poops` = `s`, `xp` = `g`, dan lainnya. `f()` membaca kembali nilai ini. Sumber: `decompiled/sources/defpackage/zp2.java`, metode `M` dan `f`.
- `N(d, view)` mengurangi `fullness` dengan `0.00006481*d`, `fun` dengan `0.0000405*d`, energy terjaga dengan `0.000054*d`, serta menambah energy tidur dengan `0.000324*d`. Health dikurangi `0.00001286*d` saat dirty, atau `0.000009645*d` saat bersih. Nilai dibatasi pada 0–100. Jangan langsung mengonversi konstanta ini ke per jam tanpa menguji seluruh jalur pemanggilan `N`.
- Loop `ti.run()` melangkah 16 ms dan memanggil `AppView.t()`. `AppView.t()` memanggil `N(1, s)` dan, bila tidak sedang transisi, `s.K(d)`; implementasi dasar `g33.K()` juga memanggil `N(1, this)`. Perbedaan subclass dan transisi perlu diperiksa sebelum mengasumsikan jumlah update per detik.
- `l(waktu, view)` menghitung waktu offline dalam detik sejak save, mengalikan selisih dengan 60, dan dalam kondisi tanggal/jam tertentu membaginya dengan 3 sebelum memanggil `N`. Jangan samakan dengan perhitungan waktu offline web yang sekarang.
- Nilai awal pada `zp2.o()`: level 1, ukuran 0,5, fullness 30, health 100, energy 90, fun 80, `r` 1.800.000, dirty false. Penghitungan koin awal ada di `hv.F()` yaitu 200. Masih perlu melacak seluruh alur inisialisasi untuk memastikan tidak ada perubahan berikutnya.
- `a(xp, view)` mengurangi sisa XP level (`g`); saat habis, naik level, mengisi ulang lewat `k()` dan memberi koin sebanyak `min(level * 10, 1000)`. `k()` mengembalikan `(level + 1) * i.d()`, dan konstruktor membuat `i = new c62(55)`. Pastikan semantik `c62` dan batas level sebelum mem-port.

## Kamar mandi dan eek

- `zp2.N()` mengurangi timer `r` sebanyak `16*d`. Saat `r <= 0`, timer diisi `21.600.000`, `dirty` menjadi true, dan dengan peluang 50% jumlah `poops` bertambah satu. Saat view aktif merupakan `m42`, `m42.U()` membuat objek eek visual. Syarat yang terlihat di cabang ini **bukan** tiga kali makan dan kebersihan <80%.
- `zp2.o()` mengisi timer pertama dengan `1.800.000`. Konversi timer ke lama waktu nyata masih perlu memeriksa semua panggilan `N`, kondisi offline dan integer truncation.
- `m42.A()` pada case kamar mandi memeriksa sentuhan setiap objek `it1`; jika terkena, memanggil `zp2.B()`, memainkan suara, lalu menghapus objek. `zp2.B()` mengurangi jumlah `poops` dan menaikkan penghitung koin `hv.k` sebesar 5. `hv.z()` dan `hv.E()` memasukkan penghitung itu ke total koin.
- `it1` memuat `poop/red.png`, menerapkan filter warna acak dan menggambar dua mata. Objek visual yang ada di web saat ini belum menggambar kedua mata/variasi warnanya.
- `vt1.g()` mengurangi alpha kotoran 5 per panggilan sampai 0 dan memanggil `zp2.r()`; `vt1.h()` mengurangi 1 sampai 0 dan memanggil `zp2.s()`. Kedua metode `r`/`s` menetapkan dirty false, memanggil penambahan 15 XP, menambah 5 koin dan mencatat statistik/pencapaian bersih. Pastikan jalur pemanggilan g/h untuk menyimpulkan perbedaan antara alat dan gesture.
- **Perbedaan web:** saat ini memakai timer dengan peluang 50%, maksimum 100 eek tersimpan, bar kebersihan kontinu dan hadiah mandi 15 XP. Konversi timer awal 30 menit dan interval 6 jam merupakan perkiraan dan masih perlu diverifikasi.

## Ekonomi dan makanan

- `hv` menyimpan penghitung terpisah untuk sumber/pengeluaran koin. Total dihitung oleh `E()` dari saldo dasar, sumber koin dan pengeluaran; `z()` menjumlahkan penghitung hadiah. Sky Jump dan Food Drop menggunakan jalur `uo0.W()` untuk menambah penghitung hadiah game saat aksi terjadi.
- `hj0.x()` menaikkan penghitung makanan dimakan, memanggil `zp2.a(dj0.p(), view)` untuk XP, dan memperbarui pencapaian makan dan kategori makanan. Sumber nilai per item perlu ditelusuri lewat `dj0` dan koleksi makanannya; tidak boleh diasumsikan semua makanan memberi 5 XP seperti web.
- Contoh hasil jejak ID yang bisa diverifikasi: kategori 100/item 101 bernama `jelly_beans` (`dj0.t`), harga `dj0.k` = 3, level minimum `dj0.l` = 1, dan XP `dj0.p` = 10. `j2.c()` menggunakan `k` pada alur pembelian, sementara `j2.l()` membandingkan level dengan `l`. Web saat ini menetapkan harga 10 dan XP 5 untuk item itu.
- `zp2.P(hj0)` melibatkan fullness, obesity, riwayat makanan dan random untuk menentukan respons; nama flag dan dampak akhirnya belum pasti, sehingga jangan menganggapnya sekadar mekanisme kenyang.
- `zp2.D(view, boolean)` untuk salah satu aksi bunga menghapus flag layu, memberi 15 XP dan 5 koin serta memperbarui statistik/pencapaian; perlu jejak view untuk memastikan jenis aksi dan kapan layak diberikan.

## Food Drop (`fj0`)

- `xn0.A()` mengaitkan game ID 1 dengan `fj0`. `fj0.v0()` memulai penghitung makanan terlewat pada 0 dengan batas **8**, bukan tiga nyawa seperti web.
- `D0()` membuat makanan dan benda berbahaya dalam kelompok terpisah. Saat makanan melewati garis tangkap di luar Pou, penghitung terlewat bertambah; pada 8 game berakhir. Saat makanan ditangkap, skor bertambah 1. Saat benda berbahaya tertangkap, game langsung berakhir.
- Koin: penghitung `r1` dimulai 2; setiap mencapai nol ketika makanan tertangkap, `W(1)` dipanggil dan penghitung di-reset ke 2 atau 3 bergantung pada interval spawn. `uo0.W()` menambah penghitung koin game; `hv` menggabungkannya ke saldo. Web sekarang memakai hadiah langsung ini untuk Food Drop.
- `fj0` memuat sepatu, tapal kuda, CD dan pesawat sebagai benda berbahaya. Web saat ini baru memakai dua jenis.

## Sky Jump (`wn2`, `vn2`, `un2`)

- Game ID 2 dibuat oleh `xn0.A()`. `un2` memuat batu, tanah, awan, pesawat, shuttle, dua pegas, payung dan koin. `vn2` adalah platform/objek: tipe 1 batu, 2 tanah, 3 awan, 4 pesawat, 5 shuttle. `M()` mengaktifkan gerak horizontal; `K()` menambahkan pegas; `L()` menambahkan koin; `N()` menambahkan payung.
- Ketika Pou mendarat, `wn2.D0()` memantulkan Pou; platform berpegas memakai kecepatan pantul dua kali. Platform awan ditandai untuk efek jatuh. Platform dengan payung mengaktifkan flag selama 5 detik, yang mengubah percepatan saat kondisi tertentu.
- Koin diambil **saat mendarat pada platform berkoin**: flag koin dimatikan, `W(1)` dipanggil, suara dan efek dibuat. Jarak antarplatform berkoin mengikuti penghitung `i1/j1`; `v0()` memulai keduanya pada 5 dan saat koin dikumpulkan `j1` turun sampai minimal 3.
- Ketinggian menentukan fase melalui `Q0` dan `F0`. Batas yang terlihat meliputi 5.000, 15.000 dan 30.000; fase lanjutan, satuan ketinggian dan semua probabilitas harus ditelusuri sebelum menyalin. Fase mengubah jenis platform, peluang gerak, pegas, payung dan latar.
- Web sekarang memberi koin saat mendarat dan memakai penghitung platform. Pegas, payung, platform bergerak dan perubahan fase masih belum diimplementasikan.

## Hoops (`zv0`)

- `Q0(ho0)` membedakan dua kondisi bola. Kode menambah skor 2 atau 3 dan memanggil `W(1)` atau `W(3)` tergantung flag `ho0.O`. Diperlukan jejak `P0`/`R0` dan tabrakan untuk memberi nama pasti pada kedua kondisi. Web selalu menambah skor 3 dan membayar berdasarkan skor akhir.

## Free Fall (`nl0`)

- `v0()` mengatur penghitung terkena awan menjadi 0; konstruktor menetapkan batas 5. Dalam `D0()`, melewati awan di luar area awan menambah skor; melewati garis pada area awan menambah penghitung benturan dan pada 5 benturan mengakhiri permainan. Kecepatan awan bertambah dari `6*g` menuju batas `12*g`.
- Koin terpisah ikut bergerak ke atas. Saat jarak dari Pou kurang dari radius `n1`, kode memanggil `W(1)`, menghapus koin dari arena, dan memainkan efek. Saat sebuah awan baru dibuat, koin ditempatkan menjauh dari posisi awan. Web sekarang memiliki koin, skor melewati awan dan batas 5 tabrakan; jarak dan kecepatannya belum disamakan persis.

## Jet Pou (`a21`)

- Jalur tabrakan dalam kode memanggil `W(1)` untuk koin normal dan `W(5)` untuk objek bonus khusus, lalu menyembunyikan objek tersebut. Ada cabang yang memosisikan objek bonus ketika `(iD2 + 1) % 20 == 0`; arti pasti penghitung `iD2` masih perlu mengikuti penugasannya. Web sekarang memiliki koin normal dan bonus 5 koin; penyebaran dan fisikanya masih perlu dibandingkan.

## Memory (`qd1`)

- Pada dua kartu yang identik, kedua kartu ditandai cocok, skor bertambah 20, `W(1)` dipanggil, dan indikator waktu/energi `U0` ditambah dengan batas. Ada fase perhitungan sisa indikator dan game berakhir ketika indikator habis. Web sekarang memberi skor 20 dan satu koin per pasangan; model indikator dan pergantian papan belum sama.

## Indeks minigame asli

Nama dan ID berasal dari `xn0.w()`; kelas berasal dari factory `xn0.A()`. `jalur lain` berarti kasus itu tidak dibuat oleh factory `A`, bukan berarti belum ada di APK. Semua kelas masih perlu dibaca dan diverifikasi secara terpisah.

| ID | Minigame | Kelas |
| --- | --- | --- |
| 1 | Food Drop | `fj0` |
| 2 | Sky Jump | `wn2` |
| 3 | Free Fall | `nl0` |
| 4 | Color Match | `hw` |
| 5 | Sad Tap | `s52` |
| 6 | Pou Sounds | `du1` |
| 7 | Pou Popper | `zt1` |
| 8 | Tic Tac Pou | `jalur lain` |
| 9 | Four Pous | `jalur lain` |
| 10 | Find Pou | `tg0` |
| 11 | Match Tap | `zc1` |
| 12 | Color Tap | `kw` |
| 13 | Memory | `qd1` |
| 14 | Connect | `wy` |
| 15 | Goal | `jalur lain` |
| 16 | Cloud Pass | `ru` |
| 17 | Cliff Jump | `du` |
| 18 | Pool | `jalur lain` |
| 19 | Water Hop | `c53` |
| 20 | Sky Hop | `pn2` |
| 21 | Hill Drive | `bv0` |
| 22 | Cliff Dash | `yt` |
| 23 | Word Find | `n93` |
| 24 | Pet Walk | `br1` |
| 25 | Jet Pou | `a21` |
| 26 | Hoops | `zv0` |
| 27 | Tumble | `vx2` |
| 28 | Sudoku | `ts2` |
| 29 | Star Popper | `tp2` |
| 30 | Food Swap | `uj0` |
| 31 | Beach Volley | `hl` |
| 32 | Connect 2 | `sy` |

## Pekerjaan lanjutan

1. Telusuri semua pemanggil timer, aksi makan/mandi dan konversi waktu online/offline; buat contoh yang bisa diuji sebelum mengganti formula save.
2. Baca kelas setiap minigame, perilaku akhir dan payout; buat pengujian skenario yang memverifikasi aturan asli.
3. Bandingkan hasil dekompilasi dengan aplikasi nyata. JADX menandai beberapa metode dengan peringatan dan ada nama yang disamarkan; tangani secara terpisah.
4. Pertahankan fitur tambahan dan migrasi save web; jangan menyalin nilai tebakan sebagai fakta.
