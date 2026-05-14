"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

interface Props {
  slug: string;
  briefId: number;
}

interface LineItem {
  label: string;
  estimated_hours: string;
}

export default function QuoteBuilderForm({ slug, briefId }: Props) {
  const router = useRouter();
  const [amountDollars, setAmountDollars] = useState<string>("");
  const [items, setItems] = useState<LineItem[]>([{ label: "", estimated_hours: "" }]);
  const [paymentTerms, setPaymentTerms] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function removeItem(i: number) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
  }
  function addItem() {
    setItems((arr) => [...arr, { label: "", estimated_hours: "" }]);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const cents = Math.round(Number(amountDollars) * 100);
      if (!Number.isFinite(cents) || cents <= 0) {
        throw new Error("Enter a valid total amount");
      }
      const scopeItems = items
        .filter((it) => it.label.trim().length > 0)
        .map((it) => ({
          label: it.label.trim(),
          ...(it.estimated_hours.trim() && !isNaN(Number(it.estimated_hours))
            ? { estimated_hours: Number(it.estimated_hours) }
            : {}),
        }));
      const res = await fetch(`/api/teams/${slug}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief_id: briefId,
          amount_cents: cents,
          scope_items: scopeItems,
          payment_terms: paymentTerms.trim() || null,
          delivery_days_estimate: deliveryDays && !isNaN(Number(deliveryDays))
            ? Number(deliveryDays)
            : null,
        }),
      });
      const json = (await res.json()) as { quote_id?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not send quote");
      router.push(`/teams/${slug}/inbox`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send quote");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Amount */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          Total amount (A$)
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={amountDollars}
          onChange={(e) => setAmountDollars(e.target.value)}
          placeholder="e.g. 4500"
          min="0"
          step="50"
          className="w-full sm:w-64 border border-slate-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </section>

      {/* Scope */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">What&apos;s included</h2>
          <button
            type="button"
            onClick={addItem}
            className="text-xs font-semibold text-amber-700 hover:underline inline-flex items-center gap-1"
          >
            <Icon name="plus" size={12} /> Add item
          </button>
        </div>
        {items.map((it, i) => (
          <div key={i} className="flex items-start gap-2">
            <input
              type="text"
              value={it.label}
              onChange={(e) => updateItem(i, { label: e.target.value.slice(0, 200) })}
              placeholder="e.g. SMSF setup including ATO registration"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              type="number"
              value={it.estimated_hours}
              onChange={(e) => updateItem(i, { estimated_hours: e.target.value })}
              placeholder="hrs"
              min="0"
              step="0.5"
              className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-slate-400 hover:text-red-600 p-2"
                aria-label="Remove item"
              >
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
        ))}
      </section>

      {/* Payment terms + delivery */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-900 mb-1 block">
            Payment terms <span className="text-xs text-slate-400">(optional)</span>
          </span>
          <textarea
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="e.g. 50% upfront, 50% on completion"
            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-900 mb-1 block">
            Estimated delivery (days) <span className="text-xs text-slate-400">(optional)</span>
          </span>
          <input
            type="number"
            value={deliveryDays}
            onChange={(e) => setDeliveryDays(e.target.value)}
            placeholder="e.g. 21"
            min="1"
            className="w-32 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>
      </section>

      {error && (
        <p className="text-sm text-red-700" role="alert">{error}</p>
      )}

      <button
        type="button"
        onClick={() => void submit()}
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 text-slate-900 font-bold text-base px-6 py-3 rounded-xl"
      >
        {submitting ? "Sending…" : "Send quote to consumer"}
        <Icon name="arrow-right" size={16} />
      </button>

      <p className="text-[10px] text-slate-400 text-center">
        Quote valid for 14 days. Consumer will be emailed a review link.
      </p>
    </div>
  );
}
