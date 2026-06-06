// Netlify Scheduled Function — interim cron bridge while production runs on the
// Netlify mirror and Vercel Cron is parked (see netlify.toml header).
//
// The 40 schedules live only in vercel.json and stopped firing when prod moved
// off Vercel (cron fleet dark since 2026-05-23 — docs/audits/CRON-HEALTH). This
// ticks every minute, finds the vercel.json crons due "now", and calls the same
// /api/cron/dispatch/<group> routes they already target — reusing 100% of the
// existing cron logic (each is requireCronAuth-gated; we send the Bearer).
//
// SAFE BY DEFAULT: does nothing unless CRON_BRIDGE_ENABLED === "true" in the
// Netlify env. Flip it on deliberately. It only dispatches jobs DUE at the
// current tick — cron never backfills missed runs, so enabling resumes the
// normal forward cadence (no 13-day catch-up flood).
//
// Retire this once Vercel is unparked (Vercel Cron resumes from vercel.json).

import { cronMatches } from "../../lib/cron-match.ts";
import vercelConfig from "../../vercel.json" with { type: "json" };

type CronEntry = { path: string; schedule: string };

export default async function handler(): Promise<Response> {
  if (process.env.CRON_BRIDGE_ENABLED !== "true") {
    return new Response("cron bridge disabled", { status: 200 });
  }
  const secret = process.env.CRON_SECRET;
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  if (!secret || !base) {
    return new Response("missing CRON_SECRET or site URL", { status: 500 });
  }

  const now = new Date();
  const crons = (vercelConfig as { crons?: CronEntry[] }).crons ?? [];
  const due = crons.filter((c) => cronMatches(c.schedule, now));

  const results = await Promise.allSettled(
    due.map((c) =>
      fetch(`${base}${c.path}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
      }),
    ),
  );

  const ok = results.filter((r) => r.status === "fulfilled").length;
  return new Response(`dispatched ${ok}/${due.length} due jobs`, { status: 200 });
}

export const config = { schedule: "* * * * *" };
