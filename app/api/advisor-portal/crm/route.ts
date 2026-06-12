import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isFlagEnabled } from "@/lib/feature-flags";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { LEAD_SEQUENCES_FLAG } from "@/lib/advisor-portal/crm-constants";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("api:advisor-portal:crm");

/**
 * GET /api/advisor-portal/crm
 *
 * One-shot bundle for the Follow-Up Autopilot UI: the adviser's open/closed
 * tasks, their sequences (with steps) and their active enrolments — everything
 * the kanban + sequence editor need, scoped to the caller's professional_id.
 *
 * Flag-gated: when `lead_sequences` is off this returns `{ enabled: false }`
 * (HTTP 200) so LeadsTab renders the existing list byte-identical instead of
 * erroring. Service-role admin client is the correct path — the CRM tables are
 * service-role-only by design (advisor sessions carry no Supabase JWT); the
 * query is scoped to the authenticated professional_id.
 */
export async function GET(req: NextRequest) {
  if (!(await isAllowed("advisor_crm_get", ipKey(req), { max: 60, refillPerSec: 1 }))) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // Fail-closed: feature absent ⇒ tell the client cleanly so it falls back.
  if (!(await isFlagEnabled(LEAD_SEQUENCES_FLAG))) {
    return NextResponse.json({ enabled: false });
  }

  const professionalId = await requireAdvisorSession(req);
  if (!professionalId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createAdminClient();

  const [tasksRes, seqRes, enrolRes] = await Promise.all([
    admin
      .from("lead_tasks")
      .select("id, lead_ref, title, due_at, done_at, created_at")
      .eq("professional_id", professionalId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(1000),
    admin
      .from("lead_sequences")
      .select("id, name, status, created_at")
      .eq("professional_id", professionalId)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("lead_sequence_enrolments")
      .select("id, sequence_id, lead_ref, current_step, enrolled_at, completed_at, stopped_at, last_sent_at")
      .eq("professional_id", professionalId)
      .is("completed_at", null)
      .is("stopped_at", null)
      .limit(2000),
  ]);

  if (tasksRes.error || seqRes.error || enrolRes.error) {
    log.error("crm bundle query failed", {
      tasks: tasksRes.error?.message,
      sequences: seqRes.error?.message,
      enrolments: enrolRes.error?.message,
    });
    return NextResponse.json({ error: "Failed to load." }, { status: 500 });
  }

  // Load steps for the adviser's sequences (one round-trip, scoped via the
  // sequence id set we just fetched).
  const sequenceIds = (seqRes.data ?? []).map((s) => s.id);
  let steps: Array<{ id: number; sequence_id: number; day_offset: number; subject: string; body: string; position: number }> = [];
  if (sequenceIds.length > 0) {
    const stepsRes = await admin
      .from("lead_sequence_steps")
      .select("id, sequence_id, day_offset, subject, body, position")
      .in("sequence_id", sequenceIds)
      .order("position", { ascending: true });
    if (stepsRes.error) {
      log.error("crm steps query failed", { err: stepsRes.error.message });
      return NextResponse.json({ error: "Failed to load." }, { status: 500 });
    }
    steps = stepsRes.data ?? [];
  }

  const stepsBySeq = new Map<number, typeof steps>();
  for (const s of steps) {
    const list = stepsBySeq.get(s.sequence_id) ?? [];
    list.push(s);
    stepsBySeq.set(s.sequence_id, list);
  }

  const sequences = (seqRes.data ?? []).map((s) => ({
    ...s,
    steps: stepsBySeq.get(s.id) ?? [],
  }));

  return NextResponse.json({
    enabled: true,
    tasks: tasksRes.data ?? [],
    sequences,
    enrolments: enrolRes.data ?? [],
  });
}
