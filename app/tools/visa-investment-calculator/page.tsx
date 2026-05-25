import type { Metadata } from "next";
import { Suspense } from "react";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import VisaCalculatorClient from "./VisaCalculatorClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Australian Investor Visa Calculator (${CURRENT_YEAR}) — Business 188, SIV, Premium Investor, Global Talent`,
  description:
    "Compare Australian investor visa pathways: Business Innovation (188A), Investor (188B), Significant Investor (188C), Premium Investor, and Global Talent. Investment thresholds, stay requirements, and pathway to permanent residency.",
  alternates: { canonical: "/tools/visa-investment-calculator" },
  openGraph: {
    title: `Australian Investor Visa Calculator (${CURRENT_YEAR})`,
    description:
      "Side-by-side Business Innovation, SIV, Premium Investor and Global Talent visa pathways.",
    url: absoluteUrl("/tools/visa-investment-calculator"),
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

const faqLd = faqJsonLd([
  {
    q: "What is the minimum investment for an Australian Significant Investor Visa (SIV)?",
    a: "The Subclass 188C Significant Investor stream requires a minimum investment of AUD$5 million in complying investments over at least 4 years. The investment must be made within 12 months of visa grant.",
  },
  {
    q: "What are complying investments for the Australian SIV?",
    a: "SIV holders must invest in a prescribed mix: at least 10% ($500k) in early-stage venture capital limited partnerships (ESVCLPs), at least 30% ($1.5m) in eligible venture capital or growth private equity funds, and the remaining balance in managed funds investing in ASX-listed securities, bonds, or real property (excluding direct residential property).",
  },
  {
    q: "What is the Business Innovation stream investment requirement?",
    a: "The Subclass 188A Business Innovation stream requires ownership of a business with an annual turnover of at least AUD$500,000 and a net asset value of at least AUD$500,000 in business and personal assets. Applicants must have a Expressions of Interest score of 65 or above, be nominated by a state/territory, and intend to own/manage an Australian business.",
  },
  {
    q: "Do SIV investments need to be in Australian assets only?",
    a: "Yes. All SIV complying investments must be in Australian assets. The investment framework (managed funds, ESVCLPs, venture capital funds) requires funds to be registered in Australia and primarily deployed into Australian companies and assets.",
  },
  {
    q: "How long does an investor visa take to process in Australia?",
    a: "Processing times vary by stream. The 188C (SIV) stream typically takes 12–24 months from nomination. The 188A (Business Innovation) stream is 12–24 months. Permanent residence (subclass 888) can be applied for after holding a provisional visa for at least 4 years and meeting complying investment obligations. An immigration lawyer should be consulted for current processing times.",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "Australian Investor Visa Calculator",
  path: "/tools/visa-investment-calculator",
  selectors: ["h1"],
});

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }}
      />
      <Suspense fallback={<Loading />}>
        <VisaCalculatorClient />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="default" />
      </div>
    </>
  );
}
