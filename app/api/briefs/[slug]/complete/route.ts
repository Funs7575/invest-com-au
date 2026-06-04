import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { ensureOutcomeRequestForBrief } from "@/lib/outcomes";

const log = logger("briefs:complete");

const Body = z.object({
  contact_email: z.string().email().max(200),
});

/**
 * POST /api/briefs/[slug]/complete — the consumer marks an accepted engagement
 * complete, which opens the outcome review immediately (AJ-6) instead of
 * waiting for the 28-day outcome-flywheel cron.
 *
 * Auth: email-as-key (matches the brief's contact_email) — same model as
 * /api/briefs/[slug]/withdraw. Returns the review_token so the UI can send the
 * consumer straight to /review/[token].
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (!(await isAllowed("briefs_complete", ipKey(request), { max: 10, refillPerSec: 0.1 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const { slug } = await ctx.params;
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = Body.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }
    const email = parsed.data.contact_email;

    const admin = createAdminClient();
    const { data: brief } = await admin
      .from("advisor_auctions")
      .select("id, contact_email, accepted_at")
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();
    if (!brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }
    if ((brief.contact_email as string).toLowerCase() !== email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Verification failed." }, { status: 403 });
    }
    if (!brief.accepted_at) {
      return NextResponse.json(
        { error: "This request hasn't been accepted by a provider yet." },
        { status: 400 },
      );
    }

    const outcome = await ensureOutcomeRequestForBrief(brief.id as number);
    if (!outcome) {
      return NextResponse.json({ error: "Could not open the review." }, { status: 500 });
    }

    log.info("Brief marked complete by consumer", { briefId: brief.id });
    return NextResponse.json({ success: true, review_token: outcome.token });
  } catch (err) {
    log.error("complete error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to mark complete." }, { status: 500 });
  }
}
