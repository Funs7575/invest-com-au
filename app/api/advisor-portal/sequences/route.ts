import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { guardCrmRequest } from "@/lib/advisor-portal/crm-guard";
import { validateSteps } from "@/lib/advisor-portal/sequences";
import {
  MAX_SEQUENCE_NAME_LEN,
  MAX_STEPS_PER_SEQUENCE,
  MAX_SUBJECT_LEN,
  MAX_BODY_LEN,
  MAX_DAY_OFFSET,
} from "@/lib/advisor-portal/crm-constants";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:advisor-portal:sequences");

const StepSchema = z.object({
  day_offset: z.number().int().min(0).max(MAX_DAY_OFFSET),
  subject: z.string().trim().min(1).max(MAX_SUBJECT_LEN),
  body: z.string().trim().min(1).max(MAX_BODY_LEN),
});

const CreateSchema = z.object({
  name: z.string().trim().min(1).max(MAX_SEQUENCE_NAME_LEN),
  steps: z.array(StepSchema).min(1).max(MAX_STEPS_PER_SEQUENCE),
});

const UpdateSchema = z.object({
  sequence_id: z.number().int().positive(),
  name: z.string().trim().min(1).max(MAX_SEQUENCE_NAME_LEN).optional(),
  status: z.enum(["active", "paused"]).optional(),
  // When present, replaces the sequence's steps wholesale.
  steps: z.array(StepSchema).min(1).max(MAX_STEPS_PER_SEQUENCE).optional(),
});

const DeleteSchema = z.object({
  sequence_id: z.number().int().positive(),
});

/** Persist a fresh ordered set of steps for a sequence (replace-all). */
async function writeSteps(
  admin: ReturnType<typeof createAdminClient>,
  sequenceId: number,
  steps: { day_offset: number; subject: string; body: string }[],
): Promise<{ error?: string }> {
  const del = await admin.from("lead_sequence_steps").delete().eq("sequence_id", sequenceId);
  if (del.error) return { error: del.error.message };

  const rows = steps.map((s, i) => ({
    sequence_id: sequenceId,
    day_offset: s.day_offset,
    subject: s.subject,
    body: s.body,
    position: i,
  }));
  const ins = await admin.from("lead_sequence_steps").insert(rows);
  if (ins.error) return { error: ins.error.message };
  return {};
}

/** Confirm a sequence belongs to the caller (ownership scope for mutations). */
async function adviserOwnsSequence(
  admin: ReturnType<typeof createAdminClient>,
  professionalId: number,
  sequenceId: number,
): Promise<boolean> {
  const { data, error } = await admin
    .from("lead_sequences")
    .select("id")
    .eq("id", sequenceId)
    .eq("professional_id", professionalId)
    .maybeSingle();
  return !error && !!data;
}

// ── Create a sequence (+ its steps) ───────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!(await isAllowed("advisor_sequences_post", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const guard = await guardCrmRequest(req);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Domain validation (defence-in-depth over Zod: same caps, plus normalisation
  // and the merge-field-agnostic length/structure rules).
  const stepCheck = validateSteps(parsed.data.steps);
  if (!stepCheck.ok) {
    return NextResponse.json({ error: "Invalid steps.", reason: stepCheck.reason }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: seq, error: seqErr } = await admin
    .from("lead_sequences")
    .insert({ professional_id: guard.professionalId, name: parsed.data.name, status: "active" })
    .select("id, name, status, created_at")
    .single();

  if (seqErr || !seq) {
    log.error("sequence insert failed", { err: seqErr?.message });
    return NextResponse.json({ error: "Failed to create sequence." }, { status: 500 });
  }

  const stepWrite = await writeSteps(admin, seq.id, stepCheck.steps);
  if (stepWrite.error) {
    // Roll back the orphaned sequence so a failed step write doesn't leave a
    // step-less sequence behind.
    await admin.from("lead_sequences").delete().eq("id", seq.id);
    log.error("sequence steps insert failed", { err: stepWrite.error });
    return NextResponse.json({ error: "Failed to create sequence." }, { status: 500 });
  }

  return NextResponse.json({
    sequence: { ...seq, steps: stepCheck.steps.map((s, i) => ({ ...s, position: i })) },
  });
}

// ── Update a sequence (name / status / steps) ─────────────────────────────
export async function PATCH(req: NextRequest) {
  if (!(await isAllowed("advisor_sequences_patch", ipKey(req), { max: 60, refillPerSec: 1 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const guard = await guardCrmRequest(req);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { sequence_id, name, status, steps } = parsed.data;
  if (name === undefined && status === undefined && steps === undefined) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!(await adviserOwnsSequence(admin, guard.professionalId, sequence_id))) {
    return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
  }

  if (name !== undefined || status !== undefined) {
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    const { error } = await admin
      .from("lead_sequences")
      .update(updates)
      .eq("id", sequence_id)
      .eq("professional_id", guard.professionalId);
    if (error) {
      log.error("sequence update failed", { err: error.message });
      return NextResponse.json({ error: "Failed to update sequence." }, { status: 500 });
    }
  }

  if (steps !== undefined) {
    const stepCheck = validateSteps(steps);
    if (!stepCheck.ok) {
      return NextResponse.json({ error: "Invalid steps.", reason: stepCheck.reason }, { status: 400 });
    }
    const stepWrite = await writeSteps(admin, sequence_id, stepCheck.steps);
    if (stepWrite.error) {
      log.error("sequence steps replace failed", { err: stepWrite.error });
      return NextResponse.json({ error: "Failed to update steps." }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

// ── Delete a sequence ─────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!(await isAllowed("advisor_sequences_delete", ipKey(req), { max: 30, refillPerSec: 0.5 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const guard = await guardCrmRequest(req);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = DeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Steps + enrolments cascade via FK ON DELETE CASCADE.
  const admin = createAdminClient();
  const { error } = await admin
    .from("lead_sequences")
    .delete()
    .eq("id", parsed.data.sequence_id)
    .eq("professional_id", guard.professionalId); // ownership scope

  if (error) {
    log.error("sequence delete failed", { err: error.message });
    return NextResponse.json({ error: "Failed to delete sequence." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
