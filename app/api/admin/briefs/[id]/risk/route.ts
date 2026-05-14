import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("admin:briefs:risk");

const Body = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(2000).optional(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await ctx.params;
  const briefId = Number(id);
  if (!Number.isFinite(briefId)) {
    return NextResponse.json({ error: "Invalid brief id." }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = Body.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid body." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const updates =
    parsed.data.action === "approve"
      ? { risk_review_status: "approved" }
      : { risk_review_status: "rejected", status: "closed" };

  await admin.from("advisor_auctions").update(updates).eq("id", briefId);
  await admin.from("brief_tracker_events").insert({
    brief_id: briefId,
    event_type: parsed.data.action === "approve" ? "risk_approved" : "risk_rejected",
    actor_kind: "admin",
    actor_id: guard.email,
    payload: { note: parsed.data.note ?? null },
  });

  log.info("Brief risk review actioned", {
    briefId,
    action: parsed.data.action,
    by: guard.email,
  });
  return NextResponse.json({ success: true });
}
