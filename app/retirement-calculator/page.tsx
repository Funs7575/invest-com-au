import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd } from "@/lib/schema-markup";
import RetirementCalculatorClient from "./RetirementCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Retirement Calculator — How Much Do You Need? (${CURRENT_YEAR})`,
  description: "Project your superannuation balance at retirement, see how long it will last, and find out if you're on track. Free Australian retirement calculator.",
  alternates: { canonical: "/retirement-calculator" },
  openGraph: {
    title: "Retirement Calculator — How Much Do You Need?",
    description: "Project your super balance at retirement, see how long it lasts, and get a personalised gap analysis.",
    images: [{ url: "/api/og?title=Retirement+Calculator&subtitle=How+much+do+you+need%3F&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
};

export default function RetirementCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorJsonLd({ name: "Retirement Calculator", description: "Project your superannuation at retirement and find out if you're on track for the retirement you want.", path: "/retirement-calculator" })) }} />
      <RetirementCalculatorClient />
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
