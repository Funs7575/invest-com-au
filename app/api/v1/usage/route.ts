/**
 * GET /api/v1/usage
 *
 * Returns usage counters and tier limits for the authenticated API key.
 * Authentication: Bearer ica_xxx.
 *
 * Response:
 * {
 *   tier: "free" | "basic" | "pro" | "enterprise",
 *   tier_label: "Free" | "Basic" | "Pro" | "Enterprise",
 *   limits: {
 *     per_minute: number,
 *     per_day: number,
 *     allowed_endpoints: string[],
 *   },
 *   usage: {
 *     today: number,
 *     this_month: number,
 *     total: number,
 *     last_used_at: string | null,
 *   },
 *   key: {
 *     id: string,
 *     name: string,
 *     prefix: string,
 *     created_at: string,
 *   },
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, API_CORS_HEADERS } from "@/lib/api-auth";
import { getTierConfig } from "@/lib/api-tiers";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-usage");

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth.valid || !auth.apiKey) {
    return NextResponse.json(
      { error: auth.error ?? "Unauthorized" },
      { status: 401, headers: API_CORS_HEADERS },
    );
  }

  const apiKey = auth.apiKey;

  // Pull the freshest row so we get requests_this_month (added by migration)
  const supabase = createAdminClient();
  const { data: freshRow, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("id", apiKey.id)
    .single();

  if (error || !freshRow) {
    log.error("Usage: failed to reload key row", { keyId: apiKey.id, error: error?.message });
    return NextResponse.json(
      { error: "Failed to load usage data" },
      { status: 500, headers: API_CORS_HEADERS },
    );
  }

  const row = freshRow as typeof apiKey & { requests_this_month?: number };
  const tierConfig = getTierConfig(row.tier);

  return NextResponse.json(
    {
      tier: row.tier,
      tier_label: tierConfig.label,
      limits: {
        per_minute: row.rate_limit_per_minute,
        per_day: row.rate_limit_per_day,
        allowed_endpoints: row.allowed_endpoints,
      },
      usage: {
        today: row.requests_today,
        this_month: row.requests_this_month ?? 0,
        total: row.requests_total,
        last_used_at: row.last_used_at,
      },
      key: {
        id: row.id,
        name: row.name,
        prefix: row.key_prefix,
        created_at: row.created_at,
      },
    },
    { headers: API_CORS_HEADERS },
  );
}
