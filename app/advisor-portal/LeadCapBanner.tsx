"use client";

/**
 * Lead-cap upsell banner — advisor portal dashboard.
 *
 * Self-fetching (same pattern as DashboardTab's YourRankWidget): pulls
 * /api/advisor-auth/lead-cap and renders ONLY when the advisor has used
 * >= 80% of their tier's monthly lead allowance (lib/advisor-lead-cap).
 *
 * Copy rules (zero dark patterns):
 *   - Factual usage only: "X of the Y leads/month included in <Tier>".
 *   - Never claims lead routing stops at the cap (it is not enforced
 *     by allocation today) — the cap is a plan inclusion.
 *   - One neutral CTA to the EXISTING self-service upgrade page
 *     (/advisor-portal/upgrade → Stripe checkout). No new billing.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface LeadCapResponse {
  tier: string;
  cap: number | null;
  used: number;
  remaining: number | null;
  level: "ok" | "approaching" | "at_cap" | "over_cap";
  next_tier: {
    id: string;
    label: string;
    monthly_price_cents: number;
    max_leads_per_month: number | null;
  } | null;
  month_label: string;
}

export default function LeadCapBanner() {
  const [data, setData] = useState<LeadCapResponse | null>(null);

  useEffect(() => {
    fetch("/api/advisor-auth/lead-cap")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: LeadCapResponse | null) => {
        if (d) setData(d);
      })
      .catch(() => {
        /* fail silently — the banner is informational */
      });
  }, []);

  if (!data || data.cap === null) return null;
  if (data.level === "ok") return null;

  const atOrOver = data.level === "at_cap" || data.level === "over_cap";
  const pct = Math.min(100, Math.round((data.used / data.cap) * 100));
  const tierLabel = data.tier.charAt(0).toUpperCase() + data.tier.slice(1);

  const nextTierLine = data.next_tier
    ? data.next_tier.max_leads_per_month === null
      ? `${data.next_tier.label} ($${(data.next_tier.monthly_price_cents / 100).toFixed(0)}/mo) includes uncapped leads`
      : `${data.next_tier.label} ($${(data.next_tier.monthly_price_cents / 100).toFixed(0)}/mo) includes up to ${data.next_tier.max_leads_per_month} leads/month`
    : null;

  return (
    <div
      data-testid="lead-cap-banner"
      className={`border rounded-xl p-4 mb-4 ${
        atOrOver ? "bg-violet-50 border-violet-200" : "bg-slate-50 border-slate-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon
              name="inbox"
              size={16}
              className={atOrOver ? "text-violet-600" : "text-slate-500"}
            />
            <p className="text-sm font-bold text-slate-900">
              {atOrOver
                ? `You've used all ${data.cap} leads included in ${tierLabel} this month`
                : `${data.used} of the ${data.cap} leads/month included in ${tierLabel} used (${data.month_label})`}
            </p>
          </div>
          <div
            className="mt-2 h-1.5 w-full max-w-xs rounded-full bg-slate-200"
            role="progressbar"
            aria-valuenow={data.used}
            aria-valuemin={0}
            aria-valuemax={data.cap}
            aria-label={`${data.used} of ${data.cap} monthly leads used`}
          >
            <div
              className={`h-1.5 rounded-full ${atOrOver ? "bg-violet-600" : "bg-slate-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {nextTierLine && (
            <p className="text-xs text-slate-600 mt-2">{nextTierLine}. Change plans any time — no contract.</p>
          )}
        </div>
        <Link
          href="/advisor-portal/upgrade"
          className="shrink-0 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
        >
          See plans
        </Link>
      </div>
    </div>
  );
}
