import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validate-email";
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

interface Payload {
  report_slug: string;
  email: string;
  name: string;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`report-leads:${ip}`, 10, 10)) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429 },
    );
  }

  let body: Partial<Payload>;
  try {
    body = (await req.json()) as Partial<Payload>;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const report_slug = typeof body.report_slug === "string" ? body.report_slug.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!report_slug || report_slug.length > 200) {
    return NextResponse.json(
      { success: false, error: "Invalid report_slug" },
      { status: 400 },
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { success: false, error: "Invalid email" },
      { status: 400 },
    );
  }
  if (!name || name.length < 2 || name.length > 120) {
    return NextResponse.json(
      { success: false, error: "Invalid name" },
      { status: 400 },
    );
  }

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
