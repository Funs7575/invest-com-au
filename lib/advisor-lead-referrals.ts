/**
 * Advisor→advisor client lead referrals.
 *
 * Advisor A sends a structured client introduction to advisor B. On accept,
 * a professional_leads row is created for B at NO charge (a colleague's
 * referral is not a platform-generated lead). When B later marks that lead
 * converted, A earns a FLAT platform credit (kind='referral_payout',
 * reference_type='advisor_lead_referral') — gated by the
 * `advisor_lead_referral_bonus` feature flag, default OFF.
 *
 * COMPLIANCE (REGULATORY-AVOID-LIST lean lane):
 *  - flat B2B credit, never a % of an advice fee (RG 246);
 *  - no consumer money is intermediated;
 *  - the referral note runs the classifyText publish gate so the structured
 *    introduction can't carry advice/performance claims;
 *  - the bonus flag stays OFF until founder + legal sign-off.
 */

// eslint-disable-next-line no-restricted-imports -- cross-professional writes (referral rows, lead creation for the receiving advisor) on behalf of an advisor session; service-role legitimate per CLAUDE.md. Direct reads stay behind the table's party-scoped RLS.
import { createAdminClient } from "@/lib/supabase/admin";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";
import { isFlagEnabled } from "@/lib/feature-flags";
import { classifyText } from "@/lib/text-moderation";
import { logger } from "@/lib/logger";

const log = logger("advisor-lead-referrals");

export const REFERRAL_BONUS_FLAG = "advisor_lead_referral_bonus";

const DEFAULT_BONUS_CENTS = 2_500;

function getBonusCents(): number {
  const raw = process.env.ADVISOR_REFERRAL_BONUS_CENTS;
  if (!raw) return DEFAULT_BONUS_CENTS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100_000) {
    log.warn("ADVISOR_REFERRAL_BONUS_CENTS out of range, using default", { raw });
    return DEFAULT_BONUS_CENTS;
  }
  return parsed;
}

export interface LeadReferralRow {
  id: number;
  from_professional_id: number;
  to_professional_id: number;
  source_lead_id: number | null;
  created_lead_id: number | null;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  note: string | null;
  status: "pending" | "accepted" | "declined" | "expired" | "converted";
  bonus_cents: number;
  created_at: string;
}

export type ReferralFailure = "unavailable" | "not_found" | "forbidden" | "invalid" | "error";

function isMissingTableError(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "42P01" || err.code === "PGRST205" || err.code === "PGRST200") return true;
  const msg = (err.message ?? "").toLowerCase();
  return msg.includes("does not exist") || msg.includes("schema cache");
}

export async function createLeadReferral(input: {
  fromProfessionalId: number;
  /** Colleague's account email — resolved to an active professional. */
  toProfessionalEmail: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  note?: string | null;
  sourceLeadId?: number | null;
}): Promise<{ ok: true; referral: LeadReferralRow } | { ok: false; reason: ReferralFailure; message: string }> {
  // The referral note is a professional-to-professional introduction, but it
  // still must not carry advice/performance claims.
  if (input.note && input.note.trim().length > 0) {
    const verdict = classifyText({ text: input.note, title: null, surface: "advisor_post" });
    if (verdict.verdict !== "auto_publish") {
      return {
        ok: false,
        reason: "invalid",
        message:
          "The referral note can't include forward-looking claims or advice language — keep it to factual context about what the client needs.",
      };
    }
  }

  const admin = createAdminClient();

  const { data: receiver } = await admin
    .from("professionals")
    .select("id, status, accepting_new_clients")
    .ilike("email", input.toProfessionalEmail.trim())
    .eq("status", "active")
    .maybeSingle();
  if (!receiver) {
    return {
      ok: false,
      reason: "not_found",
      message: "No active advisor account found with that email — they need an Invest.com.au profile first.",
    };
  }
  if (receiver.id === input.fromProfessionalId) {
    return { ok: false, reason: "invalid", message: "You can't refer a client to yourself." };
  }

  // When referring an existing lead, it must belong to the referrer.
  if (input.sourceLeadId) {
    const { data: sourceLead } = await admin
      .from("professional_leads")
      .select("id, professional_id")
      .eq("id", input.sourceLeadId)
      .maybeSingle();
    if (!sourceLead || sourceLead.professional_id !== input.fromProfessionalId) {
      return { ok: false, reason: "forbidden", message: "You can only refer your own leads." };
    }
  }

  const { data, error } = await admin
    .from("advisor_lead_referrals")
    .insert({
      from_professional_id: input.fromProfessionalId,
      to_professional_id: receiver.id,
      source_lead_id: input.sourceLeadId ?? null,
      client_name: input.clientName.trim(),
      client_email: input.clientEmail.trim().toLowerCase(),
      client_phone: input.clientPhone?.trim() || null,
      note: input.note?.trim() || null,
      status: "pending",
    })
    .select("*")
    .single();

  if (error || !data) {
    if (isMissingTableError(error)) {
      return { ok: false, reason: "unavailable", message: "Client referrals are rolling out — try again soon." };
    }
    log.error("createLeadReferral insert failed", { error: error?.message });
    return { ok: false, reason: "error", message: "Failed to create the referral." };
  }
  return { ok: true, referral: data as LeadReferralRow };
}

export async function respondToLeadReferral(input: {
  referralId: number;
  professionalId: number;
  accept: boolean;
}): Promise<{ ok: true; createdLeadId: number | null } | { ok: false; reason: ReferralFailure; message: string }> {
  const admin = createAdminClient();
  const { data: referral, error } = await admin
    .from("advisor_lead_referrals")
    .select("*")
    .eq("id", input.referralId)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return { ok: false, reason: "unavailable", message: "Client referrals are rolling out — try again soon." };
    }
    return { ok: false, reason: "error", message: "Failed to load the referral." };
  }
  if (!referral) return { ok: false, reason: "not_found", message: "Referral not found." };
  if (referral.to_professional_id !== input.professionalId) {
    return { ok: false, reason: "forbidden", message: "This referral is addressed to someone else." };
  }
  if (referral.status !== "pending") {
    return { ok: false, reason: "invalid", message: "This referral has already been answered." };
  }

  if (!input.accept) {
    await admin
      .from("advisor_lead_referrals")
      .update({ status: "declined", responded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", input.referralId)
      .eq("status", "pending");
    return { ok: true, createdLeadId: null };
  }

  // Accept → create the lead for the receiver. No billing: bill_amount_cents
  // stays 0 and billed=false (colleague referral, not a platform lead).
  const { data: lead, error: leadError } = await admin
    .from("professional_leads")
    .insert({
      professional_id: referral.to_professional_id,
      user_name: referral.client_name,
      user_email: referral.client_email,
      user_phone: referral.client_phone,
      message: referral.note
        ? `Referred by a fellow advisor: ${referral.note}`
        : "Referred by a fellow advisor on Invest.com.au.",
      source_page: "advisor_referral",
      status: "new",
      billed: false,
      bill_amount_cents: 0,
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    log.error("respondToLeadReferral lead creation failed", { error: leadError?.message, referralId: input.referralId });
    return { ok: false, reason: "error", message: "Failed to create the lead." };
  }

  const { error: updateError } = await admin
    .from("advisor_lead_referrals")
    .update({
      status: "accepted",
      created_lead_id: lead.id,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.referralId)
    .eq("status", "pending");

  if (updateError) {
    log.error("respondToLeadReferral status update failed", { error: updateError.message, referralId: input.referralId });
  }

  return { ok: true, createdLeadId: lead.id as number };
}

/**
 * Called when a lead created from a referral converts. Marks the referral
 * converted and — only when the `advisor_lead_referral_bonus` flag is ON —
 * credits the referrer a flat bonus. Idempotent via the ledger's
 * (kind, reference_type, reference_id) unique triple.
 */
export async function recordReferralConversionForLead(leadId: number): Promise<void> {
  const admin = createAdminClient();
  const { data: referral, error } = await admin
    .from("advisor_lead_referrals")
    .select("id, from_professional_id, status, bonus_cents")
    .eq("created_lead_id", leadId)
    .maybeSingle();

  if (error) {
    if (!isMissingTableError(error)) {
      log.error("recordReferralConversionForLead lookup failed", { error: error.message, leadId });
    }
    return;
  }
  if (!referral || referral.status === "converted") return;

  await admin
    .from("advisor_lead_referrals")
    .update({ status: "converted", updated_at: new Date().toISOString() })
    .eq("id", referral.id);

  // Flat credit bonus — only when explicitly enabled (founder + legal
  // sign-off recorded before flipping the flag; REGULATORY-AVOID-LIST).
  const bonusEnabled = await isFlagEnabled(REFERRAL_BONUS_FLAG);
  if (!bonusEnabled) return;

  const bonusCents = getBonusCents();
  if (bonusCents <= 0) return;

  try {
    await recordLedgerEntry({
      professionalId: referral.from_professional_id,
      amountCents: bonusCents,
      kind: "referral_payout",
      description: `Client referral bonus — referred lead converted`,
      referenceType: "advisor_lead_referral",
      referenceId: String(referral.id),
      metadata: { referral_id: referral.id, lead_id: leadId, flat_bonus: true },
      createdBy: "system:advisor-lead-referral",
    });
    await admin
      .from("advisor_lead_referrals")
      .update({ bonus_cents: bonusCents, bonus_recorded_at: new Date().toISOString() })
      .eq("id", referral.id);
  } catch (err) {
    log.error("Referral bonus credit failed", {
      referralId: referral.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

export interface ReferralListEntry extends LeadReferralRow {
  counterpart_name: string | null;
  direction: "sent" | "received";
}

export async function listReferralsForAdvisor(professionalId: number): Promise<ReferralListEntry[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advisor_lead_referrals")
    .select("*")
    .or(`from_professional_id.eq.${professionalId},to_professional_id.eq.${professionalId}`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) {
    if (error && !isMissingTableError(error)) {
      log.error("listReferralsForAdvisor failed", { error: error.message });
    }
    return [];
  }

  const rows = data as LeadReferralRow[];
  const counterpartIds = Array.from(
    new Set(
      rows.map((r) =>
        r.from_professional_id === professionalId ? r.to_professional_id : r.from_professional_id,
      ),
    ),
  );
  const names = new Map<number, string>();
  if (counterpartIds.length > 0) {
    const { data: pros } = await admin
      .from("professionals")
      .select("id, name")
      .in("id", counterpartIds);
    for (const p of (pros ?? []) as { id: number; name: string }[]) names.set(p.id, p.name);
  }

  return rows.map((r) => {
    const direction: "sent" | "received" =
      r.from_professional_id === professionalId ? "sent" : "received";
    const counterpartId = direction === "sent" ? r.to_professional_id : r.from_professional_id;
    return { ...r, direction, counterpart_name: names.get(counterpartId) ?? null };
  });
}
