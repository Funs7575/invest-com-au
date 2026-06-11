"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import Icon from "@/components/Icon";

// Client half of the tokenised manage-preferences page. Reads ?token=,
// fetches the subscription list, and exposes per-alert frequency / pause /
// unsubscribe controls plus a global unsubscribe-all. All mutations go
// through POST /api/rate-alerts/manage with the same token.

type Frequency = "instant" | "daily" | "weekly";

interface ManagedAlert {
  id: string;
  metric_kind: string | null;
  product_kind: string;
  threshold_bps: number;
  direction: string;
  frequency: string;
  broker_slug: string | null;
  lender_slug: string | null;
  mode: "threshold" | "any_change";
  paused: boolean;
  verified: boolean;
  last_notified_at: string | null;
  notification_count: number;
  created_at: string;
}

type PageState =
  | { kind: "loading" }
  | { kind: "invalid_token" }
  | { kind: "error" }
  | { kind: "unsubscribed_all" }
  | { kind: "ready"; email: string; items: ManagedAlert[] };

const METRIC_LABELS: Record<string, string> = {
  savings_rate: "Savings account rate",
  savings_account: "Savings account rate",
  term_deposit: "Term deposit rate",
  loan_rate: "Investment loan rate",
  broker_fee: "Brokerage fee",
};

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: "instant", label: "Instant" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

function describeAlert(alert: ManagedAlert): string {
  const label =
    METRIC_LABELS[alert.metric_kind ?? alert.product_kind] ??
    (alert.metric_kind ?? alert.product_kind);
  if (alert.mode === "any_change") {
    return `${label} — any change`;
  }
  const threshold = (alert.threshold_bps / 100).toFixed(2);
  const isFee = alert.metric_kind === "broker_fee";
  const dir = alert.direction === "below" ? "drops below" : "rises above";
  return `${label} ${dir} ${isFee ? `$${threshold}` : `${threshold}% p.a.`}`;
}

export default function ManagePrefsClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<PageState>({ kind: "loading" });
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid_token" });
      return;
    }
    const ctrl = new AbortController();
    fetch(`/api/rate-alerts/manage?token=${encodeURIComponent(token)}`, {
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (res.status === 404) {
          setState({ kind: "invalid_token" });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error" });
          return;
        }
        const data = (await res.json()) as { email: string; items: ManagedAlert[] };
        setState({ kind: "ready", email: data.email, items: data.items });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setState({ kind: "error" });
      });
    return () => ctrl.abort();
  }, [token]);

  async function act(
    action: "set_frequency" | "pause" | "resume" | "unsubscribe" | "unsubscribe_all",
    subscriptionId?: string,
    frequency?: Frequency,
  ) {
    if (!token || state.kind !== "ready") return;
    setBusy(subscriptionId ?? action);
    setActionError(null);
    try {
      const res = await fetch("/api/rate-alerts/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action,
          ...(subscriptionId ? { subscription_id: subscriptionId } : {}),
          ...(frequency ? { frequency } : {}),
        }),
      });
      if (res.status === 404) {
        setState({ kind: "invalid_token" });
        return;
      }
      if (!res.ok) {
        setActionError("That change didn't save. Please try again.");
        return;
      }
      const data = (await res.json()) as {
        success: boolean;
        item?: ManagedAlert;
        action?: string;
      };
      if (action === "unsubscribe_all") {
        setState({ kind: "unsubscribed_all" });
        return;
      }
      if (action === "unsubscribe") {
        setState((prev) =>
          prev.kind === "ready"
            ? { ...prev, items: prev.items.filter((a) => a.id !== subscriptionId) }
            : prev,
        );
        return;
      }
      if (data.item) {
        const updated = data.item;
        setState((prev) =>
          prev.kind === "ready"
            ? {
                ...prev,
                items: prev.items.map((a) => (a.id === updated.id ? updated : a)),
              }
            : prev,
        );
      }
    } catch {
      setActionError("That change didn't save. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (state.kind === "loading") {
    return (
      <div
        data-testid="manage-prefs-loading"
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600"
      >
        Loading your alerts…
      </div>
    );
  }

  if (state.kind === "invalid_token") {
    return (
      <div
        data-testid="manage-prefs-invalid-token"
        role="alert"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"
      >
        <h2 className="text-base font-bold text-amber-900">
          That link looks expired or already used
        </h2>
        <p className="mt-1 text-sm text-amber-800">
          Manage links stop working once the alert they came from is
          unsubscribed. You can set up a fresh alert in under a minute.
        </p>
        <Link
          href="/rate-alerts"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Set up a rate alert
        </Link>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        data-testid="manage-prefs-error"
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700"
      >
        Something went wrong loading your alerts. Please refresh to try again.
      </div>
    );
  }

  if (state.kind === "unsubscribed_all") {
    return (
      <div
        data-testid="manage-prefs-unsubscribed-all"
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center"
      >
        <h2 className="text-base font-bold text-slate-900">Unsubscribed</h2>
        <p className="mt-1 text-sm text-slate-600">
          All your rate alerts have been removed. You can resubscribe at any
          time.
        </p>
        <Link
          href="/rate-alerts"
          className="mt-4 inline-block text-sm font-medium text-slate-700 underline hover:text-slate-900"
        >
          Set up a new alert
        </Link>
      </div>
    );
  }

  const { email, items } = state;

  return (
    <div className="space-y-4" data-testid="manage-prefs-ready">
      <p className="text-xs text-slate-500">
        Alerts for <strong className="break-all">{email}</strong>
      </p>

      {actionError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"
        >
          {actionError}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm font-semibold text-slate-900">No alerts left</p>
          <p className="mt-1 text-xs text-slate-500">
            Every alert on this email has been unsubscribed.
          </p>
          <Link
            href="/rate-alerts"
            className="mt-4 inline-block rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-700"
          >
            Set up a new alert
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((alert) => (
            <div
              key={alert.id}
              data-testid={`manage-alert-${alert.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                    <Icon name="bell" size={18} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {describeAlert(alert)}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      {alert.paused ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-600">
                          <Icon name="clock" size={11} />
                          Paused
                        </span>
                      ) : alert.verified ? (
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
                        <span className="text-[0.65rem] text-slate-500">
                          {alert.notification_count} sent
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy === alert.id}
                  onClick={() => act("unsubscribe", alert.id)}
                  className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 transition-colors hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Unsubscribe
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <label
                  htmlFor={`freq-${alert.id}`}
                  className="text-xs font-medium text-slate-600"
                >
                  Frequency
                </label>
                <select
                  id={`freq-${alert.id}`}
                  value={alert.frequency}
                  disabled={busy === alert.id}
                  onChange={(e) =>
                    act("set_frequency", alert.id, e.target.value as Frequency)
                  }
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-300"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  disabled={busy === alert.id}
                  onClick={() => act(alert.paused ? "resume" : "pause", alert.id)}
                  className="ml-auto rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy === alert.id ? "Saving…" : alert.paused ? "Resume" : "Pause"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="pt-2 text-center">
          <button
            type="button"
            disabled={busy === "unsubscribe_all"}
            onClick={() => act("unsubscribe_all")}
            className="text-xs font-medium text-slate-500 underline transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "unsubscribe_all"
              ? "Unsubscribing…"
              : "Unsubscribe from all rate alerts"}
          </button>
        </div>
      )}
    </div>
  );
}
