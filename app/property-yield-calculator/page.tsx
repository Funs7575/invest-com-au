import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd } from "@/lib/schema-markup";
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
      <PropertyYieldCalculatorClient />
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
