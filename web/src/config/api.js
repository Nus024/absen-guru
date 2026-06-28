// ═══════════════════════════════════════════════════════════════
// KONFIGURASI API TERPUSAT
// ═══════════════════════════════════════════════════════════════
//
// Semua konfigurasi komunikasi frontend ↔ backend berasal dari
// file ini. Jangan tulis URL backend secara langsung di tempat lain.
//
// Development  → BASE_URL kosong, Vite proxy /api → localhost:3000
// Production   → Isi VITE_API_BASE_URL di file .env production
//
// ═══════════════════════════════════════════════════════════════

/**
 * Alamat dasar backend.
 *
 * Development : tidak perlu di-set (Vite proxy menangani /api/*).
 * Production  : set via environment variable VITE_API_BASE_URL.
 *               Contoh: https://api.namadomain.com
 *
 * @type {string}
 */
export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/**
 * Seluruh endpoint backend terdefinisi di sini.
 * Gunakan konstanta ini di mana saja di codebase —
 * jangan hardcode string "/api/..." secara langsung.
 *
 * Untuk endpoint dengan query parameter dinamis, gunakan template literal:
 * Contoh: `${API_ENDPOINTS.JADWAL}?hari=${namaHari}`
 */
export const API_ENDPOINTS = {
  /** GET  — Status server & WhatsApp bot (no auth) */
  STATUS: `${BASE_URL}/api/status`,

  /** GET  — Ambil pengaturan aplikasi (autoRekap, dsb) */
  /** POST — Perbarui pengaturan aplikasi */
  SETTINGS: `${BASE_URL}/api/settings`,

  /** POST — Autentikasi dengan nomor WA dan password (no auth) */
  LOGIN: `${BASE_URL}/api/login`,


  /** GET  — Jadwal mengajar berdasarkan hari (?hari=nama_hari) */
  JADWAL: `${BASE_URL}/api/jadwal`,

  /** GET  — Log absensi (?tanggal=YYYY-MM-DD atau tanpa tanggal = semua) */
  REKAP: `${BASE_URL}/api/rekap`,

  /** GET  — Daftar kontak guru (nama + nomor WhatsApp) */
  KONTAK: `${BASE_URL}/api/kontak`,

  /** POST — Simpan data absensi (single maupun bulk) */
  ABSEN: `${BASE_URL}/api/absen`,

  /** POST — Koreksi status absensi yang sudah tersimpan */
  KOREKSI: `${BASE_URL}/api/koreksi`,

  /** GET  — Statistik rekap bulanan per guru (?month=M&year=YYYY) */
  REKAP_BULANAN: `${BASE_URL}/api/rekap-bulanan`,

  /** POST — Sinkronisasi rekap bulanan ke Google Sheets */
  SYNC_BULANAN: `${BASE_URL}/api/sync-bulanan`,

  /** POST — Ekspor laporan bulanan (PDF / Excel) via WhatsApp */
  EKSPOR_BULANAN: `${BASE_URL}/api/ekspor-bulanan`,

  /** POST — Kirim alarm pengingat KBM via WhatsApp bot */
  ALARM: `${BASE_URL}/api/alarm`,

  /** POST — Kirim broadcast pesan ke kontak guru terpilih */
  BROADCAST: `${BASE_URL}/api/broadcast`,
};
