import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { retirementHubConfig } from "@/lib/hub-configs/retirement";
import HubPage from "@/components/HubPage";
import AnnuityComparisonRail from "@/components/retirement/AnnuityComparisonRail";
import Link from "next/link";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Retirement Planning Hub (${CURRENT_YEAR}) — Account-Based Pensions, Age Pension & Drawdown`,
  description: retirementHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/retirement` },
  openGraph: {
    title: `Retirement Planning Hub (${CURRENT_YEAR}) — Account-Based Pensions, Age Pension & Drawdown`,
    description: retirementHubConfig.metaDescription,
    url: `${SITE_URL}/retirement`,
  },
};

export default function RetirementPage() {
  return (
    <HubPage config={retirementHubConfig}>
      {/* Quick-access topic links */}
      <section className="py-10 border-t border-slate-200 bg-slate-50">
        <div className="container-custom max-w-6xl">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Explore retirement topics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                label: "Account-Based Pensions",
                href: "/retirement/account-based-pensions",
                badge: "Most common structure",
              },
              {
                label: "Age Pension Guide",
                href: "/retirement/age-pension",
                badge: "Means test explained",
              },
              {
                label: "Annuities",
                href: "/retirement/annuities",
                badge: "Guaranteed income",
              },
              {
                label: "Drawdown Strategies",
                href: "/retirement/drawdown",
                badge: "Sequencing risk",
              },
              {
                label: "Longevity Planning",
                href: "/retirement/longevity",
                badge: "Live to 90+",
              },
              {
                label: "Retirement Quiz",
                href: "/retirement/quiz",
                badge: "Readiness diagnostic",
              },
            ].map(({ label, href, badge }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col gap-1 p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all"
              >
                <span className="text-sm font-semibold text-slate-900">{label}</span>
                <span className="text-xs text-slate-500">{badge}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Annuity comparison section */}
      <AnnuityComparisonRail />

      {/* Adviser CTA strip */}
      <section className="py-12 border-t border-slate-200 bg-emerald-50">
        <div className="container-custom max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Need a retirement plan tailored to your numbers?
          </h2>
          <p className="text-slate-700 text-sm leading-relaxed mb-6 max-w-xl mx-auto">
            A licensed retirement planner can model your specific balance, expected Age Pension
            entitlement, drawdown rate, and longevity risk — then build a strategy that optimises
            all four. This is general information only; not personal financial advice.
          </p>
          <Link
            href="/retirement/quiz"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-7 py-3 transition-colors"
          >
            Take the Retirement Readiness Diagnostic &rarr;
          </Link>
          <p className="mt-3 text-xs text-slate-500">
            Free 3-question diagnostic · General information only
          </p>
        </div>
      </section>

      {/* Related hubs */}
      <section className="py-10 border-t border-slate-200">
        <div className="container-custom max-w-6xl">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Related topics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Superannuation", href: "/super", badge: "Building your balance" },
              { label: "SMSF", href: "/smsf", badge: "Self-managed funds" },
              { label: "Aged Care", href: "/aged-care", badge: "Funding care costs" },
              { label: "Insurance", href: "/insurance", badge: "Protecting income" },
            ].map(({ label, href, badge }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col gap-1 p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all"
              >
                <span className="text-sm font-semibold text-slate-800">{label}</span>
                <span className="text-xs text-slate-500">{badge}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </HubPage>
  );
}
