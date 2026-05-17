/**
 * Unified timeline for /account/timeline — consolidates plans, briefs,
 * bookings, and dispute events into a single chronological view so the
 * user can see "everything happening" at one glance.
 *
 * Pure-ish: reads each table independently, merges + sorts in JS. The DB
 * touchpoints fail-safe on errors (each one returns an empty array on read
 * failure so a single broken table doesn't take out the timeline).
 */
// eslint-disable-next-line no-restricted-imports -- the timeline does cross-table reads scoped to the calling user; service-role keeps the page server-rendered without RLS-tuning every join.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("account:timeline");

export type TimelineKind =
  | "plan_started"
  | "plan_saved"
  | "brief_submitted"
  | "brief_accepted"
  | "quote_received"
  | "consultation_booked"
  | "outcome_submitted";

export interface TimelineItem {
  id: string;
  kind: TimelineKind;
  title: string;
  body: string | null;
  href: string;
  at: string;
}

export async function loadTimeline(input: {
  authUserId: string;
  email: string | null;
}): Promise<TimelineItem[]> {
  const admin = createAdminClient();
  const email = input.email;

  const [plansRes, briefsRes, quotesRes, bookingsRes] = await Promise.all([
    admin
      .from("get_matched_action_plans")
      .select("id, status, route, goal, intent_slug, updated_at, created_at, share_token")
      .eq("auth_user_id", input.authUserId)
      .order("updated_at", { ascending: false })
      .limit(20),
    email
      ? admin
          .from("advisor_auctions")
          .select(
            "id, slug, job_title, status, tracker_status, accepted_at, contact_email, created_at",
          )
          .eq("contact_email", email)
          .eq("flow_type", "accept")
          .order("created_at", { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null }),
    email
      ? (async () => {
          try {
            const result = await admin
              .from("team_fixed_quotes")
              .select("id, review_token, status, amount_cents, sent_at, brief_id")
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
    email
      ? (async () => {
          try {
            const result = await admin
              .from("consultation_bookings")
              .select("id, brief_id, status, created_at, meet_url")
              .eq("consumer_email", email)
              .order("created_at", { ascending: false })
              .limit(10);
            return {
              data: (result.data ?? []) as Array<Record<string, unknown>>,
              error: null,
            };
          } catch {
            return { data: [] as Array<Record<string, unknown>>, error: null };
          }
        })()
      : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null }),
  ]);

  if (plansRes.error) log.warn("timeline plans fetch failed", { err: plansRes.error.message });

  const items: TimelineItem[] = [];

  for (const p of (plansRes.data ?? []) as Array<{
    id: number;
    status: string;
    goal: string | null;
    intent_slug: string | null;
    created_at: string;
    updated_at: string;
  }>) {
    const label = p.goal ?? p.intent_slug?.replace(/_/g, " ") ?? "Action plan";
    items.push({
      id: `plan-start-${p.id}`,
      kind: "plan_started",
      title: "Started action plan",
      body: label,
      href: `/account/plans/${p.id}`,
      at: p.created_at,
    });
    if (p.status === "saved" || p.status === "converted") {
      items.push({
        id: `plan-saved-${p.id}`,
        kind: "plan_saved",
        title: "Saved action plan",
        body: label,
        href: `/account/plans/${p.id}`,
        at: p.updated_at,
      });
    }
  }

  for (const b of (briefsRes.data ?? []) as Array<{
    id: number;
    slug: string;
    job_title: string;
    accepted_at: string | null;
    created_at: string;
  }>) {
    items.push({
      id: `brief-sub-${b.id}`,
      kind: "brief_submitted",
      title: "Match Request submitted",
      body: b.job_title,
      href: `/briefs/${b.slug}`,
      at: b.created_at,
    });
    if (b.accepted_at) {
      items.push({
        id: `brief-acc-${b.id}`,
        kind: "brief_accepted",
        title: "A pro accepted your Match Request",
        body: b.job_title,
        href: `/briefs/${b.slug}`,
        at: b.accepted_at,
      });
    }
  }

  for (const q of (quotesRes.data ?? []) as Array<{
    id: number;
    review_token: string;
    amount_cents: number;
    sent_at: string;
  }>) {
    items.push({
      id: `quote-${q.id}`,
      kind: "quote_received",
      title: "Fixed-price quote received",
      body: `A$${(q.amount_cents / 100).toLocaleString("en-AU")}`,
      href: `/quote/${q.review_token}`,
      at: q.sent_at,
    });
  }

  for (const bk of (bookingsRes.data ?? []) as Array<{
    id: number;
    brief_id: number;
    status: string;
    created_at: string;
  }>) {
    items.push({
      id: `book-${bk.id}`,
      kind: "consultation_booked",
      title: "Consultation booked",
      body: bk.status === "confirmed" ? "Confirmed by pro" : "Awaiting pro confirmation",
      href: `/briefs/${bk.brief_id}`,
      at: bk.created_at,
    });
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return items.slice(0, 50);
}
