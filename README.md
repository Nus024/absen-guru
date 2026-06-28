# Absensi Bot + Web (Architecture V2)

Sistem Informasi Kehadiran & Rekapitulasi Berbasis WhatsApp & Cloudflare Worker (React Web) – 100% Menggunakan Google Sheets sebagai Database.

Arsitektur V2 memisahkan Web API (via *Cloudflare Worker*) dari Bot WA, menjadikan sistem sangat tangguh (*resilient*), tidak terbebani *race conditions*, dan mampu di-deploy secara *serverless*.

## Fitur Utama

- **Web Dashboard**: Panel guru (React) untuk melihat jadwal, merekap absensi bulanan, melakukan koreksi absen, mengirim broadcast, hingga membunyikan bel/alarm notifikasi.
- **WhatsApp Interface (Automation Worker)**: Mengizinkan absensi secara manual melalui chat (ex: `/absen Hadir`), membalas pertanyaan jadwal, serta mengirim pengingat secara pasif.

## Struktur Direktori
- `/web` : Source code *frontend* React JS (Vite).
- `/worker` : Source code API *backend* menggunakan Cloudflare Worker.
- `/docs` : Pedoman mendalam mengenai arsitektur, instalasi, dan pemeliharaan.
- `index.js` : *Source code* untuk **Automation WhatsApp Worker** (NodeJS).

## Panduan Instalasi
Sistem ini terdiri dari 3 buah lingkungan yang di-*deploy* terpisah.

Silakan pelajari [Pedoman Deployment (DEPLOYMENT_GUIDE)](./docs/DEPLOYMENT_GUIDE.md) untuk langkah-langkah detail.

## Referensi Arsitektur & Perawatan
- [Architecture V2 Overview](./docs/ARCHITECTURE_V2.md)
- [Maintenance & Recovery Guide](./docs/MAINTENANCE_GUIDE.md)

---
*Dibangun dengan cinta untuk efisiensi pendidikan.*
