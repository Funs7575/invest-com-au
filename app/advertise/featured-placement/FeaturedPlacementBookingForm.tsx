"use client";

import { useMemo, useState } from "react";

interface PricingRow {
  id: number;
  tier: string;
  duration_days: number;
  amount_cents: number;
  description: string | null;
  max_concurrent: number;
  sort_order: number;
}

interface BrokerRow {
  slug: string;
  name: string;
}

interface Props {
  pricing: PricingRow[];
  brokers: BrokerRow[];
}

function prettyTier(t: string): string {
  return t
    .split("_")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

function defaultStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

function maxStartDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toISOString().slice(0, 10);
}

export default function FeaturedPlacementBookingForm({
  pricing,
  brokers,
}: Props) {
  const [pricingId, setPricingId] = useState<number>(pricing[0]?.id ?? 0);
  const [brokerSlug, setBrokerSlug] = useState<string>("");
  const [brokerName, setBrokerName] = useState<string>("");
  const [startsAt, setStartsAt] = useState<string>(defaultStartDate());
  const [email, setEmail] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const selectedPricing = useMemo(
    () => pricing.find((p) => p.id === pricingId) ?? pricing[0],
    [pricingId, pricing],
  );

  const selectedBroker = useMemo(
    () => brokers.find((b) => b.slug === brokerSlug) ?? null,
    [brokerSlug, brokers],
  );

  const endsAt = useMemo(() => {
    if (!selectedPricing || !startsAt) return "";
    const d = new Date(startsAt);
    d.setDate(d.getDate() + selectedPricing.duration_days);
    return d.toISOString().slice(0, 10);
  }, [selectedPricing, startsAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!selectedPricing) return setError("Select a tier and duration.");
    if (!selectedBroker && !brokerName.trim()) {
      return setError("Pick a broker or type the name we should sponsor.");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError("Enter a valid billing email.");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/advertise/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pricing_id: selectedPricing.id,
          broker_slug: selectedBroker?.slug ?? "",
          broker_name: selectedBroker?.name ?? brokerName,
          starts_at: startsAt,
          email: email.trim(),
          contact_name: contactName.trim(),
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Checkout failed");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="book-tier"
          className="block text-xs font-bold text-slate-700 mb-1.5"
        >
          Tier &amp; duration
        </label>
        <select
          id="book-tier"
          value={pricingId}
          onChange={(e) => setPricingId(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {pricing.map((p) => (
            <option key={p.id} value={p.id}>
              {prettyTier(p.tier)} — {p.duration_days} days — A$
              {(p.amount_cents / 100).toLocaleString("en-AU", {
                maximumFractionDigits: 0,
              })}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="book-broker"
          className="block text-xs font-bold text-slate-700 mb-1.5"
        >
          Broker / platform to sponsor
        </label>
        <select
          id="book-broker"
          value={brokerSlug}
          onChange={(e) => {
            setBrokerSlug(e.target.value);
            const match = brokers.find((b) => b.slug === e.target.value);
            if (match) setBrokerName(match.name);
          }}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">— Select from our catalogue —</option>
          {brokers.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500 mt-1">
          Don&apos;t see your platform? Email{" "}
          <a
            href="mailto:partnerships@invest.com.au"
            className="text-amber-700 underline"
          >
            partnerships@invest.com.au
          </a>{" "}
          to get listed first.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="book-start"
            className="block text-xs font-bold text-slate-700 mb-1.5"
          >
            Start date
          </label>
          <input
            id="book-start"
            type="date"
            value={startsAt}
            min={defaultStartDate()}
            max={maxStartDate()}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            required
          />
        </div>
        <div>
          <label
            htmlFor="book-end"
            className="block text-xs font-bold text-slate-700 mb-1.5"
          >
            End date (calculated)
          </label>
          <input
            id="book-end"
            type="date"
            value={endsAt}
            readOnly
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
            aria-readonly="true"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="book-contact"
            className="block text-xs font-bold text-slate-700 mb-1.5"
          >
            Your name
          </label>
          <input
            id="book-contact"
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Jane Smith"
            maxLength={80}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label
            htmlFor="book-email"
            className="block text-xs font-bold text-slate-700 mb-1.5"
          >
            Billing email
          </label>
          <input
            id="book-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@broker.com"
            required
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm transition-colors disabled:opacity-60"
        >
          {submitting
            ? "Redirecting to checkout…"
            : `Checkout — A$${selectedPricing ? (selectedPricing.amount_cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 0 }) : "—"}`}
        </button>
        <p className="text-center text-[11px] text-slate-500 mt-2">
          Secure payment via Stripe. Invoice sent automatically.
        </p>
      </div>
    </form>
  );
}
