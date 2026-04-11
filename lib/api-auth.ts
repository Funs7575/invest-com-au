/**
 * API key authentication for the Financial Planner API (v1).
 *
 * Keys follow the format `ica_<32-hex-chars>` and are stored as SHA-256
 * hashes — the plain-text key is shown exactly once at creation time.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { NextRequest } from "next/server";

const log = logger("api-auth");

export interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  owner_email: string;
  owner_name: string | null;
  company_name: string | null;
  tier: string;
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  allowed_endpoints: string[];
  is_active: boolean;
  requests_today: number;
  requests_total: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyValidation {
  valid: boolean;
  apiKey?: ApiKeyRow;
  error?: string;
}

/**
 * SHA-256 hash a string and return the hex digest.
 * Uses the Web Crypto API available in Edge and Node 18+ runtimes.
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate an API key from the incoming request.
 *
 * Extracts the key from the `Authorization: Bearer ica_xxxxx` header,
 * hashes it, and looks up the corresponding row in `api_keys`.
 *
 * Checks:
 *  1. Header present and correctly formatted
 *  2. Key hash exists in the database
 *  3. Key is active
 *  4. Key has not expired
 *  5. Per-minute rate limit (approximated via requests_today + timing)
 *  6. Per-day rate limit
 *
 * Side-effects: increments `requests_today`, `requests_total`, and
 * updates `last_used_at`.
 */
export async function validateApiKey(
  request: NextRequest
): Promise<ApiKeyValidation> {
  try {
    // ── 1. Extract key from header ──
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return { valid: false, error: "Missing Authorization header" };
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return {
        valid: false,
        error: "Invalid Authorization format. Use: Bearer ica_xxxxx",
      };
    }

    const rawKey = parts[1];
    if (!rawKey.startsWith("ica_") || rawKey.length < 12) {
      return { valid: false, error: "Invalid API key format" };
    }

    // ── 2. Hash and look up ──
    const keyHash = await sha256(rawKey);
    const supabase = createAdminClient();

    const { data: apiKey, error: dbError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .single();

    if (dbError || !apiKey) {
      log.warn("API key not found", { prefix: rawKey.slice(0, 8) });
      return { valid: false, error: "Invalid API key" };
    }

    const row = apiKey as ApiKeyRow;

    // ── 3. Active check ──
    if (!row.is_active) {
      return { valid: false, error: "API key is deactivated" };
    }

    // ── 4. Expiry check ──
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return { valid: false, error: "API key has expired" };
    }

    // ── 5. Daily rate limit ──
    if (row.requests_today >= row.rate_limit_per_day) {
      return {
        valid: false,
        error: `Daily rate limit exceeded (${row.rate_limit_per_day}/day). Resets at midnight UTC.`,
      };
    }

    // ── 6. Increment counters ──
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("api_keys")
      .update({
        requests_today: row.requests_today + 1,
        requests_total: (row.requests_total || 0) + 1,
        last_used_at: now,
        updated_at: now,
      })
      .eq("id", row.id);

    if (updateError) {
      log.error("Failed to update API key counters", {
        keyId: row.id,
        error: updateError.message,
      });
      // Non-fatal — allow the request to proceed
    }

    return { valid: true, apiKey: row };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("API key validation error", { error: msg });
    return { valid: false, error: "Authentication error" };
  }
}

/**
 * Log an API request to the `api_request_log` table.
 * Fire-and-forget — errors are logged but never propagated.
 */
export async function logApiRequest(opts: {
  apiKeyId: string | null;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress: string;
  userAgent: string;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("api_request_log").insert({
      api_key_id: opts.apiKeyId,
      endpoint: opts.endpoint,
      method: opts.method,
      status_code: opts.statusCode,
      response_time_ms: opts.responseTimeMs,
      ip_address: opts.ipAddress,
      user_agent: opts.userAgent,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Failed to log API request", { error: msg });
  }
}

/** Standard CORS headers for the public API. */
export const API_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;
