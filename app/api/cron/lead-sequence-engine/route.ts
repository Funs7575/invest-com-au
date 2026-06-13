import { NextRequest, NextResponse } from "next/server";

import { requireCronAuth } from "@/lib/cron-auth";
import { runSequenceEngine } from "@/lib/advisor-portal/sequence-engine";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

const log = logger("cron:lead-sequence-engine");

// Adviser Follow-Up Autopilot send engine (idea #14).
//
// Advances due sequence enrolments (one email per due step, suppression-checked
// with the adviser's reply-to) and, once per day, sends each adviser their
// "tasks due today" digest. Folded into ONE cron per spec.
//
// Cadence: registered in CRON_GROUPS["hourly-15"] (alongside the other
// marketplace automation sweeps). Hourly gives sub-day send latency — a lead
// enrolled at 2pm for a day-0 intro goes out within the hour, not next morning.
// Safe to run hourly because: steps are day-offset (so "due" only flips once
// per day per step), and the ≤1-send-per-lead-per-day cap (last_sent_at) plus
// per-step current_step advancement make re-runs within a day idempotent. The
// daily due-task digest self-gates to a single UTC hour inside the engine.
//
// Dormant behind the `lead_sequences` flag (fail-closed): flag off ⇒ the engine
// no-ops without touching any table, so it never 500s even if the tables are
// absent.

export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const startedAt = new Date().toISOString();

  try {
    const { flagEnabled, engine, digest } = await runSequenceEngine();

    if (!flagEnabled) {
      log.info("lead-sequence-engine: flag off, no-op");
      return NextResponse.json({ startedAt, status: "flag_off" });
    }

    log.info("lead-sequence-engine complete", {
      considered: engine?.enrolmentsConsidered ?? 0,
      sent: engine?.sent ?? 0,
      completed: engine?.completed ?? 0,
      suppressed: engine?.skippedSuppressed ?? 0,
      capped: engine?.skippedCapped ?? 0,
      failures: engine?.failures ?? 0,
      digestsSent: digest?.digestsSent ?? 0,
    });

    return NextResponse.json({ startedAt, engine, digest });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("lead-sequence-engine failed", { err: message });
    return NextResponse.json({ startedAt, error: message }, { status: 500 });
  }
}
