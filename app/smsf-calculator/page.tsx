import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import SMSFCalculatorClient from "./SMSFCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";
import CalcToPlanBridge from "@/components/get-matched/CalcToPlanBridge";
import RelatedCalculators from "@/components/RelatedCalculators";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `SMSF Calculator — Is Self-Managed Super Right for You? (${CURRENT_YEAR})`,
  description: "Find out if a Self-Managed Super Fund makes financial sense for your situation. Compare projected costs and returns vs your current fund.",
  alternates: { canonical: "/smsf-calculator" },
  openGraph: {
    title: "SMSF Calculator — Should You Switch to a Self-Managed Super Fund?",
    description: "Enter your super balance and contribution details. See whether an SMSF could save you money or cost you more over time.",
    images: [{ url: "/api/og?title=SMSF+Calculator&subtitle=Is+self-managed+super+right+for+you%3F&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
};

const softwareLd = calculatorJsonLd({
  name: "SMSF Eligibility Calculator",
  description: "Calculate whether a Self-Managed Super Fund is worth it compared to your current super fund.",
  path: "/smsf-calculator",
});

const faqLd = faqJsonLd([
  {
    q: "How much super do I need to set up an SMSF in Australia?",
    a: "The ATO and ASIC both recommend having at least $200,000 in super before establishing an SMSF, as the fixed costs — accounting, audit, ASIC registration, and investment platform fees — typically range from $3,000 to $6,000 per year. Below $200,000, those costs usually consume a larger percentage of returns than a low-cost industry fund.",
  },
  {
    q: "What are the annual running costs of an SMSF?",
    a: "Typical annual SMSF running costs include ATO supervisory levy (~$259), independent audit ($300–$700), accounting and tax return ($1,500–$3,500), and any ASIC or corporate trustee fees. Total costs usually range from $2,500 to $5,000+ per year, excluding financial adviser or investment management fees.",
  },
  {
    q: "Can I use my SMSF to buy an investment property in Australia?",
    a: "Yes. An SMSF can purchase residential or commercial investment property, provided it meets the sole purpose test (held purely for retirement benefit), is not acquired from or leased to a related party (for residential property), and the fund can meet the loan repayments without cash-flow stress. Limited recourse borrowing arrangements (LRBAs) can be used to fund the purchase.",
  },
  {
    q: "What is the SMSF trustee structure — individual vs corporate?",
    a: "An SMSF can have individual trustees (each member is a trustee) or a corporate trustee (a company where each member is a director). A corporate trustee costs more to set up (~$700–$1,000 for ASIC registration) but reduces paperwork when members join or leave, provides cleaner asset separation, and is generally preferred by accountants and lenders.",
  },
  {
    q: "What can an SMSF invest in under Australian law?",
    a: "SMSFs can invest in Australian shares, ETFs, listed investment companies, bonds, direct property, term deposits, cash, unlisted trusts, and collectibles (subject to strict storage rules). All investments must comply with the fund's investment strategy, meet the sole purpose test, and not contravene the in-house asset rules (generally no more than 5% of fund value in related-party investments).",
  },
  {
    q: "Who audits my SMSF and how often?",
    a: "An SMSF must be audited by an approved SMSF auditor (registered with ASIC) every financial year, regardless of whether any transactions occurred. The auditor checks both financial compliance and superannuation law compliance. The audit must be completed before lodging the SMSF annual return with the ATO.",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "SMSF Calculator — Is Self-Managed Super Right for You?",
  path: "/smsf-calculator",
  selectors: ["h1", ".calculator-result-summary"],
});

export default function SMSFCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }} />
      <SMSFCalculatorClient />
      <div className="container-custom pb-8">
        <RelatedCalculators
          items={[
            { name: "Super Contributions Calculator", description: "Model the impact of salary sacrifice and voluntary contributions on your retirement balance.", href: "/super-contributions-calculator" },
            { name: "Compound Interest Calculator", description: "See how your SMSF balance compounds over time with your target return rate.", href: "/compound-interest-calculator" },
            { name: "FIRE Calculator", description: "Calculate the balance you need to retire and how many years your SMSF needs to reach it.", href: "/fire-calculator" },
          ]}
        />
        <CalcToPlanBridge
          goal="super"
          headline="Want a personalised SMSF action plan?"
          subtitle="We'll match you with verified SMSF accountants and Pro Squads to set up your fund the right way."
        />
        <ComplianceFooter variant="calculator" />
      </div>

    </>
  );
}
