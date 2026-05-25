"use client";

import { useCallback, useState } from "react";
import Icon from "@/components/Icon";
import type { BrandedProfileState } from "@/lib/firm-branded-profile";

interface Props {
  state: BrandedProfileState;
}

const FEATURES: { icon: string; title: string; body: string }[] = [
  {
    icon: "shield-check",
    title: "Custom hero",
    body: "A branded banner image and tagline at the top of your firm profile.",
  },
  {
    icon: "check-circle",
    title: "Featured specialties",
    body: "Pin the specialties you want clients to see first — above the team grid.",
  },
  {
    icon: "external-link",
    title: "Booking embed",
    body: "Embed your scheduling tool so clients can book straight from the page.",
  },
];

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BrandedProfileClient({ state }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = useCallback(
    async (path: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(path, { method: "POST" });
        const json = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !json.url) {
          throw new Error(json.error ?? "Something went wrong. Try again.");
        }
        window.location.href = json.url;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Try again.",
        );
        setBusy(false);
      }
    },
    [],
  );

  const subscribe = useCallback(
    () => post("/api/firm-portal/branded-profile/subscribe"),
    [post],
  );
  const openPortal = useCallback(
    () => post("/api/firm-portal/branded-profile/portal"),
    [post],
  );

  const renewLabel = formatDate(state.periodEnd);
  const isActive = state.active;
  const isPastDue = state.status === "past_due";

  return (
    <div className="space-y-6">
      {/* Status / CTA card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-7 shadow-sm">
        {isActive ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                <Icon name="check-circle" className="h-3.5 w-3.5" />
                {state.status === "trialing" ? "Trialing" : "Active"}
              </span>
              <p className="text-sm text-slate-600 mt-3">
                Your branded profile is live.
                {renewLabel ? ` Renews on ${renewLabel}.` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={openPortal}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Icon name="credit-card" className="h-4 w-4" />
              {busy ? "Opening…" : "Manage billing"}
            </button>
          </div>
        ) : (
          <div>
            {isPastDue && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <strong>Payment past due.</strong> Your branded profile is
                paused until billing is up to date. Update your card to restore
                it.
              </div>
            )}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-3xl md:text-4xl font-extrabold text-slate-900">
                  A$49
                  <span className="text-base font-medium text-slate-500">
                    {" "}
                    / month
                  </span>
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Cancel anytime from the billing portal.
                </p>
              </div>
              {isPastDue ? (
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <Icon name="credit-card" className="h-4 w-4" />
                  {busy ? "Opening…" : "Update card"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={subscribe}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <Icon name="rocket" className="h-4 w-4" />
                  {busy ? "Starting…" : "Upgrade now"}
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 mt-4" role="alert">
            {error}
          </p>
        )}
      </section>

      {/* Feature list */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-7 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          What you get
        </h2>
        <ul className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="flex flex-col gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold text-slate-900">
                {f.title}
              </span>
              <span className="text-sm text-slate-500 leading-relaxed">
                {f.body}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 mt-5 leading-relaxed">
          After upgrading, add your hero image, tagline, featured specialties
          and booking link from your firm settings. Free profiles keep their
          current layout — nothing changes for them.
        </p>
      </section>
    </div>
  );
}
