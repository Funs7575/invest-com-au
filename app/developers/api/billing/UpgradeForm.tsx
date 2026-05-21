"use client";

import { useState } from "react";

interface PurchasableTier {
  tier: "basic" | "pro";
  label: string;
  priceMonthly: number;
}

interface Props {
  /** Paid, self-serve-purchasable tiers (price id configured server-side). */
  tiers: PurchasableTier[];
  /** Pre-fill the tier dropdown (e.g. from a "Choose Pro" card click). */
  defaultTier?: "basic" | "pro";
}

/**
 * Client-side upgrade form for the Data-API billing page.
 *
 * Collects the API key prefix the caller wants to upgrade plus the target
 * tier, then POSTs to `/api/v1/billing/checkout` and redirects to the
 * returned Stripe Checkout URL. The route enforces that the signed-in user
 * owns the key (by `owner_email`), so this form stays deliberately thin.
 */
export default function UpgradeForm({ tiers, defaultTier }: Props) {
  const [keyPrefix, setKeyPrefix] = useState("");
  const [tier, setTier] = useState<"basic" | "pro">(
    defaultTier ?? tiers[0]?.tier ?? "basic",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, key_prefix: keyPrefix.trim() }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Could not start checkout");
      }
      window.location.href = json.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setLoading(false);
    }
  }

  if (tiers.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
        Self-serve checkout isn&apos;t enabled right now. Email{" "}
        <a
          href="mailto:api@invest.com.au"
          className="text-brand underline underline-offset-2"
        >
          api@invest.com.au
        </a>{" "}
        to upgrade your tier.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 md:p-6 space-y-4"
    >
      <div className="space-y-1.5">
        <label
          htmlFor="api-key-prefix"
          className="block text-sm font-semibold text-slate-800"
        >
          Your API key prefix
        </label>
        <input
          id="api-key-prefix"
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          required
          minLength={8}
          maxLength={8}
          pattern="ica_.{4}"
          value={keyPrefix}
          onChange={(e) => setKeyPrefix(e.target.value)}
          placeholder="ica_xxxx"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <p className="text-xs text-slate-500">
          The first 8 characters shown when you created the key (e.g.{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5">ica_a1b2</code>).
          The key must be registered to the email you&apos;re signed in with.
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="api-tier"
          className="block text-sm font-semibold text-slate-800"
        >
          Plan
        </label>
        <select
          id="api-tier"
          value={tier}
          onChange={(e) => setTier(e.target.value as "basic" | "pro")}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        >
          {tiers.map((t) => (
            <option key={t.tier} value={t.tier}>
              {t.label} — A${t.priceMonthly}/month
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {loading ? "Redirecting to checkout…" : "Continue to checkout"}
      </button>

      <p className="text-xs text-slate-400">
        Secure subscription billing by Stripe. Cancel anytime — your tier
        reverts to Free at the end of the billing period.
      </p>
    </form>
  );
}
