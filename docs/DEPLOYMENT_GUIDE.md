# Pedoman Deployment (Architecture V2)

Ada 3 lapis komponen yang perlu di-*deploy* untuk mengeksekusi sistem Absensi Bot V2.

## 1. Google Sheets (Database)
1. Siapkan lembar bentang Google (Google Spreadsheet).
2. Buat sheet wajib: `Guru`, `Jadwal`, `rekap_semua`, `Setting`, `Task_Queue`.
3. Tambahkan email Service Account (`wa-ma-XX@...gserviceaccount.com`) ke daftar editor Sheet.
4. Salin ID Sheet (bagian URL di antara `/d/` dan `/edit`) dan masukkan ke variabel `GOOGLE_SHEET_ID`.

## 2. Cloudflare Worker (Backend/API)
Cloudflare Worker melayani seluruh permintaan REST API dari React Web.

1. Buka terminal di folder `worker`.
2. Pastikan file `service.json` (Service Account) berada di dalam folder *root* proyek agar `sheets.js` bisa di-*deploy* dengan benar (jika menggunakan skrip bundling lokal).
3. Jalankan instalasi: `npm install`
4. Set variabel Cloudflare Secret (Production):
   - `JWT_SECRET`: kata sandi unik
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (string dari `private_key` JSON)
   - `GOOGLE_SHEET_ID`
5. Lakukan deploy:
   ```bash
   npx wrangler deploy
   ```
6. Catat URL rilis worker (misal: `https://absen-worker.username.workers.dev`).

## 3. React Web (Frontend)
Web dapat di-*hosting* bebas (Netlify, Vercel, Cloudflare Pages).

1. Buka terminal di folder `web`.
2. Ubah URL API di `src/config/api.js`:
   ```javascript
   const API_URL = "https://absen-worker.username.workers.dev";
   ```
3. Kompilasi Web:
   ```bash
   npm run build
   ```
4. Unggah folder `dist/` ke layanan *hosting* statis Anda.

## 4. WhatsApp Bot (Automation Worker)
Bot WhatsApp WAJIB berjalan terus menerus pada mesin/PC/VPS sekolah (karena harus terkoneksi ke WhatsApp).

1. Buka direktori utama proyek (`d:\NUS\AbsenNew\Bot 2026`).
2. Konfigurasi file `.env`:
   ```
   GOOGLE_SHEET_ID=ID_SHEET
   GOOGLE_SERVICE_ACCOUNT_EMAIL=email_akun_layanan
   GOOGLE_PRIVATE_KEY=./service.json
   ```
3. Jalankan bot:
   ```bash
   npm start
   ```
4. Pindai kode QR (jika baru pertama kali atau sesi kedaluwarsa).
5. Biarkan terminal terbuka. Bot kini siap mengambil *tasks* (Polling) dan melayani obrolan WA.
