import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { getAdminEmails } from "@/lib/admin";
import { logger } from "@/lib/logger";
import { escapeHtml } from "@/lib/html-escape";

const log = logger("broker-outreach");

/**
 * POST /api/broker-outreach
 *
 * Admin-only. Sends a cold-pitch email to a broker contact introducing
 * invest.com.au's Featured Partner placement flow. Tracks sends in
 * broker_outreach_log so repeats to the same address can be spotted.
 *
 * This pairs with the self-serve booking flow at
 * /advertise/featured-placement — the email's primary CTA links there
 * so a recipient who's interested can book + pay without a sales call.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (
      authErr ||
      !user ||
      !getAdminEmails().includes(user.email?.toLowerCase() || "")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`broker_outreach:${ip}`, 10, 60)) {
      return NextResponse.json(
        { error: "Too many requests. Slow down." },
        { status: 429 },
      );
    }

    // eslint-disable-next-line invest/no-unvalidated-req-json -- pre-existing; Zod backfill is E-04 stream territory, out of scope for SSOT cleanup PR
    const body = await request.json();
    const {
      to_email,
      to_name,
      broker_name,
      broker_slug,
    } = body as {
      to_email?: string;
      to_name?: string;
      broker_name?: string;
      broker_slug?: string;
    };

    if (!to_email || !to_name || !broker_name) {
      return NextResponse.json(
        { error: "to_email, to_name, broker_name required" },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to_email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: "Email not configured" }, { status: 500 });
    }

    const firstName = to_name.split(" ")[0];
    const html = buildHtml({ firstName, brokerName: broker_name, brokerSlug: broker_slug });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Invest.com.au <hello@invest.com.au>",
        to: to_email,
        subject: `${broker_name}: tiered placement on invest.com.au (A$500/30d)`,
        html,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      log.error("resend_non_ok", { status: res.status, text: text.slice(0, 300) });
      return NextResponse.json({ error: "Email send failed" }, { status: 502 });
    }

    // Log the send so we can spot duplicates + track outreach pace.
    // Table defined by the paired migration. Fire-and-forget: the
    // email has already shipped by this point.
    await supabase.from("broker_outreach_log").insert({
      broker_slug: broker_slug ?? null,
      broker_name,
      contact_name: to_name,
      contact_email: to_email,
      sent_by: user.email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("handler_error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}

function buildHtml({
  firstName,
  brokerName,
  brokerSlug,
}: {
  firstName: string;
  brokerName: string;
  brokerSlug?: string;
}): string {
  const reviewUrl = brokerSlug
    ? `https://invest.com.au/broker/${brokerSlug}`
    : "https://invest.com.au/brokers";
  const bookUrl = "https://invest.com.au/advertise/featured-placement";
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
    <div style="background: #0f172a; padding: 22px 28px; border-radius: 12px 12px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 20px;">Invest.com.au</h1>
      <p style="color: #94a3b8; margin: 4px 0 0; font-size: 12px;">Australia's independent investing hub</p>
    </div>
    <div style="background: #f8fafc; padding: 28px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
      <p style="font-size: 15px; line-height: 1.6;">Hi ${firstName},</p>
      <p style="font-size: 15px; line-height: 1.6;">
        I'm reaching out because <strong>${escapeHtml(brokerName)}</strong> appears in our comparison index
        at <a href="${reviewUrl}" style="color: #2563eb;">${reviewUrl.replace(/^https?:\/\//, "")}</a>,
        and we've just opened up tiered Featured Partner placements to brokers who want priority
        visibility on high-intent comparison pages.
      </p>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin: 18px 0;">
        <h2 style="font-size: 15px; margin: 0 0 10px; color: #0f172a;">What's on offer</h2>
        <ul style="font-size: 14px; line-height: 1.65; padding-left: 20px; margin: 0;">
          <li><strong>Featured Partner</strong> — 30 days from A$500 / 90 days from A$1,350</li>
          <li><strong>Editor's Pick</strong> — top-of-list slot across the whole vertical</li>
          <li><strong>Deal of the Month</strong> — homepage hero + deal-ribbon treatment</li>
        </ul>
        <p style="font-size: 13px; margin: 10px 0 0; color: #64748b;">
          Clear editorial labelling on every slot. Transparent pricing. No contracts — month-to-month, self-serve via Stripe.
        </p>
      </div>
      <h2 style="font-size: 15px; margin: 18px 0 8px; color: #0f172a;">Who sees our comparison pages</h2>
      <p style="font-size: 14px; line-height: 1.6;">
        High-intent Australian investors actively comparing brokers before opening an account.
        We don't rank on hype — our ranking logic is published at
        <a href="https://invest.com.au/methodology" style="color: #2563eb;">invest.com.au/methodology</a>,
        so editorial integrity is already baked in.
      </p>
      <div style="text-align: center; margin: 22px 0;">
        <a href="${bookUrl}" style="display: inline-block; padding: 12px 26px; background: #f59e0b; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 700;">See pricing + book a slot →</a>
      </div>
      <p style="font-size: 13px; line-height: 1.6; color: #64748b;">
        Worth a 10-minute call instead? Reply here and I'll send a time.
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #94a3b8;">
        If this isn't relevant — no worries, please ignore this email. We won't follow up.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 22px 0;" />
      <p style="font-size: 11px; color: #94a3b8; line-height: 1.55;">
        Invest.com.au · Independent investing education &amp; comparison<br>
        Reply-to address: <a href="mailto:partnerships@invest.com.au" style="color: #64748b;">partnerships@invest.com.au</a>
      </p>
    </div>
  </div>`;
}
