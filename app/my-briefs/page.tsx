import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- cross-table read: advisor_auctions has no anon SELECT policy for contact_email lookups; advisor_auction_bids has advisor-only RLS so bid counts require service-role.
import { createAdminClient } from "@/lib/supabase/admin";
import { BRIEF_TEMPLATE_LABELS } from "@/lib/briefs/templates";
import type { BriefTemplate } from "@/lib/briefs/types";
import { formatDate } from "@/lib/utils";
import DirectoryHero from "@/components/directory/DirectoryHero";
import EmptyState from "@/components/directory/EmptyState";
import { Badge } from "@/components/ui/Badge";
import Icon from "@/components/Icon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Briefs — Invest.com.au",
  description: "Track your advisor quote requests and Match Requests.",
  robots: "noindex, nofollow",
};

type BriefSummary = {
  id: number;
  slug: string;
  job_title: string;
  brief_template: string | null;
  tracker_status: string;
  status: string;
  created_at: string;
  location: string | null;
};

type BriefWithCount = BriefSummary & { bid_count: number };

type BadgeVariant = "default" | "success" | "warning" | "info";

/** Maps the compound (status, tracker_status) to a user-facing label and Badge variant. */
function resolveStatusBadge(row: BriefSummary): {
  label: string;
  variant: BadgeVariant;
} {
  if (row.status === "closed" || row.status === "expired" || row.status === "withdrawn") {
    return { label: "Closed", variant: "default" };
  }
  if (row.tracker_status === "won") {
    return { label: "Engagement confirmed", variant: "success" };
  }
  if (row.tracker_status === "lost" || row.tracker_status === "withdrawn") {
    return { label: "Closed", variant: "default" };
  }
  if (row.tracker_status === "proposal_sent") {
    return { label: "Proposal sent", variant: "info" };
  }
  if (row.tracker_status === "call_booked") {
    return { label: "Call booked", variant: "info" };
  }
  if (row.tracker_status === "contacted") {
    return { label: "In progress", variant: "info" };
  }
  // "new" or unknown — brief is live and waiting
  return { label: "Pending", variant: "warning" };
}

function isActive(row: BriefSummary): boolean {
  if (row.status === "closed" || row.status === "expired" || row.status === "withdrawn") {
    return false;
  }
  return !["won", "lost", "withdrawn"].includes(row.tracker_status);
}

export default async function MyBriefsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/auth/login?next=/my-briefs");
  }

  const email = user.email.toLowerCase().trim();

  // Service-role needed: advisor_auctions has no authenticated-user SELECT
  // policy for consumer lookups; bid counts on advisor_auction_bids are
  // advisor-only under RLS.
  const admin = createAdminClient();

  let briefs: BriefSummary[] = [];
  let bidCounts: Record<number, number> = {};

  try {
    const { data } = await admin
      .from("advisor_auctions")
      .select(
        "id, slug, job_title, brief_template, tracker_status, status, created_at, location",
      )
      .eq("contact_email", email)
      .eq("flow_type", "accept")
      .order("created_at", { ascending: false })
      .limit(50);

    briefs = (data ?? []) as BriefSummary[];
  } catch {
    // fail-soft — render empty state
  }

  if (briefs.length > 0) {
    try {
      const ids = briefs.map((b) => b.id);
      const { data: bids } = await admin
        .from("advisor_auction_bids")
        .select("auction_id")
        .in("auction_id", ids)
        .eq("status", "active");

      bidCounts = (bids ?? []).reduce<Record<number, number>>((acc, row) => {
        const id = row.auction_id as number;
        acc[id] = (acc[id] ?? 0) + 1;
        return acc;
      }, {});
    } catch {
      // bid counts are display-only — fail-soft
    }
  }

  const briefsWithCounts: BriefWithCount[] = briefs.map((b) => ({
    ...b,
    bid_count: bidCounts[b.id] ?? 0,
  }));

  const activeCount = briefs.filter(isActive).length;
  const responseCount = briefsWithCounts.reduce((sum, b) => sum + b.bid_count, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <DirectoryHero
        tone="light"
        breadcrumbLabel="My briefs"
        headlineLead="Your briefs"
        subtitle="Your quote requests and where each one is up to. Pros respond — you compare and choose."
        stats={
          briefs.length > 0
            ? [
                { v: String(briefs.length), l: "briefs" },
                { v: String(activeCount), l: "active" },
                { v: String(responseCount), l: "responses" },
              ]
            : undefined
        }
      />

      <div className="container-custom max-w-6xl pb-12 pt-3 md:pt-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {briefsWithCounts.length > 0
              ? `Showing your ${briefsWithCounts.length} most recent brief${briefsWithCounts.length === 1 ? "" : "s"}.`
              : ""}
          </p>
          <Link
            href="/briefs/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-150 hover:bg-amber-600 hover:shadow-md"
          >
            <Icon name="plus" size={14} />
            Post a new brief
          </Link>
        </div>

        {briefsWithCounts.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="No briefs yet"
            body="Tell us what you're looking for and verified pros respond — you compare and choose."
            ctas={[
              { label: "Post your first brief", href: "/briefs/new" },
              { label: "Browse verified pros", href: "/advisors", variant: "secondary" },
            ]}
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {briefsWithCounts.map((brief) => {
              const badge = resolveStatusBadge(brief);
              const templateLabel =
                brief.brief_template && brief.brief_template in BRIEF_TEMPLATE_LABELS
                  ? BRIEF_TEMPLATE_LABELS[brief.brief_template as BriefTemplate]
                  : null;

              return (
                <li key={brief.id}>
                  <Link
                    href={`/briefs/${brief.slug}`}
                    className="group block rounded-xl border border-slate-200 bg-white p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="mb-1.5 flex items-start justify-between gap-3">
                      <h2 className="min-w-0 flex-1 text-sm font-bold text-slate-900">
                        {brief.job_title}
                      </h2>
                      <Badge variant={badge.variant} size="sm" className="shrink-0">
                        {badge.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      {templateLabel && (
                        <>
                          <span>{templateLabel}</span>
                          <span aria-hidden>·</span>
                        </>
                      )}
                      <span>Submitted {formatDate(brief.created_at)}</span>
                      {brief.location && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Icon name="map-pin" size={11} className="text-slate-400" />
                            {brief.location}
                          </span>
                        </>
                      )}
                      {brief.bid_count > 0 && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="font-semibold text-emerald-700">
                            {brief.bid_count} pro{brief.bid_count === 1 ? "" : "s"} responded
                          </span>
                        </>
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 font-semibold text-amber-700">
                        View
                        <Icon
                          name="arrow-right"
                          size={12}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
