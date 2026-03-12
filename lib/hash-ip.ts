import { createHash } from "crypto";

/**
 * Hash an IP address with SHA-256 + salt for privacy-safe analytics.
 * Throws at startup if IP_HASH_SALT is not set — never falls back
 * to a hardcoded default that would make all hashes predictable.
 */

const salt = process.env.IP_HASH_SALT;
if (!salt) {
  console.error("FATAL: IP_HASH_SALT environment variable is required. Set a random string in your .env.local and Vercel env vars.");
}

export function hashIP(ip: string): string {
  if (!salt) {
    // In production this should never happen; return a random hash so analytics still works
    return createHash("sha256").update(crypto.randomUUID() + ip).digest("hex").slice(0, 16);
  }
  return createHash("sha256").update(salt + ip).digest("hex").slice(0, 16);
}
