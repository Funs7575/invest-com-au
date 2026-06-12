/**
 * Adviser Follow-Up Autopilot — server-side send engine + due-task digest.
 *
 * SERVER ONLY. Imports the service-role admin client and the Resend rails, so
 * this must never be value-imported by a client component.
 *
 * Two jobs, both driven by /api/cron/lead-sequence-engine:
 *   - runDueEnrolments(): advance every active enrolment whose next step is due,
 *     sending one email per due step via lib/resend (suppression-checked,
 *     adviser reply-to, sanitised), then stamping last_sent_at / current_step.
 *   - runDueTaskDigest(): one "tasks due today" email per adviser (preference-
 *     gated on professionals.digest_opt_out), folded into the same cron.
 *
 * Hard caps (CLAUDE.md EMAIL SAFETY):
 *   - ≤1 send per lead per day — enforced via last_sent_at: an enrolment whose
 *     last_sent_at is within the last 24h is skipped.
 *   - ≤3 steps per sequence — enforced at write time + the engine only ever
 *     looks at steps[current_step] and stops when current_step reaches the
 *     step count.
 *   - Suppression list — honoured automatically by sendEmail().
 *   - Idempotent per enrolment-step: current_step only advances after a
 *     non-suppressed send, and last_sent_at gates same-day re-runs, so two cron
 *     fires in one day can never double-send.
 */

// eslint-disable-next-line no-restricted-imports -- the lead_* CRM tables are service-role-only by design (advisor sessions carry no Supabase JWT → no authenticated policy); this engine runs from cron with no user context and writes cross-lead/cross-adviser rows. Legitimate per CLAUDE.md § "Two Supabase clients" → service_role-only tables + cron jobs.
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { getSiteUrl } from "@/lib/url";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import {
  firstName,
  renderSubject,
  renderBodyHtml,
  renderBodyText,
  type MergeContext,
} from "@/lib/advisor-portal/sequences";
import { LEAD_SEQUENCES_FLAG } from "@/lib/advisor-portal/crm-constants";

const log = logger("sequence-engine");

// Re-exported for existing importers (the cron route imports it from here).
export { LEAD_SEQUENCES_FLAG };

/** 24h in ms — the per-lead-per-day send gate. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Safety ceiling so a runaway cron can never fan out unbounded sends. */
const MAX_SENDS_PER_RUN = 500;

type AdminClient = ReturnType<typeof createAdminClient>;

interface EnrolmentRow {
  id: number;
  sequence_id: number;
  professional_id: number;
  lead_ref: number;
  current_step: number;
  last_sent_at: string | null;
}

interface StepRow {
  sequence_id: number;
  day_offset: number;
  subject: string;
  body: string;
  position: number;
}

interface AdviserRow {
  id: number;
  name: string;
  email: string | null;
  firm_name: string | null;
}

interface LeadRow {
  id: number;
  professional_id: number;
  user_name: string;
  user_email: string;
  status: string;
}

export interface EngineResult {
  enrolmentsConsidered: number;
  sent: number;
  completed: number;
  skippedSuppressed: number;
  skippedNoRecipient: number;
  skippedCapped: number;
  failures: number;
}

export interface DigestResult {
  advisersWithDueTasks: number;
  digestsSent: number;
  optedOut: number;
  failures: number;
}

/** Footer giving the consumer a one-click unsubscribe + general-info notice. */
function emailFooter(unsubEmail: string): string {
  const site = getSiteUrl();
  const unsub = `${site}/api/unsubscribe?email=${encodeURIComponent(unsubEmail)}`;
  return (
    `<p style="font-size:11px;color:#94a3b8;margin-top:20px;line-height:1.6">` +
    `General information only — not personal advice. ` +
    `<a href="${unsub}" style="color:#94a3b8">Unsubscribe</a> · ` +
    `<a href="${site}/privacy" style="color:#94a3b8">Privacy</a></p>`
  );
}

function wrapEmail(bodyHtml: string, unsubEmail: string): string {
  return (
    `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155;line-height:1.6">` +
    `<div style="font-size:14px;color:#334155">${bodyHtml}</div>` +
    emailFooter(unsubEmail) +
    `</div>`
  );
}

/**
 * Send a single due sequence step. Returns the outcome so the caller can keep
 * the run counters and decide whether to advance current_step.
 *
 * Exported for unit testing with an injected `send` so the suppression / cap /
 * idempotency branches can be covered without network or DB.
 */
export async function sendSequenceStep(args: {
  step: StepRow;
  adviser: AdviserRow;
  lead: LeadRow;
  send?: typeof sendEmail;
}): Promise<{ outcome: "sent" | "suppressed" | "failed" }> {
  const send = args.send ?? sendEmail;
  const { step, adviser, lead } = args;

  const ctx: MergeContext = {
    leadFirstName: firstName(lead.user_name),
    adviserName: adviser.name,
    adviserFirm: adviser.firm_name ?? "",
  };

  const subject = renderSubject(step.subject, ctx);
  // Render adviser plain text → safe HTML (escape-then-<br>), then run the
  // shared sanitizer as defence-in-depth even though escaping already
  // neutralised every tag.
  const bodyHtml = sanitizeHtml(renderBodyHtml(step.body, ctx));
  const bodyText = renderBodyText(step.body, ctx);

  const result = await send({
    to: lead.user_email,
    subject,
    html: wrapEmail(bodyHtml, lead.user_email),
    text: bodyText,
    // Replies go straight to the adviser, off-platform, per spec. Falls back to
    // the default From when the adviser somehow has no email (shouldn't happen;
    // they're filtered out before we get here).
    ...(adviser.email ? { replyTo: adviser.email } : {}),
  });

  if (result.ok) return { outcome: "sent" };
  if (result.error === "suppressed") return { outcome: "suppressed" };
  return { outcome: "failed" };
}

/**
 * Advance every active enrolment whose next step is due.
 *
 * "Due" = the step at index `current_step` has `day_offset` days elapsed since
 * `enrolled_at`, AND the enrolment hasn't already been sent to within the last
 * 24h (the per-lead-per-day cap, also covering same-day cron re-runs).
 */
export async function runDueEnrolments(
  supabase: AdminClient = createAdminClient(),
  now: Date = new Date(),
): Promise<EngineResult> {
  const result: EngineResult = {
    enrolmentsConsidered: 0,
    sent: 0,
    completed: 0,
    skippedSuppressed: 0,
    skippedNoRecipient: 0,
    skippedCapped: 0,
    failures: 0,
  };

  // Active enrolments only (not completed, not stopped).
  const { data: enrolments, error: enrErr } = await supabase
    .from("lead_sequence_enrolments")
    .select("id, sequence_id, professional_id, lead_ref, current_step, last_sent_at, enrolled_at")
    .is("completed_at", null)
    .is("stopped_at", null)
    .limit(MAX_SENDS_PER_RUN);

  if (enrErr) {
    log.error("enrolments query failed", { err: enrErr.message });
    throw new Error(enrErr.message);
  }

  type EnrolmentWithEnrolledAt = EnrolmentRow & { enrolled_at: string };
  const rows = (enrolments ?? []) as EnrolmentWithEnrolledAt[];
  result.enrolmentsConsidered = rows.length;
  if (rows.length === 0) return result;

  // Batch-load the steps, advisers and leads referenced by these enrolments.
  const sequenceIds = [...new Set(rows.map((r) => r.sequence_id))];
  const adviserIds = [...new Set(rows.map((r) => r.professional_id))];
  const leadRefs = [...new Set(rows.map((r) => r.lead_ref))];

  const [{ data: steps }, { data: advisers }, { data: leads }] = await Promise.all([
    supabase
      .from("lead_sequence_steps")
      .select("sequence_id, day_offset, subject, body, position")
      .in("sequence_id", sequenceIds),
    supabase
      .from("professionals")
      .select("id, name, email, firm_name")
      .in("id", adviserIds),
    supabase
      .from("professional_leads")
      .select("id, professional_id, user_name, user_email, status")
      .in("id", leadRefs),
  ]);

  // Steps per sequence, ordered by position (the engine indexes by current_step).
  const stepsBySeq = new Map<number, StepRow[]>();
  for (const s of (steps ?? []) as StepRow[]) {
    const list = stepsBySeq.get(s.sequence_id) ?? [];
    list.push(s);
    stepsBySeq.set(s.sequence_id, list);
  }
  for (const list of stepsBySeq.values()) list.sort((a, b) => a.position - b.position);

  const adviserById = new Map<number, AdviserRow>();
  for (const a of (advisers ?? []) as AdviserRow[]) adviserById.set(a.id, a);

  const leadById = new Map<number, LeadRow>();
  for (const l of (leads ?? []) as LeadRow[]) leadById.set(l.id, l);

  for (const enr of rows) {
    const seqSteps = stepsBySeq.get(enr.sequence_id) ?? [];

    // Completed: current_step has run off the end of the sequence.
    if (enr.current_step >= seqSteps.length) {
      await supabase
        .from("lead_sequence_enrolments")
        .update({ completed_at: now.toISOString() })
        .eq("id", enr.id);
      result.completed++;
      continue;
    }

    const step = seqSteps[enr.current_step];
    if (!step) continue;

    // Per-lead-per-day cap + same-day-rerun idempotency.
    if (enr.last_sent_at && now.getTime() - new Date(enr.last_sent_at).getTime() < DAY_MS) {
      result.skippedCapped++;
      continue;
    }

    // Is this step due yet? day_offset days after enrolment.
    const dueAt = new Date(new Date(enr.enrolled_at).getTime() + step.day_offset * DAY_MS);
    if (now < dueAt) continue; // not due — leave for a later run

    const adviser = adviserById.get(enr.professional_id);
    const lead = leadById.get(enr.lead_ref);

    // No resolvable adviser email or lead (e.g. lead purged) → stop the
    // enrolment so it isn't reconsidered forever.
    if (!adviser || !adviser.email || !lead || !lead.user_email) {
      await supabase
        .from("lead_sequence_enrolments")
        .update({ stopped_at: now.toISOString() })
        .eq("id", enr.id);
      result.skippedNoRecipient++;
      continue;
    }

    const { outcome } = await sendSequenceStep({ step, adviser, lead });

    if (outcome === "failed") {
      // Transient — don't advance; a later run retries the same step.
      result.failures++;
      continue;
    }

    if (outcome === "suppressed") {
      // Consumer is on the suppression list: never reaches them. Advance the
      // step (so we don't retry a dead address daily) and stamp last_sent_at,
      // but count it separately for observability.
      result.skippedSuppressed++;
    } else {
      result.sent++;
    }

    const nextStep = enr.current_step + 1;
    const patch: Record<string, unknown> = {
      current_step: nextStep,
      last_sent_at: now.toISOString(),
    };
    // If that was the final step, mark complete in the same write.
    if (nextStep >= seqSteps.length) {
      patch.completed_at = now.toISOString();
      result.completed++;
    }
    await supabase.from("lead_sequence_enrolments").update(patch).eq("id", enr.id);
  }

  return result;
}

/** Local YYYY-MM-DD bounds (UTC) for "today" task-due filtering. */
function todayBoundsUtc(now: Date): { startIso: string; endIso: string } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + DAY_MS);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/**
 * Send one "tasks due today / overdue" digest per adviser. Preference-gated on
 * professionals.digest_opt_out. Open tasks (done_at IS NULL) that are either
 * overdue or due before end-of-day today are included.
 */
export async function runDueTaskDigest(
  supabase: AdminClient = createAdminClient(),
  now: Date = new Date(),
): Promise<DigestResult> {
  const result: DigestResult = {
    advisersWithDueTasks: 0,
    digestsSent: 0,
    optedOut: 0,
    failures: 0,
  };

  const { endIso } = todayBoundsUtc(now);

  // Open, dated tasks due by end of today (includes overdue).
  const { data: tasks, error: taskErr } = await supabase
    .from("lead_tasks")
    .select("id, professional_id, lead_ref, title, due_at")
    .is("done_at", null)
    .not("due_at", "is", null)
    .lt("due_at", endIso)
    .limit(2000);

  if (taskErr) {
    log.error("due tasks query failed", { err: taskErr.message });
    throw new Error(taskErr.message);
  }

  type DueTask = { id: number; professional_id: number; lead_ref: number; title: string; due_at: string };
  const dueTasks = (tasks ?? []) as DueTask[];
  if (dueTasks.length === 0) return result;

  const byAdviser = new Map<number, DueTask[]>();
  for (const t of dueTasks) {
    const list = byAdviser.get(t.professional_id) ?? [];
    list.push(t);
    byAdviser.set(t.professional_id, list);
  }
  result.advisersWithDueTasks = byAdviser.size;

  const adviserIds = [...byAdviser.keys()];
  const { data: advisers, error: advErr } = await supabase
    .from("professionals")
    .select("id, name, email, digest_opt_out")
    .in("id", adviserIds);

  if (advErr) {
    log.error("digest adviser lookup failed", { err: advErr.message });
    throw new Error(advErr.message);
  }

  type DigestAdviser = { id: number; name: string; email: string | null; digest_opt_out: boolean };
  const adviserById = new Map<number, DigestAdviser>();
  for (const a of (advisers ?? []) as DigestAdviser[]) adviserById.set(a.id, a);

  const site = getSiteUrl();

  for (const [adviserId, list] of byAdviser) {
    const adviser = adviserById.get(adviserId);
    if (!adviser?.email) continue;
    if (adviser.digest_opt_out) {
      result.optedOut++;
      continue;
    }

    const nowMs = now.getTime();
    const rowsHtml = list
      .slice(0, 50)
      .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
      .map((t) => {
        const overdue = new Date(t.due_at).getTime() < nowMs;
        const due = new Date(t.due_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
        const dueCell = overdue
          ? `<span style="color:#dc2626;font-weight:600">Overdue · ${due}</span>`
          : `<span style="color:#475569">Due ${due}</span>`;
        return (
          `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155">` +
          // Task titles are adviser-authored — escape before embedding.
          `${escapeForEmail(t.title)}</td>` +
          `<td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px">${dueCell}</td></tr>`
        );
      })
      .join("");

    const count = list.length;
    const { ok } = await sendEmail({
      to: adviser.email,
      subject: `${count} follow-up task${count === 1 ? "" : "s"} due`,
      html:
        `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#334155">` +
        `<div style="background:#0f172a;padding:20px 24px;border-radius:12px 12px 0 0">` +
        `<h1 style="color:white;margin:0;font-size:18px">Tasks due today</h1></div>` +
        `<div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">` +
        `<p style="font-size:15px;margin-top:0">Hi ${escapeForEmail(adviser.name)}, you have <strong>${count}</strong> follow-up task${count === 1 ? "" : "s"} due.</p>` +
        `<table style="width:100%;border-collapse:collapse;margin:16px 0;background:white;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0"><tbody>${rowsHtml}</tbody></table>` +
        `<div style="text-align:center;margin:20px 0"><a href="${site}/advisor-portal" style="display:inline-block;padding:12px 32px;background:#0f172a;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Open Leads &rarr;</a></div>` +
        `</div></div>`,
    });

    if (ok) result.digestsSent++;
    else result.failures++;
  }

  return result;
}

/** Minimal HTML escaper for digest cells (adviser-authored task titles/names). */
function escapeForEmail(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Top-level engine entry — called by the cron. Fail-closed on the feature flag
 * (flag off ⇒ no-op, returns counts of zero, nothing 500s even if the tables
 * are absent because we never query them).
 *
 * The `digest` portion is gated to run once per day at `digestHourUtc` so the
 * hourly cron sends sequence emails responsively but the digest fires daily.
 */
export async function runSequenceEngine(opts?: {
  now?: Date;
  digestHourUtc?: number;
}): Promise<{
  flagEnabled: boolean;
  engine: EngineResult | null;
  digest: DigestResult | null;
}> {
  const now = opts?.now ?? new Date();
  const digestHourUtc = opts?.digestHourUtc ?? 23; // ~09:00 AEST

  const enabled = await isFlagEnabled(LEAD_SEQUENCES_FLAG);
  if (!enabled) {
    return { flagEnabled: false, engine: null, digest: null };
  }

  const supabase = createAdminClient();
  const engine = await runDueEnrolments(supabase, now);
  const digest =
    now.getUTCHours() === digestHourUtc ? await runDueTaskDigest(supabase, now) : null;

  return { flagEnabled: true, engine, digest };
}
