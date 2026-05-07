import { NextRequest, NextResponse } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { wrapCronHandler } from "@/lib/cron-run-log";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { ADMIN_EMAIL } from "@/lib/admin";
import { getSiteUrl } from "@/lib/url";

const log = logger("cron:hub-silence-check");

export const runtime = "nodejs";
export const maxDuration = 60;

// Per-hub silence thresholds (hours). Busy hubs alert sooner.
const SILENCE_HOURS: Record<string, number> = {
  financial_planner: 2,
  mortgage_broker: 2,
  property_advisor: 4,
  buyers_agent: 4,
  tax_agent: 6,
  smsf_accountant: 6,
};
const DEFAULT_SILENCE_HOURS = 8;

// Cron cadence: 1h. Each run covers a 1h window so each silence episode
// triggers exactly one alert the first time it crosses its threshold.
const WINDOW_H = 1;
const WINDOW_MS = WINDOW_H * 3600 * 1000;

// Lookback must cover the widest threshold + window so we can detect the
// boundary crossing client-side. Hubs silent longer than this are outside
// the detection window and won't generate duplicate re-alerts.
const LOOKBACK_H = DEFAULT_SILENCE_HOURS + WINDOW_H + 1; // 10 h

// Returns true during AEST business hours (Mon–Fri 09:00–17:00 UTC+10).
// Uses a fixed UTC+10 offset — does not account for AEDT daylight saving.
export function isBusinessHoursAest(now: Date): boolean {
  const aestMs = now.getTime() + 10 * 60 * 60 * 1000;
  const aest = new Date(aestMs);
  const dow = aest.getUTCDay(); // 0=Sun 6=Sat
  const hour = aest.getUTCHours();
  return dow >= 1 && dow <= 5 && hour >= 9 && hour < 17;
}

type SilencedHub = { hubType: string; thresholdH: number; lastLeadAt: Date };

async function handler(req: NextRequest): Promise<NextResponse> {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const now = new Date();
  const nowMs = now.getTime();

  if (!isBusinessHoursAest(now)) {
    log.info("hub silence check skipped — outside AEST business hours");
    return NextResponse.json({ ok: true, skipped: "outside business hours" });
  }

  const supabase = createAdminClient();

  // Step 1: load active professional IDs grouped by hub type
  const { data: profs, error: profsError } = await supabase
    .from("professionals")
    .select("id, type")
    .eq("status", "active")
    .not("type", "is", null);

  if (profsError) {
    log.error("professionals query failed", { error: profsError.message });
    return NextResponse.json({ ok: false, error: profsError.message }, { status: 500 });
  }

  const profTypeMap: Record<number, string> = {};
  const hubToProfIds: Record<string, number[]> = {};
  for (const p of profs ?? []) {
    if (!p.type) continue;
    profTypeMap[p.id] = p.type;
    (hubToProfIds[p.type] ??= []).push(p.id);
  }

  const hubTypes = Object.keys(hubToProfIds);
  if (hubTypes.length === 0) {
    log.info("no active professionals found");
    return NextResponse.json({ ok: true, hubs: 0, silenced: 0 });
  }

  // Step 2: fetch all leads in the lookback window across all hub professional IDs
  const since = new Date(nowMs - LOOKBACK_H * 3600 * 1000).toISOString();
  const allProfIds = Object.keys(profTypeMap).map(Number);

  const { data: recentLeads, error: leadsError } = await supabase
    .from("professional_leads")
    .select("professional_id, created_at")
    .in("professional_id", allProfIds)
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (leadsError) {
    log.error("leads query failed", { error: leadsError.message });
    return NextResponse.json({ ok: false, error: leadsError.message }, { status: 500 });
  }

  // Build most-recent lead timestamp per hub
  const lastLeadByHub: Record<string, Date> = {};
  for (const lead of recentLeads ?? []) {
    const hubType = profTypeMap[lead.professional_id];
    if (!hubType || !lead.created_at) continue;
    const d = new Date(lead.created_at);
    if (!lastLeadByHub[hubType] || d > lastLeadByHub[hubType]!) {
      lastLeadByHub[hubType] = d;
    }
  }

  // Step 3: detect hubs whose silence just crossed the threshold this run
  const silenced: SilencedHub[] = [];

  for (const hubType of hubTypes) {
    const thresholdH = SILENCE_HOURS[hubType] ?? DEFAULT_SILENCE_HOURS;
    const thresholdMs = thresholdH * 3600 * 1000;
    const lastLead = lastLeadByHub[hubType];

    if (!lastLead) {
      // No lead in the lookback window — silence exceeds the detection range.
      // Skip to avoid duplicate alerts for long-running silences.
      continue;
    }

    const silenceMs = nowMs - lastLead.getTime();
    // Alert only when silence enters the threshold window to fire once per episode.
    if (silenceMs >= thresholdMs && silenceMs < thresholdMs + WINDOW_MS) {
      silenced.push({ hubType, thresholdH, lastLeadAt: lastLead });
    }
  }

  if (silenced.length === 0) {
    log.info("no hub silence detected", { hubs: hubTypes.length });
    return NextResponse.json({ ok: true, hubs: hubTypes.length, silenced: 0 });
  }

  log.warn("hub silence detected", {
    count: silenced.length,
    hubs: silenced.map((s) => ({ hub: s.hubType, threshold: `${s.thresholdH}h` })),
  });

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const siteUrl = getSiteUrl();
    const lines = silenced
      .map(
        (s) =>
          `  • ${s.hubType} — silent for ${s.thresholdH}h+ (last lead: ${s.lastLeadAt.toUTCString()})`,
      )
      .join("\n");
    const subject = `[HUB SILENCE] ${silenced.length} hub${silenced.length === 1 ? "" : "s"} exceeded silence threshold`;
    const text = `The following hubs have received no new leads beyond their silence threshold:\n\n${lines}\n\nCheck forms and routing at ${siteUrl}/admin/advisors`;

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
    hubs: hubTypes.length,
    silenced: silenced.length,
    breakdown: silenced.map((s) => ({ hub: s.hubType, threshold: `${s.thresholdH}h` })),
  });
}

export const GET = wrapCronHandler("hub-silence-check", handler);
