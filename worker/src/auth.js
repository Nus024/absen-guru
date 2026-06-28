import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

/**
 * Hash password string menjadi hash bcrypt
 */
export async function hashPassword(plainText) {
  return await bcrypt.hash(plainText, 10);
}

/**
 * Validasi password dengan hash
 */
export async function verifyPassword(plainText, hash) {
  return await bcrypt.compare(plainText, hash);
}

/**
 * Generate JWT Token untuk user
 */
export async function generateToken(payload, secret) {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 24 * 3600; // 24 jam

  const secretKey = new TextEncoder().encode(secret);

  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(secretKey);
}

/**
 * Verifikasi JWT Token dan return payload
 */
export async function verifyToken(token, secret) {
  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Normalisasi nomor WhatsApp menjadi format internasional (contoh: 62851...)
 */
export function normalizePhoneNumber(phone) {
  if (!phone) return '';
  let normalized = String(phone).replace(/\D/g, ''); // Hapus semua karakter non-digit
  if (normalized.startsWith('0')) {
    normalized = '62' + normalized.substring(1);
  }
  return normalized;
}

/**
 * Membuat response standard
 */
export function createResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function createErrorResponse(message, status = 400) {
  return createResponse({ status: 'error', message }, status);
}
