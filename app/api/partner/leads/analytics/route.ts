import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { resolvePartner } from "@/lib/partner-auth";

const log = logger("partner-analytics");

const RECENT_LIMIT = 50;

interface LeadRow {
  id: number;
  created_at: string | null;
  status: string | null;
  pipeline_stage: string;
  responded_at: string | null;
  converted_at: string | null;
  billed: boolean | null;
  bill_amount_cents: number | null;
  user_email: string;
  user_name: string;
  professionals: { name: string; type: string } | null;
}

/**
 * GET /api/partner/leads/analytics?api_key=...
 *
 * Per-partner lead performance for the /partner/leads dashboard:
 * delivery totals, status/pipeline funnel, response-SLA rate, billed
 * value, and the most recent leads (the partner sent these enquiries,
 * so the contact fields are the partner's own data — nothing about
 * other partners or on-site leads ever leaves the partner_id scope).
 *
 * The legacy env-key partner (id null) reports over source_page =
 * 'partner_api' with partner_id IS NULL — pre-account traffic.
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await isAllowed("partner_analytics", ipKey(request), { max: 30, refillPerSec: 30 / 60 }))) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const partner = await resolvePartner(request.nextUrl.searchParams.get("api_key"));
    if (!partner) {
      return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
    }

    const supabase = createAdminClient();

    let query = supabase
      .from("professional_leads")
      .select(
        "id, created_at, status, pipeline_stage, responded_at, converted_at, billed, bill_amount_cents, user_email, user_name, professionals(name, type)",
      )
      .order("created_at", { ascending: false })
      .limit(2000);

    query = partner.id
      ? query.eq("partner_id", partner.id)
      : query.eq("source_page", "partner_api").is("partner_id", null);

    const { data, error } = await query;
    if (error) {
      log.error("partner analytics fetch failed", { error: error.message });
      return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
    }

    const leads = (data ?? []) as unknown as LeadRow[];

    const byStatus: Record<string, number> = {};
    const byStage: Record<string, number> = {};
    let responded = 0;
    let respondedWithin24h = 0;
    let converted = 0;
    let billedCents = 0;

    for (const lead of leads) {
      const status = lead.status ?? "unknown";
      byStatus[status] = (byStatus[status] ?? 0) + 1;
      byStage[lead.pipeline_stage] = (byStage[lead.pipeline_stage] ?? 0) + 1;

      if (lead.responded_at) {
        responded++;
        if (
          lead.created_at &&
          new Date(lead.responded_at).getTime() - new Date(lead.created_at).getTime() <= 24 * 60 * 60 * 1000
        ) {
          respondedWithin24h++;
        }
      }
      if (lead.converted_at || lead.pipeline_stage === "won") converted++;
      if (lead.billed) billedCents += lead.bill_amount_cents ?? 0;
    }

    const total = leads.length;

    return NextResponse.json({
      partner: { name: partner.name, account: partner.id ? "managed" : "legacy" },
      totals: {
        delivered: total,
        responded,
        responded_within_24h: respondedWithin24h,
        response_within_24h_pct: total > 0 ? Math.round((respondedWithin24h / total) * 100) : 0,
        converted,
        conversion_pct: total > 0 ? Math.round((converted / total) * 100) : 0,
        billed_cents: billedCents,
      },
      by_status: byStatus,
      by_pipeline_stage: byStage,
      recent_leads: leads.slice(0, RECENT_LIMIT).map((lead) => ({
        id: lead.id,
        created_at: lead.created_at,
        name: lead.user_name,
        email: lead.user_email,
        status: lead.status,
        pipeline_stage: lead.pipeline_stage,
        responded_at: lead.responded_at,
        advisor_type: lead.professionals?.type ?? null,
      })),
    });
  } catch (error) {
    log.error("Partner analytics API error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
