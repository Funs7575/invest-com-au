"use client";

import { useState } from "react";
import type { BillingSummary, LedgerEntryView } from "./types";

const KIND_LABELS: Record<LedgerEntryView["kind"], string> = {
  topup: "Top-up",
  refund_to_credit: "Refund credit",
  lead_spend: "Lead",
  lead_dispute_refund: "Dispute refund",
  tier_proration_credit: "Tier proration",
  admin_adjustment: "Adjustment",
  expiry: "Expired",
  chargeback_clawback: "Chargeback",
};

const KIND_BADGE: Record<LedgerEntryView["kind"], string> = {
  topup: "bg-violet-100 text-violet-700",
  refund_to_credit: "bg-emerald-100 text-emerald-700",
  lead_spend: "bg-slate-100 text-slate-600",
  lead_dispute_refund: "bg-emerald-100 text-emerald-700",
  tier_proration_credit: "bg-blue-100 text-blue-700",
  admin_adjustment: "bg-amber-100 text-amber-700",
  expiry: "bg-rose-100 text-rose-700",
  chargeback_clawback: "bg-red-100 text-red-700",
};

interface Props {
  summary: BillingSummary;
}

const PAGE_SIZE = 50;

/**
 * Unified ledger history. Replaces the separate "Lead Charges" + "Top-up
 * History" tables in the legacy BillingTab. Reads the first page from
 * the summary payload (already on the wire) and paginates further pages
 * via /api/advisor-auth/credit-ledger when the advisor wants more.
 */
export default function LedgerHistoryTable({ summary }: Props) {
  const [rows, setRows] = useState<LedgerEntryView[]>(summary.ledger_first_page);
  const [offset, setOffset] = useState(summary.ledger_first_page.length);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/advisor-auth/credit-ledger?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      if (!res.ok) return;
      const data: { rows: LedgerEntryView[] } = await res.json();
      setRows((prev) => [...prev, ...data.rows]);
      setOffset((prev) => prev + data.rows.length);
    } finally {
      setLoading(false);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center mt-6">
        <p className="text-sm text-slate-500">
          No ledger entries yet. Buy a credit pack above to get started.
        </p>
      </div>
    );
  }

  const hasMore = offset < summary.ledger_total;

  return (
    <>
      <h2 className="text-base font-bold text-slate-900 mb-3 mt-8">Account history</h2>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-50 text-xs font-semibold text-slate-600 px-4 py-2 border-b border-slate-200">
          <span className="col-span-2">Date</span>
          <span className="col-span-2">Type</span>
          <span className="col-span-5">Description</span>
          <span className="col-span-2 text-right">Amount</span>
          <span className="col-span-1 text-right">Balance</span>
        </div>
        {rows.map((row) => {
          const sign = row.amount_cents >= 0 ? "+" : "−";
          const amountAbs = Math.abs(row.amount_cents);
          return (
            <div
              key={row.id}
              className="grid grid-cols-12 px-4 py-2.5 text-xs border-b border-slate-100 last:border-b-0"
            >
              <span className="col-span-2 text-slate-500">
                {new Date(row.created_at).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              <span className="col-span-2">
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[0.6rem] font-bold ${KIND_BADGE[row.kind]}`}
                >
                  {KIND_LABELS[row.kind]}
                </span>
              </span>
              <span className="col-span-5 text-slate-700 truncate">{row.description}</span>
              <span
                className={`col-span-2 text-right font-semibold ${row.amount_cents >= 0 ? "text-emerald-600" : "text-slate-900"}`}
              >
                {sign}${(amountAbs / 100).toFixed(2)}
              </span>
              <span className="col-span-1 text-right text-slate-500">
                ${(row.balance_after_cents / 100).toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <div className="text-center mt-3">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="text-xs font-semibold text-violet-700 hover:text-violet-900 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
