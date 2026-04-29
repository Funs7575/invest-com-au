import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

const log = logger("advisor-opt-ins");

/**
 * Shared processor for "advisor opt-in checkbox" submissions.
 *
 * Persists each tick into `listing_advisor_opt_ins` and fans out into the
 * `leads` table via the existing /api/submit-lead pipeline. This keeps every
 * downstream cron (`confirm-lead-notify`, `enforce-lead-sla`) treating these
 * as normal advisor leads — no parallel notification or SLA tracking
 * required.
 *
 * Idempotent: the unique index on (email, source, source-id-tuple,
 * advisor_type) means a re-submission silently no-ops.
 */

export type OptInSource = "investment_listing" | "property_enquiry" | "quiz_post" | "job_posting";

export interface ProcessOptInsArgs {
  /** Service-role Supabase client. */
  admin: SupabaseClient;
  /** Where the opt-in came from. */
  source: OptInSource;
  investment_listing_id?: number | null;
  property_enquiry_id?: number | null;
  quiz_lead_id?: number | null;
  job_posting_id?: number | null;
  /** ProfessionalType slugs the user ticked. */
  advisor_types: string[];
  contact_email: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  user_location_state?: string | null;
  /** Free-text context that goes into the lead message. */
  context_note?: string | null;
}

export interface ProcessOptInsResult {
  inserted: number;
  /** Per-type result for callers that need it (e.g. analytics). */
  results: { advisor_type: string; status: "queued" | "duplicate" | "failed"; error?: string }[];
}

const VALID_ADVISOR_TYPES = new Set([
  "smsf_accountant",
  "financial_planner",
  "property_advisor",
  "tax_agent",
  "mortgage_broker",
  "estate_planner",
  "insurance_broker",
  "buyers_agent",
  "real_estate_agent",
  "wealth_manager",
  "aged_care_advisor",
  "crypto_advisor",
  "debt_counsellor",
  "stockbroker_firm",
  "private_wealth_manager",
  "mining_lawyer",
  "mining_tax_advisor",
  "migration_agent",
  "business_broker",
  "commercial_lawyer",
  "rural_property_agent",
  "commercial_property_agent",
  "energy_consultant",
  "energy_financial_planner",
  "resources_fund_manager",
  "foreign_investment_lawyer",
  "petroleum_royalties_advisor",
  "smsf_auditor",
  "smsf_specialist",
  "immigration_investment_lawyer",
  "fund_manager",
]);

export async function processAdvisorOptIns(args: ProcessOptInsArgs): Promise<ProcessOptInsResult> {
  const {
    admin,
    source,
    investment_listing_id = null,
    property_enquiry_id = null,
    quiz_lead_id = null,
    job_posting_id = null,
    advisor_types,
    contact_email,
    contact_name = null,
    contact_phone = null,
    user_location_state = null,
    context_note = null,
  } = args;

  const cleanTypes = (advisor_types || [])
    .map((t) => String(t).trim())
    .filter((t) => VALID_ADVISOR_TYPES.has(t));

  const result: ProcessOptInsResult = { inserted: 0, results: [] };
  if (cleanTypes.length === 0) return result;

  const rows = cleanTypes.map((advisor_type) => ({
    source,
    investment_listing_id,
    property_enquiry_id,
    quiz_lead_id,
    job_posting_id,
    advisor_type,
    contact_email: contact_email.toLowerCase().trim(),
    contact_name,
    contact_phone,
    user_location_state,
    context_note,
    status: "pending" as const,
  }));

  const { data: inserted, error: insertError } = await admin
    .from("listing_advisor_opt_ins")
    .upsert(rows, {
      onConflict: "contact_email,source,investment_listing_id,property_enquiry_id,quiz_lead_id,job_posting_id,advisor_type",
      ignoreDuplicates: true,
    })
    .select("id, advisor_type");

  if (insertError) {
    log.error("opt-in insert failed", { error: insertError.message, source });
    return { inserted: 0, results: cleanTypes.map((t) => ({ advisor_type: t, status: "failed", error: insertError.message })) };
  }

  // Fan out into the leads table — one row per opt-in. Run sequentially to
  // keep matching deterministic and avoid race conditions in the round-robin
  // logic.
  for (const row of inserted || []) {
    const { id, advisor_type } = row as { id: number; advisor_type: string };

    const { data: lead, error: leadError } = await admin
      .from("leads")
      .insert({
        lead_type: "advisor",
        user_email: contact_email.toLowerCase().trim(),
        user_name: contact_name,
        user_phone: contact_phone,
        user_location_state,
        user_intent: { need: "planning", advisor_type, source, context: context_note ? [context_note] : [] },
        status: "new",
        source_page: `opt-in:${source}`,
      })
      .select("id")
      .single();

    if (leadError) {
      log.warn("lead fan-out failed", { error: leadError.message, source, advisor_type });
      await admin
        .from("listing_advisor_opt_ins")
        .update({ status: "failed", failure_reason: leadError.message })
        .eq("id", id);
      result.results.push({ advisor_type, status: "failed", error: leadError.message });
      continue;
    }

    await admin
      .from("listing_advisor_opt_ins")
      .update({ status: "sent", lead_id: lead?.id ?? null, processed_at: new Date().toISOString() })
      .eq("id", id);

    result.inserted++;
    result.results.push({ advisor_type, status: "queued" });
  }

  log.info("opt-ins processed", { source, requested: cleanTypes.length, inserted: result.inserted });
  return result;
}
