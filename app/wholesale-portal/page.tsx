/**
 * /wholesale-portal — placeholder landing page (Phase 4.2).
 *
 * Lands wholesale operators after sign-in. Real surfaces (listings
 * management, sophisticated-investor leads, billing) ship as the
 * vertical matures; this page exists so the kind has a portal to
 * route to.
 */

import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wholesale operator portal — Invest.com.au",
  robots: { index: false, follow: false },
};

export default function WholesalePortalHome() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900 mb-3">
        Wholesale operator portal
      </h1>
      <p className="text-sm text-slate-700 mb-6">
        Welcome. Listings management, sophisticated-investor leads, and
        billing for s708-qualified fund managers ship here.
      </p>
      <p className="text-xs text-slate-500">
        Have a question? Contact the partnerships team.
      </p>
    </main>
  );
}
