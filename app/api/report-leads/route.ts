import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("report-leads");

/**
 * POST /api/report-leads
 *
 * Gated-report email capture. Client sends { report_slug, email, name }.
 * Response includes the report_url so the frontend can redirect the
 * user directly to the PDF.
 *
 * Rate-limited. Inserts a row into developer_leads with report_slug
 * populated and a sensible default investor_type.
 */

const ReportLeadBody = z.object({
  report_slug: z.string().min(1).max(200),
  email: z.string().email(),
  name: z.string().min(2).max(120),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`report-leads:${ip}`, 10, 10)) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const bodyResult = ReportLeadBody.safeParse(rawBody);
  if (!bodyResult.success) {
    const field = bodyResult.error.issues[0]?.path[0] as string | undefined;
    const errorMsg =
      field === "report_slug" ? "Invalid report_slug"
      : field === "email" ? "Invalid email"
      : field === "name" ? "Invalid name"
      : "Invalid request";
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }

  const { report_slug, email, name } = bodyResult.data;

  try {
    const supabase = createAdminClient();

    // Look up the report so we can return the report_url on success.
    // This also validates the slug against our published catalog.
    const { data: report, error: reportErr } = await supabase
      .from("sector_reports")
      .select("slug, report_url, gated, status")
      .eq("slug", report_slug)
      .maybeSingle();

    if (reportErr || !report) {
      return NextResponse.json(
        { success: false, error: "Unknown report" },
        { status: 404 },
      );
    }

    // Record the lead even for ungated reports — gives us attribution.
    const { error: insertErr } = await supabase.from("developer_leads").insert({
      report_slug,
      full_name: name,
      email,
      investor_type: "retail",
    });
    if (insertErr) {
      log.error("insert_failed", { error: insertErr.message });
      return NextResponse.json(
        { success: false, error: "Database error" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      report_url: report.report_url as string | null,
    });
  } catch (err) {
    log.error("unexpected_error", { err: String(err) });
    return NextResponse.json(
      { success: false, error: "Unexpected error" },
      { status: 500 },
    );
  }
}
