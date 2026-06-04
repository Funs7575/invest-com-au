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
 * Concurrency: the cache update is applied through the atomic
 * `apply_credit_ledger_balance` RPC (a SECURITY DEFINER Postgres function
 * that increments `credit_balance_cents` under a row lock), so concurrent
 * ledger writes to the same advisor can never lose an update — the old
 * read-modify-write + optimistic-lock loop could silently drop a writer's
 * cache update (a 0-row PostgREST UPDATE returns no error). If the RPC is
 * unavailable we fall back to a fixed optimistic-lock loop that (a) locks
 * against the *refreshed* balance on retry and (b) detects 0-row updates
 * via `.select()`.
 *
 * Negative-balance guard: spend kinds (`lead_spend`, `referral_payout`)
 * default to refusing a mutation that would push the cached balance below
 * zero (mirroring `lib/marketplace/wallet.ts` `adjustWallet`). Correction
 * kinds (`expiry`, `chargeback_clawback`, `admin_adjustment`,
 * `lead_dispute_refund`) may legitimately drive a balance negative and so
 * default to allowing it. Callers can override via `allowNegative`.
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

/**
 * Thrown when a spend would push `credit_balance_cents` below zero and the
 * caller has not opted into `allowNegative`. Callers that gate before
 * charging (e.g. brief accept, referral payout) can catch this to surface an
 * "insufficient credits" outcome instead of a 500.
 */
export class NegativeBalanceError extends Error {
  readonly professionalId: number;
  readonly attemptedDeltaCents: number;
  constructor(professionalId: number, attemptedDeltaCents: number) {
    super(
      `recordLedgerEntry: insufficient balance for advisor ${professionalId} (delta ${attemptedDeltaCents})`,
    );
    this.name = "NegativeBalanceError";
    this.professionalId = professionalId;
    this.attemptedDeltaCents = attemptedDeltaCents;
  }
}

export type LedgerKind =
  | "topup"
  | "refund_to_credit"
  | "lead_spend"
  | "lead_dispute_refund"
  | "tier_proration_credit"
  | "admin_adjustment"
  | "expiry"
  | "chargeback_clawback"
  | "referral_payout"
  | "success_bonus_award";

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
   * When false, a mutation that would drive `credit_balance_cents` below
   * zero is rejected (mirrors `lib/marketplace/wallet.ts` adjustWallet).
   * Defaults by `kind`: spend kinds (lead_spend, referral_payout) → false;
   * correction kinds (expiry, chargeback_clawback, admin_adjustment,
   * lead_dispute_refund) → true. Credit kinds are unaffected. Pass an
   * explicit value to override the per-kind default.
   */
  allowNegative?: boolean;
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
 * Per-kind default for the negative-balance guard. Spend kinds keep the
 * guard ON (a debit must not silently over-spend); correction/reconciliation
 * kinds may legitimately drive a balance negative and so default to OFF.
 * Credit kinds never decrease the balance, so the value is moot for them.
 */
function defaultAllowNegative(kind: LedgerKind): boolean {
  switch (kind) {
    case "lead_spend":
    case "referral_payout":
      return false;
    default:
      // topup / refund_to_credit / tier_proration_credit / success_bonus_award
      // (credits — guard never triggers), and the correction kinds
      // expiry / chargeback_clawback / admin_adjustment / lead_dispute_refund
      // which may legitimately go negative.
      return true;
  }
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

  // ── 4. Atomically apply the cache + lifetime totals ────────────────
  // Lifetime roll-up deltas (always non-negative; the RPC clamps too).
  let lifetimeCreditDelta = 0;
  let lifetimeSpendDelta = 0;
  if (
    (input.kind === "topup" ||
      input.kind === "refund_to_credit" ||
      input.kind === "tier_proration_credit") &&
    input.amountCents > 0
  ) {
    lifetimeCreditDelta = input.amountCents;
  }
  if (input.kind === "lead_spend" && input.amountCents < 0) {
    lifetimeSpendDelta = Math.abs(input.amountCents);
  }

  const allowNegative = input.allowNegative ?? defaultAllowNegative(input.kind);

  // Preferred path: a single atomic SQL statement under a row lock. This
  // eliminates the read-modify-write race entirely — concurrent writers to
  // the same advisor each see the locked, current balance, so no update is
  // ever lost. The RPC also enforces the negative-balance guard.
  const { data: rpcBalance, error: rpcErr } = await supabase.rpc(
    "apply_credit_ledger_balance",
    {
      p_professional_id: input.professionalId,
      p_delta_cents: input.amountCents,
      p_allow_negative: allowNegative,
      p_lifetime_credit_delta_cents: lifetimeCreditDelta,
      p_lifetime_spend_delta_cents: lifetimeSpendDelta,
    },
  );

  let finalBalance = newBalance;

  if (!rpcErr && typeof rpcBalance === "number") {
    // Authoritative balance from the atomic mutation.
    finalBalance = rpcBalance;
    if (finalBalance !== newBalance) {
      // The stale read disagreed with the locked value (a concurrent write
      // landed in between). Correct the ledger row's snapshot so the audit
      // trail matches the true post-balance.
      await supabase
        .from("advisor_credit_ledger")
        .update({ balance_after_cents: finalBalance })
        .eq("id", inserted.id);
      (inserted as LedgerEntry).balance_after_cents = finalBalance;
    }
  } else if (isNegativeBalanceRpcError(rpcErr)) {
    // Guard tripped: the spend would have driven the balance below zero.
    // Roll back the ledger row we just inserted so SUM(amount_cents) stays
    // consistent with the (unchanged) cache, then surface the rejection.
    await supabase.from("advisor_credit_ledger").delete().eq("id", inserted.id);
    throw new NegativeBalanceError(input.professionalId, input.amountCents);
  } else if (isMissingRpcError(rpcErr)) {
    // Fallback for environments where the RPC migration has not yet been
    // applied. Uses a FIXED optimistic-lock loop: the retry predicate locks
    // against the *refreshed* balance, and a 0-row UPDATE is detected via
    // `.select()` (PostgREST does not error on a 0-row UPDATE, so a missing
    // lock would otherwise look like success — the original bug).
    finalBalance = await applyBalanceOptimistic({
      supabase,
      professionalId: input.professionalId,
      amountCents: input.amountCents,
      currentBalance,
      lifetimeCreditDelta,
      lifetimeSpendDelta,
      allowNegative,
      ledgerId: inserted.id,
    });
    if (finalBalance !== newBalance) {
      await supabase
        .from("advisor_credit_ledger")
        .update({ balance_after_cents: finalBalance })
        .eq("id", inserted.id);
      (inserted as LedgerEntry).balance_after_cents = finalBalance;
    }
  } else {
    // Unexpected RPC failure — the ledger row is in place (SUM remains
    // authoritative) but the cache may not have moved. Surface loudly.
    log.error("Atomic balance RPC failed — ledger row recorded but cache may drift", {
      professionalId: input.professionalId,
      ledgerId: inserted.id,
      kind: input.kind,
      error: rpcErr?.message ?? "unknown",
    });
  }

  return {
    entry: inserted as LedgerEntry,
    balanceAfterCents: finalBalance,
    idempotent: false,
  };
}

interface RpcLikeError {
  message?: string;
  code?: string;
}

/**
 * The atomic RPC raises with ERRCODE 'check_violation' (23514) when the
 * negative-balance guard trips.
 */
function isNegativeBalanceRpcError(err: RpcLikeError | null): boolean {
  if (!err) return false;
  if (err.code === "23514") return true;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("insufficient balance");
}

/**
 * Detect "function does not exist" so we can fall back to the optimistic
 * loop in environments where the RPC migration has not yet been applied.
 * PostgREST surfaces a missing RPC as PGRST202 / 404 or Postgres 42883.
 */
function isMissingRpcError(err: RpcLikeError | null): boolean {
  if (!err) return false;
  if (err.code === "42883" || err.code === "PGRST202" || err.code === "404") return true;
  const msg = (err.message ?? "").toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    msg.includes("not found") ||
    msg.includes("schema cache")
  );
}

interface ApplyBalanceOptimisticArgs {
  supabase: SupabaseLike;
  professionalId: number;
  amountCents: number;
  currentBalance: number;
  lifetimeCreditDelta: number;
  lifetimeSpendDelta: number;
  allowNegative: boolean;
  ledgerId: number;
}

/**
 * Fallback cache mutation when the atomic RPC is unavailable. Fixes BOTH
 * defects from the original loop:
 *   1) the retry predicate locks against the *refreshed* balance (the old
 *      code used the stale `currentBalance` on both attempts — a no-op);
 *   2) a 0-row UPDATE is detected via `.select("id")`, because PostgREST
 *      returns no error on a 0-row UPDATE (the old code treated that as
 *      success, silently dropping the write).
 * Returns the persisted balance. Throws NegativeBalanceError if the guard
 * trips. Rolls back the ledger row before throwing.
 */
async function applyBalanceOptimistic(args: ApplyBalanceOptimisticArgs): Promise<number> {
  const {
    supabase,
    professionalId,
    amountCents,
    currentBalance,
    lifetimeCreditDelta,
    lifetimeSpendDelta,
    allowNegative,
    ledgerId,
  } = args;

  let lockBalance = currentBalance;

  for (let attempt = 0; attempt < 4; attempt++) {
    const newBalance = lockBalance + amountCents;
    if (amountCents < 0 && !allowNegative && newBalance < 0) {
      await supabase.from("advisor_credit_ledger").delete().eq("id", ledgerId);
      throw new NegativeBalanceError(professionalId, amountCents);
    }

    const updates: Record<string, number> = { credit_balance_cents: newBalance };
    if (lifetimeCreditDelta > 0 || lifetimeSpendDelta > 0) {
      // Read the current lifetime totals so we add (not overwrite) them.
      const { data: cur } = await supabase
        .from("professionals")
        .select("lifetime_credit_cents, lifetime_lead_spend_cents")
        .eq("id", professionalId)
        .single();
      if (cur) {
        if (lifetimeCreditDelta > 0) {
          updates.lifetime_credit_cents = (cur.lifetime_credit_cents ?? 0) + lifetimeCreditDelta;
        }
        if (lifetimeSpendDelta > 0) {
          updates.lifetime_lead_spend_cents =
            (cur.lifetime_lead_spend_cents ?? 0) + lifetimeSpendDelta;
        }
      }
    }

    // Optimistic lock against the *current* lockBalance, and request the
    // affected rows back so a 0-row update is observable.
    const { data: affected, error: cacheErr } = await supabase
      .from("professionals")
      .update(updates)
      .eq("id", professionalId)
      .eq("credit_balance_cents", lockBalance)
      .select("id");

    if (!cacheErr && affected && affected.length > 0) {
      return newBalance; // a row was actually updated
    }

    // Either an error, or a 0-row update (lost lock). Refresh and retry
    // against the new balance.
    const { data: refreshed } = await supabase
      .from("professionals")
      .select("credit_balance_cents")
      .eq("id", professionalId)
      .single();
    if (!refreshed) break;
    const refreshedBalance = refreshed.credit_balance_cents ?? 0;
    if (refreshedBalance === lockBalance) {
      // Balance hasn't moved yet our update matched 0 rows — avoid a spin.
      break;
    }
    lockBalance = refreshedBalance;
  }

  log.error("Cache update lost — ledger row recorded but cache may drift", {
    professionalId,
    ledgerId,
  });
  return lockBalance + amountCents;
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
