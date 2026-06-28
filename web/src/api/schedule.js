// ─── Schedule Service ──────────────────────────────────────────
// Domain: Jadwal Mengajar
// Endpoint yang ditangani: jadwal

import { API_ENDPOINTS } from "../config/api.js";
import { get } from "./client.js";

/**
 * Ambil jadwal mengajar berdasarkan nama hari.
 * @param {string} hari - Nama hari dalam bahasa Indonesia lowercase
 *                        (misal: "senin", "selasa", "rabu", dst.)
 * @returns {Promise<{ data: Array }>}
 */
export const getJadwal = (hari) =>
  get(`${API_ENDPOINTS.JADWAL}?hari=${hari}`);
