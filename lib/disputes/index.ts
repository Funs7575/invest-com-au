/**
 * Brief disputes — mediation thread between the consumer and the accepted
 * professional/team on a marketplace brief (Ship #9 / MM39).
 *
 * Lifecycle:
 *   1. Brief is accepted.
 *   2. Either side (or the platform team) opens a dispute against the
 *      brief once an outcome has been submitted, OR after 30 days of
 *      acceptance silence (outcome not yet captured). Anything earlier
 *      should still be a brief_messages back-and-forth.
 *   3. Both sides + admin post messages in `brief_dispute_messages`.
 *      Admin posts as sender_kind='admin'; service_role enforced.
 *   4. Admin resolves via `setStatus`:
 *        - 'resolved_for_consumer'  → triggers the refund hook in the
 *           API layer (see app/api/admin/disputes/[id]/resolve).
 *        - 'resolved_for_provider'  → no money moves.
 *        - 'withdrawn'              → opener changed their mind.
 *
 * Service-role rationale (CLAUDE.md § "Two Supabase clients"):
 *   - Anonymous brief paths still feed disputes (the consumer may not
 *     have an authenticated session at "open dispute" time — they hit
 *     the page via the email-link).
 *   - Admin actions cross the user → service-role boundary by design.
 *   - listOpenDisputes is an admin queue (cross-user).
 */

// eslint-disable-next-line no-restricted-imports -- Brief disputes mix anonymous-consumer access (no JWT) + cross-user admin queries; both are legitimate service-role use cases per CLAUDE.md § "Two Supabase clients".
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("disputes");

export const DISPUTE_REASON_MIN = 200 as const;
export const DISPUTE_REASON_MAX = 4000 as const;
export const DISPUTE_STALE_DAYS = 30 as const;

export type DisputeOpenedByKind = "consumer" | "professional" | "team";
export type DisputeSenderKind =
  | "consumer"
  | "professional"
  | "team"
  | "admin";
export type DisputeStatus =
  | "open"
  | "admin_reviewing"
  | "resolved_for_consumer"
  | "resolved_for_provider"
  | "withdrawn";

export interface DisputeRow {
  id: number;
  brief_id: number;
  opened_by_kind: DisputeOpenedByKind;
  opened_by_user_id: string | null;
  opened_by_email: string;
  reason: string;
  evidence_urls: string[];
  status: DisputeStatus;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DisputeMessageRow {
  id: number;
  dispute_id: number;
  sender_kind: DisputeSenderKind;
  sender_user_id: string | null;
  body: string;
  created_at: string;
}

export class DisputeError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "DisputeError";
  }
}

export interface OpenDisputeInput {
  briefId: number;
  openedByKind: DisputeOpenedByKind;
  openedByUserId: string | null;
  openedByEmail: string;
  reason: string;
  evidenceUrls?: string[];
}

/**
 * Validate that the brief is in a state where a dispute can be opened.
 *
 * Rules:
 *   - Must have been accepted (`accepted_at IS NOT NULL`).
 *   - Either an outcome has been submitted on `brief_outcomes`, OR
 *     30+ days have elapsed since acceptance without one. Disputes
 *     before that point are noise — use the in-brief chat.
 *
 * Throws `DisputeError(400)` on a validation failure so the API route
 * can surface a clean message.
 */
async function assertBriefIsDisputable(briefId: number): Promise<void> {
  const admin = createAdminClient();
  const { data: brief, error: briefErr } = await admin
    .from("advisor_auctions")
    .select("id, accepted_at")
    .eq("id", briefId)
    .maybeSingle();
  if (briefErr) {
    log.error("assertBriefIsDisputable: brief lookup failed", {
      briefId,
      err: briefErr.message,
    });
    throw new DisputeError("Failed to load brief.", 500);
  }
  if (!brief) {
    throw new DisputeError("Brief not found.", 404);
  }
  if (!brief.accepted_at) {
    throw new DisputeError(
      "Disputes can only be opened after a brief has been accepted.",
      400,
    );
  }
  const acceptedAt = new Date(brief.accepted_at as string).getTime();
  const ageMs = Date.now() - acceptedAt;
  const staleMs = DISPUTE_STALE_DAYS * 24 * 60 * 60 * 1000;
  if (ageMs >= staleMs) return; // 30d+ stale acceptance → dispute permitted regardless of outcome

  // Acceptance is still fresh; require a submitted outcome.
  const { data: outcome } = await admin
    .from("brief_outcomes")
    .select("submitted_at")
    .eq("brief_id", briefId)
    .maybeSingle();
  if (!outcome || !outcome.submitted_at) {
    throw new DisputeError(
      `Disputes can be opened once the outcome is submitted, or after ${DISPUTE_STALE_DAYS} days from acceptance.`,
      400,
    );
  }
}

/**
 * Open a new dispute against a brief. Returns the inserted row. If a
 * dispute already exists (UNIQUE on brief_id), returns the existing
 * row with status 409 so the route can hint the UI to switch to the
 * "view discussion" state.
 */
export async function openDispute(input: OpenDisputeInput): Promise<DisputeRow> {
  const reason = (input.reason ?? "").trim();
  if (reason.length < DISPUTE_REASON_MIN) {
    throw new DisputeError(
      `Reason must be at least ${DISPUTE_REASON_MIN} characters so admins have context to arbitrate.`,
      400,
    );
  }
  if (reason.length > DISPUTE_REASON_MAX) {
    throw new DisputeError(
      `Reason must be ${DISPUTE_REASON_MAX} characters or fewer.`,
      400,
    );
  }

  await assertBriefIsDisputable(input.briefId);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("brief_disputes")
    .insert({
      brief_id: input.briefId,
      opened_by_kind: input.openedByKind,
      opened_by_user_id: input.openedByUserId,
      opened_by_email: input.openedByEmail,
      reason,
      evidence_urls: input.evidenceUrls ?? [],
    })
    .select("*")
    .single();

  if (error) {
    // Unique-violation on brief_id → already exists.
    if (error.code === "23505") {
      throw new DisputeError("A dispute is already open for this brief.", 409);
    }
    log.error("openDispute: insert failed", {
      briefId: input.briefId,
      err: error.message,
    });
    throw new DisputeError("Failed to open dispute.", 500);
  }

  // Audit trail on brief_tracker_events so the admin review page can
  // surface "dispute opened" alongside risk/accept events.
  await admin.from("brief_tracker_events").insert({
    brief_id: input.briefId,
    event_type: "dispute_opened",
    actor_kind: input.openedByKind,
    actor_id: input.openedByUserId ?? input.openedByEmail,
    payload: { dispute_id: data.id, reason_excerpt: reason.slice(0, 200) },
  });

  log.info("Dispute opened", {
    briefId: input.briefId,
    disputeId: data.id,
    openedByKind: input.openedByKind,
  });

  return data as DisputeRow;
}

export interface AddDisputeMessageInput {
  disputeId: number;
  senderKind: DisputeSenderKind;
  senderUserId: string | null;
  body: string;
}

export async function addMessage(
  input: AddDisputeMessageInput,
): Promise<DisputeMessageRow> {
  const body = (input.body ?? "").replace(/\s+$/g, "");
  if (body.length === 0) {
    throw new DisputeError("Message cannot be empty.", 400);
  }
  if (body.length > DISPUTE_REASON_MAX) {
    throw new DisputeError(
      `Message must be ${DISPUTE_REASON_MAX} characters or fewer.`,
      400,
    );
  }

  const admin = createAdminClient();

  // Guard: dispute must exist + not already terminal. Posting on a
  // resolved/withdrawn dispute is rejected (admins can still post via
  // service-role outside this helper if they need to, but the route
  // layer always uses this helper).
  const { data: dispute, error: lookupErr } = await admin
    .from("brief_disputes")
    .select("id, status")
    .eq("id", input.disputeId)
    .maybeSingle();
  if (lookupErr) {
    log.error("addMessage: lookup failed", {
      disputeId: input.disputeId,
      err: lookupErr.message,
    });
    throw new DisputeError("Failed to load dispute.", 500);
  }
  if (!dispute) {
    throw new DisputeError("Dispute not found.", 404);
  }
  const status = dispute.status as DisputeStatus;
  if (status !== "open" && status !== "admin_reviewing") {
    throw new DisputeError(
      "This dispute is closed. New messages can't be posted.",
      409,
    );
  }

  const { data, error } = await admin
    .from("brief_dispute_messages")
    .insert({
      dispute_id: input.disputeId,
      sender_kind: input.senderKind,
      sender_user_id: input.senderUserId,
      body,
    })
    .select("*")
    .single();

  if (error || !data) {
    log.error("addMessage: insert failed", {
      disputeId: input.disputeId,
      err: error?.message,
    });
    throw new DisputeError("Failed to send message.", 500);
  }
  return data as DisputeMessageRow;
}

export interface SetDisputeStatusInput {
  disputeId: number;
  status: DisputeStatus;
  resolutionNotes?: string | null;
  resolvedByUserId: string;
}

export interface SetDisputeStatusResult {
  dispute: DisputeRow;
  /** True when this call actually changed the row; false on a no-op (already in the target status). */
  changed: boolean;
}

/**
 * Admin-only status mutation. Stamps resolved_at / resolved_by_user_id /
 * resolution_notes when moving into a terminal state. The refund hook
 * is run by the API route (see app/api/admin/disputes/[id]/resolve)
 * rather than here so the ledger import doesn't pull into pure helpers.
 */
export async function setStatus(
  input: SetDisputeStatusInput,
): Promise<SetDisputeStatusResult> {
  const admin = createAdminClient();

  const { data: current, error: readErr } = await admin
    .from("brief_disputes")
    .select("*")
    .eq("id", input.disputeId)
    .maybeSingle();
  if (readErr) {
    log.error("setStatus: lookup failed", {
      disputeId: input.disputeId,
      err: readErr.message,
    });
    throw new DisputeError("Failed to load dispute.", 500);
  }
  if (!current) {
    throw new DisputeError("Dispute not found.", 404);
  }

  if ((current.status as DisputeStatus) === input.status) {
    return { dispute: current as DisputeRow, changed: false };
  }

  const isTerminal =
    input.status === "resolved_for_consumer" ||
    input.status === "resolved_for_provider" ||
    input.status === "withdrawn";

  const updates: Record<string, unknown> = {
    status: input.status,
    updated_at: new Date().toISOString(),
  };
  if (input.resolutionNotes !== undefined) {
    updates.resolution_notes = input.resolutionNotes;
  }
  if (isTerminal) {
    updates.resolved_at = new Date().toISOString();
    updates.resolved_by_user_id = input.resolvedByUserId;
  }

  const { data: updated, error: updateErr } = await admin
    .from("brief_disputes")
    .update(updates)
    .eq("id", input.disputeId)
    .select("*")
    .single();
  if (updateErr || !updated) {
    log.error("setStatus: update failed", {
      disputeId: input.disputeId,
      err: updateErr?.message,
    });
    throw new DisputeError("Failed to update dispute.", 500);
  }

  // Audit trail.
  await admin.from("brief_tracker_events").insert({
    brief_id: updated.brief_id,
    event_type: `dispute_${input.status}`,
    actor_kind: "admin",
    actor_id: input.resolvedByUserId,
    payload: {
      dispute_id: input.disputeId,
      resolution_notes: input.resolutionNotes ?? null,
    },
  });

  log.info("Dispute status set", {
    disputeId: input.disputeId,
    status: input.status,
  });

  return { dispute: updated as DisputeRow, changed: true };
}

/**
 * Admin queue — open or in-review disputes, newest first. Joins the
 * brief so the admin can scan at a glance.
 */
export interface OpenDisputeListRow extends DisputeRow {
  brief_slug: string | null;
  brief_job_title: string | null;
}

export async function listOpenDisputes(): Promise<OpenDisputeListRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("brief_disputes")
    .select(
      "*, brief:advisor_auctions!brief_disputes_brief_id_fkey(slug, job_title)",
    )
    .in("status", ["open", "admin_reviewing"])
    .order("created_at", { ascending: false });
  if (error) {
    log.error("listOpenDisputes failed", { err: error.message });
    return [];
  }
  return (data ?? []).map((row) => {
    const r = row as DisputeRow & {
      brief?: { slug?: string; job_title?: string } | null;
    };
    return {
      ...r,
      brief_slug: r.brief?.slug ?? null,
      brief_job_title: r.brief?.job_title ?? null,
    };
  });
}

/**
 * Fetch the dispute for a brief alongside its messages, but only if
 * the supplied viewerEmail matches one of the parties (contact_email
 * or accepted-pro/team-member email). Returns null when no dispute
 * exists or the viewer isn't a party.
 *
 * This is the consumer-side "view discussion" loader. Admin pages
 * hit the table directly via listOpenDisputes / a per-id read.
 */
export async function getDisputeForBrief(
  briefId: number,
  viewerEmail: string,
): Promise<{ dispute: DisputeRow; messages: DisputeMessageRow[] } | null> {
  if (!viewerEmail) return null;
  const admin = createAdminClient();

  const { data: brief } = await admin
    .from("advisor_auctions")
    .select(
      "id, contact_email, accepted_by_professional_id, accepted_by_team_id",
    )
    .eq("id", briefId)
    .maybeSingle();
  if (!brief) return null;

  const lower = viewerEmail.trim().toLowerCase();
  let allowed = false;
  if (
    typeof brief.contact_email === "string" &&
    brief.contact_email.toLowerCase() === lower
  ) {
    allowed = true;
  }
  if (!allowed && brief.accepted_by_professional_id) {
    const { data: pro } = await admin
      .from("professionals")
      .select("email")
      .eq("id", brief.accepted_by_professional_id as number)
      .maybeSingle();
    if (
      pro?.email &&
      (pro.email as string).toLowerCase() === lower
    ) {
      allowed = true;
    }
  }
  if (!allowed && brief.accepted_by_team_id) {
    // Any active member of the accepted team can view.
    const { data: members } = await admin
      .from("expert_team_members")
      .select("professional_id")
      .eq("team_id", brief.accepted_by_team_id as number)
      .eq("status", "active");
    const memberIds = (members ?? [])
      .map((m) => m.professional_id as number | null)
      .filter((id): id is number => typeof id === "number");
    if (memberIds.length > 0) {
      const { data: matched } = await admin
        .from("professionals")
        .select("id")
        .in("id", memberIds)
        .eq("email", lower);
      if ((matched ?? []).length > 0) allowed = true;
    }
  }
  if (!allowed) return null;

  const { data: dispute } = await admin
    .from("brief_disputes")
    .select("*")
    .eq("brief_id", briefId)
    .maybeSingle();
  if (!dispute) return null;

  const { data: messages } = await admin
    .from("brief_dispute_messages")
    .select("*")
    .eq("dispute_id", dispute.id as number)
    .order("created_at", { ascending: true });

  return {
    dispute: dispute as DisputeRow,
    messages: (messages ?? []) as DisputeMessageRow[],
  };
}

export async function getDisputeById(
  disputeId: number,
): Promise<{ dispute: DisputeRow; messages: DisputeMessageRow[] } | null> {
  const admin = createAdminClient();
  const { data: dispute } = await admin
    .from("brief_disputes")
    .select("*")
    .eq("id", disputeId)
    .maybeSingle();
  if (!dispute) return null;
  const { data: messages } = await admin
    .from("brief_dispute_messages")
    .select("*")
    .eq("dispute_id", disputeId)
    .order("created_at", { ascending: true });
  return {
    dispute: dispute as DisputeRow,
    messages: (messages ?? []) as DisputeMessageRow[],
  };
}

/**
 * Resolve the (consumer-referrer, accepted-pro, lead_spend_cents)
 * triple for a dispute. Used by the refund hook so it can credit the
 * pro back and award credits to the consumer's referrer (if any).
 *
 * Returns nulls where each piece is missing so the caller can branch.
 */
export interface DisputeRefundContext {
  briefId: number;
  acceptedProfessionalId: number | null;
  leadSpendEntryId: number | null;
  leadSpendCents: number;
  consumerReferrerUserId: string | null;
  consumerAuthUserId: string | null;
  consumerEmail: string | null;
}

export async function loadRefundContext(
  disputeId: number,
): Promise<DisputeRefundContext | null> {
  const admin = createAdminClient();
  const { data: dispute } = await admin
    .from("brief_disputes")
    .select("brief_id")
    .eq("id", disputeId)
    .maybeSingle();
  if (!dispute) return null;
  const briefId = dispute.brief_id as number;

  const { data: brief } = await admin
    .from("advisor_auctions")
    .select(
      "id, contact_email, accepted_by_professional_id",
    )
    .eq("id", briefId)
    .maybeSingle();

  const acceptedProfessionalId =
    (brief?.accepted_by_professional_id as number | null) ?? null;
  const consumerEmail = (brief?.contact_email as string | null) ?? null;

  // Find the original lead_spend ledger entry so we know the amount.
  let leadSpendEntryId: number | null = null;
  let leadSpendCents = 0;
  if (acceptedProfessionalId) {
    const { data: ledgerRow } = await admin
      .from("advisor_credit_ledger")
      .select("id, amount_cents")
      .eq("kind", "lead_spend")
      .eq("reference_type", "brief_accept")
      .eq("reference_id", String(briefId))
      .maybeSingle();
    if (ledgerRow) {
      leadSpendEntryId = ledgerRow.id as number;
      leadSpendCents = Math.abs((ledgerRow.amount_cents as number) ?? 0);
    }
  }

  // Pull the consumer's auth_user_id from the outcome row (the only
  // place we systematically record it for a brief).
  let consumerAuthUserId: string | null = null;
  const { data: outcome } = await admin
    .from("brief_outcomes")
    .select("auth_user_id")
    .eq("brief_id", briefId)
    .maybeSingle();
  if (outcome) {
    consumerAuthUserId = (outcome.auth_user_id as string | null) ?? null;
  }

  // Find the consumer's referrer via investor_referral_credits — the
  // 'brief_created' event row carries attributed_brief_id = briefId,
  // and `auth_user_id` on that row is the referrer (the one who shared
  // the link), not the referred consumer.
  let consumerReferrerUserId: string | null = null;
  const { data: refCredit } = await admin
    .from("investor_referral_credits")
    .select("auth_user_id")
    .eq("attributed_brief_id", briefId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (refCredit) {
    consumerReferrerUserId =
      (refCredit.auth_user_id as string | null) ?? null;
  }

  return {
    briefId,
    acceptedProfessionalId,
    leadSpendEntryId,
    leadSpendCents,
    consumerReferrerUserId,
    consumerAuthUserId,
    consumerEmail,
  };
}
