/**
 * POST /api/admin/rba-polls/[id]/reveal — record the actual RBA decision.
 *
 * Admin-session-only. Sets outcome + change_bps + decided_at + status=revealed.
 * After this the rba_poll_accuracy view automatically picks up new correct
 * predictions.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:admin:rba-polls:reveal");

export const runtime = "nodejs";

const RevealBody = z.object({
  outcome: z.union([z.literal(1), z.literal(0), z.literal(-1)]),
  change_bps: z.number().int().optional(),
});

export const POST = withValidatedBody(RevealBody, async (req: NextRequest, body) => {
  // Admin gate — only admin users may reveal outcomes.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim());
  if (!user.email || !adminEmails.includes(user.email)) {
    log.warn("non-admin reveal attempt", { userId: user.id });
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { pathname } = new URL(req.url);
  const segments = pathname.split("/");
  const idSegment = segments[segments.indexOf("rba-polls") + 1] ?? "";
  const pollId = parseInt(idSegment, 10);
  if (!Number.isFinite(pollId) || pollId <= 0) {
    return NextResponse.json({ error: "invalid_poll_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("rba_polls")
    .update({
      status: "revealed",
      outcome: body.outcome,
      change_bps: body.change_bps ?? null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", pollId)
    .select("id, meeting_date, outcome, change_bps, decided_at")
    .single();

  if (error) {
    log.warn("reveal update failed", { pollId, error: error.message });
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "poll_not_found" }, { status: 404 });

  log.info("poll revealed", { pollId, outcome: body.outcome });
  return NextResponse.json({ ok: true, poll: data });
});
