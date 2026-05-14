/**
 * Fixed-price quote helpers for Pro Squad engagements.
 *
 * Lifecycle reference is in
 * `supabase/migrations/20260514_mm05_team_fixed_quotes.sql`.
 *
 * Pure DB helpers — no email or UI logic here. The API routes wire the
 * helpers to email + notification fan-out separately.
 */

import { randomBytes } from "crypto";

// eslint-disable-next-line no-restricted-imports -- consumer review of a quote is token-keyed anon access; squad-side mutations are cross-row writes that need service-role.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("teams:fixed-quotes");

export type QuoteStatus =
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "withdrawn";

export interface ScopeItem {
  label: string;
  estimated_hours?: number;
}

export interface FixedQuoteRow {
  id: number;
  brief_id: number;
  team_id: number;
  issued_by_professional_id: number | null;
  amount_cents: number;
  scope_items: ScopeItem[];
  payment_terms: string | null;
  delivery_days_estimate: number | null;
  expires_at: string;
  status: QuoteStatus;
  review_token: string;
  sent_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  withdrawn_at: string | null;
}

export function newReviewToken(): string {
  return randomBytes(24).toString("hex");
}

export interface CreateQuoteInput {
  briefId: number;
  teamId: number;
  issuedByProfessionalId: number | null;
  amountCents: number;
  scopeItems: ScopeItem[];
  paymentTerms?: string | null;
  deliveryDaysEstimate?: number | null;
  /** ms-since-epoch; defaults to +14 days */
  expiresAtMs?: number;
}

export async function createFixedQuote(
  input: CreateQuoteInput,
): Promise<FixedQuoteRow | null> {
  try {
    const admin = createAdminClient();
    const expiresAt = new Date(
      input.expiresAtMs ?? Date.now() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data, error } = await admin
      .from("team_fixed_quotes")
      .insert({
        brief_id: input.briefId,
        team_id: input.teamId,
        issued_by_professional_id: input.issuedByProfessionalId,
        amount_cents: input.amountCents,
        scope_items: input.scopeItems,
        payment_terms: input.paymentTerms ?? null,
        delivery_days_estimate: input.deliveryDaysEstimate ?? null,
        expires_at: expiresAt,
        review_token: newReviewToken(),
      })
      .select("*")
      .single();
    if (error) {
      log.warn("createFixedQuote failed", { err: error.message });
      return null;
    }
    return data as FixedQuoteRow;
  } catch (err) {
    log.warn("createFixedQuote threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export async function getQuoteByToken(token: string): Promise<FixedQuoteRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("team_fixed_quotes")
    .select("*")
    .eq("review_token", token)
    .maybeSingle();
  if (!data) return null;
  // Lazy expiry check: if past expires_at and still 'sent', mark expired.
  const row = data as FixedQuoteRow;
  if (row.status === "sent" && new Date(row.expires_at).getTime() < Date.now()) {
    await admin
      .from("team_fixed_quotes")
      .update({ status: "expired" })
      .eq("id", row.id);
    return { ...row, status: "expired" };
  }
  return row;
}

export async function acceptQuote(token: string): Promise<FixedQuoteRow | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("team_fixed_quotes")
    .update({ status: "accepted", accepted_at: now })
    .eq("review_token", token)
    .eq("status", "sent")
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  const row = data as FixedQuoteRow;
  // Log a brief tracker event so the squad inbox + admin see the
  // acceptance.
  await admin.from("brief_tracker_events").insert({
    brief_id: row.brief_id,
    event_type: "fixed_quote_accepted",
    actor_kind: "consumer",
    payload: { quote_id: row.id, amount_cents: row.amount_cents },
  });
  return row;
}

export async function declineQuote(
  token: string,
  reason: string | null,
): Promise<FixedQuoteRow | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("team_fixed_quotes")
    .update({
      status: "declined",
      declined_at: now,
      decline_reason: reason?.slice(0, 500) ?? null,
    })
    .eq("review_token", token)
    .eq("status", "sent")
    .select("*")
    .maybeSingle();
  if (error || !data) return null;
  return data as FixedQuoteRow;
}

/** Pure: total scope hours from the line items. */
export function totalScopeHours(items: ScopeItem[]): number {
  return items.reduce((sum, i) => sum + (i.estimated_hours ?? 0), 0);
}
