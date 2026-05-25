/**
 * lib/investor-handoff.ts
 *
 * Read path for investor handoff tokens.
 *
 * `getHandoff(token)` is called from the /find-advisor page (server
 * component) when a `?handoff=` query param is present. It returns the
 * holdings snapshot only when:
 *   1. The token exists.
 *   2. The token has not expired.
 *   3. The token has not been consumed.
 *
 * The read uses the service-role client because:
 *   - The token is accessed anonymously (no JWT from the advisor/investor
 *     on the other side), and the investor_handoffs table has deny-all-anon
 *     RLS.
 *   - This is an explicitly allowed service-role path per CLAUDE.md (cross-
 *     user / no-JWT anonymous path where the token acts as the auth factor).
 *
 * After a successful read, consumed_at is stamped so the token can't be
 * replayed. The investor can always re-generate from their holdings page.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("lib:investor-handoff");

export interface HoldingSnapshot {
  ticker: string;
  exchange: string;
  shares: number;
  cost_basis_per_share_cents: number;
  acquired_at: string;
  broker_slug: string | null;
  notes: string | null;
}

export interface HandoffResult {
  intent: string;
  holdings: HoldingSnapshot[];
  created_at: string;
}

/**
 * Fetch and consume a handoff token.
 *
 * Returns `null` when the token is missing, expired, or already consumed.
 * On success, stamps `consumed_at` and returns the holdings snapshot.
 */
export async function getHandoff(token: string): Promise<HandoffResult | null> {
  if (!token || token.length > 200) return null;

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("investor_handoffs")
    .select("id, intent, holdings_snapshot_json, expires_at, consumed_at, created_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    log.warn("handoff lookup failed", { error: error.message });
    return null;
  }

  if (!data) return null;

  // Guard: already consumed.
  if (data.consumed_at != null) return null;

  // Guard: expired.
  if (new Date(data.expires_at as string) < new Date()) return null;

  // Stamp consumed_at — best-effort, but if it fails we still return the
  // snapshot (the token will expire naturally).
  const { error: updateError } = await admin
    .from("investor_handoffs")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", data.id);

  if (updateError) {
    log.warn("handoff consumed_at stamp failed", { error: updateError.message, id: data.id });
    // Continue — don't block the investor's advisor from seeing the data.
  }

  const rawHoldings = Array.isArray(data.holdings_snapshot_json)
    ? data.holdings_snapshot_json
    : [];

  const holdings: HoldingSnapshot[] = rawHoldings.map((h: Record<string, unknown>) => ({
    ticker: String(h.ticker ?? ""),
    exchange: String(h.exchange ?? ""),
    shares: Number(h.shares ?? 0),
    cost_basis_per_share_cents: Number(h.cost_basis_per_share_cents ?? 0),
    acquired_at: String(h.acquired_at ?? ""),
    broker_slug: h.broker_slug == null ? null : String(h.broker_slug),
    notes: h.notes == null ? null : String(h.notes),
  }));

  return {
    intent: String(data.intent ?? "tax-prep"),
    holdings,
    created_at: String(data.created_at ?? ""),
  };
}
