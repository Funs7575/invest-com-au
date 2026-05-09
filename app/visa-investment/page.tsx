import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";
import HubPage from "@/components/HubPage";
import { visaInvestmentHubConfig } from "@/lib/hub-configs/visa-investment";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: visaInvestmentHubConfig.title,
  description: visaInvestmentHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/visa-investment` },
  openGraph: {
    title: `Investing in Australia: Visa & Migration Pathways ${CURRENT_YEAR}`,
    description: "Current visa pathways for investors after the SIV closure.",
    url: `${SITE_URL}/visa-investment`,
    type: "website",
  },
};

const PATHWAYS = [
  {
    title: "National Innovation Visa (Subclass 858)",
    blurb:
      "Replaced the SIV. Invitation-only, no fixed investment threshold. For exceptionally talented individuals in priority sectors — green energy, agtech, defence, health, manufacturing, quantum and AI.",
    href: "/foreign-investment",
    cta: "Investment guidance",
  },
  {
    title: "Employer Sponsored (482 / 186)",
    blurb:
      "Skills-based. Bring talent to your Australian business. The 482 TRT pathway gives a 2-year route to PR under the rules updated in 2025.",
    href: "/advisors/migration-agents",
    cta: "Find a migration agent",
  },
  {
    title: "State / Territory Nomination (190 / 491)",
    blurb:
      "States nominate based on skills and occupation lists. 20,350 places in the 2025–26 program year. Strong pathway for skilled migrants outside priority sectors.",
    href: "/advisors/migration-agents",
    cta: "Find a migration agent",
  },
  {
    title: "Existing SIV Holders (188C)",
    blurb:
      "If you hold a 188C visa granted before 31 July 2024, your complying investment obligations continue unchanged. The transition to permanent 888C remains.",
    href: "/foreign-investment/siv",
    cta: "SIV transition",
  },
];

const COUNTRY_LINKS = [
  { label: "Singapore", href: "/foreign-investment/singapore" },
  { label: "Hong Kong", href: "/foreign-investment/hong-kong" },
  { label: "China", href: "/foreign-investment/china" },
  { label: "Japan", href: "/foreign-investment/japan" },
  { label: "United Kingdom", href: "/foreign-investment/united-kingdom" },
  { label: "United States", href: "/foreign-investment/united-states" },
];

const pathwaysGrid = (
  <section className="py-12 bg-white">
    <div className="container-custom max-w-5xl">
      <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
        Current pathways
      </h2>
      <p className="text-sm text-slate-600 mb-6">
        Four routes — investor-relevant, but very different in eligibility and
        process.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PATHWAYS.map((p) => (
          <div
            key={p.title}
            className="rounded-xl border border-slate-200 bg-slate-50 p-5 flex flex-col"
          >
            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              {p.title}
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed flex-1">
              {p.blurb}
            </p>
            <Link
              href={p.href}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:underline"
            >
              {p.cta}
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default function VisaInvestmentHubPage() {
  return (
    <HubPage
      config={visaInvestmentHubConfig}
      serviceGrid={pathwaysGrid}
      advisorCta={
        <HubAdvisorCTA
          heading="Speak to a migration agent or immigration investment lawyer"
          subheading="The right specialist will assess eligibility, sequence applications, and avoid the documentation traps that derail most investor applications."
          intent={{ need: "planning", context: ["estate_planning"] }}
          source="visa_investment_hub"
          ctaLabel="Get matched with a specialist"
          extraFields={[
            { name: "current_country", label: "Current country of residence" },
            { name: "intended_pathway", label: "Pathway of interest" },
          ]}
          className="py-12 bg-white"
        />
      }
    >
      {/* SIV closure warning banner */}
      <section className="py-4 bg-amber-50 border-y border-amber-200">
        <div className="container-custom max-w-5xl flex items-start gap-3">
          <Icon
            name="alert-triangle"
            size={20}
            className="text-amber-700 mt-0.5 shrink-0"
          />
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong>SIV / BIIP closed.</strong> The Significant Investor Visa
            and Business Innovation and Investment Program permanently closed to
            new applications on 31 July 2024. The pathways above reflect the
            current {CURRENT_YEAR} landscape.
          </p>
        </div>
      </section>

      {/* Country cross-links */}
      <section className="py-12 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Already in Australia and investing?
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Country-specific guides for non-resident and dual-resident
            investors.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {COUNTRY_LINKS.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className="rounded-lg border border-slate-200 bg-white p-3 text-sm font-bold text-slate-900 hover:bg-amber-50 hover:border-amber-300 transition-colors text-center"
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <Link
              href="/article/australia-national-innovation-visa-guide"
              className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
            >
              National Innovation Visa deep-dive →
            </Link>
            <Link
              href="/foreign-investment/siv"
              className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
            >
              SIV transition guide →
            </Link>
            <Link
              href="/advisors/migration-agents"
              className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900"
            >
              All migration agents →
            </Link>
          </div>
        </div>
      </section>
    </HubPage>
  );
}
