/**
 * /embed-portal — placeholder landing page (Phase 4.4).
 *
 * Lands embed customers after sign-in. Real surfaces (API key
 * rotation, quota usage, Stripe billing) ship as B2B SaaS demand
 * surfaces; this page exists so the kind has a portal to route to.
 */

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Embed portal — Invest.com.au",
  robots: { index: false, follow: false },
};

export default function EmbedPortalHome() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900 mb-3">Embed portal</h1>
      <p className="text-sm text-slate-700 mb-6">
        Welcome. API keys, quota usage, and billing for white-label
        widget integrations ship here.
      </p>
      <p className="text-xs text-slate-500">
        Have a question? Contact the partnerships team.
      </p>
    </main>
  );
}
