import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listBookmarks } from "@/lib/bookmarks";
import { listForUser as listSavedSearches } from "@/lib/saved-searches";
import {
  buildMySavesHubViewModel,
  type WatchlistItem,
  type SavedComparisonItem,
  type SavedSearchItem,
  type RateAlertItem,
} from "@/lib/my-saves-hub";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Saves — My Account",
  robots: "noindex, nofollow",
};

// ── Small formatting helpers ───────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2);
}

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  title,
  count,
  viewAllHref,
  addHref,
  addLabel,
  children,
  emptyMessage,
  emptyCtaHref,
  emptyCtaLabel,
}: {
  title: string;
  count: number;
  viewAllHref: string;
  addHref?: string;
  addLabel?: string;
  children?: React.ReactNode;
  emptyMessage: string;
  emptyCtaHref: string;
  emptyCtaLabel: string;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          {count > 0 && (
            <span className="text-xs font-semibold text-slate-400 tabular-nums">
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {addHref && addLabel && (
            <Link
              href={addHref}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              + {addLabel}
            </Link>
          )}
          {count > 0 && (
            <Link
              href={viewAllHref}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              View all
            </Link>
          )}
        </div>
      </div>

      {/* Body */}
      {count === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-slate-500 mb-3">{emptyMessage}</p>
          <Link
            href={emptyCtaHref}
            className="inline-block px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            {emptyCtaLabel}
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">{children}</div>
      )}
    </section>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default async function MySavesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/account/my-saves");
  }

  const admin = createAdminClient();

  // Fetch all five data sets in parallel. Each call is already guarded
  // against throwing by its lib helper (returns [] on failure). The
  // watchlist and rate alerts don't have standalone lib helpers that return
  // the right shape, so we query here directly — matching the existing
  // patterns in /account/watchlist/page.tsx and /account/alerts/page.tsx.
  const [
    bookmarks,
    savedSearchRows,
    comparisonsRes,
    watchlistRes,
    alertsRes,
  ] = await Promise.all([
    listBookmarks(user.id),
    listSavedSearches(user.id),
    // Saved comparisons: same fetch as SavedComparisonsClient uses via
    // /api/saved-comparisons, but here we query directly (RSC context).
    supabase
      .from("user_saved_comparisons")
      .select("id, name, broker_slugs, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    // Watchlist items: mirrors /account/watchlist/page.tsx
    supabase
      .from("user_watchlist_items")
      .select("id, item_type, item_slug, display_name, added_at")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false }),
    // Rate alerts: mirrors /account/alerts/page.tsx (service-role for
    // the or() cross-column query the same way the full alerts page does).
    admin
      .from("rate_alert_subscriptions")
      .select(
        "id, metric_kind, product_kind, threshold_bps, direction, broker_slug, verified, created_at",
      )
      .or(`user_id.eq.${user.id},email.eq.${(user.email ?? "").toLowerCase()}`)
      .order("created_at", { ascending: false }),
  ]);

  const watchlistItems: WatchlistItem[] = (watchlistRes.data ?? []).map(
    (row) => ({
      id: row.id as number,
      item_type: row.item_type as string,
      item_slug: row.item_slug as string,
      display_name: row.display_name as string | null,
      added_at: row.added_at as string,
    }),
  );

  const comparisons: SavedComparisonItem[] = (
    comparisonsRes.data ?? []
  ).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    broker_slugs: (row.broker_slugs as string[]) ?? [],
    created_at: row.created_at as string,
  }));

  const savedSearches: SavedSearchItem[] = savedSearchRows.map((r) => ({
    id: r.id,
    kind: r.kind,
    label: r.label,
    email_frequency: r.email_frequency,
    created_at: r.created_at,
  }));

  const rateAlerts: RateAlertItem[] = (alertsRes.data ?? []).map((row) => ({
    id: row.id as string,
    metric_kind: row.metric_kind as string | null,
    product_kind: row.product_kind as string,
    threshold_bps: row.threshold_bps as number,
    direction: row.direction as string,
    broker_slug: row.broker_slug as string | null,
    verified: row.verified as boolean,
    created_at: row.created_at as string | null,
  }));

  const vm = buildMySavesHubViewModel({
    bookmarks,
    watchlistItems,
    comparisons,
    savedSearches,
    rateAlerts,
  });

  const METRIC_LABELS: Record<string, string> = {
    savings_rate: "Savings Rate",
    term_deposit: "Term Deposit",
    loan_rate: "Loan Rate",
    broker_fee: "Brokerage Fee",
    savings_account: "Savings Rate",
  };

  const SEARCH_KIND_LABELS: Record<string, string> = {
    advisors: "Advisors",
    teams: "Teams",
    invest: "Invest",
  };

  return (
    <div className="py-6 md:py-10">
      <div className="container-custom max-w-3xl">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-3">
          <Link href="/account" className="hover:text-slate-900">
            ← My account
          </Link>
        </nav>

        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">My Saves</h1>
          <p className="text-sm text-slate-500 mt-1">
            Everything you&rsquo;ve saved in one place.
          </p>
        </div>

        {/* All-empty state */}
        {vm.isEmpty && (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center mb-6">
            <div className="text-4xl mb-3" aria-hidden>
              🔖
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Nothing saved yet
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Start comparing brokers, save articles you want to read later, or
              set up a rate alert and they&rsquo;ll all show up here.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link
                href="/compare"
                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Compare brokers
              </Link>
              <Link
                href="/rate-alerts"
                className="px-5 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                Set a rate alert
              </Link>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* ── Bookmarks ─────────────────────────────────────────────────── */}
          <Section
            title="Reading List"
            count={vm.bookmarks.count}
            viewAllHref="/account/bookmarks"
            emptyMessage="Save articles, brokers and advisors to read or revisit later."
            emptyCtaHref="/compare"
            emptyCtaLabel="Browse brokers"
          >
            {vm.bookmarks.recent.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-xs font-medium text-slate-400 w-16 shrink-0 capitalize">
                  {b.bookmark_type}
                </span>
                <Link
                  href={
                    b.bookmark_type === "article"
                      ? `/article/${b.ref}`
                      : b.bookmark_type === "broker"
                        ? `/broker/${b.ref}`
                        : b.bookmark_type === "advisor"
                          ? `/advisor/${b.ref}`
                          : b.bookmark_type === "calculator"
                            ? `/calculators/${b.ref}`
                            : `#`
                  }
                  className="flex-1 text-sm font-medium text-slate-900 hover:text-primary truncate"
                >
                  {b.label ?? b.ref}
                </Link>
                <span className="text-xs text-slate-400 shrink-0">
                  {fmtDate(b.created_at)}
                </span>
              </div>
            ))}
          </Section>

          {/* ── Watchlist ─────────────────────────────────────────────────── */}
          <Section
            title="Watchlist"
            count={vm.watchlist.count}
            viewAllHref="/account/watchlist"
            emptyMessage="Add brokers, savings accounts and term deposits to your watchlist to track them."
            emptyCtaHref="/compare"
            emptyCtaLabel="Browse brokers"
          >
            {vm.watchlist.recent.map((w) => (
              <div key={w.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-xs font-medium text-slate-400 w-16 shrink-0 capitalize">
                  {w.item_type}
                </span>
                <Link
                  href={`/broker/${w.item_slug}`}
                  className="flex-1 text-sm font-medium text-slate-900 hover:text-primary truncate"
                >
                  {w.display_name ?? w.item_slug}
                </Link>
                <span className="text-xs text-slate-400 shrink-0">
                  {fmtDate(w.added_at)}
                </span>
              </div>
            ))}
          </Section>

          {/* ── Saved Comparisons ─────────────────────────────────────────── */}
          <Section
            title="Saved Comparisons"
            count={vm.comparisons.count}
            viewAllHref="/account/saved"
            addHref="/compare"
            addLabel="New comparison"
            emptyMessage="Compare brokers side by side and save your shortlists for later."
            emptyCtaHref="/compare"
            emptyCtaLabel="Start comparing"
          >
            {vm.comparisons.recent.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <Link
                  href={`/compare?brokers=${c.broker_slugs.join(",")}`}
                  className="flex-1 text-sm font-medium text-slate-900 hover:text-primary truncate"
                >
                  {c.name}
                </Link>
                <span className="text-xs text-slate-400 shrink-0">
                  {c.broker_slugs.length} broker
                  {c.broker_slugs.length !== 1 ? "s" : ""}
                </span>
                <span className="text-xs text-slate-400 shrink-0">
                  {fmtDate(c.created_at)}
                </span>
              </div>
            ))}
          </Section>

          {/* ── Saved Searches ────────────────────────────────────────────── */}
          <Section
            title="Saved Searches"
            count={vm.savedSearches.count}
            viewAllHref="/account/saved-searches"
            emptyMessage="Save an advisor or team search and get a digest when new providers match."
            emptyCtaHref="/advisors"
            emptyCtaLabel="Browse advisors"
          >
            {vm.savedSearches.recent.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-xs font-medium text-slate-400 w-16 shrink-0">
                  {SEARCH_KIND_LABELS[s.kind] ?? s.kind}
                </span>
                <span className="flex-1 text-sm font-medium text-slate-900 truncate">
                  {s.label}
                </span>
                <span className="text-xs text-slate-400 shrink-0 capitalize">
                  {s.email_frequency === "off" ? "Alerts off" : s.email_frequency}
                </span>
              </div>
            ))}
          </Section>

          {/* ── Rate Alerts ───────────────────────────────────────────────── */}
          <Section
            title="Rate Alerts"
            count={vm.rateAlerts.count}
            viewAllHref="/account/alerts"
            addHref="/rate-alerts"
            addLabel="New alert"
            emptyMessage="Get notified when savings rates, term deposits or brokerage fees hit your threshold."
            emptyCtaHref="/rate-alerts"
            emptyCtaLabel="Set an alert"
          >
            {vm.rateAlerts.recent.map((a) => {
              const kind = a.metric_kind ?? a.product_kind;
              const label = METRIC_LABELS[kind] ?? kind;
              const direction = a.direction === "above" ? "rises above" : "drops below";
              const threshold = a.threshold_bps > 0 ? ` ${bpsToPercent(a.threshold_bps)}%` : "";
              return (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex-1 text-sm font-medium text-slate-900 truncate">
                    {label} {direction}{threshold}
                    {a.broker_slug ? ` — ${a.broker_slug}` : ""}
                  </span>
                  {a.verified ? (
                    <span className="text-xs font-semibold text-emerald-600 shrink-0">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-600 shrink-0">
                      Unverified
                    </span>
                  )}
                </div>
              );
            })}
          </Section>
        </div>
      </div>
    </div>
  );
}
