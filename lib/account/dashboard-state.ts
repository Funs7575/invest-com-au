/**
 * Account dashboard state — derives the "what's next" hero card +
 * activity feed for /account. Pure-ish: each query is a single Supabase
 * round-trip, no joins, fail-soft on errors.
 *
 * Hero priority (highest signal first):
 *   1. Unaccepted-quote awaiting consumer review (we sent them a fixed
 *      quote and they haven't responded)
 *   2. Brief accepted by a pro — pro should be in touch soon
 *   3. Brief still open — providers reviewing
 *   4. Action plan saved but no brief — finish the funnel
 *   5. Action plan partial (Get Matched abandoned mid-quiz) — resume
 *   6. Nothing yet — encourage Get Matched
 */

// eslint-disable-next-line no-restricted-imports -- the account dashboard does cross-table reads scoped to the calling user. Service-role keeps the page server-rendered without RLS-tuning every join.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("account:dashboard-state");

export type HeroKind =
  | "quote_awaiting_review"
  | "brief_accepted"
  | "brief_open"
  | "plan_saved_no_brief"
  | "plan_in_progress"
  | "empty";

export interface HeroCard {
  kind: HeroKind;
  title: string;
  body: string;
  cta_label: string;
  cta_href: string;
}

export interface FeedItem {
  id: string;
  kind: "plan" | "brief_event" | "outcome";
  title: string;
  body: string | null;
  href: string;
  at: string;
}

export interface DashboardState {
  hero: HeroCard;
  kpis: {
    plans: number;
    briefs: number;
    quotes_awaiting: number;
  };
  feed: FeedItem[];
}

export async function loadDashboardState(input: {
  authUserId: string;
  email: string | null;
}): Promise<DashboardState> {
  const admin = createAdminClient();
  const email = input.email;

  // Pull all in-parallel.
  const [plansRes, briefsRes, quotesRes] = await Promise.all([
    admin
      .from("get_matched_action_plans")
      .select("id, status, route, goal, intent_slug, linked_brief_id, updated_at, share_token")
      .eq("auth_user_id", input.authUserId)
      .order("updated_at", { ascending: false })
      .limit(20),
    // Briefs we can attribute to the user — by contact_email (most
    // reliable: the brief flow always records this) or by linked plan.
    email
      ? admin
          .from("advisor_auctions")
          .select(
            "id, slug, job_title, status, tracker_status, accepted_at, accepted_by_team_id, accepted_by_professional_id, contact_email, created_at",
          )
          .eq("contact_email", email)
          .eq("flow_type", "accept")
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null }),
    // Fixed-price quotes awaiting consumer review.
    email
      ? (async () => {
          try {
            const result = await admin
              .from("team_fixed_quotes")
              .select(
                "id, review_token, status, amount_cents, expires_at, brief_id, sent_at",
              )
              .eq("status", "sent")
              .order("sent_at", { ascending: false })
              .limit(10);
            if (!result.data || result.data.length === 0)
              return { data: [] as Array<Record<string, unknown>>, error: null };
            const briefIds = result.data.map((q) => q.brief_id as number);
            const { data: matching } = await admin
              .from("advisor_auctions")
              .select("id")
              .in("id", briefIds)
              .eq("contact_email", email);
            const ownedIds = new Set((matching ?? []).map((b) => b.id as number));
            return {
              data: result.data.filter((q) =>
                ownedIds.has(q.brief_id as number),
              ) as Array<Record<string, unknown>>,
              error: null,
            };
          } catch {
            return { data: [] as Array<Record<string, unknown>>, error: null };
          }
        })()
      : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null }),
  ]);

  if (plansRes.error) log.warn("plans fetch failed", { err: plansRes.error.message });
  const plans = (plansRes.data ?? []) as Array<{
    id: number;
    status: string;
    route: string | null;
    goal: string | null;
    intent_slug: string | null;
    linked_brief_id: number | null;
    updated_at: string;
    share_token: string;
  }>;
  const briefs = (briefsRes.data ?? []) as Array<{
    id: number;
    slug: string;
    job_title: string;
    status: string;
    tracker_status: string | null;
    accepted_at: string | null;
    accepted_by_team_id: number | null;
    accepted_by_professional_id: number | null;
    created_at: string;
  }>;
  const quotes = (quotesRes.data ?? []) as Array<{
    id: number;
    review_token: string;
    status: string;
    amount_cents: number;
    expires_at: string;
    brief_id: number;
    sent_at: string;
  }>;

  const hero = pickHero({ plans, briefs, quotes });

  // ── Activity feed (most recent across plans + brief events) ──
  const feed: FeedItem[] = [];
  for (const p of plans.slice(0, 5)) {
    feed.push({
      id: `plan-${p.id}`,
      kind: "plan",
      title: p.goal
        ? `Plan: ${p.goal}`
        : `Action plan${p.intent_slug ? ` — ${p.intent_slug.replace(/_/g, " ")}` : ""}`,
      body: `Status: ${p.status}${p.route ? ` · route ${p.route}` : ""}`,
      href: `/account/plans/${p.id}`,
      at: p.updated_at,
    });
  }
  for (const b of briefs.slice(0, 5)) {
    feed.push({
      id: `brief-${b.id}`,
      kind: "brief_event",
      title: b.job_title,
      body: b.accepted_at
        ? `Accepted ${new Date(b.accepted_at).toLocaleDateString("en-AU", { dateStyle: "medium" })}`
        : `Status: ${b.tracker_status ?? b.status}`,
      href: `/briefs/${b.slug}`,
      at: b.accepted_at ?? b.created_at,
    });
  }
  feed.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    hero,
    kpis: {
      plans: plans.length,
      briefs: briefs.length,
      quotes_awaiting: quotes.length,
    },
    feed: feed.slice(0, 10),
  };
}

export interface HeroInputs {
  plans: Array<{ id: number; status: string; share_token: string; updated_at?: string }>;
  briefs: Array<{
    slug: string;
    status: string;
    accepted_at: string | null;
  }>;
  quotes: Array<{
    review_token: string;
    amount_cents: number;
    expires_at: string;
  }>;
}

/**
 * Pure hero-selection logic, separated so unit tests can pin down
 * the priority order without mocking Supabase.
 */
export function pickHero({ plans, briefs, quotes }: HeroInputs): HeroCard {
  if (quotes.length > 0) {
    const q = quotes[0]!;
    return {
      kind: "quote_awaiting_review",
      title: "You have a quote to review",
      body: `A$${(q.amount_cents / 100).toLocaleString("en-AU")} — review and accept or decline before ${new Date(q.expires_at).toLocaleDateString("en-AU", { dateStyle: "medium" })}.`,
      cta_label: "Review quote",
      cta_href: `/quote/${q.review_token}`,
    };
  }
  if (briefs.length > 0) {
    const accepted = briefs.find((b) => b.accepted_at !== null);
    if (accepted) {
      return {
        kind: "brief_accepted",
        title: "A verified pro accepted your Match Request",
        body: "They'll be in touch shortly — usually within 1-2 business days.",
        cta_label: "View status",
        cta_href: `/briefs/${accepted.slug}`,
      };
    }
    const open = briefs.find((b) => b.status === "open" && b.accepted_at === null);
    if (open) {
      return {
        kind: "brief_open",
        title: "Verified pros are reviewing your Match Request",
        body: "First to accept gets exclusive contact unlock — you'll be notified by email.",
        cta_label: "View status",
        cta_href: `/briefs/${open.slug}`,
      };
    }
  }
  return heroForPlans(plans);
}

function heroForPlans(
  plans: Array<{ status: string; share_token: string; id: number; updated_at?: string }>,
): HeroCard {
  const savedPlan = plans.find((p) => p.status === "saved" || p.status === "converted");
  const draftPlan = plans.find((p) => p.status === "draft");
  if (savedPlan && !plans.some((p) => p.status === "converted")) {
    // Plan-aging nudge: after 14 days of sitting saved, escalate the hero
    // copy from passive "ready to get quotes" to active "still considering?".
    const ageDays =
      savedPlan.updated_at != null
        ? Math.floor(
            (Date.now() - new Date(savedPlan.updated_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;
    if (ageDays >= 14) {
      return {
        kind: "plan_saved_no_brief",
        title: "Still considering? Send your Match Request",
        body: `Your action plan has been saved for ${ageDays} days. Verified pros usually respond within 24 hours — get quotes now.`,
        cta_label: "Send Match Request",
        cta_href: `/briefs/new?plan_id=${savedPlan.id}&utm_source=plan_age_nudge`,
      };
    }
    return {
      kind: "plan_saved_no_brief",
      title: "Ready to get quotes?",
      body: "Your action plan is saved. Next step: send a Match Request to verified Australian pros.",
      cta_label: "Get quotes",
      cta_href: `/briefs/new?plan_id=${savedPlan.id}`,
    };
  }
  if (draftPlan) {
    return {
      kind: "plan_in_progress",
      title: "Pick up where you left off",
      body: "Your action plan is half-built. Finish it in under a minute.",
      cta_label: "Continue",
      cta_href: "/get-matched",
    };
  }
  return {
    kind: "empty",
    title: "Build your investment action plan",
    body: "Answer 5-7 quick questions and get matched with the right platforms, opportunities, or verified pros.",
    cta_label: "Get matched",
    cta_href: "/get-matched",
  };
}
