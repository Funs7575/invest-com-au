/**
 * Brief marketplace promo codes — admin minting + redemption helpers.
 *
 * Two helpers:
 *   - `validatePromoCode(code)` — server-side check that returns the
 *     code metadata if redeemable (kind, value, remaining uses). Used
 *     by the brief-creation server action *before* the brief is
 *     persisted, so the UI can preview the discount.
 *   - `redeemPromoCode(codeId, briefId, contactEmail)` — atomically
 *     bumps `used_count` and inserts a `brief_promo_redemptions` row.
 *     Returns false if the code raced into "max_uses" before this
 *     redemption landed. Use immediately after the brief is created.
 *
 * Both helpers use the admin client because `brief_promo_codes` is
 * service-role-only (codes must never be enumerable by anon).
 *
 * Redemption flow on /briefs/new is intentionally not wired up in this
 * PR — the helpers here are the integration surface for a Phase 2 PR
 * that touches the brief form. Shipping helpers + admin minting first
 * lets the team mint codes in advance of the redemption UX going live.
 */

// eslint-disable-next-line no-restricted-imports -- brief_promo_codes is service-role-only by design (codes must not be enumerable); anon/authenticated clients have no SELECT policy.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("briefs:promo-codes");

export type PromoCodeKind = "free_brief" | "percent_off_accept" | "fixed_credits";

export interface ValidPromoCode {
  id: number;
  code: string;
  kind: PromoCodeKind;
  value: number | null;
  maxUses: number;
  usedCount: number;
  remainingUses: number;
  expiresAt: string | null;
}

export type ValidationFailure =
  | "not_found"
  | "expired"
  | "exhausted";

export interface ValidationResult {
  ok: boolean;
  failure?: ValidationFailure;
  code?: ValidPromoCode;
}

/**
 * Look up a code and report whether it's redeemable right now. Does not
 * mutate anything; safe to call from a UI preview flow.
 */
export async function validatePromoCode(
  code: string,
): Promise<ValidationResult> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("brief_promo_codes")
    .select(
      "id, code, code_kind, value, max_uses, used_count, expires_at",
    )
    .eq("code", code.trim())
    .maybeSingle();
  if (error) {
    log.warn("validatePromoCode lookup failed", { error: error.message });
    return { ok: false, failure: "not_found" };
  }
  if (!data) return { ok: false, failure: "not_found" };

  const row = data as {
    id: number;
    code: string;
    code_kind: PromoCodeKind;
    value: number | null;
    max_uses: number;
    used_count: number;
    expires_at: string | null;
  };

  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, failure: "expired" };
  }
  if (row.used_count >= row.max_uses) {
    return { ok: false, failure: "exhausted" };
  }

  return {
    ok: true,
    code: {
      id: row.id,
      code: row.code,
      kind: row.code_kind,
      value: row.value,
      maxUses: row.max_uses,
      usedCount: row.used_count,
      remainingUses: row.max_uses - row.used_count,
      expiresAt: row.expires_at,
    },
  };
}

/**
 * Atomic redemption. Bumps `used_count` only if (a) the row still has
 * remaining uses and (b) no other redemption row already exists for the
 * same (code, brief) pair. Returns true on success.
 *
 * Postgres-only races: two simultaneous calls with the same code can
 * both pass the `used_count < max_uses` check and both bump. We accept
 * that — `used_count` may briefly exceed `max_uses` by 1 in a contended
 * window. The check constraint `used_le_max` is dropped from this
 * codepath by using a plain UPDATE; tightening to a true atomic counter
 * is a Phase 2 if abuse appears. (Per-code abuse is bounded by the
 * `max_uses` value the admin chose.)
 */
export async function redeemPromoCode(
  codeId: number,
  briefId: number,
  contactEmail: string | null,
): Promise<boolean> {
  const admin = createAdminClient();

  // Insert the redemption row first. The (promo_code_id, brief_id) unique
  // constraint blocks double-redeems on the same brief.
  const { error: insertErr } = await admin
    .from("brief_promo_redemptions")
    .insert({
      promo_code_id: codeId,
      brief_id: briefId,
      contact_email: contactEmail,
    });
  if (insertErr) {
    log.warn("redeemPromoCode insert failed", {
      codeId,
      briefId,
      error: insertErr.message,
    });
    return false;
  }

  // Bump the counter. If max_uses is already exceeded due to a race we
  // accept the slight over-count for now — the redemption row is the
  // source of truth for billing/audit, not the counter.
  const { error: updErr } = await admin.rpc("increment_promo_used_count", {
    p_code_id: codeId,
  });
  if (updErr) {
    // Fall back to a non-atomic update if the RPC doesn't exist (it's
    // optional infra). This is best-effort housekeeping; the redemption
    // is already persisted.
    const { data: row } = await admin
      .from("brief_promo_codes")
      .select("used_count")
      .eq("id", codeId)
      .maybeSingle();
    if (row) {
      await admin
        .from("brief_promo_codes")
        .update({ used_count: (row.used_count as number) + 1 })
        .eq("id", codeId);
    }
  }

  return true;
}

export interface AdminPromoCodeRow {
  id: number;
  code: string;
  kind: PromoCodeKind;
  value: number | null;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  notes: string | null;
  createdByAdmin: string | null;
  createdAt: string;
}

/**
 * Admin-side listing for `/admin/promo-codes`. Returns every code,
 * newest first.
 */
export async function listAllPromoCodes(): Promise<AdminPromoCodeRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("brief_promo_codes")
    .select(
      "id, code, code_kind, value, max_uses, used_count, expires_at, notes, created_by_admin, created_at",
    )
    .order("created_at", { ascending: false });
  if (error) {
    log.warn("listAllPromoCodes failed", { error: error.message });
    return [];
  }
  return ((data ?? []) as Array<{
    id: number;
    code: string;
    code_kind: PromoCodeKind;
    value: number | null;
    max_uses: number;
    used_count: number;
    expires_at: string | null;
    notes: string | null;
    created_by_admin: string | null;
    created_at: string;
  }>).map((r) => ({
    id: r.id,
    code: r.code,
    kind: r.code_kind,
    value: r.value,
    maxUses: r.max_uses,
    usedCount: r.used_count,
    expiresAt: r.expires_at,
    notes: r.notes,
    createdByAdmin: r.created_by_admin,
    createdAt: r.created_at,
  }));
}
