"use client";

/**
 * BidCoachPanel — informational sidebar for the auctions/bid screen.
 * Surfaces the adviser's own win rate, the anonymised category benchmark,
 * and response-timing medians from /api/advisor-portal/marketplace-analytics.
 *
 * Tone guard: nudges only ("similar jobs…", "your win rate…") — never
 * countdowns or pressure mechanics, never other advisers' identities or
 * individual bids. All aggregates arrive pre-suppressed (null) below
 * minimum sample sizes; this component renders honest empty states.
 */

import Icon from "@/components/Icon";

export interface BidCoachAnalytics {
  window_days: number;
  total_bids: number;
  wins: number;
  win_rate_pct: number;
  median_response_hours: number | null;
  category_avg_win_rate_pct: number;
  category_sample_size?: number;
  category_median_response_hours?: number | null;
  category_winning_median_response_hours?: number | null;
  category_median_winning_bid_cents?: number | null;
  suggested_response_window_hours?: number | null;
}

function hoursLabel(hours: number): string {
  if (hours < 1) return "under 1h";
  if (hours < 48) return `~${Math.round(hours)}h`;
  return `~${Math.round(hours / 24)} days`;
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-slate-100 last:border-b-0">
      <dt className="text-xs text-slate-600">{label}</dt>
      <dd className="text-right">
        <span className="text-sm font-extrabold text-slate-900">{value}</span>
        {hint && <span className="block text-[0.65rem] text-slate-500">{hint}</span>}
      </dd>
    </div>
  );
}

export default function BidCoachPanel({
  analytics,
}: {
  analytics: BidCoachAnalytics | null;
}) {
  if (!analytics) return null;

  const winningHours = analytics.category_winning_median_response_hours ?? null;
  const categoryHours = analytics.category_median_response_hours ?? null;
  const suggestedWindow = analytics.suggested_response_window_hours ?? null;
  const winningBidCents = analytics.category_median_winning_bid_cents ?? null;
  const hasCategoryStats =
    winningHours != null || categoryHours != null || winningBidCents != null;
  const hasOwnStats = analytics.total_bids > 0;

  return (
    <section
      aria-label="Bid coach"
      className="bg-white rounded-xl border border-slate-200 p-5"
    >
      <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900 mb-1">
        <Icon name="target" size={15} className="text-emerald-600" aria-hidden />
        Bid coach
      </h2>
      <p className="text-[0.7rem] text-slate-500 mb-3">
        Your category, last {analytics.window_days} days. Aggregated and anonymised —
        individual bids are never shown.
      </p>

      {suggestedWindow != null && (winningHours != null || categoryHours != null) && (
        <p className="text-xs text-slate-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 mb-3">
          {winningHours != null ? (
            <>
              Winning quotes in your category typically arrive within{" "}
              <strong>{hoursLabel(winningHours)}</strong> of a job being posted.
            </>
          ) : (
            <>
              Quotes in your category typically arrive within{" "}
              <strong>{hoursLabel(categoryHours as number)}</strong> of posting.
            </>
          )}{" "}
          Responding within {suggestedWindow}h keeps you in the early group.
        </p>
      )}

      <dl>
        {hasOwnStats ? (
          <Row
            label="Your win rate"
            value={`${analytics.win_rate_pct}%`}
            hint={`${analytics.wins} of ${analytics.total_bids} quotes`}
          />
        ) : (
          <div className="py-1.5 text-xs text-slate-500">
            No quotes in the last {analytics.window_days} days — your win rate appears
            after your first quotes.
          </div>
        )}
        <Row
          label="Category average win rate"
          value={`${analytics.category_avg_win_rate_pct}%`}
        />
        {analytics.median_response_hours != null && (
          <Row
            label="Your median response"
            value={hoursLabel(analytics.median_response_hours)}
          />
        )}
        {winningBidCents != null && (
          <Row
            label="Typical winning quote"
            value={`$${Math.round(winningBidCents / 100)}`}
            hint="median of accepted quotes"
          />
        )}
      </dl>

      {!hasCategoryStats && (
        <p className="text-xs text-slate-500 mt-2">
          Not enough recent category history for timing and pricing medians yet — they
          unlock once at least 5 recent quotes exist in your category.
        </p>
      )}
    </section>
  );
}
