import type { Metadata } from "next";
import Link from "next/link";
import BriefsInboxClient from "./BriefsInboxClient";

export const metadata: Metadata = {
  title: "Brief inbox — Advisor Portal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdvisorPortalBriefsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-10 md:pt-5">
        <nav aria-label="Breadcrumb" className="mb-1.5 text-[11px] md:text-xs text-slate-500">
          <Link href="/advisor-portal" className="hover:text-slate-700">Advisor Portal</Link>
          <span className="mx-1.5" aria-hidden>/</span>
          <span className="text-slate-600">Brief inbox</span>
        </nav>
        <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-[1.9rem]">
          Investor Brief inbox
        </h1>
        <p className="mt-1 mb-5 max-w-2xl text-[12.5px] leading-snug text-slate-500 md:text-[13.5px]">
          Verified providers see masked previews. Accept a brief to unlock the
          consumer&apos;s contact details — your credit balance is debited at
          the moment of acceptance.
        </p>
        <BriefsInboxClient />
      </div>
    </div>
  );
}
