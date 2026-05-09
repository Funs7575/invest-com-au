"use client";

import Link from "next/link";
import type { BillingSummary } from "./types";

interface Props {
  summary: BillingSummary;
}

type Status = "healthy" | "low" | "empty" | "pending_downgrade";

function deriveStatus(summary: BillingSummary): Status {
  if (summary.pending_tier) return "pending_downgrade";
  const leadsLeft = summary.lead_price_cents > 0
    ? Math.floor(summary.balance_cents / summary.lead_price_cents)
    : 0;
  if (summary.balance_cents <= 0) return "empty";
  if (leadsLeft < 3) return "low";
  return "healthy";
}

const STATUS_STYLES: Record<Status, { bg: string; pill: string; pillBg: string }> = {
  healthy: {
    bg: "bg-emerald-50 border-emerald-200",
    pill: "text-emerald-700",
    pillBg: "bg-emerald-100",
  },
  low: {
    bg: "bg-amber-50 border-amber-200",
    pill: "text-amber-700",
    pillBg: "bg-amber-100",
  },
  empty: {
    bg: "bg-rose-50 border-rose-200",
    pill: "text-rose-700",
    pillBg: "bg-rose-100",
  },
  pending_downgrade: {
    bg: "bg-blue-50 border-blue-200",
    pill: "text-blue-700",
    pillBg: "bg-blue-100",
  },
};

const STATUS_LABEL: Record<Status, string> = {
  healthy: "Healthy",
  low: "Low credit",
  empty: "Top up",
  pending_downgrade: "Downgrade scheduled",
};

/**
 * Dashboard-pinned billing widget. Shows credit remaining, this-month
 * spend, and a status pill that surfaces low / empty / pending-downgrade
 * states without the advisor having to click into BillingTab.
 */
export default function PinnedBillingWidget({ summary }: Props) {
  const status = deriveStatus(summary);
  const styles = STATUS_STYLES[status];
  const balanceDollars = (summary.balance_cents / 100).toFixed(0);
  const leadsRemaining = summary.lead_price_cents > 0
    ? Math.floor(summary.balance_cents / summary.lead_price_cents)
    : 0;
  const spendDollars = (summary.lifetime_spend_cents / 100).toFixed(0);

  return (
    <div className={`border rounded-xl p-4 mb-6 ${styles.bg}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-0.5">
              Credit remaining
            </p>
            <p className="text-2xl font-extrabold text-slate-900">
              ${balanceDollars}{" "}
              <span className="text-xs font-normal text-slate-500">
                ≈ {leadsRemaining} leads
              </span>
            </p>
          </div>
          <div className="border-l border-slate-200 pl-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-0.5">
              Lifetime spend
            </p>
            <p className="text-base font-bold text-slate-900">${spendDollars}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-[0.65rem] font-bold uppercase px-2.5 py-1 rounded-full ${styles.pillBg} ${styles.pill}`}
          >
            {STATUS_LABEL[status]}
          </span>
          <Link
            href="/advisor-portal?tab=billing"
            className="text-xs font-semibold text-violet-700 hover:text-violet-900"
          >
            Manage billing →
          </Link>
        </div>
      </div>
    </div>
  );
}
