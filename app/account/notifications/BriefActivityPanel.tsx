import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
 
import { createAdminClient } from "@/lib/supabase/admin";

interface ActivityItem {
  kind: "message" | "dispute" | "review_requested";
  briefSlug: string;
  briefTitle: string;
  preview: string;
  createdAt: string;
  href: string;
}

/**
 * Live "Recent brief activity" panel for /account/notifications.
 *
 * Aggregates the user's last events across brief_messages, brief_disputes,
 * brief_outcomes (review-requested but not submitted) into a single
 * reverse-chronological list. Complements the main user_notifications
 * inbox — events that happen to brief tables aren't always also written
 * to user_notifications, and a caller looking for "what happened on my
 * Match Requests" wants both views.
 *
 * Returns an empty fragment when there are no events so the section
 * doesn't render an empty card.
 */
export default async function BriefActivityPanel() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const admin = createAdminClient();
  // Find all briefs filed by this user (email-match covers anon flow).
  const { data: briefsRaw } = await admin
    .from("advisor_auctions")
    .select("id, slug, job_title")
    .eq("contact_email", user.email)
    .order("created_at", { ascending: false })
    .limit(50);

  const briefs = (briefsRaw ?? []) as {
    id: number;
    slug: string;
    job_title: string;
  }[];
  if (briefs.length === 0) return null;

  const briefIds = briefs.map((b) => b.id);
  const briefById = new Map(briefs.map((b) => [b.id, b]));

  const [
    { data: messagesRaw },
    { data: disputesRaw },
    { data: outcomesRaw },
  ] = await Promise.all([
    admin
      .from("brief_messages")
      .select("id, brief_id, sender_kind, body, created_at")
      .in("brief_id", briefIds)
      .in("sender_kind", ["professional", "team"])
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("brief_disputes")
      .select("id, brief_id, status, reason, created_at, updated_at")
      .in("brief_id", briefIds)
      .order("updated_at", { ascending: false })
      .limit(5),
    admin
      .from("brief_outcomes")
      .select("id, brief_id, review_token, review_requested_at, submitted_at")
      .in("brief_id", briefIds)
      .is("submitted_at", null)
      .not("review_requested_at", "is", null)
      .order("review_requested_at", { ascending: false })
      .limit(5),
  ]);

  const items: ActivityItem[] = [];

  for (const m of (messagesRaw ?? []) as {
    id: number;
    brief_id: number;
    sender_kind: string;
    body: string;
    created_at: string;
  }[]) {
    const brief = briefById.get(m.brief_id);
    if (!brief) continue;
    items.push({
      kind: "message",
      briefSlug: brief.slug,
      briefTitle: brief.job_title,
      preview:
        m.body.length > 160 ? `${m.body.slice(0, 160)}…` : m.body,
      createdAt: m.created_at,
      href: `/briefs/${brief.slug}?email=${encodeURIComponent(user.email)}`,
    });
  }

  for (const d of (disputesRaw ?? []) as {
    id: number;
    brief_id: number;
    status: string;
    reason: string;
    created_at: string;
    updated_at: string;
  }[]) {
    const brief = briefById.get(d.brief_id);
    if (!brief) continue;
    items.push({
      kind: "dispute",
      briefSlug: brief.slug,
      briefTitle: brief.job_title,
      preview: `Dispute status: ${d.status.replace(/_/g, " ")}`,
      createdAt: d.updated_at,
      href: `/briefs/${brief.slug}?email=${encodeURIComponent(user.email)}#dispute`,
    });
  }

  for (const o of (outcomesRaw ?? []) as {
    id: number;
    brief_id: number;
    review_token: string;
    review_requested_at: string;
  }[]) {
    const brief = briefById.get(o.brief_id);
    if (!brief) continue;
    items.push({
      kind: "review_requested",
      briefSlug: brief.slug,
      briefTitle: brief.job_title,
      preview: "How did your engagement go? Two-minute review available.",
      createdAt: o.review_requested_at,
      href: `/review/${o.review_token}`,
    });
  }

  if (items.length === 0) return null;

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const top = items.slice(0, 10);

  return (
    <section
      aria-labelledby="brief-activity-heading"
      className="mb-6 rounded-xl border border-slate-200 bg-white"
    >
      <header className="border-b border-slate-200 p-4 flex items-center justify-between">
        <h2
          id="brief-activity-heading"
          className="text-sm font-bold text-slate-900"
        >
          Recent brief activity
        </h2>
        <Link
          href="/briefs"
          className="text-xs font-semibold text-violet-700 hover:underline"
        >
          All briefs →
        </Link>
      </header>
      <ul className="divide-y divide-slate-200">
        {top.map((item, idx) => (
          <li key={`${item.kind}-${item.briefSlug}-${idx}`}>
            <Link
              href={item.href}
              className="block p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-baseline justify-between gap-3 mb-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  <span className="mr-1.5" aria-hidden>
                    {item.kind === "message" && "💬"}
                    {item.kind === "dispute" && "⚖️"}
                    {item.kind === "review_requested" && "⭐"}
                  </span>
                  {item.briefTitle}
                </p>
                <time className="text-[11px] text-slate-500 flex-shrink-0">
                  {formatRelative(item.createdAt)}
                </time>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 pl-6">
                {item.preview}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} mo ago`;
}
