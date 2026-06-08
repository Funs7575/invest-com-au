"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

// FIN_NOTEBOOK Revenue #4 — public landing-page form. POSTs to the existing
// `/api/rate-alerts` endpoint (see app/api/rate-alerts/route.ts for the
// canonical payload shape). Token-driven verify/unsubscribe links from the
// confirmation email also land back here (via ?verify=… or ?unsubscribe=…),
// so the component also surfaces those success states.

type ProductKind = "savings_account" | "term_deposit";
type Frequency = "instant" | "daily" | "weekly";
type FormStatus = "idle" | "sending" | "done" | "error";

const PRODUCT_LABELS: Record<ProductKind, string> = {
  savings_account: "Savings account",
  term_deposit: "Term deposit",
};

const FREQUENCY_LABELS: Record<Frequency, string> = {
  instant: "Instant",
  daily: "Daily digest",
  weekly: "Weekly digest",
};

export default function RateAlertSignupForm() {
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [productKind, setProductKind] = useState<ProductKind>("savings_account");
  const [thresholdPct, setThresholdPct] = useState("5.25");
  const [frequency, setFrequency] = useState<Frequency>("instant");
  // Honeypot — bots fill this, real users never see it. Submit-side checks
  // are handled server-side (route.ts silently 200s on a non-empty value).
  const [website, setWebsite] = useState("");

  const [status, setStatus] = useState<FormStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Token states — separate from the form so a verify/unsubscribe round-trip
  // doesn't reset a half-filled form.
  const [tokenStatus, setTokenStatus] = useState<
    "idle" | "verifying" | "verified" | "unsubscribed" | "token_error"
  >("idle");

  // Depend on the string values (stable) rather than the searchParams
  // object reference — Next.js returns a new ReadonlyURLSearchParams
  // instance on each render of pages with `useSearchParams`, which would
  // otherwise refire this effect indefinitely.
  const verifyToken = searchParams.get("verify");
  const unsubToken = searchParams.get("unsubscribe");

  useEffect(() => {
    if (!verifyToken && !unsubToken) return;

    const ctrl = new AbortController();
    setTokenStatus("verifying");

    const url = verifyToken
      ? `/api/rate-alerts?verify=${encodeURIComponent(verifyToken)}`
      : `/api/rate-alerts?unsubscribe=${encodeURIComponent(unsubToken!)}`;

    fetch(url, { signal: ctrl.signal })
      .then((res) => res.json().catch(() => ({})))
      .then((data: { action?: string; error?: string }) => {
        if (data.action === "verified") {
          setTokenStatus("verified");
        } else if (data.action === "unsubscribed") {
          setTokenStatus("unsubscribed");
        } else {
          setTokenStatus("token_error");
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setTokenStatus("token_error");
      });

    return () => ctrl.abort();
  }, [verifyToken, unsubToken]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const pct = Number.parseFloat(thresholdPct);
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!Number.isFinite(pct) || pct <= 0 || pct > 50) {
      setError("Enter a target rate between 0% and 50%.");
      return;
    }

    setStatus("sending");
    try {
      const res = await fetch("/api/rate-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          product_kind: productKind,
          threshold_pct: pct,
          frequency,
          website,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
      }
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Network error.");
    }
  }

  // ── Token-driven states first (verify / unsubscribe round-trip). ──
  if (tokenStatus === "verifying") {
    return (
      <div
        data-testid="rate-alert-token-pending"
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm"
      >
        Checking your link…
      </div>
    );
  }
  if (tokenStatus === "verified") {
    return (
      <div
        data-testid="rate-alert-verified"
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm"
      >
        <h2 className="text-base font-bold text-emerald-900">
          You&apos;re subscribed
        </h2>
        <p className="mt-1 text-sm text-emerald-800">
          We&apos;ll email you the moment an Australian rate beats your
          threshold.
        </p>
      </div>
    );
  }
  if (tokenStatus === "unsubscribed") {
    return (
      <div
        data-testid="rate-alert-unsubscribed"
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center shadow-sm"
      >
        <h2 className="text-base font-bold text-slate-900">Unsubscribed</h2>
        <p className="mt-1 text-sm text-slate-600">
          You&apos;ve been removed from rate alerts. You can resubscribe at any
          time below.
        </p>
      </div>
    );
  }
  if (tokenStatus === "token_error") {
    return (
      <div
        data-testid="rate-alert-token-error"
        role="alert"
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-900 shadow-sm"
      >
        That link looks expired or already used. You can re-subscribe below.
      </div>
    );
  }

  if (status === "done") {
    return (
      <div
        data-testid="rate-alert-success"
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center shadow-sm"
      >
        <h2 className="text-base font-bold text-emerald-900">
          Check your inbox
        </h2>
        <p className="mt-1 text-sm text-emerald-800">
          We&apos;ve sent a confirmation link to{" "}
          <strong className="break-all">{email}</strong>. Click it to activate
          your alert.
        </p>
      </div>
    );
  }

  return (
    <form
      data-testid="rate-alert-form"
      onSubmit={submit}
      // noValidate so our own (consistent, accessible) error messages run
      // instead of the browser's locale-dependent native popups.
      noValidate
      className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg md:p-8"
    >
      <h2 className="text-lg font-bold md:text-xl">
        Set up your rate alert — free
      </h2>
      <p className="mt-1 text-sm text-slate-300">
        Double opt-in. One email per match, max one per day. Unsubscribe in one
        click.
      </p>

      {/* Honeypot — visually hidden, off-screen, no tab stop. */}
      <label
        aria-hidden="true"
        className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
      >
        Website
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </label>

      <div className="mt-5 grid gap-4">
        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-semibold text-slate-300">
            Email address
          </span>
          <input
            data-testid="rate-alert-email"
            type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>

        <fieldset>
          <legend className="mb-1.5 block text-xs font-semibold text-slate-300">
            Product
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PRODUCT_LABELS) as ProductKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                data-testid={`rate-alert-kind-${kind}`}
                aria-pressed={productKind === kind}
                onClick={() => setProductKind(kind)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  productKind === kind
                    ? "bg-amber-500 text-white"
                    : "bg-white/10 text-slate-300 hover:bg-white/15"
                }`}
              >
                {PRODUCT_LABELS[kind]}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block text-sm">
          <span className="mb-1.5 block text-xs font-semibold text-slate-300">
            Notify me when the headline rate reaches
          </span>
          <div className="relative">
            <input
              data-testid="rate-alert-threshold"
              type="number"
              inputMode="decimal"
              step="0.05"
              min="0"
              max="50"
              value={thresholdPct}
              onChange={(e) => setThresholdPct(e.target.value)}
              placeholder="5.25"
              required
              aria-label="Target rate in per cent per annum"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 pr-16 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
              % p.a.
            </span>
          </div>
        </label>

        <fieldset>
          <legend className="mb-1.5 block text-xs font-semibold text-slate-300">
            Frequency
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
              <button
                key={f}
                type="button"
                data-testid={`rate-alert-freq-${f}`}
                aria-pressed={frequency === f}
                onClick={() => setFrequency(f)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  frequency === f
                    ? "bg-amber-500 text-white"
                    : "bg-white/10 text-slate-300 hover:bg-white/15"
                }`}
              >
                {FREQUENCY_LABELS[f]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <button
        data-testid="rate-alert-submit"
        type="submit"
        disabled={status === "sending"}
        className="mt-6 w-full rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "sending" ? "Setting your alert…" : "Alert me"}
      </button>

      {error && (
        <p
          data-testid="rate-alert-error"
          role="alert"
          className="mt-3 text-sm text-amber-200"
        >
          {error}
        </p>
      )}
    </form>
  );
}
