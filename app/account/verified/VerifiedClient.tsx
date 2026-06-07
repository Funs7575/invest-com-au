"use client";

import { useState } from "react";
import Link from "next/link";

export interface VerifiedRow {
  id: number;
  product_type: "broker" | "etf" | "advisor" | "property";
  product_ref: string;
  verified_at: string;
}

const TYPE_CONFIG: Record<
  VerifiedRow["product_type"],
  { label: string; emoji: string; href: (ref: string) => string }
> = {
  broker: { label: "Broker", emoji: "🏦", href: (ref) => `/brokers/${ref}` },
  etf: { label: "ETF", emoji: "📈", href: (ref) => `/etf/${ref}` },
  advisor: { label: "Advisor", emoji: "🎓", href: (ref) => `/advisors/${ref}` },
  property: { label: "Property", emoji: "🏠", href: (ref) => `/property/${ref}` },
};

interface CardProps {
  row: VerifiedRow;
  onRemove: (id: number) => void;
}

function VerifiedCard({ row, onRemove }: CardProps) {
  const [removing, setRemoving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState(false);
  const cfg = TYPE_CONFIG[row.product_type];

  const handleRemove = async () => {
    setPendingRemove(false);
    setRemoving(true);
    try {
      const res = await fetch("/api/account/verified-products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_type: row.product_type, product_ref: row.product_ref }),
      });
      if (res.ok) onRemove(row.id);
    } finally {
      setRemoving(false);
    }
  };

  const verifiedDate = new Date(row.verified_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl" aria-hidden>
          {cfg.emoji}
        </span>
        <div className="min-w-0">
          <Link
            href={cfg.href(row.product_ref)}
            className="text-sm font-semibold text-violet-700 hover:underline truncate block"
          >
            {row.product_ref}
          </Link>
          <p className="text-xs text-slate-400">
            {cfg.label} · Verified {verifiedDate}
          </p>
        </div>
      </div>
      {pendingRemove ? (
        <div className="shrink-0 flex items-center gap-1.5">
          <span className="text-xs text-red-600 font-medium">Remove?</span>
          <button
            type="button"
            onClick={() => { void handleRemove(); }}
            disabled={removing}
            className="text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded-md transition-colors disabled:opacity-50"
          >{removing ? "…" : "Yes"}</button>
          <button
            type="button"
            onClick={() => setPendingRemove(false)}
            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 hover:border-slate-300 transition-colors"
          >No</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPendingRemove(true)}
          disabled={removing}
          className="shrink-0 text-xs text-slate-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {removing ? "Removing…" : "Remove"}
        </button>
      )}
    </div>
  );
}

export default function VerifiedClient({ initialRows }: { initialRows: VerifiedRow[] }) {
  const [rows, setRows] = useState<VerifiedRow[]>(initialRows);

  const handleRemove = (id: number) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const types: VerifiedRow["product_type"][] = ["broker", "etf", "advisor", "property"];

  if (rows.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-3" aria-hidden>✅</p>
        <p className="font-semibold text-slate-700">No verified products yet</p>
        <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
          When you click &quot;I use this&quot; on a broker, ETF, advisor, or property listing, it
          appears here.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Link
            href="/brokers"
            className="text-sm font-medium text-violet-700 hover:underline"
          >
            Browse brokers →
          </Link>
          <Link
            href="/etf"
            className="text-sm font-medium text-violet-700 hover:underline"
          >
            Browse ETFs →
          </Link>
          <Link
            href="/advisors"
            className="text-sm font-medium text-violet-700 hover:underline"
          >
            Browse advisors →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {types.map((type) => {
        const group = rows.filter((r) => r.product_type === type);
        if (group.length === 0) return null;
        const cfg = TYPE_CONFIG[type];
        return (
          <section key={type}>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {cfg.emoji} {cfg.label}s — {group.length}
            </h2>
            <div className="space-y-2">
              {group.map((row) => (
                <VerifiedCard key={row.id} row={row} onRemove={handleRemove} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
