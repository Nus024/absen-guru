// ─── Report Service ────────────────────────────────────────────
// Domain: Rekap Bulanan, Sinkronisasi, Ekspor
// Endpoint yang ditangani: rekap-bulanan, sync-bulanan, ekspor-bulanan

import { API_ENDPOINTS } from "../config/api.js";
import { get, post } from "./client.js";

/**
 * Ambil statistik rekap kehadiran bulanan per guru.
 * @param {number} month - Bulan (1–12)
 * @param {number} year  - Tahun (misal: 2026)
 * @returns {Promise<{ data: Array }>}
 */
export const getRekapBulanan = (month, year) =>
  get(`${API_ENDPOINTS.REKAP_BULANAN}?month=${month}&year=${year}`);

/**
 * Sinkronisasi rekap bulanan ke Google Sheets.
 * @param {{ monthName: string, year: number }} payload
 * @returns {Promise<{ message: string }>}
 */
export const syncBulanan = (payload) =>
  post(API_ENDPOINTS.SYNC_BULANAN, payload);

/**
 * Ekspor laporan bulanan (PDF atau Excel) dan kirim via WhatsApp.
 * @param {{ format: "pdf" | "xlsx", monthName: string, year: number }} payload
 * @returns {Promise<unknown>}
 */
export const eksporBulanan = (payload) =>
  post(API_ENDPOINTS.EKSPOR_BULANAN, payload);
