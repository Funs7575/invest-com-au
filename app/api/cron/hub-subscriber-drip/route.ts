import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";

const log = logger("cron:hub-subscriber-drip");

export const runtime = "nodejs";
export const maxDuration = 120;

const SITE_URL = getSiteUrl();

interface HubConfig {
  name: string;
  hubPath: string;
  resourcePath: string;
  resourceLabel: string;
  toolPath: string;
  toolLabel: string;
  advisorSpecialty: string;
}

const HUB_CONFIGS: Record<string, HubConfig> = {
  "smsf-hub": {
    name: "SMSF",
    hubPath: "/smsf",
    resourcePath: "/article/smsf-setup-guide-australia",
    resourceLabel: "SMSF Setup Guide",
    toolPath: "/smsf-calculator",
    toolLabel: "SMSF Cost Calculator",
    advisorSpecialty: "SMSF accountant",
  },
  "dividends-hub": {
    name: "Dividend Investing",
    hubPath: "/dividends",
    resourcePath: "/article/best-dividend-stocks-australia",
    resourceLabel: "Best ASX Dividend Stocks",
    toolPath: "/dividend-calculator",
    toolLabel: "Dividend Yield Calculator",
    advisorSpecialty: "financial planner",
  },
  "wholesale-hub": {
    name: "Wholesale Investing",
    hubPath: "/invest/wholesale",
    resourcePath: "/article/wholesale-investor-opportunities-australia",
    resourceLabel: "Wholesale Investor Opportunities",
    toolPath: "/compound-interest-calculator",
    toolLabel: "Compound Interest Calculator",
    advisorSpecialty: "financial planner",
  },
  "property-hub": {
    name: "Property Investing",
    hubPath: "/property",
    resourcePath: "/article/property-investment-guide-australia",
    resourceLabel: "Property Investment Guide",
    toolPath: "/mortgage-calculator",
    toolLabel: "Mortgage Repayment Calculator",
    advisorSpecialty: "buyer's agent",
  },
  "super-hub": {
    name: "Superannuation",
    hubPath: "/super",
    resourcePath: "/article/superannuation-guide-australia",
    resourceLabel: "Super Optimisation Guide",
    toolPath: "/smsf-calculator",
    toolLabel: "Super Fee Calculator",
    advisorSpecialty: "financial planner",
  },
  "insurance-hub": {
    name: "Insurance",
    hubPath: "/insurance",
    resourcePath: "/article/life-insurance-guide-australia",
    resourceLabel: "Life Insurance Guide",
    toolPath: "/calculators",
    toolLabel: "Financial Calculators",
    advisorSpecialty: "insurance adviser",
  },
  "foreign-investment-hub": {
    name: "Foreign Investment",
    hubPath: "/foreign-investment",
    resourcePath: "/article/firb-approval-guide",
    resourceLabel: "FIRB Approval Guide",
    toolPath: "/calculators",
    toolLabel: "Financial Calculators",
    advisorSpecialty: "financial planner",
  },
  "private-markets-hub": {
    name: "Private Markets",
    hubPath: "/invest/private-markets",
    resourcePath: "/article/private-equity-guide-australia",
    resourceLabel: "Private Markets Guide",
    toolPath: "/compound-interest-calculator",
    toolLabel: "Compound Interest Calculator",
    advisorSpecialty: "financial planner",
  },
  "first-home-buyer-hub": {
    name: "First Home Buying",
    hubPath: "/first-home-buyer",
    resourcePath: "/article/first-home-buyer-guide-australia",
    resourceLabel: "First Home Buyer Guide",
    toolPath: "/mortgage-calculator",
    toolLabel: "Mortgage Repayment Calculator",
    advisorSpecialty: "mortgage broker",
  },
};

const DRIP_SCHEDULE = [
  { step: 1 as const, minDays: 0, maxDays: 3 },
  { step: 2 as const, minDays: 5, maxDays: 9 },
  { step: 3 as const, minDays: 14, maxDays: 30 },
];

function buildStep1Html(hub: HubConfig, unsub: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155">
    <div style="background:#0f172a;padding:24px;border-radius:12px 12px 0 0;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">Welcome to the ${hub.name} Hub</h1>
      <p style="color:#94a3b8;margin:6px 0 0;font-size:13px">Invest.com.au — independent Australian finance</p>
    </div>
    <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
      <p style="font-size:15px;line-height:1.6">Thanks for subscribing.</p>
      <p style="font-size:14px;line-height:1.6;color:#64748b">
        You'll get hub-specific updates on ${hub.name} — research, tools, and platform comparisons. Here's a good starting point:
      </p>
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e2e8f0">
        <p style="font-size:13px;font-weight:700;color:#0f172a;margin:0 0 6px">Free resource</p>
        <a href="${SITE_URL}${hub.resourcePath}" style="color:#2563eb;font-size:14px;font-weight:600;text-decoration:none">
          ${hub.resourceLabel} →
        </a>
      </div>
      <div style="text-align:center;margin:20px 0">
        <a href="${SITE_URL}${hub.hubPath}" style="display:inline-block;padding:12px 28px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">
          Explore the ${hub.name} Hub →
        </a>
      </div>
      <p style="font-size:11px;color:#94a3b8;margin-top:24px">
        <a href="${SITE_URL}/newsletter/unsubscribe?token=${unsub}" style="color:#94a3b8">Unsubscribe</a>
      </p>
    </div>
  </div>`;
}

function buildStep2Html(hub: HubConfig, unsub: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155">
    <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
      <h1 style="color:white;margin:0;font-size:18px">${hub.name}: your free calculator is ready</h1>
    </div>
    <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
      <p style="font-size:14px;line-height:1.6;color:#64748b">
        Run the numbers on your ${hub.name.toLowerCase()} situation in under a minute:
      </p>
      <div style="text-align:center;margin:20px 0">
        <a href="${SITE_URL}${hub.toolPath}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">
          ${hub.toolLabel} →
        </a>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#64748b">Or keep reading:</p>
      <ul style="font-size:13px;color:#334155;padding-left:18px;line-height:2">
        <li><a href="${SITE_URL}${hub.resourcePath}" style="color:#2563eb">${hub.resourceLabel}</a></li>
        <li><a href="${SITE_URL}${hub.hubPath}" style="color:#2563eb">All ${hub.name} guides</a></li>
        <li><a href="${SITE_URL}/compare" style="color:#2563eb">Platform comparison table</a></li>
      </ul>
      <p style="font-size:11px;color:#94a3b8;margin-top:24px">
        <a href="${SITE_URL}/newsletter/unsubscribe?token=${unsub}" style="color:#94a3b8">Unsubscribe</a>
      </p>
    </div>
  </div>`;
}

function buildStep3Html(hub: HubConfig, unsub: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155">
    <div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">
      <h1 style="color:white;margin:0;font-size:18px">Want a personalised ${hub.name} plan?</h1>
    </div>
    <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
      <p style="font-size:14px;line-height:1.6;color:#64748b">
        Our tools give you a strong starting point, but a verified ${hub.advisorSpecialty} can tailor a plan to your exact numbers.
      </p>
      <div style="background:#faf5ff;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #e9d5ff">
        <p style="font-size:13px;font-weight:700;color:#581c87;margin:0 0 6px">Find a verified ${hub.advisorSpecialty}</p>
        <p style="font-size:13px;color:#7c3aed;margin:0 0 10px">
          All advisors are licence-verified and independently reviewed.
        </p>
        <a href="${SITE_URL}/find-advisor" style="display:inline-block;padding:10px 24px;background:#7c3aed;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:700">
          Browse Advisors →
        </a>
      </div>
      <p style="font-size:14px;line-height:1.6;color:#64748b">
        Not ready for an advisor? The <a href="${SITE_URL}${hub.hubPath}" style="color:#2563eb">${hub.name} Hub</a> has everything you need to go it alone.
      </p>
      <p style="font-size:11px;color:#94a3b8;margin-top:24px">
        This is the last email in your ${hub.name} welcome series.<br>
        <a href="${SITE_URL}/newsletter/unsubscribe?token=${unsub}" style="color:#94a3b8">Unsubscribe</a>
      </p>
    </div>
  </div>`;
}

/**
 * Daily cron — hub subscriber 3-step drip sequence.
 *
 * For each confirmed, non-unsubscribed newsletter_subscription with a
 * hub segment_slug, sends up to one drip email per run based on how
 * many days have elapsed since confirmed_at:
 *   Step 1 (Day 0–3):  Welcome + top hub resource
 *   Step 2 (Day 5–9):  Hub tool / calculator CTA
 *   Step 3 (Day 14–30): Advisor CTA + series close
 *
 * Idempotency: hub_drip_log UNIQUE (email, segment_slug, drip_step).
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date();

  const stats = { scanned: 0, sent: 0, skipped: 0, errors: 0 };

  // ── 1. Fetch confirmed, active hub subscriptions ──
  const { data: subs, error: subErr } = await supabase
    .from("newsletter_subscriptions")
    .select("email, segment_slug, confirmed_at, unsubscribe_token")
    .eq("confirmed", true)
    .is("unsubscribed_at", null)
    .not("segment_slug", "is", null)
    .not("confirmed_at", "is", null);

  if (subErr) {
    log.error("Failed to fetch hub subscriptions", { error: subErr.message });
    return NextResponse.json({ error: subErr.message }, { status: 500 });
  }
  if (!subs || subs.length === 0) {
    return NextResponse.json({ ...stats, message: "No confirmed hub subscribers" });
  }

  // ── 2. Fetch existing drip log entries ──
  const { data: logRows } = await supabase
    .from("hub_drip_log")
    .select("email, segment_slug, drip_step");

  const sentSet = new Set<string>(
    (logRows || []).map(
      (r: { email: string; segment_slug: string; drip_step: number }) =>
        `${r.email}:${r.segment_slug}:${r.drip_step}`
    )
  );

  // ── 3. Process each subscription ──
  for (const sub of subs) {
    stats.scanned++;

    const segSlug = sub.segment_slug as string;
    const hub = HUB_CONFIGS[segSlug];
    if (!hub) {
      stats.skipped++;
      continue;
    }

    const confirmedAt = new Date(sub.confirmed_at as string);
    const daysSince = Math.floor((now.getTime() - confirmedAt.getTime()) / 86400000);

    let stepToSend: 1 | 2 | 3 | null = null;
    for (const s of DRIP_SCHEDULE) {
      if (daysSince < s.minDays || daysSince > s.maxDays) continue;
      const key = `${sub.email}:${segSlug}:${s.step}`;
      if (sentSet.has(key)) continue;
      stepToSend = s.step;
      break;
    }

    if (!stepToSend) {
      stats.skipped++;
      continue;
    }

    const unsub = sub.unsubscribe_token as string;
    const subjects: Record<number, string> = {
      1: `Welcome to the ${hub.name} Hub — your free resource`,
      2: `${hub.name}: ${hub.toolLabel}`,
      3: `Want a personalised ${hub.name} plan?`,
    };
    const htmlBuilders: Record<number, () => string> = {
      1: () => buildStep1Html(hub, unsub),
      2: () => buildStep2Html(hub, unsub),
      3: () => buildStep3Html(hub, unsub),
    };

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Invest.com.au <hello@invest.com.au>",
          to: sub.email,
          subject: subjects[stepToSend],
          html: htmlBuilders[stepToSend](),
        }),
      });

      if (res.ok) {
        await supabase.from("hub_drip_log").insert({
          email: sub.email,
          segment_slug: segSlug,
          drip_step: stepToSend,
        });
        sentSet.add(`${sub.email}:${segSlug}:${stepToSend}`);
        stats.sent++;
      } else {
        log.warn("Resend API error", {
          status: res.status,
          email: sub.email,
          segment: segSlug,
          step: stepToSend,
        });
        stats.errors++;
      }
    } catch (err) {
      log.warn("Hub drip send failed", {
        err: err instanceof Error ? err.message : String(err),
        email: sub.email,
        segment: segSlug,
        step: stepToSend,
      });
      stats.errors++;
    }
  }

  log.info("Hub subscriber drip complete", stats);
  return NextResponse.json({ ...stats, timestamp: now.toISOString() });
}
