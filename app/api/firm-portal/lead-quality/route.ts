/**
 * GET /api/firm-portal/lead-quality
 *
 * Lead-quality benchmark analytics for firm admins. Returns:
 *   - Pipeline stage funnel (new → won/lost)
 *   - Lead tier breakdown (standard / qualified / exclusive)
 *   - Quality score distribution (4 buckets)
 *   - Top 5 UTM sources
 *   - Overall conversion rate
 *   - Anonymised market benchmarks (median conversion + leads per member)
 *
 * Auth: requireAdvisorSession + resolveFirmAdminContext.
 * Data: admin client (cross-member aggregation; createClient() RLS scopes
 *       to a single advisor's own leads, not firm-wide).
 * Rate-limit: 20 / min / IP.
 * Cache: private, max-age=900 (15 min — lead data refreshes slowly).
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { resolveFirmAdminContext } from "@/lib/firm-billing";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const log = logger("firm-portal:lead-quality");

const PIPELINE_STAGES = [
  { stage: "new", label: "New" },
  { stage: "contacted", label: "Contacted" },
  { stage: "proposal_sent", label: "Proposal Sent" },
  { stage: "negotiating", label: "Negotiating" },
  { stage: "won", label: "Won" },
] as const;

const WINDOW_DAYS = 90;

type LeadRow = {
  pipeline_stage: string | null;
  lead_tier: string | null;
  quality_score: number | null;
  utm_source: string | null;
};

type BenchmarkRow = {
  firm_id: number | null;
  lead_count: number | null;
  won_count: number | null;
  member_count: number | null;
};

function qualityBucket(score: number | null): string {
  if (score === null) return "unscored";
  if (score < 40) return "poor";
  if (score < 70) return "fair";
  if (score < 90) return "good";
  return "excellent";
}

export async function GET(request: NextRequest) {
  if (!(await isAllowed("firm_portal_lead_quality", ipKey(request), { max: 20, refillPerSec: 0.33 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveFirmAdminContext(professionalId);
  if (!ctx) {
    return NextResponse.json({ error: "Firm admin access required." }, { status: 403 });
  }

  const supabase = createAdminClient();
  const windowStart = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Get all professional IDs in this firm.
    const { data: memberRows, error: memberErr } = await supabase
      .from("professionals")
      .select("id")
      .eq("firm_id", ctx.firmId)
      .eq("status", "active");

    if (memberErr) {
      log.error("Failed to fetch firm members", { firmId: ctx.firmId, error: memberErr.message });
      return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
    }

    const memberIds = (memberRows ?? []).map((r) => r.id);

    if (memberIds.length === 0) {
      return NextResponse.json({
        firmId: ctx.firmId,
        totalLeads: 0,
        funnel: [],
        tierBreakdown: [],
        qualityDistribution: [],
        topSources: [],
        conversionRate: null,
        benchmarks: { medianConversionRate: null, medianLeadsPerMember: null, topQuartileConversionRate: null },
        windowDays: WINDOW_DAYS,
        windowStart,
      });
    }

    // Fetch leads for the window.
    const { data: leads, error: leadsErr } = await supabase
      .from("professional_leads")
      .select("pipeline_stage, lead_tier, quality_score, utm_source")
      .in("professional_id", memberIds)
      .gte("created_at", windowStart);

    if (leadsErr) {
      log.error("Failed to fetch leads", { firmId: ctx.firmId, error: leadsErr.message });
      return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
    }

    const rows = (leads ?? []) as LeadRow[];
    const totalLeads = rows.length;

    // ── Pipeline stage funnel ──────────────────────────────────────────────
    const stageCounts = new Map<string, number>();
    for (const row of rows) {
      const s = row.pipeline_stage ?? "new";
      stageCounts.set(s, (stageCounts.get(s) ?? 0) + 1);
    }

    // Include won + lost separately for the funnel (lost shown as context, not a funnel stage)
    const wonCount = stageCounts.get("won") ?? 0;
    const lostCount = stageCounts.get("lost") ?? 0;

    const funnel = PIPELINE_STAGES.map(({ stage, label }) => ({
      stage,
      label,
      count: stageCounts.get(stage) ?? 0,
      conversionRate: totalLeads > 0 ? +((stageCounts.get(stage) ?? 0) / totalLeads * 100).toFixed(1) : 0,
    }));

    // ── Tier breakdown ────────────────────────────────────────────────────
    const tierCounts: Record<string, number> = { standard: 0, qualified: 0, exclusive: 0 };
    for (const row of rows) {
      const t = row.lead_tier ?? "standard";
      tierCounts[t] = (tierCounts[t] ?? 0) + 1;
    }
    const tierBreakdown = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
      pct: totalLeads > 0 ? +(count / totalLeads * 100).toFixed(1) : 0,
    }));

    // ── Quality score distribution ────────────────────────────────────────
    const BUCKETS: { bucket: string; range: string }[] = [
      { bucket: "excellent", range: "≥ 90" },
      { bucket: "good", range: "70–89" },
      { bucket: "fair", range: "40–69" },
      { bucket: "poor", range: "< 40" },
      { bucket: "unscored", range: "No score" },
    ];
    const bucketCounts: Record<string, number> = {};
    for (const row of rows) {
      const b = qualityBucket(row.quality_score);
      bucketCounts[b] = (bucketCounts[b] ?? 0) + 1;
    }
    const qualityDistribution = BUCKETS.map(({ bucket, range }) => ({
      bucket,
      range,
      count: bucketCounts[bucket] ?? 0,
      pct: totalLeads > 0 ? +((bucketCounts[bucket] ?? 0) / totalLeads * 100).toFixed(1) : 0,
    }));

    // ── Top UTM sources ───────────────────────────────────────────────────
    const sourceCounts = new Map<string, number>();
    for (const row of rows) {
      const src = row.utm_source ?? "(direct)";
      sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
    }
    const topSources = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    // ── Conversion rate ───────────────────────────────────────────────────
    const conversionRate = totalLeads > 0
      ? +(wonCount / totalLeads * 100).toFixed(1)
      : null;

    // ── Market benchmarks (anonymized, all active firms) ──────────────────
    // Aggregate per firm: lead count, won count, member count.
    // We use a raw SQL approach via multiple targeted queries to avoid a
    // full cross-firm scan — sufficient for median estimation.
    let benchmarks: { medianConversionRate: number | null; medianLeadsPerMember: number | null; topQuartileConversionRate: number | null } = {
      medianConversionRate: null,
      medianLeadsPerMember: null,
      topQuartileConversionRate: null,
    };

    try {
      // Fetch all firms with at least one active member.
      const { data: allFirmRows } = await supabase
        .from("advisor_firms")
        .select("id")
        .eq("status", "active")
        .limit(500);

      const allFirmIds = (allFirmRows ?? []).map((r: { id: number }) => r.id);

      if (allFirmIds.length >= 3) {
        // For each firm, get member count + lead counts — batched in groups
        // of 50 firm IDs to stay within query complexity limits.
        const firmData: BenchmarkRow[] = [];
        const BATCH = 50;

        for (let i = 0; i < allFirmIds.length; i += BATCH) {
          const batch = allFirmIds.slice(i, i + BATCH);

          // Get member IDs for this batch of firms
          const { data: batchMembers } = await supabase
            .from("professionals")
            .select("id, firm_id")
            .in("firm_id", batch)
            .eq("status", "active");

          const firmMemberMap = new Map<number, number[]>();
          for (const m of batchMembers ?? []) {
            if (!firmMemberMap.has(m.firm_id)) firmMemberMap.set(m.firm_id, []);
            firmMemberMap.get(m.firm_id)!.push(m.id);
          }

          for (const [fId, mIds] of firmMemberMap.entries()) {
            const { data: fLeads } = await supabase
              .from("professional_leads")
              .select("pipeline_stage")
              .in("professional_id", mIds)
              .gte("created_at", windowStart)
              .limit(1000);

            const fLeadRows = fLeads ?? [];
            const fWon = fLeadRows.filter((l) => l.pipeline_stage === "won").length;
            firmData.push({
              firm_id: fId,
              lead_count: fLeadRows.length,
              won_count: fWon,
              member_count: mIds.length,
            });
          }
        }

        // Compute medians from firms with >= 1 lead
        const activeFirms = firmData.filter((f) => (f.lead_count ?? 0) >= 1);

        if (activeFirms.length >= 3) {
          const convRates = activeFirms
            .map((f) => (f.lead_count && f.lead_count > 0 && f.won_count !== null ? (f.won_count / f.lead_count) * 100 : null))
            .filter((v): v is number => v !== null)
            .sort((a, b) => a - b);

          const leadsPerMember = activeFirms
            .map((f) => (f.member_count && f.member_count > 0 && f.lead_count !== null ? f.lead_count / f.member_count : null))
            .filter((v): v is number => v !== null)
            .sort((a, b) => a - b);

          const mid = (arr: number[]) => {
            if (arr.length === 0) return null;
            const m = Math.floor(arr.length / 2);
            return arr.length % 2 === 0
              ? +((arr[m - 1]! + arr[m]!) / 2).toFixed(1)
              : +(arr[m]!).toFixed(1);
          };

          const top25Idx = Math.floor(convRates.length * 0.75);

          benchmarks = {
            medianConversionRate: mid(convRates),
            medianLeadsPerMember: mid(leadsPerMember),
            topQuartileConversionRate: convRates[top25Idx] !== undefined ? +convRates[top25Idx]!.toFixed(1) : null,
          };
        }
      }
    } catch (bErr) {
      // Benchmarks are best-effort — log but don't fail the whole response.
      log.error("Benchmark computation error", { error: bErr instanceof Error ? bErr.message : String(bErr) });
    }

    return NextResponse.json(
      {
        firmId: ctx.firmId,
        totalLeads,
        wonCount,
        lostCount,
        memberCount: memberIds.length,
        funnel,
        tierBreakdown,
        qualityDistribution,
        topSources,
        conversionRate,
        benchmarks,
        windowDays: WINDOW_DAYS,
        windowStart,
      },
      {
        status: 200,
        headers: { "Cache-Control": "private, max-age=900" },
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    log.error("Unhandled error in GET /api/firm-portal/lead-quality", { error: msg });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
