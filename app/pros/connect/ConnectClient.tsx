"use client";

import { useState, useTransition } from "react";
import type { StripeConnectStatus } from "@/lib/stripe-connect";

interface Props {
  professionalId: number;
  status: StripeConnectStatus;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
}

const STATUS_LABEL: Record<StripeConnectStatus, { label: string; tone: string }> = {
  not_connected: {
    label: "Not connected",
    tone: "bg-slate-50 border-slate-200 text-slate-800",
  },
  onboarding: {
    label: "Onboarding in progress",
    tone: "bg-amber-50 border-amber-200 text-amber-900",
  },
  active: {
    label: "Connected — payouts enabled",
    tone: "bg-emerald-50 border-emerald-200 text-emerald-900",
  },
  restricted: {
    label: "Restricted — action required",
    tone: "bg-amber-50 border-amber-200 text-amber-900",
  },
  rejected: {
    label: "Rejected",
    tone: "bg-rose-50 border-rose-200 text-rose-800",
  },
};

export default function ConnectClient({
  status,
  payoutsEnabled,
  chargesEnabled,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStart() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/pros/connect/onboarding", { method: "POST" });
        const body = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !body.url) {
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        window.location.href = body.url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start.");
      }
    });
  }

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/pros/connect/refresh", { method: "POST" });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Refresh failed.");
      }
    });
  }

  const meta = STATUS_LABEL[status];

  // 3-step onboarding wizard indicator. Each step lights up based on the
  // resolved Stripe Connect status — turns the opaque "click Connect"
  // button into a visible journey so pros know what's next + how close
  // they are to receiving payouts.
  const stepIndex =
    status === "active"
      ? 2
      : status === "onboarding" || status === "restricted"
        ? 1
        : 0;
  const steps = [
    {
      title: "Connect",
      body: "Hand off to Stripe Express to verify your identity + bank account.",
    },
    {
      title: "Verify",
      body: "Stripe checks your details. Usually instant; takes up to 24h if anything needs follow-up.",
    },
    {
      title: "Active",
      body: "Marketplace payments start flowing. 10% platform fee, payouts on your Stripe schedule.",
    },
  ];

  return (
    <div className="space-y-4">
      <ol className="grid grid-cols-3 gap-2 mb-2">
        {steps.map((s, i) => {
          const reached = i <= stepIndex;
          const active = i === stepIndex;
          return (
            <li
              key={s.title}
              className={`rounded-xl border p-3 ${
                active
                  ? "border-amber-400 bg-amber-50"
                  : reached
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex w-5 h-5 rounded-full text-[10px] font-bold items-center justify-center ${
                    reached
                      ? active
                        ? "bg-amber-500 text-slate-900"
                        : "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {reached && !active ? "✓" : i + 1}
                </span>
                <p
                  className={`text-xs font-bold ${
                    active
                      ? "text-amber-900"
                      : reached
                        ? "text-emerald-900"
                        : "text-slate-500"
                  }`}
                >
                  {s.title}
                </p>
              </div>
              <p className="text-[10px] leading-snug text-slate-600">{s.body}</p>
            </li>
          );
        })}
      </ol>

      <div className={`rounded-2xl border p-4 ${meta.tone}`}>
        <p className="text-[11px] uppercase tracking-widest font-bold opacity-80 mb-1">
          Status
        </p>
        <p className="text-base font-extrabold">{meta.label}</p>
        <p className="text-xs mt-2 opacity-80">
          Charges {chargesEnabled ? "enabled" : "disabled"} · Payouts{" "}
          {payoutsEnabled ? "enabled" : "disabled"}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {status === "not_connected" && (
          <button
            type="button"
            onClick={handleStart}
            disabled={pending}
            className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl"
          >
            {pending ? "Starting…" : "Connect with Stripe"}
          </button>
        )}
        {status === "onboarding" && (
          <button
            type="button"
            onClick={handleStart}
            disabled={pending}
            className="bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl"
          >
            {pending ? "Loading…" : "Continue onboarding"}
          </button>
        )}
        {(status === "active" || status === "restricted") && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={pending}
            className="bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-xl"
          >
            {pending ? "Refreshing…" : "Refresh status"}
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-500">
        Platform fee: 10% of each transaction. Funds payout to your bank per
        your Stripe schedule.
      </p>
    </div>
  );
}
