"use client";

import { useState } from "react";
import type { BillingSummary } from "./types";
import { logger } from "@/lib/logger";

const log = logger("advisor-portal-downgrade-banner");

interface Props {
  summary: BillingSummary;
  onCancelled?: () => void;
}

/**
 * Renders only when a tier downgrade is queued (PR-B3). Shows the
 * effective date and lets the advisor cancel the pending downgrade with
 * one click — `DELETE /api/advisor-auth/tier-upgrade/pending` un-cancels
 * the Stripe subscription and claws back the proration credit.
 */
export default function DowngradeBanner({ summary, onCancelled }: Props) {
  const [busy, setBusy] = useState(false);

  if (!summary.pending_tier || !summary.pending_tier_effective_at) return null;

  const effective = new Date(summary.pending_tier_effective_at).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  async function cancelDowngrade() {
    setBusy(true);
    try {
      const res = await fetch("/api/advisor-auth/tier-upgrade/pending", { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Couldn't cancel the downgrade. Try again or contact support.");
        return;
      }
      onCancelled?.();
      window.location.reload();
    } catch (err) {
      log.error("cancel pending downgrade failed", {
        err: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  const currentTierLabel = summary.advisor_tier.charAt(0).toUpperCase() + summary.advisor_tier.slice(1);
  const pendingTierLabel = summary.pending_tier.charAt(0).toUpperCase() + summary.pending_tier.slice(1);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-bold text-amber-900 mb-0.5">
          Downgrade scheduled
        </h3>
        <p className="text-xs text-amber-800">
          You&rsquo;re on <strong>{currentTierLabel}</strong> until{" "}
          <strong>{effective}</strong>, then <strong>{pendingTierLabel}</strong>.
          Unused subscription days were credited to your portal balance.
        </p>
      </div>
      <button
        type="button"
        onClick={cancelDowngrade}
        disabled={busy}
        className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white text-sm font-bold px-4 py-2 rounded-lg whitespace-nowrap"
      >
        {busy ? "Cancelling…" : "Cancel downgrade"}
      </button>
    </div>
  );
}
