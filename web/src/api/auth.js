// ─── Authentication Service ────────────────────────────────────
// Domain: Login, Status Server
// Endpoint yang ditangani: status, login

import { API_ENDPOINTS } from "../config/api.js";
import { get, post } from "./client.js";

/**
 * Cek status server dan WhatsApp bot.
 * Endpoint publik — tidak membutuhkan token.
 * @returns {Promise<{ botReady: boolean }>}
 */
export const getStatus = () => get(API_ENDPOINTS.STATUS);

/**
 * Login dengan nomor WA dan Password
 * @param {string} phone
 * @param {string} password
 * @returns {Promise<{ token: string, user: { phone: string, name: string, role: string } }>}
 */
export const login = (phone, password) =>
  post(API_ENDPOINTS.LOGIN, { phone, password });
