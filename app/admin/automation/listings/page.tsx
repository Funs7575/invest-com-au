import { createAdminClient } from "@/lib/supabase/admin";
import DrillDownShell from "@/components/admin/automation/DrillDownShell";
import VerdictChart from "@/components/admin/automation/VerdictChart";
import { getListingScamOverview } from "@/lib/admin/automation-metrics";
import ListingsBulkTable from "./ListingsBulkTable";

export const dynamic = "force-dynamic";

export default async function ListingsDrillDown() {
  const supabase = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [overview, recentRes, chartRes] = await Promise.all([
    getListingScamOverview(),
    supabase
      .from("investment_listings")
      .select(
        "id, title, vertical, status, contact_email, auto_classified_verdict, auto_classified_risk_score, auto_classified_reasons, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("automation_verdict_daily")
      .select("day, auto_acted, escalated, rejected, approved")
      .eq("feature", "listing_scam")
      .gte("day", thirtyDaysAgo)
      .order("day", { ascending: true }),
  ]);
  const rows = recentRes.data || [];
  const chartRows = chartRes.data || [];

  return (
    <DrillDownShell overview={overview}>
      <div className="mb-4">
        <VerdictChart rows={chartRows} />
      </div>
      <ListingsBulkTable initialRows={rows} />
    </DrillDownShell>
  );
}
