import type { Metadata } from "next";
import ProsJoinWizard from "./ProsJoinWizard";

export const metadata: Metadata = {
  title: "Join the Invest.com.au Provider Marketplace",
  description:
    "Verified Australian professionals — sign up in under 2 minutes to start receiving Match Requests from consumers.",
  robots: { index: true, follow: true },
};

export default function ProsJoinPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-6 md:py-12">
      <div className="container-custom max-w-2xl">
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Join the Provider Marketplace
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1.5 leading-relaxed">
            Verified professionals can receive Match Requests routed from
            consumers across our network. Sign up below — under 2 minutes.
          </p>
        </header>
        <ProsJoinWizard />
      </div>
    </div>
  );
}
