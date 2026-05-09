"use client";

import { useState } from "react";
import type { BillingSummary } from "./types";
import { logger } from "@/lib/logger";

const log = logger("advisor-portal-payment-method");

interface Props {
  summary: BillingSummary;
}

/**
 * Payment method on file + "Manage subscription & invoices" CTA. Both
 * actions hand off to the Stripe Customer Portal via
 * /api/advisor-auth/billing-portal so the advisor can self-serve
 * (update card, change tier, cancel, download invoices) without
 * waiting for support.
 */
export default function PaymentMethodCard({ summary }: Props) {
  const [busy, setBusy] = useState(false);

  async function openPortal() {
    setBusy(true);
    try {
      const res = await fetch("/api/advisor-auth/billing-portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Could not open billing portal.");
      }
    } catch (err) {
      log.error("billing portal open failed", {
        err: err instanceof Error ? err.message : String(err),
      });
      alert("Could not open billing portal. Try again or contact support.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 flex items-center justify-between gap-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          {summary.has_payment_method ? "Card on file" : "No card on file"}
        </h3>
        <p className="text-xs text-slate-500">
          {summary.has_payment_method
            ? "Used for top-ups, subscriptions, and self-service refunds."
            : summary.has_stripe_customer
              ? "Add a card via the portal to enable subscription features."
              : "Make your first top-up to set up Stripe billing."}
        </p>
      </div>
      <button
        type="button"
        onClick={openPortal}
        disabled={busy || !summary.has_stripe_customer}
        className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
      >
        {busy ? "Opening…" : summary.has_payment_method ? "Update card" : "Manage billing"}
      </button>
    </div>
  );
}
