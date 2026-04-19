import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

const log = logger("report-download");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/report-download
 *
 * Captures an email address for the annual report download.
 * In production, this would trigger an email with the PDF attachment.
 *
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  if (!(await isAllowed("report_download_post", ipKey(request), { max: 10, refillPerSec: 0.05 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email } = body as { email: string };

    if (!email || !email.includes("@") || email.length > 320) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 }
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Upsert to avoid duplicate entries for the same email
    const { error } = await supabase
      .from("email_captures")
      .upsert(
        {
          email: email.toLowerCase().trim(),
          source: "annual_report",
          captured_at: new Date().toISOString(),
        },
        { onConflict: "email,source" }
      );

    if (error) {
      log.error("Email capture error:", error.message);
      // Don't expose internal errors — still return success to the user
      // so they get a good UX even if storage fails
    }

    // In production: trigger email send via Resend/SendGrid/SES here
    // await sendReportEmail(email);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
