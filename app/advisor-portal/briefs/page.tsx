import type { Metadata } from "next";
import BriefsInboxClient from "./BriefsInboxClient";

export const metadata: Metadata = {
  title: "Brief inbox — Advisor Portal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdvisorPortalBriefsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
          Investor Brief inbox
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Verified providers see masked previews. Accept a brief to unlock the
          consumer&apos;s contact details — your credit balance is debited at
          the moment of acceptance.
        </p>
        <BriefsInboxClient />
      </div>
    </div>
  );
}
