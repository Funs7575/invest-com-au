import type { Metadata } from "next";
import Link from "next/link";

import { isFlagEnabled } from "@/lib/feature-flags";
import ProspectsClient from "./ProspectsClient";

export const metadata: Metadata = {
  title: "Prospects — Advisor Portal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Advisor portal — "Prospects" (Open to Offers). Browse anonymised prospect
 * cards and send one structured pitch each (credits debited via the brief
 * money path). Dormant behind the `open_to_offers` flag: when off the page
 * renders a quiet "not available" state rather than the tab.
 */
export default async function ProspectsPage() {
  const enabled = await isFlagEnabled("open_to_offers", { segment: "advisor" });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-4 md:pt-5">
        <nav aria-label="Breadcrumb" className="mb-1.5 text-[11px] text-slate-500 md:text-xs">
          <Link href="/advisor-portal" className="hover:text-slate-700">
            Advisor Portal
          </Link>
          <span className="mx-1.5" aria-hidden>
            /
          </span>
          <span className="text-slate-600">Prospects</span>
        </nav>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-[1.9rem]">
          Prospects — open to offers
        </h1>
        <p className="mb-5 mt-1 max-w-2xl text-[12.5px] leading-snug text-slate-500 md:text-[13.5px]">
          These investors said vetted advisers can pitch them. You see their goal, state and
          budget band only — never their identity. Send one short, general pitch; if they
          accept, their contact details unlock and a chat opens. Credits are debited when you
          send, and refunded if they decline.
        </p>

        {enabled ? (
          <ProspectsClient />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-slate-700">
            Prospects aren&apos;t available on the portal yet. Check back soon.
          </div>
        )}
      </div>
    </div>
  );
}
