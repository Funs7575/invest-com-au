import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { agedCareHubConfig } from "@/lib/hub-configs/aged-care";
import HubPage from "@/components/HubPage";
import ReverseMortgageReferral from "@/components/aged-care/ReverseMortgageReferral";
import HubLeadForm from "@/components/leads/HubLeadForm";
import Link from "next/link";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Aged Care Funding Guide Australia (${CURRENT_YEAR}) — Home Care, RAD/DAP & Means Testing`,
  description: agedCareHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/aged-care` },
  openGraph: {
    title: `Aged Care Funding Guide Australia (${CURRENT_YEAR}) — Home Care, RAD/DAP & Means Testing`,
    description: agedCareHubConfig.metaDescription,
    url: `${SITE_URL}/aged-care`,
  },
};

export default function AgedCarePage() {
  return (
    <HubPage config={agedCareHubConfig}>
      {/* Quick-access topic links */}
      <section className="py-10 border-t border-slate-200 bg-slate-50">
        <div className="container-custom max-w-6xl">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Explore aged care topics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                label: "Home Care Packages",
                href: "/aged-care/home-care-packages",
                badge: "Levels 1–4",
              },
              {
                label: "Residential Care",
                href: "/aged-care/residential-care",
                badge: "Full-time care",
              },
              {
                label: "RAD & DAP",
                href: "/aged-care/rad-dap",
                badge: "Accommodation costs",
              },
              {
                label: "Means Testing",
                href: "/aged-care/means-testing",
                badge: "Income & assets",
              },
              {
                label: "Reverse Mortgages",
                href: "/aged-care/reverse-mortgage",
                badge: "Home equity release",
              },
              {
                label: "Funding Diagnostic",
                href: "/aged-care/quiz",
                badge: "3-question quiz",
              },
            ].map(({ label, href, badge }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col gap-1 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <span className="text-sm font-semibold text-slate-900">{label}</span>
                <span className="text-xs text-slate-500">{badge}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Reverse mortgage referral section */}
      <ReverseMortgageReferral />

      {/* Certified aged-care adviser referral */}
      <section className="py-12 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <HubLeadForm
            heading="Speak to a certified aged-care adviser"
            subheading="Our network includes accredited Aged Care Specialists who can model your means test, compare RAD vs DAP, and advise on Age Pension impacts. General information only — not personal financial advice."
            intent={{ need: "agedcare", context: ["aged_care"] }}
            source="aged-care-hub"
            ctaLabel="Connect with an aged-care specialist"
            ctaIntro={
              <p className="text-sm text-slate-600 leading-relaxed">
                Aged care financial advice is specialist territory. Only advisers with
                specialist accreditation (AIFC / FPA Aged Care Specialist) are equipped
                to advise on the full interaction of care costs, Age Pension, and estate
                planning. Free initial conversation — no obligation.
              </p>
            }
          />
        </div>
      </section>

      {/* Related hubs */}
      <section className="py-10 border-t border-slate-200 bg-slate-50">
        <div className="container-custom max-w-6xl">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Related topics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Retirement Planning", href: "/retirement", badge: "Income in retirement" },
              { label: "Superannuation", href: "/super", badge: "Building super" },
              { label: "Insurance", href: "/insurance", badge: "Income protection" },
              { label: "Find an Adviser", href: "/advisors", badge: "All specialties" },
            ].map(({ label, href, badge }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col gap-1 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"
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
