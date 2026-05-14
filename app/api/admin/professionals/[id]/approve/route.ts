/**
 * POST /api/admin/professionals/[id]/approve
 *
 * One-click verification approval for a pending provider. Flips
 * verification_status to 'verified', accepts_briefs to true, status to
 * 'active', stamps verified_at, optionally grants starter credits, and
 * fires the pro-approved email.
 *
 * Admin-only — guarded by requireAdmin() (cookie session must belong to
 * an email in ADMIN_EMAILS). IP rate-limited as a defence-in-depth even
 * though admin sessions are already MFA-gated via the proxy.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { sendProApproved } from "@/lib/pro-onboarding-emails";
import {
  STARTER_FREE_CREDITS,
  STARTER_CREDIT_CENTS_PER_CREDIT,
} from "@/lib/pro-onboarding";
import { logger } from "@/lib/logger";

const log = logger("api:admin:pros-approve");

export const runtime = "nodejs";

const Body = z.object({
  // Default true — admin can override to skip the credit grant for low-trust
  // approvals (e.g. recovered rejected account).
  grant_starter_credits: z.boolean().default(true),
  notes: z.string().trim().max(500).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

async function handlePost(
  request: NextRequest,
  body: z.infer<typeof Body>,
  context: RouteContext,
): Promise<NextResponse> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  if (
    !(await isAllowed("admin_pros_approve", ipKey(request), {
      max: 60,
      refillPerSec: 60 / 3600,
    }))
  ) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const { id: rawId } = await context.params;
  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: pro, error: fetchError } = await supabase
    .from("professionals")
    .select("id, email, name, verification_status, credit_balance_cents")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    log.error("Lookup failed", { id, error: fetchError.message });
    return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  }
  if (!pro) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }
  if (pro.verification_status === "verified") {
    return NextResponse.json(
      { error: "Already verified" },
      { status: 409 },
    );
  }

  // Credit grant — only on first approval, idempotent via the guard above.
  // Credits are stored as cents (1 credit = 100 cents nominally). The brief
  // gives free *credits*, not cents — so we map STARTER_FREE_CREDITS → cents
  // matching the existing credit_balance_cents column. Treat 1 credit as
  // worth $1 of platform value for this initial grant; ops can re-price.
  const grantCents =
    body.grant_starter_credits && STARTER_FREE_CREDITS > 0
      ? STARTER_FREE_CREDITS * STARTER_CREDIT_CENTS_PER_CREDIT
      : 0;

  const update: Record<string, unknown> = {
    verification_status: "verified",
    accepts_briefs: true,
    verified: true,
    status: "active",
    verified_at: new Date().toISOString(),
    verified_by: guard.email,
    verification_notes: body.notes || null,
  };
  if (grantCents > 0) {
    update.credit_balance_cents =
      (pro.credit_balance_cents || 0) + grantCents;
    update.lifetime_credit_cents =
      (pro.credit_balance_cents || 0) + grantCents;
    update.free_leads_used = 0;
  }

  const { error: updateError } = await supabase
    .from("professionals")
    .update(update)
    .eq("id", id);

  if (updateError) {
    log.error("Approve update failed", { id, error: updateError.message });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  // Best-effort email — log failures, don't block the response.
  if (pro.email) {
    try {
      const portalUrl =
        process.env.NEXT_PUBLIC_SITE_URL
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/advisor-portal`
          : "https://invest.com.au/advisor-portal";
      const ok = await sendProApproved(pro.email, pro.name || "there", {
        starterCredits: grantCents > 0 ? STARTER_FREE_CREDITS : 0,
        portalUrl,
      });
      if (!ok) {
        log.warn("pro-approved email send returned ok=false", { id });
      }
    } catch (err) {
      log.warn("pro-approved email threw", {
        id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("Provider approved", {
    id,
    actor: guard.email,
    grantCents,
  });

  return NextResponse.json({
    ok: true,
    starter_credits_granted: grantCents > 0 ? STARTER_FREE_CREDITS : 0,
  });
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  // withValidatedBody runs the request once; we wrap manually to thread
  // the dynamic-segment context through.
  const wrapped = withValidatedBody(Body, (req, body) =>
    handlePost(req, body, context),
  );
  return wrapped(request);
}
