// ─── Attendance Service ────────────────────────────────────────
// Domain: Absensi & Log Kehadiran
// Endpoint yang ditangani: absen, koreksi, rekap

import { API_ENDPOINTS } from "../config/api.js";
import { get, post } from "./client.js";

/**
 * Ambil log absensi pada tanggal tertentu.
 * @param {string} tanggal - Format YYYY-MM-DD
 * @returns {Promise<{ data: Array }>}
 */
export const getRekapHarian = (tanggal) =>
  get(`${API_ENDPOINTS.REKAP}?tanggal=${tanggal}`);

/**
 * Ambil seluruh log absensi tanpa filter tanggal.
 * Digunakan untuk menampilkan riwayat kehadiran guru.
 * @returns {Promise<{ data: Array }>}
 */
export const getAllRekap = () =>
  get(`${API_ENDPOINTS.REKAP}?tanggal=`);

/**
 * Simpan data absensi (single maupun bulk).
 * @param {{ jam: string, tanggal: string, data: Array<{ nama_guru: string, kelas: string, mapel: string, status: string }> }} payload
 * @returns {Promise<unknown>}
 */
export const submitAbsen = (payload) => post(API_ENDPOINTS.ABSEN, payload);

/**
 * Koreksi status absensi yang sudah tersimpan.
 * @param {{ nama_guru: string, jam: string, tanggal: string, status_baru: string }} payload
 * @returns {Promise<unknown>}
 */
export const koreksiAbsen = (payload) => post(API_ENDPOINTS.KOREKSI, payload);
