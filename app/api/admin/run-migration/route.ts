import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

// GET - for Vercel cron or manual browser check
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runMigration();
}

// POST - for programmatic calls
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET || process.env.INTERNAL_API_KEY;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runMigration();
}
