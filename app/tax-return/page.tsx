import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import HubPage from "@/components/HubPage";
import HubNewsletterCapture from "@/components/HubNewsletterCapture";
import { taxReturnHubConfig } from "@/lib/hub-configs/tax-return";
import Link from "next/link";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: taxReturnHubConfig.title,
  description: taxReturnHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/tax-return` },
  openGraph: {
    title: `Tax Return Hub (${CURRENT_YEAR}) — Deductions, Agents & Investment Income`,
    description: taxReturnHubConfig.metaDescription,
    url: `${SITE_URL}/tax-return`,
  },
};

export default function TaxReturnPage() {
  return (
    <HubPage
      config={taxReturnHubConfig}
      newsletterCapture={
        <HubNewsletterCapture
          segmentSlug="tax-return-hub"
          hubTitle="Tax Return"
        />
      }
    >
      {/* Key dates callout */}
      <section className="py-10 border-t border-slate-200 bg-amber-50">
        <div className="container-custom max-w-6xl">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            FY2025-26 key dates
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                date: "1 Jul 2025",
                label: "FY2025-26 opens",
                note: "ATO opens myTax for current-year lodgements",
              },
              {
                date: "31 Oct 2025",
                label: "Individual deadline",
                note: "Lodgement due for individuals without a tax agent",
              },
              {
                date: "15 May 2026",
                label: "Tax agent deadline",
                note: "Extended deadline for clients of registered tax agents",
              },
            ].map(({ date, label, note }) => (
              <div
                key={date}
                className="bg-white border border-amber-200 rounded-xl p-4"
              >
                <p className="text-base font-bold text-amber-700 mb-1">{date}</p>
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="text-xs text-slate-500 mt-1">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick-access topic links */}
      <section className="py-10 border-t border-slate-200">
        <div className="container-custom max-w-6xl">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Tax topics by investor type
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Shares & ETFs", href: "/tax/capital-gains", badge: "CGT + franking" },
              { label: "Property Investors", href: "/negative-gearing", badge: "Rental deductions" },
              { label: "Crypto", href: "/tax/crypto", badge: "ATO rules" },
              { label: "SMSF Trustees", href: "/smsf", badge: "15% fund tax" },
              { label: "Freelancers / ABN", href: "/investing-for/freelancer", badge: "Sole trader tax" },
              { label: "Tax Agent Guide", href: "/advisor-guides/tax-agent-vs-accountant", badge: "DIY vs agent" },
            ].map(({ label, href, badge }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col gap-1 p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-sm transition-all"
              >
                <span className="text-sm font-semibold text-slate-900">{label}</span>
                <span className="text-xs text-slate-500">{badge}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </HubPage>
  );
}
