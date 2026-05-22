"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface AlertRow {
  id: string;
  product_kind: string;
  threshold_bps: number;
  frequency: string;
  verified: boolean;
  last_notified_at: string | null;
  notification_count: number;
  created_at: string | null;
  unsubscribe_token: string;
}

interface Props {
  alerts: AlertRow[];
  userEmail: string;
}

const STAGE_LABELS: Record<string, string> = {
  savings_account: "Savings Account",
  term_deposit: "Term Deposit",
};

const FREQUENCY_LABELS: Record<string, string> = {
  instant: "Instant (within 24h)",
  daily: "Daily digest",
  weekly: "Weekly digest",
};

export default function AlertsClient({ alerts: initial, userEmail }: Props) {
  const [alerts, setAlerts] = useState(initial);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async (alert: AlertRow) => {
    setRemoving(alert.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/rate-alerts?unsubscribe=${alert.unsubscribe_token}`,
        { method: "GET" },
      );
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      } else {
        setError("Failed to remove alert. Please try again.");
      }
    } catch {
      setError("Failed to remove alert. Please try again.");
    }
    setRemoving(null);
  };

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
          <Icon name="bell" size={24} className="text-amber-500" />
        </div>
        <p className="text-sm font-semibold text-slate-900">No alerts yet</p>
        <p className="mt-1 text-xs text-slate-500">
          Set up a rate alert and we&apos;ll email you when an Australian savings
          account or term deposit crosses your target rate.
        </p>
        <Link
          href="/rate-alerts"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          Set up an alert
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      <p className="text-xs text-slate-500">
        Alerts sent to <strong>{userEmail}</strong>
      </p>

      {alerts.map((alert) => {
        const thresholdPct = (alert.threshold_bps / 100).toFixed(2);
        const productLabel = STAGE_LABELS[alert.product_kind] ?? alert.product_kind;
        const freqLabel = FREQUENCY_LABELS[alert.frequency] ?? alert.frequency;

        return (
          <div
            key={alert.id}
            className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                <Icon name="bell" size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {productLabel} &ge;{thresholdPct}% p.a.
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{freqLabel}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {alert.verified ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700">
                      <Icon name="check-circle" size={11} />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
                      <Icon name="clock" size={11} />
                      Awaiting verification
                    </span>
                  )}
                  {alert.notification_count > 0 && (
                    <span className="text-[0.65rem] text-slate-400">
                      {alert.notification_count} alert{alert.notification_count !== 1 ? "s" : ""} sent
                    </span>
                  )}
                  {alert.last_notified_at && (
                    <span className="text-[0.65rem] text-slate-400">
                      Last: {new Date(alert.last_notified_at).toLocaleDateString("en-AU")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={removing === alert.id}
              onClick={() => handleRemove(alert)}
              className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-40"
            >
              {removing === alert.id ? "Removing…" : "Remove"}
            </button>
          </div>
        );
      })}

      <div className="pt-2">
        <Link
          href="/rate-alerts"
          className="text-xs font-medium text-slate-700 hover:text-slate-900"
        >
          + Add another alert
        </Link>
      </div>
    </div>
  );
}
