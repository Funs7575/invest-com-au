/**
 * Open to Offers — server helpers for the reverse marketplace (idea #7).
 *
 * Everything here uses the service-role admin client, which is the documented
 * exception per CLAUDE.md §"Two Supabase clients":
 *   - prospect_pool INSERT writes an anonymised snapshot built server-side — we
 *     never trust client-sent snapshot data, so the write happens here (the
 *     owner RLS policy only covers SELECT/UPDATE).
 *   - advisor_pitches is service-role-only by design (advisor sessions carry no
 *     JWT; the consumer reads their pitches through an authenticated API that
 *     joins on their prospect row).
 *   - cross-user reads (an adviser browsing many prospects; mapping a pitch back
 *     to a consumer) can't be scoped to a single auth.uid().
 *
 * Money path: a pitch DEBITS the adviser's credits via `recordLedgerEntry`
 * (kind 'lead_spend') — the SAME primitive the brief accept uses. A decline
 * REFUNDS via `recordLedgerEntry` (kind 'lead_dispute_refund'), the SAME
 * primitive the dispute resolver uses. The money path is NOT forked.
 *
 * Accept bootstraps a chat by creating a brief-equivalent `advisor_auctions`
 * row (flow_type='accept', source='open_to_offers') that is *already accepted*
 * by the pitching adviser, so the existing /briefs/[slug] tracker inherits the
 * full chat / SLA / dispute / booking machinery for free (see acceptPitch).
 */

// eslint-disable-next-line no-restricted-imports -- see module header: anonymous-write (snapshot built server-side), service-role-only advisor_pitches, and cross-user reads — all documented service-role exceptions per CLAUDE.md §"Two Supabase clients".
import { createAdminClient } from "@/lib/supabase/admin";
import { recordLedgerEntry } from "@/lib/advisor-credit-ledger";
import { CENTS_PER_CREDIT } from "@/lib/briefs/credits";
import { classifyText } from "@/lib/text-moderation";
import { dbTypeForNeed } from "@/lib/quiz-advisor-types";
import { logger } from "@/lib/logger";
import {
  type ProspectPoolRow,
  type ProspectSnapshot,
  type ProspectStatus,
  type AdvisorPitchRow,
  type ProspectCard,
  type PitchStatus,
  PROSPECT_TTL_DAYS,
  MAX_PITCHES_PER_PROSPECT_PER_MONTH,
  PITCH_BODY_MAX_LENGTH,
} from "./types";
import { estimatePitchCredits } from "./pitch-pricing";

const log = logger("prospect-pool");

const TTL_MS = PROSPECT_TTL_DAYS * 86_400_000;

function expiryFromNow(now = Date.now()): string {
  return new Date(now + TTL_MS).toISOString();
}

// ─── Consumer: opt-in / status ──────────────────────────────────────────────

/**
 * Create or refresh the consumer's prospect_pool row with a freshly-built,
 * already-scrubbed snapshot, status 'active', and a 60-day expiry. Idempotent
 * upsert on user_id. The CALLER builds + scrubs the snapshot (snapshot.ts) so
 * the anonymisation + PII assertion happen before this write.
 */
export async function activateProspect(
  userId: string,
  snapshot: ProspectSnapshot,
): Promise<ProspectPoolRow | null> {
  try {
    const admin = createAdminClient();
    const nowIso = new Date().toISOString();
    const { data, error } = await admin
      .from("prospect_pool")
      .upsert(
        {
          user_id: userId,
          snapshot,
          status: "active",
          expires_at: expiryFromNow(),
          updated_at: nowIso,
        },
        { onConflict: "user_id" },
      )
      .select("*")
      .single();
    if (error) {
      log.warn("activateProspect failed", { userId, error: error.message });
      return null;
    }
    return data as ProspectPoolRow;
  } catch (err) {
    log.warn("activateProspect threw", {
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Flip the consumer's pool status. 'paused' = stop receiving pitches but keep
 * the row; 'expired' = withdraw (no pitches, treated as inactive). Reactivating
 * goes through activateProspect (rebuilds the snapshot + resets expiry).
 */
export async function setProspectStatus(
  userId: string,
  status: Extract<ProspectStatus, "paused" | "expired">,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("prospect_pool")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (error) {
      log.warn("setProspectStatus failed", { userId, status, error: error.message });
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/** Read the consumer's own pool row (null if they never opted in). */
export async function getProspectForUser(
  userId: string,
): Promise<ProspectPoolRow | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("prospect_pool")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return (data as ProspectPoolRow | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Effective live status for display: an 'active' row whose expires_at has passed
 * is reported as 'expired' (so the dashboard surfaces the renewal nudge) without
 * needing a cron to flip it.
 */
export function effectiveStatus(row: ProspectPoolRow, now = Date.now()): ProspectStatus {
  if (row.status === "active" && row.expires_at && new Date(row.expires_at).getTime() < now) {
    return "expired";
  }
  return row.status;
}

// ─── Adviser: browse prospects ──────────────────────────────────────────────

export interface ProspectFilters {
  advisorType?: string | null; // need slug
  state?: string | null;
  budgetBand?: string | null;
}

/**
 * List anonymised prospect cards for an adviser, applying optional filters and
 * annotating each with this adviser's pitch eligibility (already pitched / was
 * declined / estimated cost). Declined prospects are flagged (the API hides
 * them from the pitchable list — auto-suppression).
 */
export async function listProspectsForAdviser(
  professionalId: number,
  filters: ProspectFilters = {},
  limit = 50,
): Promise<ProspectCard[]> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await admin
    .from("prospect_pool")
    .select("id, snapshot, created_at")
    .eq("status", "active")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit, 100));
  if (error) {
    log.warn("listProspectsForAdviser failed", { error: error.message });
    return [];
  }

  let pool = (rows ?? []) as Array<{
    id: string;
    snapshot: ProspectSnapshot;
    created_at: string;
  }>;

  // Snapshot-level filters (the snapshot is the source of truth for the card).
  if (filters.advisorType) {
    pool = pool.filter((p) => p.snapshot.advisorType === filters.advisorType);
  }
  if (filters.state) {
    pool = pool.filter((p) => p.snapshot.state === filters.state);
  }
  if (filters.budgetBand) {
    pool = pool.filter((p) => p.snapshot.budgetBand === filters.budgetBand);
  }
  if (pool.length === 0) return [];

  // This adviser's existing pitches across the listed prospects (cap-of-1 +
  // decline suppression).
  const prospectIds = pool.map((p) => p.id);
  const { data: myPitches } = await admin
    .from("advisor_pitches")
    .select("prospect_id, status")
    .eq("professional_id", professionalId)
    .in("prospect_id", prospectIds);
  const pitchedStatus = new Map<string, PitchStatus>();
  for (const row of (myPitches ?? []) as { prospect_id: string; status: PitchStatus }[]) {
    pitchedStatus.set(row.prospect_id, row.status);
  }

  const cards: ProspectCard[] = [];
  for (const p of pool) {
    const existing = pitchedStatus.get(p.id);
    const estimatedPitchCost = await estimatePitchCredits(p.snapshot);
    cards.push({
      prospectId: p.id,
      snapshot: p.snapshot,
      listedAt: p.created_at,
      alreadyPitched: existing === "pending" || existing === "accepted",
      previouslyDeclined: existing === "declined",
      estimatedPitchCost,
    });
  }
  return cards;
}

// ─── Adviser: send a pitch ──────────────────────────────────────────────────

export type SendPitchResult =
  | { ok: true; pitch: AdvisorPitchRow; creditsSpent: number; balanceAfterCents: number }
  | {
      ok: false;
      reason:
        | "prospect_not_found"
        | "prospect_inactive"
        | "already_pitched"
        | "previously_declined"
        | "monthly_cap_reached"
        | "moderation_rejected"
        | "insufficient_credits"
        | "body_too_long";
      moderationReasons?: string[];
    };

/**
 * Send one structured pitch to a prospect and debit the adviser's credits.
 *
 * Guards (server-side, in order):
 *   1. Body length <= 300 + moderation (general capability only; rejected ⇒ no
 *      charge, caller returns 422 with reasons).
 *   2. Prospect exists + is active + not expired.
 *   3. This adviser hasn't already pitched (UNIQUE) and wasn't declined by this
 *      prospect (auto-suppression).
 *   4. Prospect hasn't already received >=3 pitches this rolling month.
 *   5. Debit credits via recordLedgerEntry('lead_spend') — the brief-accept
 *      money path. Insufficient balance ⇒ NegativeBalanceError ⇒ no pitch row.
 *
 * The pitch row is inserted FIRST (so the UNIQUE constraint atomically prevents
 * double-pitch races), then the debit is attempted; if the debit fails the row
 * is rolled back.
 */
export async function sendPitch(input: {
  professionalId: number;
  prospectId: string;
  body: string;
  feeBand: string | null;
}): Promise<SendPitchResult> {
  const admin = createAdminClient();
  const body = input.body.trim();

  if (body.length === 0 || body.length > PITCH_BODY_MAX_LENGTH) {
    return { ok: false, reason: "body_too_long" };
  }

  // 1. Moderation — general capability statements only. Anything that reads as
  //    personal advice / forward-looking / unsafe is escalated or rejected; we
  //    treat NON-auto_publish as a hard reject for this surface (no human queue
  //    for pitches — they must be clean to send).
  const verdict = classifyText({
    text: body,
    surface: "advisor_post",
    authorId: `pro_${input.professionalId}`,
    authorVerified: true,
  });
  if (verdict.verdict !== "auto_publish") {
    return { ok: false, reason: "moderation_rejected", moderationReasons: verdict.reasons };
  }

  // 2. Prospect must exist + be live.
  const { data: prospect } = await admin
    .from("prospect_pool")
    .select("id, snapshot, status, expires_at")
    .eq("id", input.prospectId)
    .maybeSingle();
  if (!prospect) return { ok: false, reason: "prospect_not_found" };
  const p = prospect as Pick<ProspectPoolRow, "id" | "snapshot" | "status" | "expires_at">;
  const live =
    p.status === "active" &&
    (!p.expires_at || new Date(p.expires_at).getTime() > Date.now());
  if (!live) return { ok: false, reason: "prospect_inactive" };

  // 3. Cap-of-1 + decline suppression for THIS adviser.
  const { data: mine } = await admin
    .from("advisor_pitches")
    .select("status")
    .eq("prospect_id", input.prospectId)
    .eq("professional_id", input.professionalId)
    .maybeSingle();
  if (mine) {
    const status = (mine as { status: PitchStatus }).status;
    if (status === "declined") return { ok: false, reason: "previously_declined" };
    return { ok: false, reason: "already_pitched" };
  }

  // 4. Per-prospect monthly cap (<=3 in a rolling 30 days; pending+accepted
  //    count — a declined pitch frees a slot but the decliner-adviser is
  //    suppressed by step 3).
  const windowStart = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { count: recentCount } = await admin
    .from("advisor_pitches")
    .select("id", { count: "exact", head: true })
    .eq("prospect_id", input.prospectId)
    .in("status", ["pending", "accepted"])
    .gte("created_at", windowStart);
  if ((recentCount ?? 0) >= MAX_PITCHES_PER_PROSPECT_PER_MONTH) {
    return { ok: false, reason: "monthly_cap_reached" };
  }

  // Price the pitch (flat B2B credits) at send time.
  const credits = await estimatePitchCredits(p.snapshot);

  // 5a. Insert the pitch row first so the UNIQUE(prospect_id, professional_id)
  //     constraint wins any double-submit race (a 23505 means "already
  //     pitched").
  const { data: inserted, error: insertErr } = await admin
    .from("advisor_pitches")
    .insert({
      prospect_id: input.prospectId,
      professional_id: input.professionalId,
      body,
      fee_band: input.feeBand,
      credits_cost: credits,
      status: "pending",
    })
    .select("*")
    .single();
  if (insertErr || !inserted) {
    if (insertErr?.code === "23505") {
      return { ok: false, reason: "already_pitched" };
    }
    log.error("sendPitch insert failed", { error: insertErr?.message });
    return { ok: false, reason: "prospect_not_found" };
  }
  const pitch = inserted as AdvisorPitchRow;

  // 5b. Debit credits via the established ledger primitive. Idempotent on the
  //     pitch id. NegativeBalanceError ⇒ roll back the pitch row + report
  //     insufficient credits.
  try {
    const result = await recordLedgerEntry({
      professionalId: input.professionalId,
      amountCents: -(credits * CENTS_PER_CREDIT),
      kind: "lead_spend",
      description: `Pitch to prospect (open to offers)`,
      referenceType: "advisor_pitch",
      referenceId: pitch.id,
      metadata: { prospect_id: input.prospectId, credits },
    });
    return {
      ok: true,
      pitch,
      creditsSpent: credits,
      balanceAfterCents: result.balanceAfterCents,
    };
  } catch (err) {
    await admin.from("advisor_pitches").delete().eq("id", pitch.id);
    log.warn("sendPitch debit failed — pitch rolled back", {
      professionalId: input.professionalId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "insufficient_credits" };
  }
}

/**
 * Resolve the consumer behind a prospect for the "pitch received" email.
 * Returns the auth user_id + email + first name (from auth.users metadata /
 * user_profiles). Used ONLY for the preference-gated notification — the email
 * goes to the consumer's own inbox, so this is not an identity leak to advisers.
 */
export async function getProspectNotifyTarget(
  prospectId: string,
): Promise<{ userId: string; email: string; firstName: string | null } | null> {
  const admin = createAdminClient();
  const { data: prospect } = await admin
    .from("prospect_pool")
    .select("user_id")
    .eq("id", prospectId)
    .maybeSingle();
  if (!prospect) return null;
  const userId = (prospect as { user_id: string }).user_id;

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? null;
  if (!email) return null;

  const { data: profile } = await admin
    .from("user_profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();
  const displayName = (profile?.display_name as string | null) ?? null;
  const firstName = displayName ? (displayName.split(" ")[0] ?? null) : null;

  return { userId, email, firstName };
}

// ─── Consumer: list + decide pitches ────────────────────────────────────────

export interface PitchWithAdviser {
  pitch: AdvisorPitchRow;
  adviser: {
    id: number;
    name: string;
    slug: string | null;
    firmName: string | null;
    type: string | null;
    photoUrl: string | null;
    rating: number | null;
    reviewCount: number | null;
    verified: boolean;
    locationState: string | null;
  } | null;
}

/**
 * Pending pitches for a consumer's prospect row, each joined to the pitching
 * adviser's PUBLIC profile summary (no adviser PII beyond what the directory
 * already shows). Returns [] if the user has no prospect row.
 */
export async function listPitchesForUser(
  userId: string,
): Promise<{ prospect: ProspectPoolRow | null; pitches: PitchWithAdviser[] }> {
  const admin = createAdminClient();
  const prospect = await getProspectForUser(userId);
  if (!prospect) return { prospect: null, pitches: [] };

  const { data: pitchRows } = await admin
    .from("advisor_pitches")
    .select("*")
    .eq("prospect_id", prospect.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  const pitches = (pitchRows ?? []) as AdvisorPitchRow[];
  if (pitches.length === 0) return { prospect, pitches: [] };

  const proIds = Array.from(new Set(pitches.map((p) => p.professional_id)));
  const { data: pros } = await admin
    .from("professionals")
    .select("id, name, slug, firm_name, type, photo_url, rating, review_count, verified, location_state")
    .in("id", proIds);
  const byId = new Map<number, Record<string, unknown>>();
  for (const pro of (pros ?? []) as Record<string, unknown>[]) {
    byId.set(pro.id as number, pro);
  }

  return {
    prospect,
    pitches: pitches.map((pitch) => {
      const pro = byId.get(pitch.professional_id);
      return {
        pitch,
        adviser: pro
          ? {
              id: pro.id as number,
              name: pro.name as string,
              slug: (pro.slug as string | null) ?? null,
              firmName: (pro.firm_name as string | null) ?? null,
              type: (pro.type as string | null) ?? null,
              photoUrl: (pro.photo_url as string | null) ?? null,
              rating: (pro.rating as number | null) ?? null,
              reviewCount: (pro.review_count as number | null) ?? null,
              verified: pro.verified === true,
              locationState: (pro.location_state as string | null) ?? null,
            }
          : null,
      };
    }),
  };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export type AcceptPitchResult =
  | {
      ok: true;
      briefSlug: string;
      briefId: number;
      adviserEmail: string | null;
      adviserName: string;
      snapshot: ProspectSnapshot;
    }
  | { ok: false; reason: "pitch_not_found" | "not_pending" | "adviser_missing" | "error" };

/**
 * Consumer accepts a pitch. This:
 *   1. Verifies the pitch is theirs (prospect_id belongs to userId) + pending.
 *   2. Creates a brief-equivalent advisor_auctions row (flow_type='accept',
 *      source='open_to_offers') carrying the consumer's REAL contact details,
 *      ALREADY accepted by the pitching adviser (accepted_by_professional_id +
 *      accepted_at set, accept_credits_cost=0 — the adviser already paid for
 *      the pitch). This makes /briefs/[slug] reveal contact + mount the chat,
 *      inheriting SLA / dispute / booking machinery with no new chat rails.
 *   3. Marks the pitch accepted + links brief_id.
 *
 * The consumer's contact details are passed in by the authenticated route
 * (resolved from auth.users / user_profiles) — never read from the snapshot
 * (which is anonymised). No credits move here.
 */
export async function acceptPitch(input: {
  userId: string;
  pitchId: string;
  contactEmail: string;
  contactName: string | null;
  contactPhone: string | null;
}): Promise<AcceptPitchResult> {
  const admin = createAdminClient();

  // 1. Load pitch + its prospect, assert ownership + pending.
  const { data: pitchRow } = await admin
    .from("advisor_pitches")
    .select("*, prospect_pool!inner(user_id, snapshot)")
    .eq("id", input.pitchId)
    .maybeSingle();
  if (!pitchRow) return { ok: false, reason: "pitch_not_found" };
  const pitch = pitchRow as unknown as AdvisorPitchRow & {
    prospect_pool: { user_id: string; snapshot: ProspectSnapshot };
  };
  if (pitch.prospect_pool.user_id !== input.userId) {
    return { ok: false, reason: "pitch_not_found" };
  }
  if (pitch.status !== "pending") return { ok: false, reason: "not_pending" };

  // 2. Resolve the adviser (for the brief acceptance + email).
  const { data: pro } = await admin
    .from("professionals")
    .select("id, name, email")
    .eq("id", pitch.professional_id)
    .maybeSingle();
  if (!pro) return { ok: false, reason: "adviser_missing" };
  const adviser = pro as { id: number; name: string; email: string | null };

  // 3. Create the brief-equivalent, already accepted by the pitching adviser.
  const snapshot = pitch.prospect_pool.snapshot;
  const title = snapshot.advisorTypeLabel
    ? `${snapshot.advisorTypeLabel} enquiry`
    : "Adviser enquiry";
  const slug = `offer-${slugify(title)}-${Date.now().toString(36)}`;
  const nowIso = new Date().toISOString();
  const endsAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const description = [
    snapshot.goal ? `Goal: ${snapshot.goal}` : null,
    snapshot.state ? `State: ${snapshot.state}` : null,
    snapshot.budgetBand ? `Budget band: ${snapshot.budgetBand}` : null,
    snapshot.timeline ? `Timeline: ${snapshot.timeline}` : null,
  ]
    .filter(Boolean)
    .join("\n") || "Accepted via Open to Offers.";

  const { data: brief, error: briefErr } = await admin
    .from("advisor_auctions")
    .insert({
      flow_type: "accept",
      source: "open_to_offers",
      is_public: false,
      slug,
      job_title: title,
      job_description: description,
      budget_band: snapshot.budgetBand ?? "not_sure",
      advisor_types: snapshot.advisorType ? [dbTypeForNeed(snapshot.advisorType)].filter(Boolean) : [],
      location: snapshot.state ?? null,
      contact_name: input.contactName,
      contact_email: input.contactEmail.toLowerCase().trim(),
      contact_phone: input.contactPhone,
      status: "open",
      ends_at: endsAt,
      brief_template: "general",
      brief_payload: { source: "open_to_offers", pitch_id: pitch.id },
      accept_credits_cost: 0, // adviser already paid for the pitch — no double-charge
      // Already accepted by the pitching adviser.
      accepted_by_professional_id: adviser.id,
      accepted_at: nowIso,
      tracker_status: "new",
      risk_flags: [],
      risk_review_status: "clear",
    })
    .select("id, slug")
    .single();
  if (briefErr || !brief) {
    log.error("acceptPitch: brief insert failed", { error: briefErr?.message });
    return { ok: false, reason: "error" };
  }

  // Tracker event so the brief timeline reads correctly.
  await admin.from("brief_tracker_events").insert({
    brief_id: brief.id,
    event_type: "accepted",
    actor_kind: "professional",
    actor_id: String(adviser.id),
    payload: { source: "open_to_offers", pitch_id: pitch.id, credits: 0 },
  });

  // 4. Mark the pitch accepted + link the brief.
  await admin
    .from("advisor_pitches")
    .update({ status: "accepted", brief_id: brief.id as number, decided_at: nowIso })
    .eq("id", pitch.id);

  return {
    ok: true,
    briefSlug: brief.slug as string,
    briefId: brief.id as number,
    adviserEmail: adviser.email,
    adviserName: adviser.name,
    snapshot,
  };
}

export type DeclinePitchResult =
  | { ok: true; creditsRefunded: number; adviserEmail: string | null; adviserName: string; snapshot: ProspectSnapshot }
  | { ok: false; reason: "pitch_not_found" | "not_pending" };

/**
 * Consumer declines a pitch silently. Refunds the adviser's credits via the
 * established refund primitive (recordLedgerEntry 'lead_dispute_refund',
 * idempotent on the pitch id) and marks the pitch declined (which auto-
 * suppresses that adviser from re-pitching this prospect via the cap-of-1 +
 * declined-status check in sendPitch).
 */
export async function declinePitch(input: {
  userId: string;
  pitchId: string;
}): Promise<DeclinePitchResult> {
  const admin = createAdminClient();

  const { data: pitchRow } = await admin
    .from("advisor_pitches")
    .select("*, prospect_pool!inner(user_id, snapshot)")
    .eq("id", input.pitchId)
    .maybeSingle();
  if (!pitchRow) return { ok: false, reason: "pitch_not_found" };
  const pitch = pitchRow as unknown as AdvisorPitchRow & {
    prospect_pool: { user_id: string; snapshot: ProspectSnapshot };
  };
  if (pitch.prospect_pool.user_id !== input.userId) {
    return { ok: false, reason: "pitch_not_found" };
  }
  if (pitch.status !== "pending") return { ok: false, reason: "not_pending" };

  // Mark declined first so a double-submit can't double-refund (the second
  // call sees not_pending). The refund itself is also idempotent on pitch id.
  const nowIso = new Date().toISOString();
  await admin
    .from("advisor_pitches")
    .update({ status: "declined", decided_at: nowIso })
    .eq("id", pitch.id);

  let creditsRefunded = 0;
  if (pitch.credits_cost > 0) {
    try {
      const result = await recordLedgerEntry({
        professionalId: pitch.professional_id,
        amountCents: pitch.credits_cost * CENTS_PER_CREDIT,
        kind: "lead_dispute_refund",
        description: `Pitch declined — refund (open to offers)`,
        referenceType: "advisor_pitch_refund",
        referenceId: pitch.id,
        metadata: { prospect_id: pitch.prospect_id, credits: pitch.credits_cost },
      });
      creditsRefunded = result.idempotent ? 0 : pitch.credits_cost;
    } catch (err) {
      log.error("declinePitch refund failed", {
        pitchId: pitch.id,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const { data: pro } = await admin
    .from("professionals")
    .select("name, email")
    .eq("id", pitch.professional_id)
    .maybeSingle();

  return {
    ok: true,
    creditsRefunded,
    adviserEmail: (pro?.email as string | null) ?? null,
    adviserName: (pro?.name as string | null) ?? "there",
    snapshot: pitch.prospect_pool.snapshot,
  };
}
