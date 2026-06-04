import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- cross-table read: advisor_auctions has no anon SELECT policy for contact_email lookups; advisor_auction_bids has advisor-only RLS so bid counts require service-role.
import { createAdminClient } from "@/lib/supabase/admin";
import { BRIEF_TEMPLATE_LABELS } from "@/lib/briefs/templates";
import type { BriefTemplate } from "@/lib/briefs/types";

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

/** Maps the compound (status, tracker_status) to a user-facing label and colour token. */
function resolveStatusBadge(row: BriefSummary): {
  label: string;
  bg: string;
  text: string;
} {
  if (row.status === "closed" || row.status === "expired" || row.status === "withdrawn") {
    return { label: "Closed", bg: "#f1f5f9", text: "#64748b" };
  }
  if (row.tracker_status === "won") {
    return { label: "Engagement confirmed", bg: "#d1fae5", text: "#065f46" };
  }
  if (row.tracker_status === "lost" || row.tracker_status === "withdrawn") {
    return { label: "Closed", bg: "#f1f5f9", text: "#64748b" };
  }
  if (row.tracker_status === "proposal_sent") {
    return { label: "Proposal sent", bg: "#ccfbf1", text: "#0f766e" };
  }
  if (row.tracker_status === "call_booked") {
    return { label: "Call booked", bg: "#ccfbf1", text: "#0f766e" };
  }
  if (row.tracker_status === "contacted") {
    return { label: "In progress", bg: "#ccfbf1", text: "#0f766e" };
  }
  // "new" or unknown — brief is live and waiting
  return { label: "Pending", bg: "#fef3c7", text: "#92400e" };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
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

  return (
    <div className="min-h-screen bg-slate-50" style={{ minHeight: "100vh" }}>
      <div
        style={{
          maxWidth: 768,
          margin: "0 auto",
          padding: "2rem 1rem 4rem",
        }}
      >
        {/* Breadcrumb */}
        <div
          className="text-slate-500"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.75rem",
            marginBottom: "1.25rem",
          }}
        >
          <Link href="/account" className="text-slate-500" style={{ textDecoration: "none" }}>
            Account
          </Link>
          <span>/</span>
          <span className="text-slate-900">My Briefs</span>
        </div>

        {/* Header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1.75rem",
          }}
        >
          <div>
            <h1
              className="text-slate-900"
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                margin: 0,
              }}
            >
              My Briefs
            </h1>
            <p className="text-slate-500" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
              Your advisor quote requests and their current status.
            </p>
          </div>
          <Link
            href="/briefs/new"
            className="text-white"
            style={{
              display: "inline-block",
              padding: "0.55rem 1.1rem",
              borderRadius: "0.6rem",
              background: "var(--color-teal-600, #0d9488)",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Submit a new brief →
          </Link>
        </div>

        {/* Empty state */}
        {briefsWithCounts.length === 0 && (
          <div
            className="bg-white border border-slate-200"
            style={{
              borderRadius: "1rem",
              padding: "3rem 2rem",
              textAlign: "center",
            }}
          >
            <p
              className="text-slate-900"
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                marginBottom: "0.5rem",
              }}
            >
              No briefs yet
            </p>
            <p className="text-slate-500" style={{ fontSize: "0.875rem", maxWidth: 360, margin: "0 auto 1.5rem" }}>
              Tell us what you&apos;re looking for and get matched with verified advisors.
            </p>
            <Link
              href="/briefs/new"
              className="text-white"
              style={{
                display: "inline-block",
                padding: "0.6rem 1.25rem",
                borderRadius: "0.6rem",
                background: "var(--color-teal-600, #0d9488)",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Submit your first brief →
            </Link>
          </div>
        )}

        {/* Brief cards */}
        {briefsWithCounts.length > 0 && (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.875rem" }}>
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
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <div
                      className="bg-white border border-slate-200"
                      style={{
                        borderRadius: "1rem",
                        padding: "1.25rem 1.5rem",
                        transition: "box-shadow 0.15s",
                      }}
                    >
                      {/* Top row: title + status badge */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <h2
                          className="text-slate-900"
                          style={{
                            fontSize: "1rem",
                            fontWeight: 700,
                            margin: 0,
                            flex: 1,
                          }}
                        >
                          {brief.job_title}
                        </h2>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.2rem 0.65rem",
                            borderRadius: "9999px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.text,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div
                        className="text-slate-500"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          fontSize: "0.75rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {templateLabel && <span>{templateLabel}</span>}
                        {templateLabel && <span>·</span>}
                        <span>Submitted {formatDate(brief.created_at)}</span>
                        {brief.location && (
                          <>
                            <span>·</span>
                            <span>{brief.location}</span>
                          </>
                        )}
                        {brief.bid_count > 0 && (
                          <>
                            <span>·</span>
                            <span
                              style={{
                                color: "var(--color-teal-600, #0d9488)",
                                fontWeight: 600,
                              }}
                            >
                              {brief.bid_count} advisor{brief.bid_count === 1 ? "" : "s"} responded
                            </span>
                          </>
                        )}
                      </div>

                      {/* CTA hint */}
                      <div
                        style={{
                          marginTop: "0.875rem",
                          fontSize: "0.75rem",
                          color: "var(--color-teal-600, #0d9488)",
                          fontWeight: 600,
                        }}
                      >
                        View details →
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer note */}
        {briefsWithCounts.length > 0 && (
          <p
            className="text-slate-400"
            style={{
              marginTop: "1.5rem",
              fontSize: "0.75rem",
              textAlign: "center",
            }}
          >
            Showing your {briefsWithCounts.length} most recent brief{briefsWithCounts.length === 1 ? "" : "s"}.
          </p>
        )}
      </div>
    </div>
  );
}
