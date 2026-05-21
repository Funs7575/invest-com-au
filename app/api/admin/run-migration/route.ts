import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

async function runMigration() {
  const supabase = createAdminClient();
  const results: { step: string; status: string; detail?: string }[] = [];

  // Check which tables/columns already exist
  const tableChecks = [
    { table: "advisor_tiers", step: "advisor_tiers" },
    { table: "leads", step: "leads" },
    { table: "email_subscribers", step: "email_subscribers" },
    { table: "analytics_events", step: "analytics_events" },
    { table: "email_campaigns", step: "email_campaigns" },
  ];

  for (const { table, step } of tableChecks) {
    const { error } = await supabase.from(table).select("*").limit(1);
    results.push({
      step: `table_${step}`,
      status: error ? "missing" : "exists",
      detail: error?.message,
    });
  }

  // Check broker revenue columns
  const { error: brokerErr } = await supabase
    .from("brokers")
    .select("cpa_value, affiliate_priority, promoted_placement")
    .limit(1);
  results.push({
    step: "broker_revenue_columns",
    status: brokerErr ? "missing" : "exists",
    detail: brokerErr?.message,
  });

  // Check professional tier columns
  const { error: profErr } = await supabase
    .from("professionals")
    .select("advisor_tier, featured_until, advisor_nudge_sent_at")
    .limit(1);
  results.push({
    step: "professional_tier_columns",
    status: profErr ? "missing" : "exists",
    detail: profErr?.message,
  });

  const missing = results.filter((r) => r.status === "missing");
  const allExist = missing.length === 0;

  return NextResponse.json({
    success: allExist,
    allTablesExist: allExist,
    missingCount: missing.length,
    results,
    message: allExist
      ? "All migration tables and columns exist. Database is ready."
      : `${missing.length} items missing. Run the SQL migration in Supabase Dashboard.`,
  });
}

// Admin-session only. This route inspects live schema (table/column
// existence), so it must require a logged-in admin — not just the cron shared
// secret, a leaked copy of which would otherwise allow schema enumeration
// (audit §5 #12). Removed from the every-6h cron schedule; admins run it on
// demand, and AD-90 DB-health + the data-integrity audit cron cover automated
// schema monitoring.
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  return runMigration();
}

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  return runMigration();
}
