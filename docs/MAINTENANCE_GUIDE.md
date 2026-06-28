# Pedoman Maintenance & Recovery

## Maintenance Rutin
1. **Bersihkan Task Queue**: Secara periodik (misal 1 minggu sekali), hapus baris-baris pada Google Sheet `Task_Queue` yang sudah berstatus `DONE` atau `FAILED` agar tidak memperlambat Google Sheets saat `Worker` mem-parsing data.
2. **Kapasitas Google Sheets**: Setiap Google Sheet memiliki batasan baris data (~5 juta sel). Pada awal semester, pertimbangkan untuk menyalin file Spreadsheet menjadi *Arsip* dan memulai file kosong dengan ID Spreadsheet baru jika data rekap harian sudah terlalu padat.
3. **Penyegaran Sesi Bot**: Apabila ada pembaruan versi WA Web, folder `.wwebjs_auth` dapat mengalami korupsi data. Jika bot *crash* atau *stuck* di layar awal, hapus folder `.wwebjs_auth` dan jalankan ulang untuk *scan QR* baru.

## Troubleshooting (Recovery)

### 1. Bot "Crash" / Timeout
- Bot dilengkapi mekanisme *restart* otomatis (`pm2` atau *script runner* bawaan Windows seperti `start-bot.bat`). 
- Jika Bot tidak memproses pesan WA, cek log terminal. Jika log menampilkan `Session Destroyed`, hapus sesi otentikasi `.wwebjs_auth` dan minta admin menyeken ulang QR.

### 2. Tugas (Task Queue) Terbengkalai
Jika baris di `Task_Queue` tertahan pada status `PENDING` atau `PROCESSING`:
- Pastikan Terminal / Layar konsol yang menjalankan `index.js` (Bot) sedang aktif.
- Pastikan tidak ada eror konektivitas. Bot mungkin harus direstart.

### 3. Login Web Gagal
- Apabila React Web tidak dapat *login*, pastikan Cloudflare Worker menyala.
- Periksa `API_URL` pada React.
- Periksa apakah variabel rahasia `JWT_SECRET` dikonfigurasi dengan benar di Cloudflare Worker.

### 4. Batas Limit Request Cloudflare
Cloudflare Worker versi gratis (Free) mendukung 100.000 *request* per hari. Untuk tingkat sekolah biasa, batas ini hampir mustahil tercapai. Namun bila sistem macet total (status error *502/429*), periksa dasbor analitik Cloudflare.
