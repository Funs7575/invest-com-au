/**
 * GET /api/advisor-auth/analytics/export
 *
 * Streams a CSV of the advisor's leads.
 *
 * Query params:
 *   period = "30d" | "90d" | "all"  (default: "30d")
 *
 * CSV columns:
 *   Date, Client (masked), Source, Status, Billed (AUD), Notes
 *
 * Rate-limited: 5 requests per hour per advisor.
 */

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";

/** Mask a client name: "John Smith" → "J. S****" */
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "";
  const rest = parts.slice(1);
  const maskedRest = rest.map((p) => `${p.charAt(0)}****`).join(" ");
  return maskedRest ? `${first.charAt(0)}. ${maskedRest}` : `${first.charAt(0)}****`;
}

/** Escape a CSV cell value: wrap in quotes and double any internal quotes. */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (await isRateLimited(`analytics_export:${advisorId}`, 5, 60)) {
    return new Response(JSON.stringify({ error: "Too many requests. Max 5 exports per hour." }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get("period") ?? "30d";

  let cutoff: string | null = null;
  if (period === "30d") {
    cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  } else if (period === "90d") {
    cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
  }
  // "all" → no cutoff

  const admin = createAdminClient();

  let query = admin
    .from("professional_leads")
    .select("created_at, user_name, source_page, status, bill_amount_cents, advisor_notes")
    .eq("professional_id", advisorId)
    .order("created_at", { ascending: false });

  if (cutoff) {
    query = query.gte("created_at", cutoff);
  }

  const { data: leads, error } = await query;

  if (error) {
    return new Response(JSON.stringify({ error: "Failed to fetch leads" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows: string[] = [
    // Header row
    ["Date", "Client", "Source", "Status", "Billed (AUD)", "Notes"].join(","),
  ];

  for (const lead of leads ?? []) {
    const date = lead.created_at
      ? new Date(lead.created_at as string).toISOString().split("T")[0]
      : "";
    const client = maskName((lead.user_name as string | null) ?? "Unknown");
    const source = (lead.source_page as string | null) ?? "";
    const status = (lead.status as string | null) ?? "";
    const billed =
      typeof lead.bill_amount_cents === "number" && lead.bill_amount_cents > 0
        ? (lead.bill_amount_cents / 100).toFixed(2)
        : "0.00";
    const notes = (lead.advisor_notes as string | null) ?? "";

    rows.push(
      [
        csvCell(date),
        csvCell(client),
        csvCell(source),
        csvCell(status),
        csvCell(billed),
        csvCell(notes),
      ].join(",")
    );
  }

  const csvBody = rows.join("\r\n");
  const periodLabel = period === "all" ? "all-time" : period;
  const filename = `leads-${periodLabel}-${new Date().toISOString().split("T")[0]}.csv`;

  return new Response(csvBody, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
