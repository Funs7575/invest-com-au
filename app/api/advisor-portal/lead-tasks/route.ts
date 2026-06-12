import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { guardCrmRequest } from "@/lib/advisor-portal/crm-guard";
import { MAX_TASK_TITLE_LEN } from "@/lib/advisor-portal/crm-constants";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:advisor-portal:lead-tasks");

const CreateSchema = z.object({
  lead_ref: z.number().int().positive(),
  title: z.string().trim().min(1).max(MAX_TASK_TITLE_LEN),
  due_at: z.string().datetime({ offset: true }).nullable().optional(),
});

const PatchSchema = z.object({
  task_id: z.number().int().positive(),
  // Toggle completion. true ⇒ stamp done_at now; false ⇒ clear it.
  done: z.boolean(),
});

const DeleteSchema = z.object({
  task_id: z.number().int().positive(),
});

/**
 * Confirm the lead belongs to the caller before we attach CRM bookkeeping to
 * it — lead_ref is not a FK, so the API layer is the ownership gate.
 */
async function adviserOwnsLead(
  admin: ReturnType<typeof createAdminClient>,
  professionalId: number,
  leadRef: number,
): Promise<boolean> {
  const { data, error } = await admin
    .from("professional_leads")
    .select("id")
    .eq("id", leadRef)
    .eq("professional_id", professionalId)
    .maybeSingle();
  return !error && !!data;
}

// ── Create a task ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!(await isAllowed("advisor_lead_tasks_post", ipKey(req), { max: 60, refillPerSec: 1 }))) {
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

  const admin = createAdminClient();
  if (!(await adviserOwnsLead(admin, guard.professionalId, parsed.data.lead_ref))) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const { data, error } = await admin
    .from("lead_tasks")
    .insert({
      professional_id: guard.professionalId,
      lead_ref: parsed.data.lead_ref,
      title: parsed.data.title,
      due_at: parsed.data.due_at ?? null,
    })
    .select("id, lead_ref, title, due_at, done_at, created_at")
    .single();

  if (error || !data) {
    log.error("task insert failed", { err: error?.message });
    return NextResponse.json({ error: "Failed to create task." }, { status: 500 });
  }

  return NextResponse.json({ task: data });
}

// ── Toggle completion ─────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  if (!(await isAllowed("advisor_lead_tasks_patch", ipKey(req), { max: 120, refillPerSec: 2 }))) {
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
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("lead_tasks")
    .update({ done_at: parsed.data.done ? new Date().toISOString() : null })
    .eq("id", parsed.data.task_id)
    .eq("professional_id", guard.professionalId); // ownership scope

  if (error) {
    log.error("task patch failed", { err: error.message });
    return NextResponse.json({ error: "Failed to update task." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// ── Delete a task ─────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!(await isAllowed("advisor_lead_tasks_delete", ipKey(req), { max: 60, refillPerSec: 1 }))) {
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

  const admin = createAdminClient();
  const { error } = await admin
    .from("lead_tasks")
    .delete()
    .eq("id", parsed.data.task_id)
    .eq("professional_id", guard.professionalId); // ownership scope

  if (error) {
    log.error("task delete failed", { err: error.message });
    return NextResponse.json({ error: "Failed to delete task." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
