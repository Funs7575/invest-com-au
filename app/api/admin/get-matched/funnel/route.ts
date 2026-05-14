import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data } = await admin
    .from("get_matched_events")
    .select("event_type, payload, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  const rows = (data ?? []) as {
    event_type: string;
    payload: Record<string, unknown> | null;
    created_at: string;
  }[];

  const totals: Record<string, number> = {};
  const routeCounts: Record<string, number> = {};
  const intentCounts: Record<string, number> = {};

  for (const row of rows) {
    totals[row.event_type] = (totals[row.event_type] ?? 0) + 1;
    if (row.event_type === "plan_shown") {
      const route = String(row.payload?.route ?? "unknown");
      const intent = String(row.payload?.intent ?? "unknown");
      routeCounts[route] = (routeCounts[route] ?? 0) + 1;
      intentCounts[intent] = (intentCounts[intent] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    since,
    totals,
    routeCounts,
    intentCounts,
    sampleCount: rows.length,
  });
}
