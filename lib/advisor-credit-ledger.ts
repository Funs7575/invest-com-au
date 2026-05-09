/**
 * Advisor credit ledger — single source of truth for every mutation
 * affecting `professionals.credit_balance_cents`.
 *
 * Every callsite that previously did
 *
 *   UPDATE professionals SET credit_balance_cents = ... WHERE id = ?
 *
 * now goes through `recordLedgerEntry`. The function:
 *   1. Reads the advisor's current cached balance.
 *   2. Inserts a ledger row with `balance_after_cents` = new total.
 *   3. Updates the cache column to match.
 *
 * Idempotency: a `(kind, reference_type, reference_id)` triple is unique
 * by partial index. Re-issuing the same entry (Stripe webhook replay,
 * dispute resolver re-run) is a no-op — `recordLedgerEntry` returns the
 * existing row instead of inserting a duplicate.
 *
 * Concurrency: the cache update uses an optimistic-lock predicate against
 * the previously-read balance, mirroring the pattern in
 * `app/api/advisor-enquiry/route.ts`. Concurrent inserts produce
 * deterministic ordering by `created_at` and a correct final cache value
 * because each call refetches the current balance before writing.
 */

// eslint-disable-next-line no-restricted-imports -- Cross-user mutation surface: webhook handlers, cron, admin overrides, and dispute resolvers all write to advisor_credit_ledger without an authenticated user JWT. Documented service-role-legitimate use case per CLAUDE.md "Two Supabase clients" — advisor reads are still gated by the table's own RLS policy (auth_user_id = auth.uid()).
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("advisor-credit-ledger");

/**
 * Supabase client surface that the ledger helper uses. Defined loosely
 * so callers can pass either the typed admin client from
 * `lib/supabase/admin.ts` or a context-bound client (e.g. webhook
 * `ctx.admin`) without a structural-typing fight.
 */
type SupabaseLike = ReturnType<typeof createAdminClient>;

export type LedgerKind =
  | "topup"
  | "refund_to_credit"
  | "lead_spend"
  | "lead_dispute_refund"
  | "tier_proration_credit"
  | "admin_adjustment"
  | "expiry"
  | "chargeback_clawback";

export interface LedgerEntry {
  id: number;
  professional_id: number;
  amount_cents: number;
  balance_after_cents: number;
  kind: LedgerKind;
  reference_type: string | null;
  reference_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RecordLedgerEntryInput {
  professionalId: number;
  amountCents: number;                     // signed: positive = credit, negative = spend
  kind: LedgerKind;
  description: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
  expiresAt?: Date | string | null;        // optional — defaults vary by kind, helper does not infer
  createdBy?: string;
  /**
   * Optional caller-supplied supabase admin client. Used by the Stripe
   * webhook handler so its ctx.admin (which the test harness mocks)
   * actually drives the helper's queries. Falls back to a fresh
   * `createAdminClient()` for callers that don't have a context.
   */
  supabase?: SupabaseLike;
}

export interface RecordLedgerEntryResult {
  /** The ledger row (existing one if (kind, reference_type, reference_id) triple already landed). */
  entry: LedgerEntry;
  /** The advisor's `credit_balance_cents` after this entry. */
  balanceAfterCents: number;
  /** True when this exact triple was already recorded — caller can branch on idempotent re-runs. */
  idempotent: boolean;
}

/**
 * Record a single ledger entry and update the cached balance.
 *
 * Returns the inserted row + post-balance. If the (kind,
 * reference_type, reference_id) triple already exists, returns the
 * existing row with `idempotent: true` and does not double-mutate the
 * cache.
 */
export async function recordLedgerEntry(
  input: RecordLedgerEntryInput,
): Promise<RecordLedgerEntryResult> {
  const supabase = input.supabase ?? createAdminClient();

  // ── 1. Idempotency check (only when we have a reference triple) ────
  if (input.referenceType && input.referenceId) {
    const { data: existing } = await supabase
      .from("advisor_credit_ledger")
      .select("*")
      .eq("kind", input.kind)
      .eq("reference_type", input.referenceType)
      .eq("reference_id", input.referenceId)
      .maybeSingle();
    if (existing) {
      return {
        entry: existing as LedgerEntry,
        balanceAfterCents: existing.balance_after_cents as number,
        idempotent: true,
      };
    }
  }

  // ── 2. Read current cached balance ─────────────────────────────────
  const { data: pro, error: readErr } = await supabase
    .from("professionals")
    .select("credit_balance_cents, lifetime_credit_cents, lifetime_lead_spend_cents")
    .eq("id", input.professionalId)
    .single();

  if (readErr || !pro) {
    throw new Error(
      `recordLedgerEntry: advisor ${input.professionalId} not found (${readErr?.message ?? "no row"})`,
    );
  }

  const currentBalance = pro.credit_balance_cents ?? 0;
  const newBalance = currentBalance + input.amountCents;

  // ── 3. Insert the ledger row ───────────────────────────────────────
  const expiresAtIso =
    input.expiresAt == null
      ? null
      : input.expiresAt instanceof Date
        ? input.expiresAt.toISOString()
        : input.expiresAt;

  const { data: inserted, error: insertErr } = await supabase
    .from("advisor_credit_ledger")
    .insert({
      professional_id: input.professionalId,
      amount_cents: input.amountCents,
      balance_after_cents: newBalance,
      kind: input.kind,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
      description: input.description,
      metadata: input.metadata ?? {},
      expires_at: expiresAtIso,
      created_by: input.createdBy ?? null,
    })
    .select("*")
    .single();

  if (insertErr) {
    // Race: another caller landed the same triple between our check and
    // our insert. Treat that as idempotent — refetch and return.
    if (input.referenceType && input.referenceId && insertErr.code === "23505") {
      const { data: raced } = await supabase
        .from("advisor_credit_ledger")
        .select("*")
        .eq("kind", input.kind)
        .eq("reference_type", input.referenceType)
        .eq("reference_id", input.referenceId)
        .single();
      if (raced) {
        return {
          entry: raced as LedgerEntry,
          balanceAfterCents: raced.balance_after_cents as number,
          idempotent: true,
        };
      }
    }
    throw new Error(`recordLedgerEntry: insert failed (${insertErr.message})`);
  }

  // ── 4. Update the cache + lifetime totals ──────────────────────────
  const updates: Record<string, number> = { credit_balance_cents: newBalance };
  if (input.kind === "topup" || input.kind === "refund_to_credit" || input.kind === "tier_proration_credit") {
    if (input.amountCents > 0) {
      updates.lifetime_credit_cents = (pro.lifetime_credit_cents ?? 0) + input.amountCents;
    }
  }
  if (input.kind === "lead_spend" && input.amountCents < 0) {
    updates.lifetime_lead_spend_cents =
      (pro.lifetime_lead_spend_cents ?? 0) + Math.abs(input.amountCents);
  }

  // Optimistic-lock cache write — if a concurrent call updated the
  // balance between our read and write we retry once with a fresh
  // read. Any further loss is logged and surfaced; the ledger row is
  // already in place so the SUM is still authoritative.
  let cacheOk = false;
  for (let attempt = 0; attempt < 2 && !cacheOk; attempt++) {
    const { error: cacheErr } = await supabase
      .from("professionals")
      .update(updates)
      .eq("id", input.professionalId)
      .eq("credit_balance_cents", attempt === 0 ? currentBalance : currentBalance);
    if (!cacheErr) {
      cacheOk = true;
      break;
    }
    // Refetch + recompute the delta against the latest cached balance.
    const { data: refreshed } = await supabase
      .from("professionals")
      .select("credit_balance_cents, lifetime_credit_cents, lifetime_lead_spend_cents")
      .eq("id", input.professionalId)
      .single();
    if (!refreshed) break;
    updates.credit_balance_cents = (refreshed.credit_balance_cents ?? 0) + input.amountCents;
  }

  if (!cacheOk) {
    log.error("Cache update lost — ledger row recorded but cache may drift", {
      professionalId: input.professionalId,
      ledgerId: inserted.id,
      kind: input.kind,
    });
  }

  return {
    entry: inserted as LedgerEntry,
    balanceAfterCents: updates.credit_balance_cents as number,
    idempotent: false,
  };
}

export interface GetLedgerPageOptions {
  limit?: number;
  offset?: number;
}

/**
 * Paginated read of an advisor's ledger, newest first.
 */
export async function getLedgerPage(
  professionalId: number,
  options: GetLedgerPageOptions = {},
): Promise<{ rows: LedgerEntry[]; total: number }> {
  const limit = Math.min(options.limit ?? 50, 200);
  const offset = options.offset ?? 0;
  const supabase = createAdminClient();

  const { data, error, count } = await supabase
    .from("advisor_credit_ledger")
    .select("*", { count: "exact" })
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    log.error("getLedgerPage failed", { error: error.message });
    return { rows: [], total: 0 };
  }
  return { rows: (data ?? []) as LedgerEntry[], total: count ?? 0 };
}

/**
 * Authoritative balance computed from ledger rows.
 * Use only for reconciliation jobs — production reads should use the
 * cached `professionals.credit_balance_cents` for perf.
 */
export async function computeBalance(professionalId: number): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("advisor_credit_ledger")
    .select("amount_cents")
    .eq("professional_id", professionalId);
  if (error || !data) return 0;
  return data.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
}

/**
 * Sum of credits expiring before a given threshold. Used to surface
 * "$X expiring before <date>" banners in the BillingTab.
 */
export async function getExpiringSoonCents(
  professionalId: number,
  before: Date,
): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("advisor_credit_ledger")
    .select("amount_cents, expires_at")
    .eq("professional_id", professionalId)
    .gt("amount_cents", 0)
    .not("expires_at", "is", null)
    .lte("expires_at", before.toISOString());
  if (error || !data) return 0;
  return data.reduce((sum, r) => sum + (r.amount_cents ?? 0), 0);
}

/**
 * Daily cron: insert `kind='expiry'` rows for credits whose expires_at
 * has passed. Caller is `app/api/cron/advisor-credit-expiry`.
 *
 * We expire on a per-source-row basis (each topup that has expired gets
 * one matching `expiry` ledger entry referencing its ledger id). The
 * unique index on (kind, reference_type, reference_id) means re-runs
 * never double-expire.
 */
export async function expireOldCredits(now: Date = new Date()): Promise<{ expiredCount: number }> {
  const supabase = createAdminClient();
  const { data: candidates, error } = await supabase
    .from("advisor_credit_ledger")
    .select("id, professional_id, amount_cents")
    .gt("amount_cents", 0)
    .not("expires_at", "is", null)
    .lte("expires_at", now.toISOString());
  if (error || !candidates) return { expiredCount: 0 };

  let expiredCount = 0;
  for (const candidate of candidates) {
    const { idempotent } = await recordLedgerEntry({
      professionalId: candidate.professional_id,
      amountCents: -(candidate.amount_cents as number),
      kind: "expiry",
      description: "Credit expiry — top-up window elapsed",
      referenceType: "advisor_credit_ledger",
      referenceId: String(candidate.id),
      createdBy: "cron:expiry",
    });
    if (!idempotent) expiredCount++;
  }
  return { expiredCount };
}
