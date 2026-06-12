import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import VisaCalculatorClient from "./VisaCalculatorClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Australian Investor Visa Calculator (${CURRENT_YEAR}) — Business 188, SIV, Premium Investor, Global Talent`,
  description:
    "Australian investor visa pathways: 188A, 188B, 188C, Premium Investor, and Global Talent. Investment thresholds, stay requirements, and PR pathways.",
  alternates: { canonical: "/tools/visa-investment-calculator" },
  openGraph: {
    title: `Australian Investor Visa Calculator (${CURRENT_YEAR})`,
    description:
      "Side-by-side Business Innovation, SIV, Premium Investor and Global Talent visa pathways.",
    url: absoluteUrl("/tools/visa-investment-calculator"),
    images: [{ url: `/api/og?title=${encodeURIComponent("Visa Investment Calculator")}&sub=${encodeURIComponent("SIV · Business Visa · Complying Investments · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `Australian Investor Visa Calculator — ${SITE_NAME}`,
  description:
    "Interactive side-by-side comparison of Australia's business and investor visa pathways with investment thresholds and stay requirements.",
  url: absoluteUrl("/tools/visa-investment-calculator"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  {
    name: "Visa Investment Calculator",
    url: absoluteUrl("/tools/visa-investment-calculator"),
  },
]);

const VISA_FAQS = [
  {
    q: "What is the Significant Investor Visa (SIV)?",
    a: "The Significant Investor Visa (subclass 188C) is a temporary visa for people willing to invest at least A$5 million in complying investments in Australia. It provides a pathway to permanent residency via the subclass 888 after holding the 188C for at least 4 years. The SIV has no age limit, no language requirement, and no points test — making it attractive to high-net-worth investors who may not qualify through other skilled pathways.",
  },
  {
    q: "What counts as a complying investment for the SIV?",
    a: "At least A$5 million must be held in a complying investment framework: a minimum of A$500,000 in venture capital or growth private equity funds, at least A$1.5 million in emerging companies (ASX-listed small companies outside the ASX 300), and the balance (up to A$3 million) in a managed fund or LIC that holds certain eligible assets (Australian equities, bonds, real property). The exact allocation rules are set by the Australian government and can be updated.",
  },
  {
    q: "How long does the investor visa process take?",
    a: "Processing times vary considerably. Business Innovation and Investment (subclass 188) visas can take 12–36 months depending on the stream, the state or territory nominating you, and how quickly you assemble documentation. The Premium Investor Visa (PIV) and Global Talent Visa typically process faster (weeks to months) but have higher thresholds and are invitation-only.",
  },
  {
    q: "Can I bring my family on an investor visa?",
    a: "Yes. All primary Australian investor visa subclasses allow you to include family members (spouse/partner and dependent children) on the same application. Family members receive the same visa conditions, including work and study rights in Australia. Some family members may also be eligible to apply separately if the primary applicant already holds the visa.",
  },
];

const visaFaqLd = faqJsonLd(VISA_FAQS);

function Loading() {
  return (
    <div className="py-12 animate-pulse">
      <div className="container-custom max-w-5xl">
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-80 bg-slate-100 rounded-xl" />
          <div className="h-80 bg-slate-100 rounded-xl" />
          <div className="h-80 bg-slate-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function VisaInvestmentCalculatorPage() {
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
      {visaFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(visaFaqLd) }}
        />
      )}
      <Suspense fallback={<Loading />}>
        <VisaCalculatorClient />
      </Suspense>
      <div className="container-custom max-w-5xl pb-8 space-y-8">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {VISA_FAQS.map((faq) => (
              <details
                key={faq.q}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden group"
              >
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
        <ComplianceFooter variant="default" />
      </div>
    </>
  );
}
