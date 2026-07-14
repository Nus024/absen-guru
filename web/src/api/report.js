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

/**
 * Unduh berkas rekap biner (PDF/Excel) langsung dari server.
 * @param {"pdf" | "xlsx"} format
 * @param {string} monthName
 * @param {number} year
 * @returns {Promise<Blob>}
 */
export const downloadRekapFile = async (format, monthName, year) => {
  const token = localStorage.getItem("token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const url = `${API_ENDPOINTS.EKSPOR_BULANAN.replace("ekspor-bulanan", "download-rekap")}?format=${format}&monthName=${encodeURIComponent(monthName)}&year=${year}`;
  const response = await fetch(url, {
    method: "GET",
    headers
  });
  if (!response.ok) {
    let errText = "Gagal mengunduh berkas.";
    try {
      const errObj = await response.json();
      errText = errObj.error || errText;
    } catch {}
    throw new Error(errText);
  }
  return response.blob();
};

/**
 * Menyimpan data rekap bulanan langsung ke Google Sheets secara RAW.
 * @param {{ monthName: string, year: number, values: Array<Array<any>> }} payload
 * @returns {Promise<{ message: string }>}
 */
export const saveRekapSheet = (payload) =>
  post(API_ENDPOINTS.EKSPOR_BULANAN.replace("ekspor-bulanan", "save-rekap-sheet"), payload);
