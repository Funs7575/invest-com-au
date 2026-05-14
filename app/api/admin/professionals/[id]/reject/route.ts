/**
 * POST /api/admin/professionals/[id]/reject
 *
 * One-click rejection for a pending provider. Flips verification_status to
 * 'rejected', keeps accepts_briefs=false, stamps rejection_reason, and
 * fires the pro-rejected email (which surfaces the reason verbatim so the
 * applicant knows what to fix).
 *
 * Admin-only, IP-rate-limited, body validated by Zod.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { sendProRejected } from "@/lib/pro-onboarding-emails";
import { logger } from "@/lib/logger";

const log = logger("api:admin:pros-reject");

export const runtime = "nodejs";

const Body = z.object({
  // Reason is mandatory — the rejection email always cites a reason so the
  // applicant can address it on reapplication.
  reason: z
    .string()
    .trim()
    .min(4, "Reason is required")
    .max(500),
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
    !(await isAllowed("admin_pros_reject", ipKey(request), {
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
    .select("id, email, name, verification_status")
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
      { error: "Cannot reject a verified provider — suspend instead." },
      { status: 409 },
    );
  }

  const { error: updateError } = await supabase
    .from("professionals")
    .update({
      verification_status: "rejected",
      accepts_briefs: false,
      status: "inactive",
      verification_notes: body.reason,
    })
    .eq("id", id);

  if (updateError) {
    log.error("Reject update failed", { id, error: updateError.message });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  if (pro.email) {
    try {
      const ok = await sendProRejected(
        pro.email,
        pro.name || "there",
        body.reason,
      );
      if (!ok) {
        log.warn("pro-rejected email send returned ok=false", { id });
      }
    } catch (err) {
      log.warn("pro-rejected email threw", {
        id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("Provider rejected", { id, actor: guard.email });

  return NextResponse.json({ ok: true });
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const wrapped = withValidatedBody(Body, (req, body) =>
    handlePost(req, body, context),
  );
  return wrapped(request);
}
