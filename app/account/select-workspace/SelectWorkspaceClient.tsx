"use client";

import { useState } from "react";
import type { KindMembership, WorkspaceKind } from "@/lib/account-kinds";

interface Props {
  memberships: KindMembership[];
}

const KIND_META: Record<
  WorkspaceKind,
  { label: string; description: string; icon: string; tone: string }
> = {
  investor: {
    label: "Investor",
    description: "Track your holdings, save searches, watchlist brokers and advisors.",
    icon: "📈",
    tone: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
  },
  advisor: {
    label: "Advisor",
    description: "Your professional dashboard — leads, KPIs, billing, advisor profile.",
    icon: "🧑‍💼",
    tone: "bg-sky-50 border-sky-200 hover:border-sky-400",
  },
  broker_partner: {
    label: "Broker partner",
    description: "Marketplace partner dashboard — campaigns, attribution, billing.",
    icon: "🏦",
    tone: "bg-amber-50 border-amber-200 hover:border-amber-400",
  },
  business_owner: {
    label: "Business owner",
    description: "Track grants, R&D claims, sell-business prep.",
    icon: "🏢",
    tone: "bg-violet-50 border-violet-200 hover:border-violet-400",
  },
  listing_owner: {
    label: "Listing owner",
    description: "Manage your listings, view leads, renew expiring placements.",
    icon: "🏷️",
    tone: "bg-rose-50 border-rose-200 hover:border-rose-400",
  },
};

export default function SelectWorkspaceClient({ memberships }: Props) {
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (kind: WorkspaceKind) => {
    setSelecting(kind);
    setError(null);
    try {
      const res = await fetch("/api/account/active-kind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; redirect?: string };
        throw new Error(body.error ?? "Could not switch workspace.");
      }
      const body = (await res.json()) as { redirect: string };
      window.location.href = body.redirect;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not switch workspace.");
      setSelecting(null);
    }
  };

  return (
    <div className="space-y-3">
      {memberships.map((m) => {
        const meta = KIND_META[m.kind];
        if (!meta) return null;
        return (
          <button
            key={`${m.kind}-${m.kindId}`}
            type="button"
            onClick={() => void choose(m.kind)}
            disabled={selecting !== null}
            className={`w-full text-left border-2 ${meta.tone} rounded-xl p-5 transition-colors disabled:opacity-50`}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl shrink-0" aria-hidden>{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-slate-900">{meta.label}</h2>
                  <span className="text-xs px-2 py-0.5 bg-white/60 text-slate-700 rounded-full">
                    {m.status}
                  </span>
                </div>
                {m.displayLabel && m.displayLabel !== meta.label && (
                  <p className="text-sm text-slate-700 font-medium mt-0.5">
                    {m.displayLabel}
                  </p>
                )}
                <p className="text-sm text-slate-600 mt-1">{meta.description}</p>
                <p className="text-xs font-semibold text-slate-700 mt-3">
                  {selecting === m.kind ? "Opening…" : "Open this workspace →"}
                </p>
              </div>
            </div>
          </button>
        );
      })}
      {error && (
        <p className="text-sm text-red-700 mt-2" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
