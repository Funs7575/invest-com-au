import type { Metadata } from "next";
import TeamsManagerClient from "./TeamsManagerClient";

export const metadata: Metadata = {
  title: "Expert Teams — Advisor Portal",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdvisorPortalTeamsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">
          Expert Teams
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          Create a multi-discipline team — same firm, independent
          collaboration, or private referral. Verified teams can receive
          structured Investor Briefs.
        </p>
        <TeamsManagerClient />
      </div>
    </div>
  );
}
