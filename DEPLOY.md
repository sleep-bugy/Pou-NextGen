# Panduan deploy Pou

Game ini memakai Svelte/Vite untuk antarmuka. Multiplayer tersedia melalui Cloudflare Workers dan Durable Objects, atau server Node.js sendiri. Hosting statis saja menjalankan permainan lokal tanpa fitur Mabar.

## Cloudflare gratis

### Workers dan Durable Objects: game dan multiplayer

Konfigurasi `wrangler.jsonc` menggunakan Worker untuk endpoint WebSocket dan aset, serta SQLite-backed Durable Object untuk menyimpan profil, teman, kebun, furnitur, peringkat, dan hadiah. Ruangan menggunakan satu lobby bersama, dengan batas aplikasi 200 koneksi dan 5.000 profil. Penyimpanan game karakter di browser tetap terpisah dari profil online.

1. Siapkan akun Cloudflare dan Node.js 22.18 atau lebih baru.
2. Dari direktori proyek, jalankan:

```sh
npm ci
npm run build
npx wrangler@4 login
npx wrangler@4 deploy
```

3. Buka alamat `workers.dev` yang diberikan Wrangler pada dua perangkat. Pastikan `/api/health` menghasilkan `{"ok":true,"backend":"cloudflare"}`, lalu coba membuat ruangan, bergabung, dan mengirim chat.
4. Untuk deploy otomatis lewat GitHub, buat **Worker** dengan Git integration di Cloudflare, pilih repository, gunakan `npm ci && npm run build` sebagai build command dan `npx wrangler@4 deploy` sebagai deploy command. `wrangler.jsonc` harus berada di akar repository. Push kode proyek terbaru sebelum menghubungkan repository.

Cloudflare Free **tidak tanpa batas**. Saat panduan ini ditulis, Durable Objects mencakup 100.000 request per hari, 13.000 GB-detik per hari, 100.000 baris ditulis per hari, dan penyimpanan total 5 GB. Pesan WebSocket masuk diperhitungkan menurut aturan Cloudflare; pertandingan aktif juga memakai durasi komputasi. Jika kuota habis, operasi dapat gagal sampai kuota direset. Periksa [harga Durable Objects](https://developers.cloudflare.com/durable-objects/platform/pricing/) dan [batas Workers](https://developers.cloudflare.com/workers/platform/limits/) sebelum digunakan. Satu lobby cocok untuk skala kecil; bukan jaminan kapasitas untuk pemain tak terbatas.

WebSocket menggunakan hibernasi saat tidak ada pertandingan; timer 50 ms hanya aktif saat pertandingan berlangsung. Data tersimpan pada Durable Object akun Cloudflare dan tidak otomatis pindah dari file `social.json` server Node. Pertandingan aktif dan chat sementara dapat terpengaruh jika Worker diperbarui atau koneksi terputus. Uji dua perangkat setelah deploy dan pantau penggunaan di dashboard.

### Alternatif lain

### A. Cloudflare Pages: permainan lokal dan offline

1. Di komputer dengan Node.js 22.18+, jalankan `npm ci` lalu `npm run build`.
2. Di dashboard Cloudflare, buka **Workers & Pages**, buat proyek **Pages Direct Upload**, lalu upload isi folder `dist/`. Atau ikuti [panduan Direct Upload resmi](https://developers.cloudflare.com/pages/get-started/direct-upload/).
3. Buka alamat `*.pages.dev` yang diberikan Cloudflare di Safari iPad, kemudian pilih **Bagikan → Tambahkan ke Layar Utama**.

Ini mengunggah frontend statis. **Chat, teman, kebun bersama, leaderboard, dan co-op belum berjalan** karena Pages tidak menjalankan `server/index.mjs`. Simpan pilihan Direct Upload dengan sengaja: Cloudflare menyatakan proyek tersebut tidak bisa diubah menjadi Git integration; buat proyek baru jika nanti ingin integrasi Git. Cek [batas Pages](https://developers.cloudflare.com/pages/platform/limits/) sebelum upload.

### B. Cloudflare Tunnel: semua fitur dengan komputer/server milikmu

Ini cara tercepat mencoba Mabar tanpa mengubah backend. Komputer yang menjalankan game dan `cloudflared` harus tetap menyala dan terhubung internet.

1. Jalankan `npm ci`, `npm run build`, lalu `npm start` di komputer. Server game tersedia pada `http://localhost:3001`.
2. Instal `cloudflared` mengikuti [petunjuk Cloudflare](https://developers.cloudflare.com/tunnel/get-started/), lalu di terminal lain jalankan:

```sh
cloudflared tunnel --url http://localhost:3001
```

3. Buka URL HTTPS `*.trycloudflare.com` yang muncul di **kedua perangkat**. Coba `/api/health`, buat ruangan, lalu bergabung lewat kode. Seluruh HTTP dan WebSocket harus memakai hostname yang sama; jangan buka frontend di `pages.dev` sementara backend memakai hostname Tunnel lain, karena klien dan pemeriksaan Origin server menggunakan origin yang sama.

Quick Tunnel bersifat sementara; alamat berubah saat dijalankan ulang dan Cloudflare menyediakannya untuk pengujian. Karena save karakter terikat origin, ekspor save sebelum alamat berganti. Untuk alamat tetap, konfigurasikan **named Tunnel** dengan hostname/domain yang tersedia di akun Cloudflare, arahkan HTTP ke `http://localhost:3001`, dan gunakan direktori `POU_DATA_DIR` permanen. Lihat [panduan Tunnel](https://developers.cloudflare.com/tunnel/get-started/) dan [Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).

## Persiapan

1. Siapkan Node.js 22.18 atau lebih baru, npm, domain yang mengarah ke server, serta HTTPS.
2. Pastikan folder proyek berisi `src/`, `server/`, `scripts/`, `public/`, `package.json`, dan `package-lock.json`. Aset yang dipakai game berada dalam `public/assets/`; periksa bahwa aset tersedia di server sebelum build.
3. Jalankan dari direktori proyek:

```sh
npm ci
npm test
npm run build
```

Build menghasilkan `dist/`. `npm ci` saat build harus memasang dev dependencies karena Vite, Svelte Check, TypeScript, dan Sharp dibutuhkan saat build. Setelah itu jalankan:

```sh
PORT=3001 POU_DATA_DIR=/var/lib/pou npm start
```

Direktori `/var/lib/pou` harus sudah ada dan dapat ditulis oleh pengguna yang menjalankan Node. Server mendengarkan `0.0.0.0` pada `PORT` atau 3001. `GET /api/health` mengembalikan JSON `ok: true`. Tes di server:

```sh
curl http://127.0.0.1:3001/api/health
```

Gunakan process manager seperti systemd atau pengelola proses dari hosting agar server otomatis berjalan kembali. Jangan menjalankan beberapa instance independen: ruangan dan koneksi aktif disimpan di memori masing-masing instance.

## HTTPS dan WebSocket menggunakan Caddy

Setelah DNS domain mengarah ke server dan port 80/443 dapat diakses, contoh Caddyfile:

```caddyfile
pou.example.com {
    reverse_proxy 127.0.0.1:3001
}
```

Ganti domain dengan milikmu. Caddy meneruskan WebSocket dan header Host untuk upstream HTTP secara bawaan. Lihat [dokumentasi reverse proxy Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy) dan [panduan konfigurasi Caddy](https://caddyserver.com/docs/quick-starts/reverse-proxy). Atur firewall agar port aplikasi 3001 tidak perlu dibuka langsung ke internet. Semua pemain harus membuka domain yang sama supaya bergabung ke server dan ruangan yang sama.

Jika memakai penyedia hosting Node, pakai perintah build `npm ci && npm run build`, perintah start `npm start`, dan sediakan volume persisten untuk `POU_DATA_DIR`. Pastikan penyedia meneruskan WebSocket pada `/multiplayer`, mempertahankan Host asli, dan menyediakan HTTPS. Hindari hosting statis atau serverless yang tidak mempertahankan proses WebSocket untuk fitur Mabar.

## Data dan backup

- `POU_DATA_DIR/social.json` berisi profil online, hubungan teman, kebun, peringkat, publikasi rumah, dan hadiah yang belum dikonfirmasi. Simpan direktori ini di volume persisten dan backup secara berkala. Ruangan aktif dan chat sementara hilang saat server restart.
- Progress Pou, pengaturan bahasa, dan token profil online tersimpan di browser perangkat. **Settings → Export save** mengekspor progress karakter, tetapi token profil online tidak ikut dalam ekspor. Menyimpan ulang domain atau perangkat baru memerlukan impor save karakter dan dapat menghasilkan profil online baru.
- Nama domain/origin yang berubah memakai penyimpanan browser berbeda. Sebelum pindah alamat, ekspor save dan impor di alamat baru. Jangan menghapus data direktori server ketika memperbarui aplikasi.
- Jika menggunakan Docker volume, volume menyimpan data di luar lapisan container; lihat [dokumentasi Docker volumes](https://docs.docker.com/engine/storage/volumes/). Jangan hapus volume yang berisi data tanpa backup.

## Pengujian setelah deploy

1. Buka `https://pou.example.com/api/health`; pastikan respons berhasil.
2. Buka game di dua perangkat pada domain yang sama. Di **Phone → Mabar**, buat ruangan dan bergabung dengan kode; coba Food Drop dan co-op.
3. Tambah teman, cek chat, kebun, leaderboard, dan undangan. Restart server lalu pastikan daftar teman dan kebun masih ada.
4. Di Safari iPad: **Bagikan → Tambahkan ke Layar Utama**. Coba suara, sentuhan, fullscreen/PWA, dan ekspor save. HTTPS diperlukan untuk service worker dan mikrofon di luar localhost.
5. Jika Mabar gagal, periksa log server, `POU_DATA_DIR`, WebSocket upgrade `/multiplayer`, dan Host yang diteruskan proxy. Jika game lokal tampil tetapi server tidak berjalan, fitur online tidak akan tersedia.

## Memperbarui versi

Backup data server dan ekspor save penting terlebih dahulu. Perbarui kode dan aset, jalankan `npm ci`, `npm test`, dan `npm run build`, lalu restart proses Node. Biarkan `POU_DATA_DIR` menunjuk direktori yang sama. Setelah update, muat ulang game; service worker akan memperbarui cache versinya.
