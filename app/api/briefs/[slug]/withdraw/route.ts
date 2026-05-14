import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("briefs:withdraw");

const Body = z.object({
  contact_email: z.string().email().max(200),
});

/**
 * POST /api/briefs/[slug]/withdraw — User withdraws an open brief.
 *
 * Auth: email-as-key (matches the contact_email used to create the
 * brief). Mirrors the consumer-side accept flow at
 * /api/quotes/[slug]/accept.
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
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
      .select("id, contact_email, status")
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();
    if (!brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }
    if ((brief.contact_email as string).toLowerCase() !== email.toLowerCase().trim()) {
      return NextResponse.json({ error: "Verification failed." }, { status: 403 });
    }
    if (brief.status === "withdrawn" || brief.status === "closed") {
      return NextResponse.json({ error: "Brief is already closed." }, { status: 400 });
    }

    await admin
      .from("advisor_auctions")
      .update({ status: "closed", tracker_status: "withdrawn" })
      .eq("id", brief.id);

    await admin.from("brief_tracker_events").insert({
      brief_id: brief.id,
      event_type: "status_changed",
      actor_kind: "user",
      payload: { to: "withdrawn" },
    });

    log.info("Brief withdrawn", { briefId: brief.id });
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("withdraw error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to withdraw brief." }, { status: 500 });
  }
}
