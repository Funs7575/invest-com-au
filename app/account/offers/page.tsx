import type { Metadata } from "next";
import Link from "next/link";

import { enforcePortalKind } from "@/lib/portal-gate";
import { isFlagEnabled } from "@/lib/feature-flags";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import OptInBlock from "@/components/open-to-offers/OptInBlock";
import PitchInbox from "@/components/open-to-offers/PitchInbox";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Adviser pitches — Invest.com.au",
  robots: "noindex, nofollow",
};

/**
 * /account/offers — the consumer's Open to Offers hub: opt-in controls + the
 * pending pitch inbox. Dormant behind the `open_to_offers` flag (the page
 * renders a gentle "not available" state rather than 500/404 so a stale link
 * is harmless).
 */
export default async function OffersPage() {
  await enforcePortalKind("investor");

  const enabled = await isFlagEnabled("open_to_offers", { segment: "user" });
  if (!enabled) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Adviser pitches</h1>
        <p className="mt-2 text-sm text-slate-500">
          This feature isn&apos;t available on your account yet.{" "}
          <Link href="/account/dashboard" className="font-semibold text-violet-700 underline">
            Back to dashboard
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-1.5 text-xs text-slate-500">
        <Link href="/account/dashboard" className="hover:text-slate-700">
          Dashboard
        </Link>
        <span className="mx-1.5" aria-hidden>
          /
        </span>
        <span className="text-slate-600">Adviser pitches</span>
      </nav>
      <h1 className="text-2xl font-extrabold text-slate-900">Open to offers</h1>
      <p className="mt-1 mb-6 max-w-2xl text-sm text-slate-500">
        When you&apos;re open to offers, vetted advisers can send you a short, anonymous
        pitch. Accept to share your details and start a chat — or decline silently.
      </p>

      <div className="space-y-6">
        <OptInBlock variant="dashboard" />
        <PitchInbox />
      </div>

      <p className="mt-8 border-t border-slate-200 pt-4 text-[11px] leading-relaxed text-slate-400">
        {GENERAL_ADVICE_WARNING}
      </p>
    </main>
  );
}
