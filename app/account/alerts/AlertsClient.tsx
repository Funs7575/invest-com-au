"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

// ── Types ──────────────────────────────────────────────────────────────────────

export type MetricKind = "savings_rate" | "term_deposit" | "loan_rate" | "broker_fee";

export interface AlertRow {
  id: string;
  metric_kind: string | null;
  product_kind: string;
  threshold_bps: number;
  direction: string;
  frequency: string;
  broker_slug: string | null;
  lender_slug: string | null;
  verified: boolean;
  last_notified_at: string | null;
  notification_count: number;
  created_at: string | null;
  unsubscribe_token?: string;
}

interface Props {
  alerts: AlertRow[];
  userEmail: string;
}

// ── Labels ─────────────────────────────────────────────────────────────────────

const METRIC_LABELS: Record<string, string> = {
  savings_rate: "Savings Account Rate",
  term_deposit: "Term Deposit Rate",
  loan_rate: "Investment Loan Rate",
  broker_fee: "Brokerage Fee",
  // legacy product_kind values
  savings_account: "Savings Account Rate",
};

const DIRECTION_LABELS: Record<string, string> = {
  above: "rises above",
  below: "drops below",
};

const FREQUENCY_LABELS: Record<string, string> = {
  instant: "Instant (within 24h)",
  daily: "Daily digest",
  weekly: "Weekly digest",
};

// ── Create form ────────────────────────────────────────────────────────────────

interface CreateFormState {
  metric_kind: MetricKind;
  threshold_pct: string;
  direction: "above" | "below";
  frequency: "instant" | "daily" | "weekly";
  broker_slug: string;
  lender_slug: string;
}

const DEFAULT_FORM: CreateFormState = {
  metric_kind: "savings_rate",
  threshold_pct: "",
  direction: "above",
  frequency: "instant",
  broker_slug: "",
  lender_slug: "",
};

function CreateAlertForm({
  onCreated,
}: {
  onCreated: (alert: AlertRow) => void;
}) {
  const [form, setForm] = useState<CreateFormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const pct = parseFloat(form.threshold_pct);
    if (isNaN(pct) || pct <= 0 || pct > 100) {
      setError("Please enter a valid threshold (0–100%).");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        metric_kind: form.metric_kind,
        threshold_pct: pct,
        direction: form.direction,
        frequency: form.frequency,
      };
      if (form.metric_kind === "broker_fee" && form.broker_slug) {
        body.broker_slug = form.broker_slug;
      }
      if (form.metric_kind === "loan_rate" && form.lender_slug) {
        body.lender_slug = form.lender_slug;
      }
      const res = await fetch("/api/account/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = (await res.json()) as { item: AlertRow };
        onCreated(data.item);
        setForm(DEFAULT_FORM);
      } else {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to create alert.");
      }
    } catch {
      setError("Failed to create alert. Please try again.");
    }
    setSaving(false);
  };

  const showBrokerSlug = form.metric_kind === "broker_fee";
  const showLenderSlug = form.metric_kind === "loan_rate";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-violet-200 bg-violet-50/40 p-4"
    >
      <p className="text-xs font-semibold text-violet-800 mb-3">New Alert</p>
      {error && (
        <div role="alert" className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Metric kind */}
        <div>
          <label htmlFor="alert-metric-kind" className="block text-xs font-medium text-slate-700 mb-1">
            Alert type
          </label>
          <select
            id="alert-metric-kind"
            value={form.metric_kind}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                metric_kind: e.target.value as MetricKind,
              }))
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
          >
            <option value="savings_rate">Savings Account Rate</option>
            <option value="term_deposit">Term Deposit Rate</option>
            <option value="loan_rate">Investment Loan Rate</option>
            <option value="broker_fee">Brokerage Fee</option>
          </select>
        </div>

        {/* Direction */}
        <div>
          <label htmlFor="alert-direction" className="block text-xs font-medium text-slate-700 mb-1">
            Trigger when rate
          </label>
          <select
            id="alert-direction"
            value={form.direction}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                direction: e.target.value as "above" | "below",
              }))
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
          >
            <option value="above">Rises above threshold</option>
            <option value="below">Drops below threshold</option>
          </select>
        </div>

        {/* Threshold */}
        <div>
          <label htmlFor="alert-threshold" className="block text-xs font-medium text-slate-700 mb-1">
            Threshold (%)
          </label>
          <input
            id="alert-threshold"
            type="number" inputMode="decimal"
            min="0"
            max="100"
            step="0.01"
            placeholder={
              form.metric_kind === "broker_fee" ? "e.g. 9.99" : "e.g. 5.25"
            }
            value={form.threshold_pct}
            onChange={(e) =>
              setForm((f) => ({ ...f, threshold_pct: e.target.value }))
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            required
          />
        </div>

        {/* Frequency */}
        <div>
          <label htmlFor="alert-frequency" className="block text-xs font-medium text-slate-700 mb-1">
            Notification frequency
          </label>
          <select
            id="alert-frequency"
            value={form.frequency}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                frequency: e.target.value as "instant" | "daily" | "weekly",
              }))
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
          >
            <option value="instant">Instant (within 24h)</option>
            <option value="daily">Daily digest</option>
            <option value="weekly">Weekly digest</option>
          </select>
        </div>

        {/* Broker slug — only for broker_fee */}
        {showBrokerSlug && (
          <div className="sm:col-span-2">
            <label htmlFor="alert-broker-slug" className="block text-xs font-medium text-slate-700 mb-1">
              Broker slug (optional — leave blank to watch all)
            </label>
            <input
              id="alert-broker-slug"
              type="text"
              placeholder="e.g. commsec"
              value={form.broker_slug}
              onChange={(e) =>
                setForm((f) => ({ ...f, broker_slug: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          </div>
        )}

        {/* Lender slug — only for loan_rate */}
        {showLenderSlug && (
          <div className="sm:col-span-2">
            <label htmlFor="alert-lender-slug" className="block text-xs font-medium text-slate-700 mb-1">
              Lender slug (optional — leave blank to watch best rate)
            </label>
            <input
              id="alert-lender-slug"
              type="text"
              placeholder="e.g. commonwealth-bank"
              value={form.lender_slug}
              onChange={(e) =>
                setForm((f) => ({ ...f, lender_slug: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[0.65rem] text-slate-400">
          Factual rate/fee data alerts only — not financial advice.
        </p>
        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-violet-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Create alert"}
        </button>
      </div>
    </form>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AlertsClient({ alerts: initial, userEmail }: Props) {
  const [alerts, setAlerts] = useState<AlertRow[]>(initial);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const handleRemove = async (alert: AlertRow) => {
    setRemoving(alert.id);
    setError(null);
    try {
      // Prefer the authenticated DELETE endpoint for user-owned rows.
      const res = await fetch("/api/account/alerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      } else if (res.status === 401 || res.status === 404) {
        // Fallback: legacy email-only subscriptions use the unsubscribe token path.
        if (alert.unsubscribe_token) {
          const fallback = await fetch(
            `/api/rate-alerts?unsubscribe=${alert.unsubscribe_token}`,
            { method: "GET" },
          );
          if (fallback.ok) {
            setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
          } else {
            setError("Failed to remove alert. Please try again.");
          }
        } else {
          setError("Failed to remove alert. Please try again.");
        }
      } else {
        setError("Failed to remove alert. Please try again.");
      }
    } catch {
      setError("Failed to remove alert. Please try again.");
    }
    setRemoving(null);
  };

  const handleCreated = (alert: AlertRow) => {
    setAlerts((prev) => [alert, ...prev]);
    setShowCreate(false);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Create form toggle */}
      {showCreate ? (
        <CreateAlertForm onCreated={handleCreated} />
      ) : (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
        >
          <Icon name="bell" size={14} />
          + New alert
        </button>
      )}

      {alerts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <Icon name="bell" size={24} className="text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-slate-900">No alerts yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Set up an alert and we&apos;ll notify you when a savings rate, term
            deposit, loan rate, or brokerage fee crosses your threshold.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Link
              href="/fee-alerts"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 transition-colors"
            >
              <Icon name="bell" size={12} />
              Set up a fee alert
            </Link>
            <Link
              href="/rates/today"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:border-slate-400 transition-colors"
            >
              Browse current rates
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            Alerts sent to <strong>{userEmail}</strong>
          </p>

          <div className="space-y-3">
            {alerts.map((alert) => {
              const metricLabel =
                METRIC_LABELS[alert.metric_kind ?? alert.product_kind] ??
                (alert.metric_kind ?? alert.product_kind);
              const dirLabel = DIRECTION_LABELS[alert.direction] ?? alert.direction;
              const freqLabel = FREQUENCY_LABELS[alert.frequency] ?? alert.frequency;
              const thresholdPct = (alert.threshold_bps / 100).toFixed(2);
              const isFee = alert.metric_kind === "broker_fee";

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
                        {metricLabel} {dirLabel}{" "}
                        {isFee ? `$${thresholdPct}` : `${thresholdPct}% p.a.`}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{freqLabel}</p>
                      {(alert.broker_slug || alert.lender_slug) && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {alert.broker_slug && `Broker: ${alert.broker_slug}`}
                          {alert.lender_slug && `Lender: ${alert.lender_slug}`}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {alert.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.65rem] font-semibold text-emerald-700">
                            <Icon name="check-circle" size={11} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.65rem] font-semibold text-amber-700">
                            <Icon name="clock" size={11} />
                            Awaiting verification
                          </span>
                        )}
                        {alert.notification_count > 0 && (
                          <span className="text-[0.65rem] text-slate-400">
                            {alert.notification_count} alert
                            {alert.notification_count !== 1 ? "s" : ""} sent
                          </span>
                        )}
                        {alert.last_notified_at && (
                          <span className="text-[0.65rem] text-slate-400">
                            Last:{" "}
                            {new Date(alert.last_notified_at).toLocaleDateString(
                              "en-AU",
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={removing === alert.id}
                    onClick={() => handleRemove(alert)}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {removing === alert.id ? "Removing…" : "Remove"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="pt-1">
        <Link
          href="/rate-alerts"
          className="text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Set up email-only alerts →
        </Link>
      </div>
    </div>
  );
}
