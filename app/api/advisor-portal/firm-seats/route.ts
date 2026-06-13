/**
 * GET  /api/advisor-portal/firm-seats   — seat-billing status (for the UI)
 * POST /api/advisor-portal/firm-seats   — start/expand the per-seat subscription
 *
 * Self-serve per-seat billing for firms (Lead-Ops #13). Firm-admins only.
 *
 * DORMANT by default: when `firm_seat_billing` is off OR Stripe env is unset,
 *   - GET returns { available:false } so the firm tab shows the existing
 *     "contact us" / manual seat-request path, and
 *   - POST returns 409 { fallback:"manual" } — the client then falls back to
 *     the manual /api/advisor-auth/firm/seat-request flow (unchanged).
 *
 * When live, POST returns a Stripe Checkout URL for a quantity-based
 * subscription (quantity = requested seats). The webhook syncs the result
 * onto advisor_firms.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import {
  resolveFirmAdminContext,
  getSeatBillingStatus,
  createSeatSubscriptionCheckout,
} from "@/lib/firm-billing";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:advisor-portal:firm-seats");

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (
    !(await isAllowed("advisor_firm_seats_get", ipKey(request), {
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

  const status = await getSeatBillingStatus();
  // Only surface availability — never leak whether the gap is flag vs env.
  return NextResponse.json({ available: status.available });
}

const PostBody = z.object({
  seats: z.number().int().min(1).max(200),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (
    !(await isAllowed("advisor_firm_seats_post", ipKey(request), {
      max: 10,
      refillPerSec: 10 / 3600,
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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = PostBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  const outcome = await createSeatSubscriptionCheckout({
    firmId: context.firmId,
    seats: parsed.data.seats,
  });

  if ("unavailable" in outcome) {
    if (outcome.reason === "dormant") {
      // Billing is off / unconfigured → tell the client to use the manual
      // seat-request flow (the existing "contact us" path).
      return NextResponse.json(
        { fallback: "manual", error: "Self-serve seat billing is not enabled." },
        { status: 409 },
      );
    }
    if (outcome.reason === "no_customer" || outcome.reason === "no_admin") {
      return NextResponse.json(
        { error: "No firm billing contact available yet." },
        { status: 409 },
      );
    }
    // stripe misconfig
    return NextResponse.json(
      { error: "Billing is temporarily unavailable." },
      { status: 503 },
    );
  }

  log.info("firm seat checkout initiated", {
    firmId: context.firmId,
    seats: parsed.data.seats,
  });
  return NextResponse.json({ url: outcome.url });
}
