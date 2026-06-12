import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { guardCrmRequest } from "@/lib/advisor-portal/crm-guard";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:advisor-portal:sequence-enrolments");

const EnrolSchema = z.object({
  sequence_id: z.number().int().positive(),
  lead_ref: z.number().int().positive(),
});

const StopSchema = z.object({
  enrolment_id: z.number().int().positive(),
});

// ── Enrol a lead into a sequence ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!(await isAllowed("advisor_seq_enrol_post", ipKey(req), { max: 60, refillPerSec: 1 }))) {
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
  const parsed = EnrolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Both the lead AND the sequence must belong to the caller.
  const [leadRes, seqRes] = await Promise.all([
    admin
      .from("professional_leads")
      .select("id")
      .eq("id", parsed.data.lead_ref)
      .eq("professional_id", guard.professionalId)
      .maybeSingle(),
    admin
      .from("lead_sequences")
      .select("id, status")
      .eq("id", parsed.data.sequence_id)
      .eq("professional_id", guard.professionalId)
      .maybeSingle(),
  ]);

  if (leadRes.error || !leadRes.data) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }
  if (seqRes.error || !seqRes.data) {
    return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
  }

  // Upsert on the UNIQUE (sequence_id, lead_ref): re-enrolling the same lead is
  // idempotent rather than a duplicate cadence. A previously stopped/completed
  // enrolment is revived (fresh enrolled_at, step counter reset).
  const { data, error } = await admin
    .from("lead_sequence_enrolments")
    .upsert(
      {
        sequence_id: parsed.data.sequence_id,
        professional_id: guard.professionalId,
        lead_ref: parsed.data.lead_ref,
        current_step: 0,
        enrolled_at: new Date().toISOString(),
        completed_at: null,
        stopped_at: null,
        last_sent_at: null,
      },
      { onConflict: "sequence_id,lead_ref" },
    )
    .select("id, sequence_id, lead_ref, current_step, enrolled_at, completed_at, stopped_at, last_sent_at")
    .single();

  if (error || !data) {
    log.error("enrol failed", { err: error?.message });
    return NextResponse.json({ error: "Failed to enrol lead." }, { status: 500 });
  }

  return NextResponse.json({ enrolment: data });
}

// ── Stop an enrolment ─────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  if (!(await isAllowed("advisor_seq_enrol_delete", ipKey(req), { max: 60, refillPerSec: 1 }))) {
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
  const parsed = StopSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Soft stop (stamp stopped_at) so the engine stops considering it but the
  // history is preserved. Scoped to the caller.
  const admin = createAdminClient();
  const { error } = await admin
    .from("lead_sequence_enrolments")
    .update({ stopped_at: new Date().toISOString() })
    .eq("id", parsed.data.enrolment_id)
    .eq("professional_id", guard.professionalId) // ownership scope
    .is("completed_at", null);

  if (error) {
    log.error("stop enrolment failed", { err: error.message });
    return NextResponse.json({ error: "Failed to stop sequence." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
