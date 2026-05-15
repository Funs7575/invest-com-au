"use client";

import { useState, useTransition } from "react";
import type { PricingTier } from "@/lib/briefs/pricing-tier";

interface Props {
  professionalId: number;
  currentTier: PricingTier;
  successMultiplier: string;
}

export default function PricingTierForm({
  professionalId,
  currentTier,
  successMultiplier,
}: Props) {
  const [selected, setSelected] = useState<PricingTier>(currentTier);
  const [pending, startTransition] = useTransition();
  const [savedTier, setSavedTier] = useState<PricingTier>(currentTier);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selected === savedTier) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/pros/pricing-tier", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ professional_id: professionalId, tier: selected }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setSavedTier(selected);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <TierOption
        value="standard"
        title="Standard"
        body="Pay credits at brief-accept time. Best for high-conversion practices."
        selected={selected === "standard"}
        onSelect={() => setSelected("standard")}
      />
      <TierOption
        value="success_only"
        title="Success-Only"
        body={`Pay nothing at accept. Pay ${successMultiplier}× standard cost at outcome time — only if the consumer confirms 'completed'.`}
        selected={selected === "success_only"}
        onSelect={() => setSelected("success_only")}
        badge="Aligned"
      />

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-slate-500">
          Current: <strong className="text-slate-700">{savedTier}</strong>
        </p>
        <button
          type="submit"
          disabled={pending || selected === savedTier}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl"
        >
          {pending ? "Saving…" : "Save tier"}
        </button>
      </div>
    </form>
  );
}

function TierOption({
  title,
  body,
  selected,
  onSelect,
  badge,
}: {
  value: PricingTier;
  title: string;
  body: string;
  selected: boolean;
  onSelect: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-4 transition ${
        selected
          ? "border-amber-500 bg-amber-50"
          : "border-slate-200 hover:border-slate-300 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold text-slate-900">{title}</span>
        {badge && (
          <span className="text-[10px] uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </button>
  );
}
