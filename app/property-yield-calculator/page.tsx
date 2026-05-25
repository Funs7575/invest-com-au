import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
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

const propertyYieldFaqLd = faqJsonLd([
  {
    q: "What is rental yield on an investment property?",
    a: "Rental yield is the annual rental income expressed as a percentage of the property's value. Gross yield divides annual rent by the purchase price. Net yield subtracts ongoing costs (rates, insurance, property management, repairs, and vacancy allowance) before dividing. Net yield is more useful for comparing properties because it reflects real cash return.",
  },
  {
    q: "What is a good rental yield in Australia?",
    a: "A gross rental yield of 4% to 6% is generally considered acceptable in Australian capital cities. Regional areas often achieve higher yields (6% to 9%) with lower capital growth expectations. Sydney and Melbourne typically see lower gross yields (2.5% to 4%) due to high purchase prices. Net yield after costs is usually 1% to 2% lower.",
  },
  {
    q: "What costs should I include when calculating net rental yield?",
    a: "Common ongoing costs include property management fees (typically 7% to 12% of rent), council rates, water rates, landlord insurance, body corporate fees (for strata properties), maintenance and repairs (budget 1% of property value per year), land tax, and a vacancy allowance (typically 2 to 4 weeks of rent per year).",
  },
  {
    q: "Does rental yield include capital growth?",
    a: "No. Rental yield only measures income return from rent. Total return on an investment property also includes capital growth (appreciation in property value). A property with a 3% gross yield and 6% annual capital growth delivers a total return of around 9%, less holding costs.",
  },
]);

export default async function PropertyYieldCalculatorPage() {
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Calculators", url: absoluteUrl("/calculators") },
    { name: "Property Yield Calculator" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorJsonLd({ name: "Property Yield Calculator", description: "Calculate gross and net rental yield on Australian investment properties.", path: "/property-yield-calculator" })) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(propertyYieldFaqLd) }} />
      <PropertyYieldCalculatorClient />
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
