// ─── Settings Service ──────────────────────────────────────────
// Domain: Pengaturan, Alarm, Broadcast, Kontak
// Endpoint yang ditangani: settings, alarm, broadcast, kontak

import { API_ENDPOINTS } from "../config/api.js";
import { get, post } from "./client.js";

/**
 * Ambil pengaturan aplikasi (autoRekapActive, dsb).
 * @returns {Promise<{ autoRekapActive: boolean }>}
 */
export const getSettings = () => get(API_ENDPOINTS.SETTINGS);

/**
 * Perbarui pengaturan aplikasi.
 * @param {{ autoRekapActive: boolean }} payload
 * @returns {Promise<{ autoRekapActive: boolean }>}
 */
export const updateSettings = (payload) =>
  post(API_ENDPOINTS.SETTINGS, payload);

/**
 * Kirim alarm pengingat KBM via WhatsApp bot.
 * Menyasar guru yang belum diabsen pada jam aktif.
 * @returns {Promise<unknown>}
 */
export const sendAlarm = () => post(API_ENDPOINTS.ALARM);

/**
 * Kirim broadcast pesan ke kontak guru.
 * @param {{ targetMode: "TODAY" | "ALL", message: string }} payload
 * @returns {Promise<unknown>}
 */
export const sendBroadcast = (payload) =>
  post(API_ENDPOINTS.BROADCAST, payload);

/**
 * Ambil daftar kontak guru (nama + nomor WhatsApp).
 * @returns {Promise<Array<{ nama_guru: string, no_wa?: string, nomor_wa?: string }>>}
 */
export const getKontak = () => get(API_ENDPOINTS.KONTAK);
