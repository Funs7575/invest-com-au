import { NextRequest, NextResponse } from "next/server";

import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { UpdateIntakeQuestionRequest } from "@/lib/api-schemas";
import {
  IntakeError,
  getQuestionById,
  isOwner,
  removeQuestion,
  upsertQuestion,
} from "@/lib/pro-intake";
import { logger } from "@/lib/logger";

const log = logger("api:intake:item");

async function resolveId(
  ctx: { params: Promise<{ id: string }> },
): Promise<number | null> {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isAllowed("intake_questions_update", ipKey(request), { max: 30, refillPerSec: 0.5 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const id = await resolveId(ctx);
    if (id == null) {
      return NextResponse.json({ error: "Invalid question id." }, { status: 400 });
    }
    const existing = await getQuestionById(id);
    if (!existing) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }
    const owned = await isOwner(existing, advisorId);
    if (!owned) {
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = UpdateIntakeQuestionRequest.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid body." },
        { status: 400 },
      );
    }
    const ownerId =
      existing.owner_kind === "professional"
        ? existing.professional_id
        : existing.team_id;
    if (ownerId == null) {
      return NextResponse.json({ error: "Question owner is missing." }, { status: 500 });
    }
    const updated = await upsertQuestion({
      id,
      owner_kind: existing.owner_kind,
      owner_id: ownerId,
      acting_professional_id: advisorId,
      prompt: parsed.data.prompt,
      kind: parsed.data.kind,
      options: parsed.data.options,
      required: parsed.data.required,
      sort_order: parsed.data.sort_order,
      enabled: parsed.data.enabled,
    });
    return NextResponse.json({ question: updated });
  } catch (err) {
    if (err instanceof IntakeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    log.error("update intake question failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to update question." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await isAllowed("intake_questions_delete", ipKey(request), { max: 30, refillPerSec: 0.5 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    const id = await resolveId(ctx);
    if (id == null) {
      return NextResponse.json({ error: "Invalid question id." }, { status: 400 });
    }
    await removeQuestion(id, advisorId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof IntakeError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    log.error("delete intake question failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to delete question." }, { status: 500 });
  }
}
