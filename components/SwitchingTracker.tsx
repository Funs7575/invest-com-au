"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProductKind = "broker" | "savings_account" | "term_deposit" | "super" | "crypto";

interface TrackedProduct {
  id: string;
  product_kind: ProductKind;
  broker_id: number | null;
  broker_name: string;
  started_at: string;
  fee_text: string | null;
  estimated_trades_pa: number | null;
  estimated_balance_cents: number | null;
  status: "active" | "switched" | "closed";
  created_at: string;
  comparison: {
    annualSavingCents: number;
    annualSavingLabel: string;
    lifetimeSavingCents: number;
    lifetimeSavingLabel: string;
    bestBrokerName: string | null;
    bestBrokerSlug: string | null;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const KIND_LABELS: Record<ProductKind, string> = {
  broker: "Share broker",
  savings_account: "Savings account",
  term_deposit: "Term deposit",
  super: "Super fund",
  crypto: "Crypto exchange",
};

const KIND_NEEDS_TRADES: Record<ProductKind, boolean> = {
  broker: true,
  crypto: true,
  savings_account: false,
  term_deposit: false,
  super: false,
};

const PRODUCT_KINDS: ProductKind[] = [
  "broker",
  "savings_account",
  "term_deposit",
  "super",
  "crypto",
];

function yearsSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, ms / (365.25 * 24 * 3600 * 1000));
}

function yearsLabel(dateStr: string): string {
  const y = yearsSince(dateStr);
  if (y < 0.5) return "< 6 months";
  if (y < 1.5) return "~1 year";
  return `~${Math.round(y)} years`;
}

// ── Add Product Form ──────────────────────────────────────────────────────────

interface AddFormState {
  productKind: ProductKind;
  brokerName: string;
  startedAt: string;
  feeText: string;
  estimatedTradesPa: string;
  estimatedBalanceCents: string;
}

const EMPTY_FORM: AddFormState = {
  productKind: "broker",
  brokerName: "",
  startedAt: "",
  feeText: "",
  estimatedTradesPa: "",
  estimatedBalanceCents: "",
};

function AddProductForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AddFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof AddFormState>(key: K, value: AddFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const needsTrades = KIND_NEEDS_TRADES[form.productKind];
    const body: Record<string, unknown> = {
      productKind: form.productKind,
      brokerName: form.brokerName.trim(),
      startedAt: form.startedAt,
      feeText: form.feeText.trim() || null,
    };
    if (needsTrades && form.estimatedTradesPa) {
      body.estimatedTradesPa = parseInt(form.estimatedTradesPa, 10);
    }
    if (!needsTrades && form.estimatedBalanceCents) {
      body.estimatedBalanceCents = Math.round(parseFloat(form.estimatedBalanceCents) * 100);
    }

    try {
      const res = await fetch("/api/switching-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError((json as { error?: string }).error ?? "Could not save product.");
      } else {
        setForm(EMPTY_FORM);
        setOpen(false);
        onAdded();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        + Track another product
      </button>
    );
  }

  const needsTrades = KIND_NEEDS_TRADES[form.productKind];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50"
    >
      <p className="text-sm font-semibold text-slate-800">Add a product to track</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Product type</label>
          <select
            value={form.productKind}
            onChange={(e) => set("productKind", e.target.value as ProductKind)}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
            required
          >
            {PRODUCT_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Provider name</label>
          <input
            type="text"
            value={form.brokerName}
            onChange={(e) => set("brokerName", e.target.value)}
            placeholder="e.g. CommSec"
            maxLength={100}
            required
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Date you started
          </label>
          <input
            type="date"
            value={form.startedAt}
            max={today}
            onChange={(e) => set("startedAt", e.target.value)}
            required
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            {needsTrades ? "Est. trades/year" : "Approx. balance ($)"}
          </label>
          <input
            type="number"
            min="0"
            value={needsTrades ? form.estimatedTradesPa : form.estimatedBalanceCents}
            onChange={(e) =>
              set(
                needsTrades ? "estimatedTradesPa" : "estimatedBalanceCents",
                e.target.value,
              )
            }
            placeholder={needsTrades ? "e.g. 12" : "e.g. 50000"}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Fee description (optional)
        </label>
        <input
          type="text"
          value={form.feeText}
          onChange={(e) => set("feeText", e.target.value)}
          placeholder="e.g. $19.95/trade"
          maxLength={100}
          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save product"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setForm(EMPTY_FORM);
            setError(null);
          }}
          className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg"
        >
          Cancel
        </button>
      </div>

      <p className="text-[11px] text-slate-400">
        General information only — estimates based on your inputs. Not personal financial advice.
      </p>
    </form>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onRemove,
}: {
  product: TrackedProduct;
  onRemove: (id: string, reason: "switched" | "closed") => void;
}) {
  const [removing, setRemoving] = useState<"switched" | "closed" | null>(null);

  async function handleRemove(reason: "switched" | "closed") {
    setRemoving(reason);
    try {
      const res = await fetch(`/api/switching-tracker/${product.id}?reason=${reason}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRemove(product.id, reason);
      }
    } finally {
      setRemoving(null);
    }
  }

  const comp = product.comparison;
  const hasComparison = comp && (comp.annualSavingCents > 0 || comp.lifetimeSavingCents > 0);
  const saving = comp?.annualSavingCents ?? 0;
  const savingTone = saving >= 20000 ? "text-emerald-700" : saving >= 5000 ? "text-amber-700" : "text-slate-500";

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-slate-400 font-medium">
            {KIND_LABELS[product.product_kind]}
          </p>
          <p className="text-base font-semibold text-slate-900 mt-0.5">{product.broker_name}</p>
          <p className="text-xs text-slate-500">
            Since {new Date(product.started_at).toLocaleDateString("en-AU", { year: "numeric", month: "short" })}
            {" · "}
            {yearsLabel(product.started_at)}
          </p>
        </div>
        {hasComparison && comp && (
          <div className="text-right shrink-0">
            <p className={`text-sm font-bold ${savingTone}`}>
              Save {comp.annualSavingLabel}/yr
            </p>
            {comp.bestBrokerName && (
              <p className="text-xs text-slate-400">vs {comp.bestBrokerName}</p>
            )}
          </div>
        )}
      </div>

      {hasComparison && comp?.bestBrokerName && comp.bestBrokerSlug && (
        <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
          Switching to{" "}
          <Link
            href={`/broker/${comp.bestBrokerSlug}`}
            className="font-medium text-violet-700 hover:underline"
          >
            {comp.bestBrokerName}
          </Link>{" "}
          could save you approximately{" "}
          <span className={`font-semibold ${savingTone}`}>{comp.annualSavingLabel}/year</span>
          {comp.lifetimeSavingCents > 0 && (
            <>
              {" "}
              ({comp.lifetimeSavingLabel} over the time you{"'"}ve held this product)
            </>
          )}
          .{" "}
          <span className="text-slate-400 text-xs">General information only — not advice.</span>
        </div>
      )}

      {product.fee_text && (
        <p className="text-xs text-slate-500">Current fee: {product.fee_text}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => handleRemove("switched")}
          disabled={removing !== null}
          className="flex-1 py-1.5 text-xs font-medium border border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg disabled:opacity-50 transition-colors"
        >
          {removing === "switched" ? "Updating…" : "I've switched"}
        </button>
        <button
          onClick={() => handleRemove("closed")}
          disabled={removing !== null}
          className="flex-1 py-1.5 text-xs font-medium border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-lg disabled:opacity-50 transition-colors"
        >
          {removing === "closed" ? "Removing…" : "Remove"}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SwitchingTracker() {
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/switching-tracker");
      if (!res.ok) {
        setError("Could not load your tracked products.");
        return;
      }
      const json = (await res.json()) as { products: TrackedProduct[] };
      setProducts(json.products);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleRemove(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">My Products</h2>
        {!loading && products.length > 0 && (
          <span className="text-xs text-slate-400">{products.length} tracked</span>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 bg-white animate-pulse">
              <div className="h-3 w-24 bg-slate-200 rounded mb-2" />
              <div className="h-5 w-40 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-32 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && products.length === 0 && (
        <p className="text-sm text-slate-500">
          You haven{"'"}t tracked any products yet. Add one below to see how much you could save
          by switching.
        </p>
      )}

      {!loading && products.map((p) => (
        <ProductCard key={p.id} product={p} onRemove={handleRemove} />
      ))}

      {!loading && <AddProductForm onAdded={load} />}
    </section>
  );
}
