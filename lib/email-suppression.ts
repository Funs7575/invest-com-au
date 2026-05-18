// eslint-disable-next-line no-restricted-imports -- suppression_list has service_role-only RLS (see migration 20260518000000); no anon/authenticated policies exist, so createAdminClient is the documented exception per CLAUDE.md §"Two Supabase clients".
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// Authoritative read/write helpers over `public.suppression_list`.
//
// Replaces the MVP `agent_memory:email:suppression` key per TODO.md. This is
// the single source of truth that every email-dispatching surface (Resend
// helpers, lifecycle crons, Editorial newsletter, advisor outreach, etc.)
// must consult before send. Agent #11 owns writes; everything else is
// read-only by convention (enforced at the agent-spec layer, not RLS —
// service_role can't enforce per-agent identity at the DB layer).

const log = logger("email-suppression");

export type SuppressionReason =
  | "hard_bounce"
  | "soft_bounce_ladder_exhausted"
  | "complaint"
  | "manual_unsubscribe"
  | "admin";

export interface SuppressionRow {
  id: string;
  contactEmail: string;
  reason: SuppressionReason;
  suppressedAt: string;
  metadata: Record<string, unknown>;
}

/**
 * Returns true if the address is on the suppression list. Lookup is
 * case-insensitive — the unique index is on `lower(contact_email)`.
 *
 * Fails OPEN (returns false) on any DB error so a transient Supabase blip
 * never silently grounds the whole email pipeline. The error is logged so
 * SLO monitoring picks it up; if a hard guarantee is required, callers
 * should add an outer circuit-breaker.
 */
export async function isSuppressed(email: string): Promise<boolean> {
  if (!email) return false;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("suppression_list")
    .select("id")
    .eq("contact_email", email.toLowerCase())
    .maybeSingle();

  if (error) {
    log.error("isSuppressed query failed", { err: error.message });
    return false;
  }

  return !!data;
}

/**
 * Bulk variant for batch sends. Returns the set of addresses (lower-cased)
 * that should NOT receive mail. Callers `filter(e => !suppressed.has(e.toLowerCase()))`.
 *
 * Uses an `IN (...)` query rather than one round-trip per address. Batch
 * size in practice is bounded by Resend's per-call limits (~100), well
 * within PG's `IN` ergonomics.
 */
export async function getSuppressedSet(emails: readonly string[]): Promise<Set<string>> {
  const lowered = emails.filter(Boolean).map((e) => e.toLowerCase());
  if (lowered.length === 0) return new Set();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("suppression_list")
    .select("contact_email")
    .in("contact_email", lowered);

  if (error) {
    log.error("getSuppressedSet query failed", { err: error.message, count: lowered.length });
    return new Set();
  }

  return new Set((data ?? []).map((r) => r.contact_email.toLowerCase()));
}

/**
 * Add an address to the suppression list. Idempotent — if the address is
 * already suppressed under a different reason, the existing row is kept
 * (preserves the original `suppressed_at`). Pass `force=true` to overwrite
 * (used by manual admin promotions).
 *
 * Intended caller: Agent #11 only. Other agents that need to add to the
 * list (e.g. a webhook handler processing a Resend bounce event) should
 * file an `agent_tasks` row addressed to #11 instead of writing directly,
 * so the suppression-source telemetry stays clean.
 */
export async function suppress(
  email: string,
  reason: SuppressionReason,
  options: { metadata?: Record<string, unknown>; force?: boolean } = {},
): Promise<{ inserted: boolean; reason: SuppressionReason }> {
  const normalised = email.toLowerCase();
  const supabase = createAdminClient();

  if (options.force) {
    const { error } = await supabase
      .from("suppression_list")
      .upsert(
        {
          contact_email: normalised,
          reason,
          suppressed_at: new Date().toISOString(),
          metadata: options.metadata ?? {},
        },
        { onConflict: "contact_email", ignoreDuplicates: false },
      );
    if (error) {
      log.error("force-suppress failed", { err: error.message });
      throw error;
    }
    return { inserted: true, reason };
  }

  const { error } = await supabase
    .from("suppression_list")
    .insert({
      contact_email: normalised,
      reason,
      metadata: options.metadata ?? {},
    });

  if (error) {
    // 23505 = unique_violation — already suppressed, leave the prior row.
    if (error.code === "23505") {
      return { inserted: false, reason };
    }
    log.error("suppress insert failed", { err: error.message, code: error.code });
    throw error;
  }

  return { inserted: true, reason };
}

/**
 * Manual de-suppression. Use only for admin overrides (e.g. user emails
 * support saying they were unsubscribed by mistake). Logged for audit.
 */
export async function unsuppress(email: string): Promise<{ removed: boolean }> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("suppression_list")
    .delete({ count: "exact" })
    .eq("contact_email", email.toLowerCase());

  if (error) {
    log.error("unsuppress failed", { err: error.message });
    throw error;
  }

  return { removed: (count ?? 0) > 0 };
}
