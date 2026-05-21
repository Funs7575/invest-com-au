import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { computeLeadBenchmark } from "@/lib/advisor/lead-benchmark";

export const runtime = "nodejs";

const log = logger("advisor:lead-benchmark");

const WINDOW_DAYS = 90;

/**
 * GET /api/advisor-portal/lead-quality-benchmark
 *
 * Returns the same-type peer-group lead-quality aggregate (accept + conversion
 * rate) so the authed advisor can benchmark themselves. Aggregate-only and
 * gated by MIN_PEERS / MIN_PEER_LEADS (see lib/advisor/lead-benchmark.ts) — no
 * individual competitor's data is exposed. Service-role is required: this is a
 * cross-advisor aggregate that can't be scoped to the caller's auth.uid().
 */
export async function GET(request: NextRequest) {
  try {
    if (
      !(await isAllowed("lead_quality_benchmark", ipKey(request), {
        max: 30,
        refillPerSec: 0.5,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: me } = await admin
      .from("professionals")
      .select("id, type")
      .eq("id", advisorId)
      .maybeSingle();

    const advisorType = (me?.type as string | null) ?? null;
    if (!advisorType) {
      return NextResponse.json(computeLeadBenchmark({
        advisorType: null,
        peerCount: 0,
        peerLeadStatuses: [],
        windowDays: WINDOW_DAYS,
      }));
    }

    // Same-type active peers, excluding the caller.
    const { data: peers } = await admin
      .from("professionals")
      .select("id")
      .eq("type", advisorType)
      .eq("status", "active")
      .neq("id", advisorId);
    const peerIds = (peers ?? []).map((p) => p.id as number);

    let peerLeadStatuses: string[] = [];
    if (peerIds.length > 0) {
      const since = new Date(Date.now() - WINDOW_DAYS * 86400_000).toISOString();
      const { data: peerLeads } = await admin
        .from("professional_leads")
        .select("status")
        .in("professional_id", peerIds)
        .gte("created_at", since)
        .limit(20000);
      peerLeadStatuses = (peerLeads ?? []).map((l) => l.status as string);
    }

    return NextResponse.json(
      computeLeadBenchmark({
        advisorType,
        peerCount: peerIds.length,
        peerLeadStatuses,
        windowDays: WINDOW_DAYS,
      }),
    );
  } catch (err) {
    log.error("benchmark error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to load benchmark." },
      { status: 500 },
    );
  }
}
