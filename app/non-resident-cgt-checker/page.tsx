import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";
import CalcToPlanBridge from "@/components/get-matched/CalcToPlanBridge";
import NonResidentCgtClient from "./NonResidentCgtClient";
import { faqJsonLd } from "@/lib/schema-markup";

const NR_CGT_FAQS = [
  {
    q: "Do non-residents pay capital gains tax on Australian shares?",
    a: "Generally no. Under Section 855-10 of the ITAA 1997, non-residents are exempt from Australian CGT on assets that are not 'Taxable Australian Property' (TAP). Listed shares in public companies are not TAP (unless the shares are in an entity where ≥50% of market value is attributable to Australian real property AND you own ≥10% of the entity — rare for normal portfolio investors). So most non-residents who sell ASX shares have no Australian CGT liability. There is also no Australian CGT withholding on share sales by non-residents (unlike property sales).",
  },
  {
    q: "Do non-residents pay capital gains tax on Australian real property?",
    a: "Yes. Direct interests in Australian real property (land, buildings, leases) are Taxable Australian Property regardless of residency. Non-residents selling Australian real estate must pay Australian CGT. The 50% CGT discount for assets held 12+ months was removed for non-residents in May 2012 — they pay tax on 100% of the gain. FIRB also imposes a withholding obligation on purchasers: purchasers of Australian property from foreign residents must withhold 12.5% of the purchase price and remit to the ATO (applies to sales ≥$750,000). This is a prepayment against the seller's CGT liability, not an additional tax.",
  },
  {
    q: "What is a 'land-rich' company under Australian CGT?",
    a: "A company is 'land-rich' (or has 'underlying TAP') if ≥50% of its market value is attributable to Australian real property (directly or through interposed entities). If you hold ≥10% in such a company as a non-resident, your shares ARE Taxable Australian Property and Australian CGT applies when you sell. This catches foreign investors in unlisted Australian property trusts, private real estate companies, and some ASX-listed REITs (depending on the 50% threshold). Listed entities with ≥10% interest test are rare in practice for portfolio investors but can arise in SME business ownership.",
  },
  {
    q: "Does Australian CGT apply to cryptocurrency sold by non-residents?",
    a: "The tax treatment of non-resident crypto gains is complex and evolving. Cryptocurrency is treated as property (capital asset) for Australian tax purposes. CGT exemptions for non-residents apply to 'portfolio' investments — assets that are not TAP. The ATO's position is that cryptocurrency is generally not TAP (it's not Australian real property or a taxable interest in an entity). However, the ATO has not issued definitive guidance on crypto as portfolio assets under Div 855. Non-residents with significant crypto gains should seek advice — the exemption likely applies but has not been definitively confirmed. Tax treaties may also affect outcomes.",
  },
];

const nrCgtFaqLd = faqJsonLd(NR_CGT_FAQS);

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Non-Resident CGT Checker (${CURRENT_YEAR}) — Section 855-10 Eligibility`,
  description:
    "Interactive check: does the Australian CGT exemption for non-residents apply to your asset? Covers listed shares, direct mining, real property, and the Taxable Australian Property tests.",
  alternates: { canonical: "/non-resident-cgt-checker" },
  openGraph: {
    title: `Non-Resident CGT Checker (${CURRENT_YEAR})`,
    description:
      "Check if Section 855-10 CGT exemption applies to your Australian investment.",
    url: absoluteUrl("/non-resident-cgt-checker"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Non-Resident CGT Checker")}&sub=${encodeURIComponent("Australian Property · Capital Gains · Withholding · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `Non-Resident CGT Checker — ${SITE_NAME}`,
  description:
    "Interactive decision tool for Section 855-10 portfolio CGT exemption eligibility for non-resident Australian investors.",
  url: absoluteUrl("/non-resident-cgt-checker"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Foreign Investment", url: absoluteUrl("/foreign-investment") },
  {
    name: "Non-Resident CGT Checker",
    url: absoluteUrl("/non-resident-cgt-checker"),
  },
]);

function Loading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-4 w-48 bg-slate-100 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function NonResidentCgtCheckerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {nrCgtFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(nrCgtFaqLd) }} />
      )}
      <Suspense fallback={<Loading />}>
        <NonResidentCgtClient />
      </Suspense>
      <section className="py-10 bg-white border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 container-custom">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
          <div className="space-y-3">
            {NR_CGT_FAQS.map((faq) => (
              <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">▾</span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
      <div className="container-custom pb-8">
        <CalcToPlanBridge
          goal="expat_investing"
          headline="Want help with your non-resident tax position?"
          subtitle="We'll match you with verified Australian tax agents who specialise in non-resident CGT and investment returns."
        />
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
