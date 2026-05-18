// GET /api/firm-portal/billing/summary
//
// Returns the firm-level credit balance aggregate + per-member breakdown
// for the calling firm admin. Powers the /firm-portal/billing dashboard
// refresh action (the page itself fetches via the server component, but
// the client polls this route for fresh balances after a top-up).
//
// Auth: requires an authenticated advisor with is_firm_admin = true. The
// resolveFirmAdminContext helper returns null otherwise → 403 here.
//
// Rate-limit: 30 / minute / IP. Refresh-button bursts are bounded.

import { NextRequest, NextResponse } from "next/server";

import { getFirmBillingSummary, resolveFirmAdminContext } from "@/lib/firm-billing";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("firm-portal:billing-summary");

export async function GET(request: NextRequest) {
  if (
    !(await isAllowed("firm_portal_billing_summary", ipKey(request), {
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

  const context = await resolveFirmAdminContext(advisorId);
  if (!context) {
    return NextResponse.json(
      { error: "Firm admin access required." },
      { status: 403 },
    );
  }

  try {
    const summary = await getFirmBillingSummary(context.firmId);
    if (!summary) {
      return NextResponse.json({ error: "Firm not found." }, { status: 404 });
    }
    return NextResponse.json({ summary });
  } catch (err) {
    log.error("summary load failed", {
      advisorId,
      firmId: context.firmId,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not load firm billing summary." },
      { status: 500 },
    );
  }
}
