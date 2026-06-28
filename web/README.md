# Absensi Web — MA. Miftahul Ulum 2

Aplikasi web untuk manajemen absensi guru, dibangun dengan **React + Vite**.

## Fitur

- Login via OTP WhatsApp
- Input absensi harian per jam
- Rekap bulanan dengan filter & pencarian
- Sinkronisasi ke Google Sheets
- Ekspor laporan (PDF / Excel) ke WhatsApp
- Pengaturan rekap otomatis

## Stack

- React 19
- Vite 8
- MUI Icons

## Development

Pastikan backend API server sudah berjalan di `http://localhost:3000` sebelum menjalankan dev server.

```bash
npm install
npm run dev
```

Vite akan mem-proxy request `/api/*` ke `http://localhost:3000` secara otomatis.

## Build

```bash
npm run build
```

Output berada di folder `dist/`. Salin ke server backend agar dapat di-serve sebagai static files.

## Deployment

Repository ini siap di-deploy ke layanan hosting statis seperti:
- **Cloudflare Pages**
- **GitHub Pages**
- **Vercel**

> Catatan: Karena aplikasi ini berkomunikasi dengan API backend (WhatsApp Bot), pastikan backend sudah berjalan dan dapat diakses dari domain produksi.
