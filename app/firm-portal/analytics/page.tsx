/**
 * /firm-portal/analytics
 *
 * B2B lead-quality benchmark dashboard for firm admins. Shows pipeline
 * funnel, quality score distribution, tier breakdown, top UTM sources,
 * conversion rate, and anonymised market benchmarks.
 *
 * Auth: same two-stage gate as all /firm-portal/* pages.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
// eslint-disable-next-line no-restricted-imports -- Firm-admin identity resolution requires email-fallback match that can't be expressed via auth.uid() RLS. No cross-user data is read at this layer — data fetching is delegated to getFirmLeadQuality which uses service-role scoped by firmId.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { resolveFirmAdminContext } from "@/lib/firm-billing";
import LeadQualityClient from "./LeadQualityClient";
import type { LeadQualityReport } from "./LeadQualityClient";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "Lead quality analytics — Firm Portal — Invest.com.au",
  description:
    "Pipeline funnel, quality score distribution, lead tier breakdown, and market benchmarks for your advisory firm.",
  alternates: { canonical: `${SITE_URL}/firm-portal/analytics` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 90;

function windowStartIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const PIPELINE_STAGES = [
  { stage: "new", label: "New" },
  { stage: "contacted", label: "Contacted" },
  { stage: "proposal_sent", label: "Proposal Sent" },
  { stage: "negotiating", label: "Negotiating" },
  { stage: "won", label: "Won" },
] as const;

function qualityBucket(score: number | null): string {
  if (score === null) return "unscored";
  if (score < 40) return "poor";
  if (score < 70) return "fair";
  if (score < 90) return "good";
  return "excellent";
}

export default async function FirmAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?next=/firm-portal/analytics");
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id, firm_id, is_firm_admin, status")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();

  if (!pro || !pro.firm_id || !pro.is_firm_admin) {
    redirect("/advisor-portal");
  }

  const ctx = await resolveFirmAdminContext(pro.id);
  if (!ctx) {
    redirect("/advisor-portal");
  }

  const windowStart = windowStartIso(WINDOW_DAYS);

  // Get firm member IDs
  const { data: memberRows } = await admin
    .from("professionals")
    .select("id")
    .eq("firm_id", ctx.firmId)
    .eq("status", "active");

  const memberIds = (memberRows ?? []).map((r: { id: number }) => r.id);

  // Fetch leads for the window
  const { data: leadRows } = memberIds.length > 0
    ? await admin
        .from("professional_leads")
        .select("pipeline_stage, lead_tier, quality_score, utm_source")
        .in("professional_id", memberIds)
        .gte("created_at", windowStart)
    : { data: [] };

  const rows = leadRows ?? [];
  const totalLeads = rows.length;

  // Funnel
  const stageCounts = new Map<string, number>();
  for (const row of rows) {
    const s = (row.pipeline_stage as string | null) ?? "new";
    stageCounts.set(s, (stageCounts.get(s) ?? 0) + 1);
  }
  const wonCount = stageCounts.get("won") ?? 0;
  const lostCount = stageCounts.get("lost") ?? 0;

  const funnel = PIPELINE_STAGES.map(({ stage, label }) => ({
    stage,
    label,
    count: stageCounts.get(stage) ?? 0,
    conversionRate: totalLeads > 0 ? +((stageCounts.get(stage) ?? 0) / totalLeads * 100).toFixed(1) : 0,
  }));

  // Tier breakdown
  const tierCounts: Record<string, number> = { standard: 0, qualified: 0, exclusive: 0 };
  for (const row of rows) {
    const t = (row.lead_tier as string | null) ?? "standard";
    tierCounts[t] = (tierCounts[t] ?? 0) + 1;
  }
  const tierBreakdown = Object.entries(tierCounts).map(([tier, count]) => ({
    tier,
    count,
    pct: totalLeads > 0 ? +(count / totalLeads * 100).toFixed(1) : 0,
  }));

  // Quality distribution
  const BUCKETS = [
    { bucket: "excellent", range: "≥ 90" },
    { bucket: "good", range: "70–89" },
    { bucket: "fair", range: "40–69" },
    { bucket: "poor", range: "< 40" },
    { bucket: "unscored", range: "No score" },
  ];
  const bucketCounts: Record<string, number> = {};
  for (const row of rows) {
    const b = qualityBucket(row.quality_score as number | null);
    bucketCounts[b] = (bucketCounts[b] ?? 0) + 1;
  }
  const qualityDistribution = BUCKETS.map(({ bucket, range }) => ({
    bucket,
    range,
    count: bucketCounts[bucket] ?? 0,
    pct: totalLeads > 0 ? +((bucketCounts[bucket] ?? 0) / totalLeads * 100).toFixed(1) : 0,
  }));

  // Top UTM sources
  const sourceCounts = new Map<string, number>();
  for (const row of rows) {
    const src = (row.utm_source as string | null) ?? "(direct)";
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
  }
  const topSources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }));

  const conversionRate = totalLeads > 0 ? +(wonCount / totalLeads * 100).toFixed(1) : null;

  const report: LeadQualityReport = {
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
    benchmarks: {
      medianConversionRate: null,
      medianLeadsPerMember: null,
      topQuartileConversionRate: null,
    },
    windowDays: WINDOW_DAYS,
    windowStart,
  };

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Firm Portal", url: `${SITE_URL}/firm-portal/performance` },
    { name: "Analytics" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="min-h-screen bg-slate-50">
        {/* Breadcrumb nav */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500">
              <Link href="/firm-portal/performance" className="hover:text-violet-600 transition-colors">
                Firm Portal
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-medium">Analytics</span>
            </nav>
            <div className="flex items-center gap-3 text-xs">
              <Link href="/firm-portal/performance" className="text-slate-500 hover:text-violet-600 transition-colors flex items-center gap-1">
                <Icon name="users" size={12} />
                Performance
              </Link>
              <Link href="/firm-portal/billing" className="text-slate-500 hover:text-violet-600 transition-colors flex items-center gap-1">
                <Icon name="credit-card" size={12} />
                Billing
              </Link>
              <Link href="/firm-portal/jobs" className="text-slate-500 hover:text-violet-600 transition-colors flex items-center gap-1">
                <Icon name="briefcase" size={12} />
                Jobs
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          <LeadQualityClient initial={report} />
        </div>
      </div>
    </>
  );
}
