import type { Metadata } from "next";
import { CURRENT_YEAR, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import SuperContributionsClient from "./SuperContributionsClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Super Contributions Calculator — Concessional Caps & Tax Savings (${CURRENT_YEAR})`,
  description:
    "Calculate how much you can contribute to super in FY2026. See your concessional cap usage, tax savings from salary sacrifice, and whether carry-forward rules apply.",
  alternates: { canonical: "/super-contributions-calculator" },
  openGraph: {
    title: "Super Contributions Calculator — Concessional Caps & Tax Savings",
    description:
      "Enter your income and employer contributions to see your remaining concessional cap, tax savings, and Division 293 liability for FY2026.",
    images: [
      {
        url: "/api/og?title=Super+Contributions+Calculator&subtitle=Caps+%26+Tax+Savings+FY2026&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const softwareLd = calculatorJsonLd({
  name: "Super Contributions Calculator",
  description:
    "Calculate your FY2026 concessional and non-concessional super contribution caps, tax savings from salary sacrifice, and Division 293 liability.",
  path: "/super-contributions-calculator",
});

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Super Contributions Calculator", url: absoluteUrl("/super-contributions-calculator") },
]);

const faqLd = faqJsonLd([
  {
    q: "What is the concessional super contribution cap for FY2026?",
    a: "The concessional (before-tax) contribution cap is $30,000 for FY2026. This includes employer super guarantee (SG) contributions and any salary sacrifice or personal deductible contributions you make.",
  },
  {
    q: "What is the non-concessional super contribution cap?",
    a: "The non-concessional (after-tax) contribution cap is $120,000 per year for FY2026. If eligible, you can use the bring-forward rule to contribute up to $360,000 over three years.",
  },
  {
    q: "What is Division 293 tax?",
    a: "Division 293 is an additional 15% tax on concessional super contributions for individuals with income (including super contributions) exceeding $250,000. This brings the total super tax rate to 30% for high earners, rather than the standard 15%.",
  },
  {
    q: "Can I carry forward unused super contribution caps?",
    a: "Yes, if your total super balance is below $500,000 on 30 June of the previous financial year, you can carry forward unused concessional cap amounts from the preceding five financial years and use them in a single year.",
  },
]);

export default function SuperContributionsCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <SuperContributionsClient />
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
