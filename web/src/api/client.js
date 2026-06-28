// ═══════════════════════════════════════════════════════════════
// API CLIENT — Lapisan komunikasi tunggal frontend ↔ backend
// ═══════════════════════════════════════════════════════════════
//
// Seluruh request HTTP melewati file ini.
// Komponen React tidak boleh memanggil fetch() secara langsung.
//
// Tanggung jawab:
//   - Inject Authorization Header (JWT dari localStorage)
//   - Global timeout via AbortController (15 detik)
//   - Parsing response.json() terpusat
//   - Normalisasi error (Network, Timeout, 401, 403, 404, 500)
//   - Dispatch event "api:unauthorized" saat JWT kedaluwarsa
//
// ═══════════════════════════════════════════════════════════════

/** Timeout global untuk setiap request (milidetik). */
const TIMEOUT_MS = 15_000;

// ─── Error Types ─────────────────────────────────────────────

export const ERROR_TYPES = {
  NETWORK: "NETWORK",
  TIMEOUT: "TIMEOUT",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION: "VALIDATION",
  SERVER: "SERVER",
  UNKNOWN: "UNKNOWN",
};

/**
 * Error terstandarisasi dari API Client.
 * Selalu memiliki: message, status (HTTP code atau null), type (ERROR_TYPES).
 */
export class ApiError extends Error {
  constructor(message, status, type) {
    super(message);
    this.name = "ApiError";
    this.status = status ?? null;
    this.type = type ?? ERROR_TYPES.UNKNOWN;
  }
}

// ─── Response Handler ─────────────────────────────────────────

/**
 * Memproses Response object dari fetch:
 * - Melempar ApiError untuk semua kondisi non-ok
 * - Mengembalikan parsed JSON untuk kondisi sukses
 *
 * @param {Response} res
 * @returns {Promise<unknown>} Parsed JSON body
 */
async function handleResponse(res) {
  const isLoginRequest = res.url && res.url.includes('/api/login');

  if (res.status === 401 && !isLoginRequest) {
    // Hapus kredensial lama dan beri tahu komponen React via event
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new CustomEvent("api:unauthorized"));
    throw new ApiError("Sesi login berakhir.", 401, ERROR_TYPES.UNAUTHORIZED);
  }

  if (res.status === 403) {
    throw new ApiError("Akses ditolak.", 403, ERROR_TYPES.FORBIDDEN);
  }

  if (res.status === 404) {
    throw new ApiError("Data tidak ditemukan.", 404, ERROR_TYPES.NOT_FOUND);
  }

  if (!res.ok) {
    let message =
      res.status >= 500
        ? "Terjadi kesalahan server."
        : "Terjadi kesalahan pada permintaan.";
    try {
      const body = await res.json();
      message = body.error || body.message || message;
    } catch {
      /* biarkan pesan default jika parsing gagal */
    }
    const type =
      res.status >= 500 ? ERROR_TYPES.SERVER : ERROR_TYPES.VALIDATION;
    throw new ApiError(message, res.status, type);
  }

  return res.json();
}

// ─── Core Request ─────────────────────────────────────────────

/**
 * Mengirim HTTP request dengan:
 * - AbortController timeout (TIMEOUT_MS)
 * - Authorization header dari localStorage (jika ada token)
 * - Content-Type: application/json (jika ada body)
 *
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<unknown>} Parsed JSON response
 */
async function request(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const token = localStorage.getItem("token");
  const headers = { ...options.headers };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return await handleResponse(res);
  } catch (err) {
    clearTimeout(timeoutId);

    // Teruskan ApiError tanpa modifikasi
    if (err instanceof ApiError) throw err;

    // AbortController.abort() melempar AbortError
    if (err.name === "AbortError") {
      throw new ApiError(
        "Permintaan habis waktu. Periksa koneksi dan coba lagi.",
        null,
        ERROR_TYPES.TIMEOUT
      );
    }

    // Network error (backend mati, DNS gagal, dsb)
    throw new ApiError(
      "Gagal terhubung ke server.",
      null,
      ERROR_TYPES.NETWORK
    );
  }
}

// ─── Public HTTP Methods ──────────────────────────────────────

/**
 * HTTP GET
 * @param {string} url
 * @returns {Promise<unknown>}
 */
export const get = (url) => request(url, { method: "GET" });

/**
 * HTTP POST
 * @param {string} url
 * @param {object} [body] - Akan di-serialize ke JSON. Opsional.
 * @returns {Promise<unknown>}
 */
export const post = (url, body) => {
  const options = { method: "POST" };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  return request(url, options);
};
