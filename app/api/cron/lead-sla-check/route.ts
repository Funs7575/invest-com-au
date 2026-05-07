import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { ADMIN_EMAIL } from "@/lib/admin";
import { getSiteUrl } from "@/lib/url";

const log = logger("cron:lead-sla-check");

export const runtime = "nodejs";
export const maxDuration = 60;

// SLA windows per quality tier (ms)
const SLA_MS = {
  hot: 5 * 60 * 1000, // 5 min — quality_score ≥ 70
  warm: 30 * 60 * 1000, // 30 min — quality_score 40–69
  cold: 4 * 60 * 60 * 1000, // 4 h — quality_score < 40 or unscored
} as const;

type QualityTier = keyof typeof SLA_MS;

// Cron cadence: every 10 min. Each run covers a 10-min breach window
// so each lead triggers exactly one alert at the moment it first
// crosses its SLA — no repeated alerts on subsequent runs.
const WINDOW_MS = 10 * 60 * 1000;

type SlaRow = {
  id: number;
  user_name: string;
  user_email: string;
  quality_score: number | null;
  created_at: string | null;
  professional_id: number;
};

async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = Date.now();

  const breaches: Array<{ tier: QualityTier; leads: SlaRow[] }> = [];

  for (const tier of Object.keys(SLA_MS) as QualityTier[]) {
    const slaMs = SLA_MS[tier];
    // Window: leads whose SLA deadline fell in the last WINDOW_MS.
    // created_at + slaMs ∈ [now - WINDOW_MS, now]
    // ⟺ created_at ∈ [now - slaMs - WINDOW_MS, now - slaMs]
    const windowStart = new Date(now - slaMs - WINDOW_MS).toISOString();
    const windowEnd = new Date(now - slaMs).toISOString();

    let query = supabase
      .from("professional_leads")
      .select("id, user_name, user_email, quality_score, created_at, professional_id")
      .is("responded_at", null)
      .gte("created_at", windowStart)
      .lt("created_at", windowEnd);

    if (tier === "hot") {
      query = query.gte("quality_score", 70);
    } else if (tier === "warm") {
      query = query.gte("quality_score", 40).lt("quality_score", 70);
    } else {
      // cold: unscored or low quality
      query = query.or("quality_score.is.null,quality_score.lt.40");
    }

    const { data, error } = await query;

    if (error) {
      log.error("SLA query failed", { tier, error: error.message });
      continue;
    }

    if (data && data.length > 0) {
      breaches.push({ tier, leads: data as SlaRow[] });
    }
  }

  const totalBreaches = breaches.reduce((n, b) => n + b.leads.length, 0);

  if (totalBreaches === 0) {
    log.info("no SLA breaches in this window");
    return NextResponse.json({ ok: true, breaches: 0 });
  }

  log.warn("lead SLA breaches detected", {
    totalBreaches,
    breakdown: breaches.map((b) => ({ tier: b.tier, count: b.leads.length })),
  });

  // Ops alert email — fire-and-forget; a missed alert is preferable to
  // blocking the cron response. The log.warn above still surfaces in Sentry.
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const siteUrl = getSiteUrl();
    const slaLabel: Record<QualityTier, string> = { hot: "5 min", warm: "30 min", cold: "4 h" };
    const lines = breaches
      .map(({ tier, leads }) => {
        const rows = leads
          .map((l) => `  • Lead #${l.id} — ${l.user_name} <${l.user_email}> (score: ${l.quality_score ?? "unscored"})`)
          .join("\n");
        return `${tier.toUpperCase()} leads (SLA: ${slaLabel[tier]}) — ${leads.length} unresponded:\n${rows}`;
      })
      .join("\n\n");
    const subject = `[LEAD SLA] ${totalBreaches} lead${totalBreaches === 1 ? "" : "s"} past SLA threshold`;
    const text = `${lines}\n\nReview at ${siteUrl}/admin/advisors`;

    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "alerts@invest.com.au",
        to: [ADMIN_EMAIL],
        subject,
        text,
      }),
    }).catch((err: unknown) => {
      log.warn("alert email threw", { err: String(err) });
    });
  } else {
    log.warn("RESEND_API_KEY not set — alert email skipped");
  }

  return NextResponse.json({
    ok: true,
    breaches: totalBreaches,
    breakdown: breaches.map((b) => ({ tier: b.tier, count: b.leads.length })),
  });
}

export const GET = wrapCronHandler("lead-sla-check", handler);
