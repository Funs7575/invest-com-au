import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import PropertyYieldCalculatorClient from "./PropertyYieldCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Property Yield Calculator — Rental Return Analysis (${CURRENT_YEAR})`,
  description: "Calculate gross and net rental yield on Australian investment properties. See annual income, expenses breakdown, and cash flow analysis.",
  alternates: { canonical: "/property-yield-calculator" },
  openGraph: {
    title: "Property Yield Calculator — Rental Return Analysis",
    description: "Enter your property purchase price, weekly rent, and expenses to calculate gross and net rental yield instantly.",
    images: [{ url: "/api/og?title=Property+Yield+Calculator&subtitle=Rental+Return+Analysis&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
};

const softwareLd = calculatorJsonLd({
  name: "Property Yield Calculator",
  description: "Calculate gross and net rental yield on Australian investment properties.",
  path: "/property-yield-calculator",
});

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Calculators", url: absoluteUrl("/calculators") },
  { name: "Property Yield Calculator" },
]);

const faqLd = faqJsonLd([
  {
    q: "What is a good rental yield in Australia?",
    a: "The typical range is 3–5% gross yield for metropolitan capital cities (Sydney, Melbourne lower; Brisbane, Adelaide, Perth higher); regional areas often yield 5–7%. Net yields (after management fees, rates, insurance, maintenance, vacancy) are typically 1.5–2.5% lower than gross. A yield above 5% gross in a capital city is generally considered strong; below 3% usually means the investor is relying heavily on capital growth.",
  },
  {
    q: "What is the difference between gross and net rental yield?",
    a: "Gross yield = (Annual rent ÷ Property purchase price) × 100. Net yield deducts ongoing costs (property management, council rates, insurance, maintenance, strata, landlord insurance, vacancy allowance) before dividing by purchase price. Net yield is a more accurate measure of actual return, but gross yield is simpler to compare across properties.",
  },
  {
    q: "How do I calculate the rental yield on an investment property?",
    a: "Gross yield: multiply weekly rent by 52 to get annual rent, then divide by the property price and multiply by 100. Example: $450/week × 52 = $23,400 annual rent ÷ $650,000 × 100 = 3.6% gross yield. For net yield, deduct annual expenses from the rent before dividing.",
  },
  {
    q: "Does property yield include capital growth?",
    a: "No. Rental yield only measures income return (rent ÷ price). Total return on a property investment is yield + capital growth (or minus capital loss). A low-yielding property in a high-growth area may still outperform a high-yielding property in a flat market; investors must assess both components.",
  },
  {
    q: "What expenses reduce net rental yield?",
    a: "Property management fees (typically 7–10% of rent), council rates (~$1,500–$2,500/yr), water charges (variable), building and landlord insurance (~$1,000–$2,000/yr), repairs and maintenance (budget 1% of property value/yr), body corporate/strata fees (units only), vacancy allowance (~2–4 weeks/yr depending on market).",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "Property Yield Calculator",
  path: "/property-yield-calculator",
  selectors: ["h1"],
});

export default async function PropertyYieldCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }} />
      <PropertyYieldCalculatorClient />
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
