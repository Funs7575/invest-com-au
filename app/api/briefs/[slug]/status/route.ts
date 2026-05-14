import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { logger } from "@/lib/logger";
import { BriefStatusUpdateRequest } from "@/lib/api-schemas";
import { updateTrackerStatus } from "@/lib/briefs/credits";

const log = logger("briefs:status");

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const { slug } = await ctx.params;
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = BriefStatusUpdateRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: brief } = await admin
      .from("advisor_auctions")
      .select("id, accepted_by_professional_id")
      .eq("slug", slug)
      .eq("flow_type", "accept")
      .maybeSingle();
    if (!brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 });
    }

    const result = await updateTrackerStatus({
      briefId: brief.id as number,
      professionalId: advisorId,
      newStatus: parsed.data.tracker_status,
      note: parsed.data.note,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason ?? "Could not update status." },
        { status: 403 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("status error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to update status." }, { status: 500 });
  }
}
