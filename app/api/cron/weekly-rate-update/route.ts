import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { notificationFooter } from "@/lib/email-templates";

const log = logger("cron-weekly-rate-update");

export const runtime = "edge";
export const maxDuration = 30;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";

const CALCULATOR_SOURCES = [
  "savings-calculator",
  "switching_calculator",
  "portfolio-calculator",
] as const;

type CalculatorSource = (typeof CALCULATOR_SOURCES)[number];

const SOURCE_CONFIG: Record<
  CalculatorSource,
  { headline: string; cta: string; path: string }
> = {
  "savings-calculator": {
    headline: "Savings rates have moved — is your account still the best?",
    cta: "Recalculate Your Savings",
    path: "/savings-calculator",
  },
  switching_calculator: {
    headline:
      "Broker fees have been updated — are you still overpaying?",
    cta: "Recalculate Switching Costs",
    path: "/switching-calculator",
  },
  "portfolio-calculator": {
    headline:
      "Platform fees have changed — check your portfolio costs",
    cta: "Recalculate Portfolio Fees",
    path: "/portfolio-calculator",
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function buildPersonalLine(
  source: CalculatorSource,
  context: Record<string, unknown> | null,
): string {
  if (!context) return "";

  if (source === "savings-calculator" && typeof context.balance === "number") {
    return `You previously checked your ${formatCurrency(context.balance)} balance — let's see if a better rate is available now.`;
  }
  if (
    source === "switching_calculator" &&
    typeof context.currentBroker === "string"
  ) {
    return `You were comparing costs from ${context.currentBroker} — fees may have shifted since then.`;
  }
  if (
    source === "portfolio-calculator" &&
    typeof context.portfolioValue === "number"
  ) {
    return `You checked costs on a ${formatCurrency(context.portfolioValue)} portfolio — updated fees could change the picture.`;
  }
  return "";
}

function buildEmailHtml(
  firstName: string,
  source: CalculatorSource,
  context: Record<string, unknown> | null,
  email: string,
): string {
  const config = SOURCE_CONFIG[source];
  const personalLine = buildPersonalLine(source, context);

  return `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#0f172a;font-size:18px">${config.headline}</h2>
      <p style="color:#475569;font-size:14px;line-height:1.6">
        Hi ${firstName},
      </p>
      ${
        personalLine
          ? `<p style="color:#475569;font-size:14px;line-height:1.6">${personalLine}</p>`
          : ""
      }
      <p style="color:#475569;font-size:14px;line-height:1.6">
        Rates and fees across Australian platforms are updated regularly.
        Since your last visit, some numbers have changed — it's worth running your calculation again to make sure you're still getting the best deal.
      </p>
      <div style="text-align:center;margin:24px 0">
        <a href="${SITE_URL}${config.path}" style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">
          ${config.cta} &rarr;
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
      <div style="background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e2e8f0">
        <p style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 6px">Want personalised guidance?</p>
        <p style="font-size:13px;color:#64748b;margin:0 0 10px">Talk to a verified financial advisor who can review your situation for free.</p>
        <a href="${SITE_URL}/find-advisor" style="color:#7c3aed;font-size:13px;font-weight:600;text-decoration:none">
          Talk to an Advisor &rarr;
        </a>
      </div>
      ${notificationFooter(email)}
    </div>
  `;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return NextResponse.json({ error: "No RESEND_API_KEY" }, { status: 500 });
  }

  const supabase = createAdminClient();

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 86400000,
  ).toISOString();

  // Fetch calculator email captures older than 7 days
  const { data: captures, error: captureErr } = await supabase
    .from("email_captures")
    .select("id, email, name, source, context, created_at")
    .in("source", [...CALCULATOR_SOURCES])
    .lte("created_at", sevenDaysAgo)
    .order("created_at", { ascending: true })
    .limit(100);

  if (captureErr) {
    log.error("Failed to fetch email captures", { error: captureErr.message });
    return NextResponse.json(
      { error: "DB query failed" },
      { status: 500 },
    );
  }

  if (!captures || captures.length === 0) {
    return NextResponse.json({ sent: 0, checked: 0, message: "No eligible captures" });
  }

  const captureIds = captures.map((c) => c.id);

  // Check which have already been sent in the last 7 days
  const { data: recentLogs } = await supabase
    .from("weekly_rate_drip_log")
    .select("email_capture_id")
    .in("email_capture_id", captureIds)
    .gte("sent_at", sevenDaysAgo);

  const alreadySent = new Set(
    (recentLogs || []).map((l) => l.email_capture_id),
  );

  let sent = 0;
  let skipped = 0;

  for (const capture of captures) {
    if (alreadySent.has(capture.id)) {
      skipped++;
      continue;
    }

    const source = capture.source as CalculatorSource;
    if (!SOURCE_CONFIG[source]) {
      skipped++;
      continue;
    }

    const firstName =
      capture.name?.split(" ")[0] || "there";
    const context = (capture.context as Record<string, unknown>) || null;

    const subject = `${firstName}, rates have changed — check your numbers again`;
    const html = buildEmailHtml(firstName, source, context, capture.email);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "Invest.com.au <hello@invest.com.au>",
          to: capture.email,
          subject,
          html,
        }),
      });

      if (res.ok) {
        await supabase.from("weekly_rate_drip_log").insert({
          email_capture_id: capture.id,
          sent_at: new Date().toISOString(),
        });
        sent++;
      } else {
        log.error("Resend API error", {
          captureId: capture.id,
          status: res.status,
        });
      }
    } catch (e) {
      log.error("Weekly rate email failed", {
        captureId: capture.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    sent,
    skipped,
    checked: captures.length,
    timestamp: new Date().toISOString(),
  });
}
