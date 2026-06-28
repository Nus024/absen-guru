# Architecture V2

## Visi & Objektif
Architecture V2 memecahkan masalah monolitik pada sistem Absensi WA Bot generasi pertama. Sistem lama menggabungkan antarmuka obrolan WhatsApp, REST API Web, dan operasi Google Sheets ke dalam satu proses tunggal (`index.js`). Hal ini menyebabkan *race conditions*, masalah otentikasi (OTP rentan), serta *downtime* ganda ketika salah satu antarmuka bermasalah.

Architecture V2 memisahkan *concern* ke dalam arsitektur berorientasi lapisan (Layered-Oriented Architecture).

## Arsitektur Komponen

### 1. Presentation Layer (React Web & WhatsApp UI)
Sistem memiliki dua antarmuka (UI) terpisah yang independen:
- **Web App (React/Vite)**: Dasbor bagi admin/operator sekolah untuk melihat rekap, mengelola absensi massal, dan mengatur jadwal.
- **WhatsApp UI (Bot Chat)**: Antarmuka berbasis obrolan bagi guru untuk melakukan presensi cepat atau cek rekap via `/absen` dan `/jadwal`.

Keduanya berfungsi setara, tidak saling mengandalkan, dan beroperasi di atas logika yang sama.

### 2. Application Layer (Cloudflare Worker)
Worker adalah *single-gateway* untuk seluruh aturan bisnis Web.
- **Autentikasi**: Memvalidasi nomor WhatsApp, memverifikasi kata sandi (*hash*), dan menerbitkan/mengonfirmasi token JWT.
- **REST API**: Menangani rute `/api/jadwal`, `/api/rekap`, `/api/koreksi`, dsb.
- **Task Dispatcher**: Menyisipkan tugas (`ALARM`, `SEND_WHATSAPP`) ke dalam `Task_Queue` Google Sheets untuk diproses oleh Bot.
- Cloudflare Worker 100% *Stateless* dan *Serverless*.

### 3. Data & Queue Layer (Google Sheets)
Satu-satunya *Single Source of Truth* (SSOT) dan basis data proyek.
- **Kredensial & Jadwal**: Tabel standar *Guru*, *Jadwal*, *Setting*, *Rekap*.
- **Message Broker (`Task_Queue`)**: Sistem persilangan pesan asinkron. Web menulis tugas ke dalam sheet ini (karena Cloudflare Worker tidak memiliki koneksi permanen ke WhatsApp). WhatsApp Bot memantau sheet ini.

### 4. Automation Worker (WhatsApp Bot `index.js`)
- Mengambil (`polling`) *tasks* berstatus `PENDING` dari `Task_Queue` setiap 10 detik.
- Mengirim pesan WhatsApp (*broadcast*/alarm).
- Menangani sesi obrolan guru.
- Berjalan murni sebagai *worker* independen.

---

## Keamanan
- Kata sandi (kolom `Password_Hash`) diverifikasi secara aman oleh Worker.
- *Secret keys* dan kredensial layanan Google (Service Account JSON) disembunyikan menggunakan `.env` (untuk Node) atau Secret Vars (untuk Cloudflare Worker).
- Koneksi Web ↔ Worker dilindungi JWT kedaluwarsa 24-jam.

## Alur Data
1. Pengguna membuka Web → React mengirim JWT ke Cloudflare Worker.
2. Worker memvalidasi JWT → Worker memanggil Google Sheets API (baca/tulis).
3. Jika tugas memerlukan WA (misal: pengingat), Worker memasukkan data ke `Task_Queue`.
4. Bot (`index.js`) membaca `Task_Queue` → Mengirim pesan WhatsApp → Mengubah status sheet menjadi `DONE`.
