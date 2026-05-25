import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:advisor-portal:pipeline");

const PipelineSchema = z.object({
  lead_id: z.number().int().positive(),
  pipeline_stage: z
    .enum(["new", "contacted", "proposal_sent", "negotiating", "won", "lost"])
    .optional(),
  next_action_at: z.string().datetime({ offset: true }).nullable().optional(),
});

export async function PATCH(req: NextRequest) {
  const allowed = await isAllowed("advisor_pipeline_patch", ipKey(req), {
    max: 60,
    refillPerSec: 1,
  });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // Verify advisor session
  const supabase = await createClient();
  const sessionRes = await fetch(
    new URL("/api/advisor-auth/session", req.url).toString(),
    { headers: { cookie: req.headers.get("cookie") ?? "" } },
  );
  if (!sessionRes.ok) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { advisor } = (await sessionRes.json()) as { advisor: { id: number } | null };
  if (!advisor) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = PipelineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { lead_id, pipeline_stage, next_action_at } = parsed.data;

  if (pipeline_stage === undefined && next_action_at === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (pipeline_stage !== undefined) updates.pipeline_stage = pipeline_stage;
  if (next_action_at !== undefined) updates.next_action_at = next_action_at;

  const { error } = await supabase
    .from("professional_leads")
    .update(updates)
    .eq("id", lead_id)
    .eq("professional_id", advisor.id);

  if (error) {
    log.error("pipeline update failed", { err: error.message, lead_id });
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
