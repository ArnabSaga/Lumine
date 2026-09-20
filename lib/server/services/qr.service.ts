import "server-only";

import crypto from "crypto";

/**
 * Generates a high-entropy 32-byte base64url QR token.
 * Never contains student ID, enrollment ID, or PII.
 */
export function createQrToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Generates a human-readable enrollment reference like ENR-8K4M2P.
 * Uses uppercase alphanumeric characters excluding confusing chars (0/O, 1/I/L).
 */
export function generateReference(): string {
  const chars = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  let result = "ENR-";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
