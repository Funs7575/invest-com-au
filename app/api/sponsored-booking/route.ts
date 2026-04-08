import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/html-escape";
import { isRateLimited } from "@/lib/rate-limit";
import { ADMIN_EMAIL } from "@/lib/admin";
import { logger } from "@/lib/logger";

const log = logger("sponsored-booking");

const VALID_PACKAGES = [
  "sponsored-article",
  "calculator-sponsorship",
  "directory-feature",
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, phone, package: pkg, message } = body;

    // Rate limit
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`sponsored-booking:${ip}`, 5, 5)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Validate required fields
    if (!name || !email || !company || !pkg) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, company, and package are required." },
        { status: 400 }
      );
    }

    if (!VALID_PACKAGES.includes(pkg)) {
      return NextResponse.json(
        { error: "Invalid package selection." },
        { status: 400 }
      );
    }

    // Send notification email to admin
    const packageLabel = pkg
      .split("-")
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `New Sponsored Content Booking: ${packageLabel} — ${company}`,
      from: "Invest.com.au <hello@invest.com.au>",
      html: `
        <h2>New Sponsored Content Booking Request</h2>
        <table style="border-collapse:collapse;width:100%;max-width:500px;">
          <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;">Package</td><td style="padding:8px 12px;">${escapeHtml(packageLabel)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;">Name</td><td style="padding:8px 12px;">${escapeHtml(name)}</td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;">Email</td><td style="padding:8px 12px;"><a href="mailto:${encodeURIComponent(email)}">${escapeHtml(email)}</a></td></tr>
          <tr><td style="padding:8px 12px;font-weight:bold;color:#475569;">Company</td><td style="padding:8px 12px;">${escapeHtml(company)}</td></tr>
          ${phone ? `<tr><td style="padding:8px 12px;font-weight:bold;color:#475569;">Phone</td><td style="padding:8px 12px;">${escapeHtml(phone)}</td></tr>` : ""}
          ${message ? `<tr><td style="padding:8px 12px;font-weight:bold;color:#475569;">Message</td><td style="padding:8px 12px;">${escapeHtml(message)}</td></tr>` : ""}
        </table>
        <p style="margin-top:16px;color:#94a3b8;font-size:12px;">This booking was submitted via the Invest.com.au sponsored content page.</p>
      `,
    });

    log.info("Sponsored booking submitted", { package: pkg, company });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Sponsored booking error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to submit booking request" },
      { status: 500 }
    );
  }
}
