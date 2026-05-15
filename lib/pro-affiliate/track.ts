/**
 * Pro affiliate program — click + attribution + credit award.
 *
 * Three integration hooks (called from elsewhere in the app):
 *   - recordClick           when /p/[token] is loaded or /api/pro-affiliate/[token] is hit
 *   - attributeSignup       called by the signup path with the session_id
 *   - attributeBriefCreated called after a brief is inserted
 *   - awardCredits          called by any of the above and by the brief-accept route
 *
 * All four are designed to be fire-and-forget: they never throw. Errors
 * are logged via `logger("pro-affiliate:track")` and swallowed so the
 * caller's primary flow always wins.
 */

// eslint-disable-next-line no-restricted-imports -- service-role legitimate per CLAUDE.md: pro_affiliate_* tables are deny-all-anon (no authenticated INSERT policy); cross-user lookups (email → auth user → click session) can't be scoped to auth.uid().
import { createAdminClient } from "@/lib/supabase/admin";

import { logger } from "@/lib/logger";

import { getCreditAwardForEvent } from "./rates";
import {
  ATTRIBUTION_WINDOW_DAYS,
  type AffiliateSourceEvent,
  type ProAffiliateLink,
  type ProKind,
} from "./types";

const log = logger("pro-affiliate:track");

export interface RecordClickInput {
  token: string;
  sessionId?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  landingPage?: string | null;
}

/**
 * Insert one row in `pro_affiliate_clicks` + bump the counter on the
 * parent link. Fire-and-forget. Returns the resolved link row (so the
 * caller can decide where to redirect) or null on miss / error.
 */
export async function recordClick({
  token,
  sessionId,
  ipHash,
  userAgent,
  landingPage,
}: RecordClickInput): Promise<ProAffiliateLink | null> {
  if (!token) return null;
  const admin = createAdminClient();

  try {
    const { data: link } = await admin
      .from("pro_affiliate_links")
      .select("*")
      .eq("share_token", token)
      .maybeSingle();
    if (!link) return null;

    await admin.from("pro_affiliate_clicks").insert({
      share_token: token,
      session_id: sessionId ?? null,
      ip_hash: ipHash ?? null,
      user_agent: userAgent ?? null,
      landing_page: landingPage ?? null,
    });

    await admin
      .from("pro_affiliate_links")
      .update({
        click_count: ((link as { click_count?: number }).click_count ?? 0) + 1,
        last_clicked_at: new Date().toISOString(),
      })
      .eq("share_token", token);

    return link as unknown as ProAffiliateLink;
  } catch (err) {
    log.warn("recordClick failed (swallowed)", {
      token,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export interface AttributeSignupInput {
  sessionId: string;
  userId: string;
}

/**
 * Mark the most recent click for `sessionId` (within the attribution
 * window) as attributed to `userId`, award signup credits to the
 * referring pro, and bump the link's signup_count.
 *
 * Returns `true` when an attribution row was updated (an actual
 * referral was credited), `false` otherwise.
 */
export async function attributeSignup({
  sessionId,
  userId,
}: AttributeSignupInput): Promise<boolean> {
  if (!sessionId || !userId) return false;
  const admin = createAdminClient();
  const since = new Date(
    Date.now() - ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    const { data: click } = await admin
      .from("pro_affiliate_clicks")
      .select("id, share_token")
      .eq("session_id", sessionId)
      .is("attributed_user_id", null)
      .gte("clicked_at", since)
      .order("clicked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!click) return false;

    await admin
      .from("pro_affiliate_clicks")
      .update({ attributed_user_id: userId })
      .eq("id", click.id);

    const { data: link } = await admin
      .from("pro_affiliate_links")
      .select("pro_slug, pro_kind, signup_count")
      .eq("share_token", click.share_token)
      .maybeSingle();
    if (!link) return true; // click attributed but link gone — odd but tolerable.

    await admin
      .from("pro_affiliate_links")
      .update({
        signup_count:
          ((link as { signup_count?: number }).signup_count ?? 0) + 1,
      })
      .eq("share_token", click.share_token);

    await awardCredits({
      proSlug: link.pro_slug as string,
      proKind: link.pro_kind as ProKind,
      sourceEvent: "signup",
      userId,
    });

    return true;
  } catch (err) {
    log.warn("attributeSignup failed (swallowed)", {
      sessionId,
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export interface AttributeSignupByTokenInput {
  token: string;
  userId: string;
  sessionId?: string | null;
}

/**
 * Variant for the auth-callback path where we know the `ref` cookie
 * (= the share_token) and the freshly created auth user, but not the
 * pre-signup session_id reliably. Picks the most recent click for the
 * token within the attribution window, attributes the user, and awards
 * signup credits.
 */
export async function attributeSignupByToken({
  token,
  userId,
  sessionId,
}: AttributeSignupByTokenInput): Promise<boolean> {
  if (!token || !userId) return false;

  // If we have the session_id, prefer the precise session-scoped path —
  // it matches the spec's `attributeSignup` semantics exactly.
  if (sessionId) {
    const attributed = await attributeSignup({ sessionId, userId });
    if (attributed) return true;
  }

  const admin = createAdminClient();
  const since = new Date(
    Date.now() - ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    const { data: click } = await admin
      .from("pro_affiliate_clicks")
      .select("id, share_token")
      .eq("share_token", token)
      .is("attributed_user_id", null)
      .gte("clicked_at", since)
      .order("clicked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!click) return false;

    await admin
      .from("pro_affiliate_clicks")
      .update({ attributed_user_id: userId })
      .eq("id", click.id);

    const { data: link } = await admin
      .from("pro_affiliate_links")
      .select("pro_slug, pro_kind, signup_count")
      .eq("share_token", token)
      .maybeSingle();
    if (!link) return true;

    await admin
      .from("pro_affiliate_links")
      .update({
        signup_count:
          ((link as { signup_count?: number }).signup_count ?? 0) + 1,
      })
      .eq("share_token", token);

    await awardCredits({
      proSlug: link.pro_slug as string,
      proKind: link.pro_kind as ProKind,
      sourceEvent: "signup",
      userId,
    });

    return true;
  } catch (err) {
    log.warn("attributeSignupByToken failed (swallowed)", {
      token,
      userId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export interface AttributeBriefCreatedInput {
  contactEmail: string;
  briefId: number;
}

/**
 * Called after a brief insert. Looks up the auth user for `contactEmail`,
 * then finds the most recent attributed click for that user within the
 * attribution window, awards brief_created credits to the referring pro,
 * and bumps the link's brief_count.
 *
 * Returns true when credits were awarded.
 */
export async function attributeBriefCreated({
  contactEmail,
  briefId,
}: AttributeBriefCreatedInput): Promise<boolean> {
  if (!contactEmail || !briefId) return false;
  const admin = createAdminClient();
  const since = new Date(
    Date.now() - ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    // contactEmail → auth.users.id (cross-user lookup; service-role required).
    const { data: userRow } = await admin
      .from("auth.users")
      .select("id")
      .eq("email", contactEmail.toLowerCase().trim())
      .maybeSingle();

    // auth schema is not directly queryable via PostgREST in many setups.
    // Fall back to a brief-side lookup keyed by attributed_user_id we
    // already stamped on the click during attributeSignup.
    let userId: string | null = (userRow as { id?: string } | null)?.id ?? null;

    if (!userId) {
      // No auth user (anonymous brief) — try matching via prior clicks
      // recorded under the same email as session_id (some signup forms
      // stamp the email into the session). Fall through if none.
      const { data: priorClick } = await admin
        .from("pro_affiliate_clicks")
        .select("share_token, attributed_user_id")
        .eq("session_id", contactEmail.toLowerCase().trim())
        .not("attributed_user_id", "is", null)
        .gte("clicked_at", since)
        .order("clicked_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      userId = (priorClick as { attributed_user_id?: string } | null)
        ?.attributed_user_id ?? null;
    }

    if (!userId) return false;

    const { data: click } = await admin
      .from("pro_affiliate_clicks")
      .select("share_token")
      .eq("attributed_user_id", userId)
      .gte("clicked_at", since)
      .order("clicked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!click) return false;

    const { data: link } = await admin
      .from("pro_affiliate_links")
      .select("pro_slug, pro_kind, brief_count")
      .eq("share_token", click.share_token)
      .maybeSingle();
    if (!link) return false;

    await admin
      .from("pro_affiliate_links")
      .update({
        brief_count: ((link as { brief_count?: number }).brief_count ?? 0) + 1,
      })
      .eq("share_token", click.share_token);

    await awardCredits({
      proSlug: link.pro_slug as string,
      proKind: link.pro_kind as ProKind,
      sourceEvent: "brief_created",
      briefId,
      userId,
    });

    return true;
  } catch (err) {
    log.warn("attributeBriefCreated failed (swallowed)", {
      contactEmail,
      briefId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export interface AwardCreditsInput {
  proSlug: string;
  proKind: ProKind;
  sourceEvent: AffiliateSourceEvent;
  briefId?: number | null;
  userId?: string | null;
}

/**
 * Insert one row in `pro_affiliate_credits`. Fire-and-forget; never
 * throws. The actual credit payout into `advisor_credit_ledger` happens
 * in a later admin-batch step so this hot path stays cheap.
 */
export async function awardCredits({
  proSlug,
  proKind,
  sourceEvent,
  briefId,
  userId,
}: AwardCreditsInput): Promise<void> {
  const credits = getCreditAwardForEvent(sourceEvent);
  if (credits <= 0) return;
  const admin = createAdminClient();

  try {
    await admin.from("pro_affiliate_credits").insert({
      pro_slug: proSlug,
      pro_kind: proKind,
      source_event: sourceEvent,
      credits_awarded: credits,
      attributed_brief_id: briefId ?? null,
      attributed_user_id: userId ?? null,
    });
  } catch (err) {
    log.warn("awardCredits insert failed (swallowed)", {
      proSlug,
      proKind,
      sourceEvent,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

export interface AttributeBriefAcceptedInput {
  briefId: number;
}

/**
 * Called by the brief-accept route after a successful acceptance.
 * Looks up the brief's contact_email → most recent attributed click,
 * awards brief_accepted credits.
 *
 * Separate from attributeBriefCreated because the accept hook only has
 * the briefId in scope, not the contact email.
 */
export async function attributeBriefAccepted({
  briefId,
}: AttributeBriefAcceptedInput): Promise<boolean> {
  if (!briefId) return false;
  const admin = createAdminClient();
  const since = new Date(
    Date.now() - ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  try {
    const { data: brief } = await admin
      .from("advisor_auctions")
      .select("contact_email")
      .eq("id", briefId)
      .maybeSingle();
    const email = (brief as { contact_email?: string } | null)?.contact_email;
    if (!email) return false;

    // Same email → user → click path as attributeBriefCreated.
    const { data: userRow } = await admin
      .from("auth.users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    const userId: string | null =
      (userRow as { id?: string } | null)?.id ?? null;
    if (!userId) return false;

    const { data: click } = await admin
      .from("pro_affiliate_clicks")
      .select("share_token")
      .eq("attributed_user_id", userId)
      .gte("clicked_at", since)
      .order("clicked_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!click) return false;

    const { data: link } = await admin
      .from("pro_affiliate_links")
      .select("pro_slug, pro_kind")
      .eq("share_token", click.share_token)
      .maybeSingle();
    if (!link) return false;

    await awardCredits({
      proSlug: link.pro_slug as string,
      proKind: link.pro_kind as ProKind,
      sourceEvent: "brief_accepted",
      briefId,
      userId,
    });

    return true;
  } catch (err) {
    log.warn("attributeBriefAccepted failed (swallowed)", {
      briefId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Aggregate stats for one pro's affiliate dashboard.
 */
export interface ProAffiliateStats {
  click_count: number;
  signup_count: number;
  brief_count: number;
  credits_earned: number;
}

export async function getStatsForPro({
  proSlug,
  proKind,
}: {
  proSlug: string;
  proKind: ProKind;
}): Promise<ProAffiliateStats> {
  const admin = createAdminClient();
  const empty: ProAffiliateStats = {
    click_count: 0,
    signup_count: 0,
    brief_count: 0,
    credits_earned: 0,
  };
  try {
    const { data: link } = await admin
      .from("pro_affiliate_links")
      .select("click_count, signup_count, brief_count")
      .eq("pro_slug", proSlug)
      .eq("pro_kind", proKind)
      .maybeSingle();

    const { data: credits } = await admin
      .from("pro_affiliate_credits")
      .select("credits_awarded")
      .eq("pro_slug", proSlug)
      .eq("pro_kind", proKind);

    const creditsEarned = (credits ?? []).reduce(
      (sum, c) =>
        sum + Number((c as { credits_awarded?: number }).credits_awarded ?? 0),
      0,
    );

    return {
      click_count: Number(
        (link as { click_count?: number } | null)?.click_count ?? 0,
      ),
      signup_count: Number(
        (link as { signup_count?: number } | null)?.signup_count ?? 0,
      ),
      brief_count: Number(
        (link as { brief_count?: number } | null)?.brief_count ?? 0,
      ),
      credits_earned: creditsEarned,
    };
  } catch (err) {
    log.warn("getStatsForPro failed", {
      proSlug,
      proKind,
      err: err instanceof Error ? err.message : String(err),
    });
    return empty;
  }
}
