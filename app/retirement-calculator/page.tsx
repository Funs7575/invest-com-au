import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
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

const retirementFaqLd = faqJsonLd([
  {
    q: "How much super do I need to retire in Australia?",
    a: "ASFA's Retirement Standard (March 2026) estimates a comfortable retirement for a couple requires around $690,000 in super at age 67, or $595,000 for a single person. This assumes partial Age Pension eligibility and produces a retirement income of roughly $72,000 per year for a couple.",
  },
  {
    q: "What is the Age Pension age in Australia?",
    a: "The Age Pension eligibility age is 67 for anyone born after 1 January 1957. The pension provides a maximum rate of around $1,144 per fortnight for singles and $1,725 per fortnight for couples (combined), subject to income and assets tests.",
  },
  {
    q: "When can I access my superannuation?",
    a: "You can access your super once you reach your preservation age and retire, or when you turn 65 regardless of whether you are still working. Preservation age is currently 60 for anyone born after 30 June 1964. Earlier access is only available in limited compassionate grounds or severe financial hardship cases.",
  },
  {
    q: "How does the superannuation guarantee work?",
    a: "Employers must contribute 11.5% of your ordinary time earnings into your nominated super fund (rising to 12% from 1 July 2025). These compulsory contributions are called the Superannuation Guarantee (SG). They continue until you turn 75.",
  },
  {
    q: "What is the transfer balance cap?",
    a: "The transfer balance cap limits the amount you can transfer into a tax-free pension account (account-based pension) in retirement. The general cap is $1.9 million from 1 July 2023. Amounts above the cap remain in accumulation phase and are taxed at 15% on earnings.",
  },
]);

export default function RetirementCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorJsonLd({ name: "Retirement Calculator", description: "Project your superannuation at retirement and find out if you're on track for the retirement you want.", path: "/retirement-calculator" })) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(retirementFaqLd) }} />
      <RetirementCalculatorClient />
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
