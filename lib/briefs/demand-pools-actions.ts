/**
 * Group Briefs — read queries + write actions (adviser offers, member
 * accept/decline). Split from the clustering engine in `demand-pools.ts` the
 * same way the brief routes are split from `standing-orders.ts`.
 *
 * Every export is flag-gated (`demand_pools`, fail-closed) and fail-soft: with
 * the flag off, reads return empty and writes refuse. Money: a member accept
 * reuses the established `acceptBrief` path at a volume discount — it does NOT
 * fork the ledger. Local row types come from `demand-pools.ts`.
 */

// eslint-disable-next-line no-restricted-imports -- demand_pools / pool_members / pool_offers are service_role-only (anonymous email-keyed surfaces); the adviser inbox reads through an authed advisor session and the consumer accept gates on email-as-key. Service-role is the correct path per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isFlagEnabled } from "@/lib/feature-flags";

import { acceptBrief, getAcceptCost } from "./credits";
import { notifyConsumerOfAcceptance } from "./notify";
import {
  DEMAND_POOLS_FLAG,
  DEFAULT_POOL_MIN_SIZE,
  POOL_ACCEPT_DISCOUNT_PCT,
  buildBudgetDistribution,
  discountedAcceptCost,
  isPoolExpiredForRead,
  markPoolExpiredIfDue,
  type BudgetDistribution,
  type DemandPoolRow,
  type PoolOfferRow,
} from "./demand-pools";

import type { BriefRow, BriefTemplate, ProviderKind } from "./types";

const log = logger("briefs:demand-pools-actions");

/** Max length enforced on a group-offer body (matches the DB CHECK). */
export const POOL_OFFER_MAX_BODY = 500;

// ─── Adviser inbox: pool cards ─────────────────────────────────────────────

export interface PoolCard {
  poolId: number;
  templateKey: string;
  state: string;
  period: string;
  status: string;
  /** Live (non-left) member count. */
  memberCount: number;
  minSize: number;
  /** Anonymised budget-band distribution (suppressed below n=3). */
  distribution: BudgetDistribution;
  /** This adviser's existing offer on the pool, if any. */
  myOffer: { id: number; body: string; package_rate_band: string | null; status: string } | null;
  /** Total active offers on the pool (so the adviser sees competition). */
  offerCount: number;
}

/**
 * Pool cards for the adviser inbox. Anonymised — no consumer identity ever
 * leaves this function; only counts and a suppressed budget distribution.
 *
 * A pool is shown to advisers that could see at least one of its member briefs
 * in their normal inbox (template parity). We keep it simple and supply-side
 * generous: any non-terminal pool whose template the adviser handles, in a
 * state they could serve, with at least `min_size` members.
 *
 * Flag-gated; returns [] when off or on any error (fail-soft, never 500s).
 */
export async function listPoolCardsForAdvisor(advisorId: number): Promise<PoolCard[]> {
  const enabled = await isFlagEnabled(DEMAND_POOLS_FLAG, { segment: "advisor" });
  if (!enabled) return [];

  try {
    const admin = createAdminClient();

    // Non-terminal pools that have reached their display threshold.
    const { data: poolRows, error: poolErr } = await admin
      .from("demand_pools")
      .select("*")
      .in("status", ["forming", "offered"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (poolErr) {
      log.warn("listPoolCardsForAdvisor pool read failed", { err: poolErr.message });
      return [];
    }
    const pools = (poolRows ?? []) as unknown as DemandPoolRow[];
    if (pools.length === 0) return [];

    // Lazily expire any pool whose period elapsed; drop it from the live view.
    const live: DemandPoolRow[] = [];
    for (const p of pools) {
      if (isPoolExpiredForRead(p)) {
        void markPoolExpiredIfDue(p);
        continue;
      }
      live.push(p);
    }
    if (live.length === 0) return [];

    const poolIds = live.map((p) => p.id);

    const [membersRes, offersRes, briefsForBands] = await Promise.all([
      admin
        .from("pool_members")
        .select("pool_id, brief_id, status")
        .in("pool_id", poolIds)
        .neq("status", "left"),
      admin
        .from("pool_offers")
        .select("id, pool_id, professional_id, body, package_rate_band, status")
        .in("pool_id", poolIds),
      // Budget bands of member briefs, for the suppressed distribution.
      admin
        .from("pool_members")
        .select("pool_id, brief_id")
        .in("pool_id", poolIds)
        .neq("status", "left"),
    ]);

    const members = membersRes.data ?? [];
    const offers = (offersRes.data ?? []) as Array<{
      id: number;
      pool_id: number;
      professional_id: number;
      body: string;
      package_rate_band: string | null;
      status: string;
    }>;

    // Hydrate budget bands for the member briefs in one query.
    const briefIds = (briefsForBands.data ?? []).map((m) => m.brief_id as number);
    const bandByBrief = new Map<number, string>();
    if (briefIds.length > 0) {
      const { data: briefRows } = await admin
        .from("advisor_auctions")
        .select("id, budget_band")
        .in("id", briefIds);
      for (const b of briefRows ?? []) {
        bandByBrief.set(b.id as number, (b.budget_band as string) ?? "not_sure");
      }
    }

    const cards: PoolCard[] = [];
    for (const pool of live) {
      const poolMembers = members.filter((m) => m.pool_id === pool.id);
      const memberCount = poolMembers.length;
      if (memberCount < (pool.min_size ?? DEFAULT_POOL_MIN_SIZE)) continue; // below display threshold

      const poolOffers = offers.filter((o) => o.pool_id === pool.id);
      const activeOffers = poolOffers.filter((o) => o.status === "active");
      const mine = poolOffers.find((o) => o.professional_id === advisorId) ?? null;

      const bands = poolMembers.map((m) => bandByBrief.get(m.brief_id as number));
      cards.push({
        poolId: pool.id,
        templateKey: pool.template_key,
        state: pool.state,
        period: pool.period,
        status: pool.status,
        memberCount,
        minSize: pool.min_size ?? DEFAULT_POOL_MIN_SIZE,
        distribution: buildBudgetDistribution(bands),
        myOffer: mine
          ? {
              id: mine.id,
              body: mine.body,
              package_rate_band: mine.package_rate_band,
              status: mine.status,
            }
          : null,
        offerCount: activeOffers.length,
      });
    }
    return cards;
  } catch (err) {
    log.warn("listPoolCardsForAdvisor threw", {
      advisorId,
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ─── Adviser action: submit a group offer ──────────────────────────────────

export interface SubmitOfferInput {
  poolId: number;
  professionalId: number;
  body: string;
  packageRateBand?: string | null;
}

export type SubmitOfferResult =
  | { ok: true; offer: PoolOfferRow; memberCount: number }
  | {
      ok: false;
      reason:
        | "flag_off"
        | "pool_not_found"
        | "pool_closed"
        | "already_offered"
        | "invalid"
        | "error";
    };

/**
 * Submit ONE structured group offer to a pool (one per adviser per pool,
 * enforced by the DB UNIQUE(pool_id, professional_id) + this guard). On the
 * first offer the pool flips 'forming' → 'offered'. Each member is then
 * notified (offer received).
 */
export async function submitPoolOffer(input: SubmitOfferInput): Promise<SubmitOfferResult> {
  const enabled = await isFlagEnabled(DEMAND_POOLS_FLAG, { segment: "advisor" });
  if (!enabled) return { ok: false, reason: "flag_off" };

  const body = input.body.trim();
  if (body.length === 0 || body.length > POOL_OFFER_MAX_BODY) {
    return { ok: false, reason: "invalid" };
  }

  try {
    const admin = createAdminClient();

    const { data: poolData } = await admin
      .from("demand_pools")
      .select("*")
      .eq("id", input.poolId)
      .maybeSingle();
    if (!poolData) return { ok: false, reason: "pool_not_found" };
    const pool = poolData as unknown as DemandPoolRow;

    if (pool.status === "closed" || pool.status === "expired" || isPoolExpiredForRead(pool)) {
      if (isPoolExpiredForRead(pool)) void markPoolExpiredIfDue(pool);
      return { ok: false, reason: "pool_closed" };
    }

    const { data: existing } = await admin
      .from("pool_offers")
      .select("id")
      .eq("pool_id", input.poolId)
      .eq("professional_id", input.professionalId)
      .maybeSingle();
    if (existing) return { ok: false, reason: "already_offered" };

    const { data: offer, error: insErr } = await admin
      .from("pool_offers")
      .insert({
        pool_id: input.poolId,
        professional_id: input.professionalId,
        body,
        package_rate_band: input.packageRateBand?.trim() || null,
      })
      .select("*")
      .single();
    if (insErr || !offer) {
      if (insErr?.code === "23505") return { ok: false, reason: "already_offered" };
      log.warn("submitPoolOffer insert failed", {
        poolId: input.poolId,
        err: insErr?.message,
      });
      return { ok: false, reason: "error" };
    }

    // First offer flips the pool to 'offered'.
    if (pool.status === "forming") {
      await admin
        .from("demand_pools")
        .update({ status: "offered", updated_at: new Date().toISOString() })
        .eq("id", input.poolId)
        .eq("status", "forming");
    }

    // Notify members (fire-and-forget; never blocks the response).
    const memberCount = await notifyPoolMembersOfOffer(
      input.poolId,
      input.professionalId,
      pool.template_key,
    );

    log.info("pool offer submitted", {
      poolId: input.poolId,
      professionalId: input.professionalId,
      offerId: offer.id,
    });
    return { ok: true, offer: offer as unknown as PoolOfferRow, memberCount };
  } catch (err) {
    log.warn("submitPoolOffer threw", {
      poolId: input.poolId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "error" };
  }
}

// ─── Consumer side: their brief's pool status ──────────────────────────────

export interface MemberOfferView {
  offerId: number;
  body: string;
  packageRateBand: string | null;
  status: string;
  /** Anonymised public summary of the offering adviser. */
  adviser: {
    name: string;
    slug: string | null;
    firmName: string | null;
    type: string | null;
    locationState: string | null;
    yearsExperience: number | null;
    verified: boolean;
  } | null;
  createdAt: string;
}

export interface MemberPoolView {
  poolId: number;
  memberCount: number;
  status: string;
  /** Discounted credits this member's accept costs the adviser (display). */
  offers: MemberOfferView[];
  /** Whether this member already accepted an offer (brief now claimed). */
  accepted: boolean;
}

/**
 * The pool view for a single member's brief tracker. Email-as-key auth is the
 * caller's responsibility (the tracker only assembles this for the verified
 * owner). Adviser identity is shown ONLY via the public profile summary.
 *
 * Flag-gated; returns null when off, when the brief isn't in a pool, or on any
 * error (fail-soft — the tracker simply doesn't render a pool section).
 */
export async function getMemberPoolView(briefId: number): Promise<MemberPoolView | null> {
  const enabled = await isFlagEnabled(DEMAND_POOLS_FLAG, { segment: "user" });
  if (!enabled) return null;

  try {
    const admin = createAdminClient();

    const { data: member } = await admin
      .from("pool_members")
      .select("pool_id, status")
      .eq("brief_id", briefId)
      .maybeSingle();
    if (!member) return null;

    const { data: poolData } = await admin
      .from("demand_pools")
      .select("*")
      .eq("id", member.pool_id as number)
      .maybeSingle();
    if (!poolData) return null;
    const pool = poolData as unknown as DemandPoolRow;
    const effectiveStatus = isPoolExpiredForRead(pool)
      ? await markPoolExpiredIfDue(pool)
      : pool.status;

    const { count: memberCount } = await admin
      .from("pool_members")
      .select("id", { count: "exact", head: true })
      .eq("pool_id", pool.id)
      .neq("status", "left");

    // Active offers on the pool. Members only ever see offers, never the
    // identities of other members.
    const { data: offerRows } = await admin
      .from("pool_offers")
      .select("id, professional_id, body, package_rate_band, status, created_at")
      .eq("pool_id", pool.id)
      .eq("status", "active")
      .order("created_at", { ascending: true });
    const offers = (offerRows ?? []) as Array<{
      id: number;
      professional_id: number;
      body: string;
      package_rate_band: string | null;
      status: string;
      created_at: string;
    }>;

    // Hydrate anonymised public adviser summaries.
    const proIds = Array.from(new Set(offers.map((o) => o.professional_id)));
    const proById = new Map<number, Record<string, unknown>>();
    if (proIds.length > 0) {
      const { data: pros } = await admin
        .from("professionals")
        .select("id, name, slug, firm_name, type, location_state, years_experience, verified")
        .in("id", proIds);
      for (const p of pros ?? []) proById.set(p.id as number, p as Record<string, unknown>);
    }

    const offerViews: MemberOfferView[] = offers.map((o) => {
      const p = proById.get(o.professional_id);
      return {
        offerId: o.id,
        body: o.body,
        packageRateBand: o.package_rate_band,
        status: o.status,
        adviser: p
          ? {
              name: (p.name as string) ?? "A verified pro",
              slug: (p.slug as string) ?? null,
              firmName: (p.firm_name as string) ?? null,
              type: (p.type as string) ?? null,
              locationState: (p.location_state as string) ?? null,
              yearsExperience: (p.years_experience as number) ?? null,
              verified: Boolean(p.verified),
            }
          : null,
        createdAt: o.created_at,
      };
    });

    return {
      poolId: pool.id,
      memberCount: memberCount ?? 0,
      status: effectiveStatus,
      offers: offerViews,
      accepted: member.status === "accepted",
    };
  } catch (err) {
    log.warn("getMemberPoolView threw", {
      briefId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ─── Consumer action: accept / decline a group offer ───────────────────────

export interface AcceptOfferInput {
  briefId: number;
  offerId: number;
  /** Verified consumer email (email-as-key auth, checked here). */
  consumerEmail: string;
}

export type AcceptOfferResult =
  | { ok: true; creditsCharged: number; professionalId: number }
  | {
      ok: false;
      reason:
        | "flag_off"
        | "not_member"
        | "offer_not_found"
        | "email_mismatch"
        | "already_accepted"
        | "insufficient_credits"
        | "not_acceptable"
        | "error";
    };

/**
 * A pool member accepts a specific group offer. This:
 *   1. verifies the caller is the brief's pool member (email-as-key),
 *   2. resolves the standard accept cost, applies the volume discount, and
 *   3. debits the offering adviser through the ESTABLISHED `acceptBrief`
 *      path with that discounted cost — same ledger, optimistic lock and
 *      rollback as any accept. The brief is claimed, contact unlocked, and
 *      the standard brief chat opens (brief is now an accepted brief).
 *
 * Decline is the absence of accept — see `declinePoolOffer` (records the
 * member as 'left' so they stop being offered to; no money moves).
 */
export async function acceptPoolOffer(input: AcceptOfferInput): Promise<AcceptOfferResult> {
  const enabled = await isFlagEnabled(DEMAND_POOLS_FLAG, { segment: "user" });
  if (!enabled) return { ok: false, reason: "flag_off" };

  const email = input.consumerEmail.toLowerCase().trim();

  try {
    const admin = createAdminClient();

    // Member + brief + offer, all in the same pool.
    const { data: member } = await admin
      .from("pool_members")
      .select("id, pool_id, brief_id, consumer_email, status")
      .eq("brief_id", input.briefId)
      .maybeSingle();
    if (!member) return { ok: false, reason: "not_member" };
    if (((member.consumer_email as string) ?? "").toLowerCase() !== email) {
      return { ok: false, reason: "email_mismatch" };
    }
    if (member.status === "accepted") return { ok: false, reason: "already_accepted" };

    const { data: offer } = await admin
      .from("pool_offers")
      .select("id, pool_id, professional_id, status")
      .eq("id", input.offerId)
      .eq("pool_id", member.pool_id as number)
      .maybeSingle();
    if (!offer || offer.status !== "active") return { ok: false, reason: "offer_not_found" };

    const professionalId = offer.professional_id as number;

    // Resolve the standard cost for this brief, then discount it. Reusing the
    // SAME getAcceptCost the inbox/create path uses — the discount is the only
    // delta, and it flows through acceptBrief's ledger debit.
    const { data: briefData } = await admin
      .from("advisor_auctions")
      .select("*")
      .eq("id", input.briefId)
      .maybeSingle();
    if (!briefData) return { ok: false, reason: "not_acceptable" };
    const brief = briefData as unknown as BriefRow;

    const providerKind: ProviderKind = await resolveProviderKind(professionalId);
    const baseCost = await getAcceptCost({
      briefTemplate: (brief.brief_template as BriefTemplate) ?? "general",
      providerKind,
    });
    const discounted = discountedAcceptCost(baseCost, POOL_ACCEPT_DISCOUNT_PCT);

    const result = await acceptBrief({
      briefId: input.briefId,
      professionalId,
      costOverride: discounted,
    });

    if (!result.accepted) {
      if (result.reason === "insufficient_credits") {
        return { ok: false, reason: "insufficient_credits" };
      }
      if (result.reason === "already_accepted") {
        return { ok: false, reason: "already_accepted" };
      }
      return { ok: false, reason: "not_acceptable" };
    }

    // Mark this member accepted; record the chosen offer on the brief tracker.
    await admin
      .from("pool_members")
      .update({ status: "accepted" })
      .eq("id", member.id as number);
    await admin.from("brief_tracker_events").insert({
      brief_id: input.briefId,
      event_type: "pool_offer_accepted",
      actor_kind: "user",
      actor_id: email,
      payload: {
        pool_id: member.pool_id,
        offer_id: input.offerId,
        professional_id: professionalId,
        credits_charged: result.creditsSpent,
        discount_pct: POOL_ACCEPT_DISCOUNT_PCT,
      },
    });

    // Notify the adviser their group offer was accepted + open the chat path.
    if (brief.contact_email) {
      void notifyConsumerOfAcceptance({
        consumerEmail: brief.contact_email,
        consumerName: brief.contact_name ?? "",
        briefTitle: brief.job_title || "Your Match Request",
        briefSlug: brief.slug,
        briefId: input.briefId,
        professionalId,
        teamId: null,
      }).catch((err) => {
        log.warn("pool accept consumer notify failed", {
          briefId: input.briefId,
          err: err instanceof Error ? err.message : String(err),
        });
      });
    }
    void notifyAdvisorOfPoolAccept(professionalId, brief, result.creditsSpent).catch((err) => {
      log.warn("pool accept advisor notify failed", {
        briefId: input.briefId,
        err: err instanceof Error ? err.message : String(err),
      });
    });

    log.info("pool offer accepted", {
      briefId: input.briefId,
      offerId: input.offerId,
      professionalId,
      credits: result.creditsSpent,
    });
    return { ok: true, creditsCharged: result.creditsSpent, professionalId };
  } catch (err) {
    log.warn("acceptPoolOffer threw", {
      briefId: input.briefId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "error" };
  }
}

export interface DeclineOfferInput {
  briefId: number;
  consumerEmail: string;
}

export type DeclineOfferResult =
  | { ok: true }
  | { ok: false; reason: "flag_off" | "not_member" | "email_mismatch" | "already_accepted" | "error" };

/**
 * A pool member declines — they leave the pool so advisers stop offering to
 * them. Nothing else happens (no money moves). Idempotent-ish: declining an
 * already-accepted membership is refused.
 */
export async function declinePoolOffer(input: DeclineOfferInput): Promise<DeclineOfferResult> {
  const enabled = await isFlagEnabled(DEMAND_POOLS_FLAG, { segment: "user" });
  if (!enabled) return { ok: false, reason: "flag_off" };

  const email = input.consumerEmail.toLowerCase().trim();
  try {
    const admin = createAdminClient();
    const { data: member } = await admin
      .from("pool_members")
      .select("id, consumer_email, status")
      .eq("brief_id", input.briefId)
      .maybeSingle();
    if (!member) return { ok: false, reason: "not_member" };
    if (((member.consumer_email as string) ?? "").toLowerCase() !== email) {
      return { ok: false, reason: "email_mismatch" };
    }
    if (member.status === "accepted") return { ok: false, reason: "already_accepted" };

    await admin
      .from("pool_members")
      .update({ status: "left" })
      .eq("id", member.id as number);
    await admin.from("brief_tracker_events").insert({
      brief_id: input.briefId,
      event_type: "pool_left",
      actor_kind: "user",
      actor_id: email,
      payload: {},
    });
    return { ok: true };
  } catch (err) {
    log.warn("declinePoolOffer threw", {
      briefId: input.briefId,
      err: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "error" };
  }
}

// ─── Internal helpers ──────────────────────────────────────────────────────

async function resolveProviderKind(professionalId: number): Promise<ProviderKind> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("professionals")
      .select("firm_id")
      .eq("id", professionalId)
      .maybeSingle();
    return data?.firm_id ? "firm" : "individual";
  } catch {
    return "individual";
  }
}

/**
 * Notify every active member of a pool that a new group offer arrived.
 * Returns the member count notified. Honors notification preference /
 * suppression via the shared mailer (sendPoolOfferReceived → resend
 * suppression). Fire-and-forget at the caller; this awaits the count only.
 */
async function notifyPoolMembersOfOffer(
  poolId: number,
  professionalId: number,
  templateKey: string,
): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data: members } = await admin
      .from("pool_members")
      .select("brief_id, consumer_email")
      .eq("pool_id", poolId)
      .neq("status", "left");
    const list = members ?? [];
    if (list.length === 0) return 0;

    // Adviser display name for the email.
    let advisorName = "A verified pro";
    const { data: pro } = await admin
      .from("professionals")
      .select("name")
      .eq("id", professionalId)
      .maybeSingle();
    if (pro?.name) advisorName = pro.name as string;

    // Brief slugs for deep links.
    const briefIds = list.map((m) => m.brief_id as number);
    const slugByBrief = new Map<number, string>();
    if (briefIds.length > 0) {
      const { data: briefRows } = await admin
        .from("advisor_auctions")
        .select("id, slug")
        .in("id", briefIds);
      for (const b of briefRows ?? []) slugByBrief.set(b.id as number, b.slug as string);
    }

    const { sendPoolOfferReceived } = await import("@/lib/marketplace-emails");
    for (const m of list) {
      const consumerEmail = m.consumer_email as string;
      if (!consumerEmail || !consumerEmail.includes("@")) continue;
      const slug = slugByBrief.get(m.brief_id as number);
      if (!slug) continue;
      void sendPoolOfferReceived({
        consumerEmail,
        briefSlug: slug,
        advisorName,
        templateKey,
        memberCount: list.length,
      });
    }
    return list.length;
  } catch (err) {
    log.warn("notifyPoolMembersOfOffer failed", {
      poolId,
      err: err instanceof Error ? err.message : String(err),
    });
    return 0;
  }
}

async function notifyAdvisorOfPoolAccept(
  professionalId: number,
  brief: BriefRow,
  creditsSpent: number,
): Promise<void> {
  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("name, email")
    .eq("id", professionalId)
    .maybeSingle();
  if (!pro?.email || typeof pro.email !== "string") return;
  const { sendProviderPoolOfferAccepted } = await import("@/lib/marketplace-emails");
  await sendProviderPoolOfferAccepted({
    providerEmail: pro.email,
    providerName: (pro.name as string) || "Pro",
    briefTitle: brief.job_title || "Match Request",
    briefSlug: brief.slug,
    briefId: brief.id,
    creditsSpent,
  });
}

export { DEFAULT_POOL_MIN_SIZE };
