import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Auth guard
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET || process.env.INTERNAL_API_KEY;
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results: { step: string; status: string; error?: string }[] = [];

  async function runSQL(step: string, sql: string) {
    const { error } = await supabase.rpc("exec_sql", { sql_text: sql });
    if (error) {
      results.push({ step, status: "error", error: error.message });
      return false;
    }
    results.push({ step, status: "ok" });
    return true;
  }

  // Step 1: Create exec_sql function if it doesn't exist (bootstrap)
  // We need this to run arbitrary SQL via the service role
  const bootstrapRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
    {
      method: "POST",
      headers: {
        "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY!,
        "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql_text: "SELECT 1 as test",
      }),
    }
  );

  if (!bootstrapRes.ok) {
    // exec_sql doesn't exist yet — we can't run raw SQL without it
    // Try creating tables via Supabase client methods instead
    results.push({
      step: "bootstrap",
      status: "info",
      error: "exec_sql function not available. Checking tables via client...",
    });

    // Test if our tables already exist by trying to query them
    const checks = [
      { table: "advisor_tiers", step: "check_advisor_tiers" },
      { table: "leads", step: "check_leads" },
      { table: "email_subscribers", step: "check_email_subscribers" },
      { table: "analytics_events", step: "check_analytics_events" },
      { table: "email_campaigns", step: "check_email_campaigns" },
    ];

    for (const { table, step } of checks) {
      const { error } = await supabase.from(table).select("*").limit(1);
      if (error) {
        results.push({ step, status: "missing", error: error.message });
      } else {
        results.push({ step, status: "exists" });
      }
    }

    // Check broker columns
    const { data: brokerData, error: brokerErr } = await supabase
      .from("brokers")
      .select("cpa_value, affiliate_priority, promoted_placement")
      .limit(1);
    if (brokerErr) {
      results.push({ step: "check_broker_cols", status: "missing", error: brokerErr.message });
    } else {
      results.push({ step: "check_broker_cols", status: "exists", error: JSON.stringify(brokerData) });
    }

    // Check professional columns
    const { data: profData, error: profErr } = await supabase
      .from("professionals")
      .select("advisor_tier, featured_until, advisor_nudge_sent_at")
      .limit(1);
    if (profErr) {
      results.push({ step: "check_professional_cols", status: "missing", error: profErr.message });
    } else {
      results.push({ step: "check_professional_cols", status: "exists", error: JSON.stringify(profData) });
    }

    return NextResponse.json({ results, needsManualMigration: results.some(r => r.status === "missing") });
  }

  // If exec_sql exists, run the full migration
  results.push({ step: "bootstrap", status: "ok" });

  // Run each migration step
  await runSQL("broker_columns", `
    ALTER TABLE brokers ADD COLUMN IF NOT EXISTS cpa_value INTEGER;
    ALTER TABLE brokers ADD COLUMN IF NOT EXISTS affiliate_priority TEXT;
    ALTER TABLE brokers ADD COLUMN IF NOT EXISTS monthly_sponsorship_fee INTEGER DEFAULT 0;
    ALTER TABLE brokers ADD COLUMN IF NOT EXISTS promoted_placement BOOLEAN DEFAULT false;
    ALTER TABLE brokers ADD COLUMN IF NOT EXISTS deal_description TEXT;
    ALTER TABLE brokers ADD COLUMN IF NOT EXISTS fee_last_checked TIMESTAMPTZ;
  `);

  await runSQL("advisor_tiers_table", `
    CREATE TABLE IF NOT EXISTS advisor_tiers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      monthly_fee INTEGER NOT NULL DEFAULT 0,
      lead_fee INTEGER NOT NULL DEFAULT 10000,
      match_multiplier NUMERIC NOT NULL DEFAULT 1.0,
      features JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await runSQL("leads_table", `
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      lead_type TEXT NOT NULL,
      professional_id INTEGER,
      advisor_specialty TEXT,
      broker_id BIGINT,
      affiliate_click_id TEXT,
      user_email TEXT NOT NULL,
      user_phone TEXT,
      user_name TEXT,
      user_location_state TEXT,
      user_intent JSONB,
      revenue_value_cents INTEGER DEFAULT 0,
      status TEXT DEFAULT 'sent',
      source_page TEXT,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      converted_at TIMESTAMPTZ
    );
  `);

  await runSQL("email_subscribers_table", `
    CREATE TABLE IF NOT EXISTS email_subscribers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      segment TEXT,
      quiz_responses JSONB,
      lead_magnet TEXT,
      report_data JSONB,
      subscribed_at TIMESTAMPTZ DEFAULT NOW(),
      last_email_opened_at TIMESTAMPTZ,
      unsubscribed_at TIMESTAMPTZ,
      source_page TEXT,
      utm_params JSONB
    );
  `);

  await runSQL("analytics_events_table", `
    CREATE TABLE IF NOT EXISTS analytics_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_name TEXT NOT NULL,
      properties JSONB,
      session_id TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await runSQL("professional_columns", `
    ALTER TABLE professionals ADD COLUMN IF NOT EXISTS advisor_tier TEXT DEFAULT 'bronze';
    ALTER TABLE professionals ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;
    ALTER TABLE professionals ADD COLUMN IF NOT EXISTS total_leads_received INTEGER DEFAULT 0;
    ALTER TABLE professionals ADD COLUMN IF NOT EXISTS leads_accepted INTEGER DEFAULT 0;
    ALTER TABLE professionals ADD COLUMN IF NOT EXISTS last_lead_date TIMESTAMPTZ;
    ALTER TABLE professionals ADD COLUMN IF NOT EXISTS advisor_nudge_sent_at TIMESTAMPTZ;
  `);

  return NextResponse.json({ success: true, results });
}
