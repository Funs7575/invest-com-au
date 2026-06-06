"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { FirmBillingSummary } from "@/lib/firm-billing";

interface Props {
  summary: FirmBillingSummary;
}

function fmtAud(cents: number): string {
  const dollars = cents / 100;
  if (Math.abs(dollars) >= 1000) {
    return `A$${dollars.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
  }
  return `A$${dollars.toFixed(2)}`;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "never";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return "today";
  if (days < 2) return "1 day ago";
  if (days < 14) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return `${months} months ago`;
}

export default function FirmBillingClient({ summary: initialSummary }: Props) {
  const [summary, setSummary] = useState<FirmBillingSummary>(initialSummary);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    try {
      const res = await fetch("/api/firm-portal/billing/summary", {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        summary?: FirmBillingSummary;
        error?: string;
      };
      if (!res.ok || !json.summary) {
        throw new Error(json.error ?? "Could not refresh.");
      }
      setSummary(json.summary);
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Could not refresh.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const openPortal = useCallback(async () => {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/firm-portal/billing/portal", {
        method: "POST",
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Could not open the billing portal.");
      }
      window.location.href = json.url;
    } catch (err) {
      setPortalError(
        err instanceof Error ? err.message : "Could not open the billing portal.",
      );
      setPortalLoading(false);
    }
  }, []);

  const lowBalanceCount = summary.lowBalanceMemberCount;

  const sortedMembers = useMemo(
    () =>
      [...summary.members].sort((a, b) => {
        if (a.isFirmAdmin !== b.isFirmAdmin) return a.isFirmAdmin ? -1 : 1;
        return b.creditBalanceCents - a.creditBalanceCents;
      }),
    [summary.members],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 font-medium">
              Firm total balance
            </p>
            <p className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-1">
              {fmtAud(summary.totalCreditBalanceCents)}
            </p>
            <p className="text-sm text-slate-500 mt-2">
              {summary.activeMemberCount} active
              {summary.pendingMemberCount > 0
                ? ` · ${summary.pendingMemberCount} pending`
                : ""}{" "}
              · {fmtAud(summary.totalLifetimeSpendCents)} spent to date
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-sm text-violet-700 hover:text-violet-900 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="rotate-ccw" className="h-4 w-4" />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {refreshError && (
          <p className="text-sm text-red-600 mt-3" role="alert">
            {refreshError}
          </p>
        )}

        {lowBalanceCount > 0 && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>{lowBalanceCount}</strong>{" "}
            {lowBalanceCount === 1 ? "member is" : "members are"} below A$50 in
            credits. Top them up below to keep them eligible for incoming
            Match Requests.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-7 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Firm payment method
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {summary.paymentMethod
                ? `Stripe customer linked to ${summary.paymentMethod.advisorName}.`
                : "No firm payment method yet. Top up any member to mint one."}
            </p>
          </div>
          {summary.paymentMethod && (
            <button
              type="button"
              onClick={openPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {portalLoading ? "Opening…" : "Manage in Stripe"}
            </button>
          )}
        </div>
        {portalError && (
          <p className="text-sm text-red-600" role="alert">
            {portalError}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <header className="px-5 md:px-7 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Per-member balances</h2>
          <p className="text-sm text-slate-500 mt-1">
            Each advisor&apos;s wallet stays separate. Click a name to open their
            personal billing page and top them up.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 md:px-7 py-3 text-left font-semibold">Member</th>
                <th className="px-3 py-3 text-right font-semibold">Balance</th>
                <th className="px-3 py-3 text-right font-semibold">Lifetime spend</th>
                <th className="px-3 py-3 text-left font-semibold">Auto-recharge</th>
                <th className="px-3 py-3 text-left font-semibold">Last seen</th>
                <th className="px-5 md:px-7 py-3 text-right font-semibold">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedMembers.map((m) => (
                <tr key={m.id} className={m.isLowBalance ? "bg-amber-50/40" : ""}>
                  <td className="px-5 md:px-7 py-3">
                    <div className="font-medium text-slate-900">{m.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {m.email}
                      {m.isFirmAdmin && (
                        <span className="ml-2 inline-flex items-center rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-900">
                    {fmtAud(m.creditBalanceCents)}
                    {m.isLowBalance && (
                      <div className="text-[11px] font-medium text-amber-700 mt-0.5">
                        Low balance
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right text-slate-700">
                    {fmtAud(m.lifetimeSpendCents)}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {m.autoRechargeEnabled ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <Icon name="check-circle" className="h-3.5 w-3.5" /> On
                      </span>
                    ) : (
                      <span className="text-slate-400">Off</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-slate-500 text-xs">
                    {fmtRelative(m.lastLoginAt)}
                  </td>
                  <td className="px-5 md:px-7 py-3 text-right">
                    <Link
                      href={`/pros/billing?as_member=${m.id}`}
                      className="text-violet-700 hover:text-violet-900 font-medium"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-slate-500 text-center">
        Need to add a member? Use{" "}
        <Link
          href="/pros/settings/firm"
          className="underline hover:text-slate-700"
        >
          Firm settings → invite members
        </Link>
        .
      </p>
    </div>
  );
}
