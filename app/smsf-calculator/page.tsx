import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
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

const smsfFaqLd = faqJsonLd([
  {
    q: "What is an SMSF?",
    a: "A Self-Managed Super Fund (SMSF) is a private superannuation fund you manage yourself, regulated by the ATO. It can have up to six members who are all trustees. You choose your own investments including shares, property, and ETFs, but you are responsible for compliance.",
  },
  {
    q: "How much super do I need to set up an SMSF?",
    a: "The ATO suggests a minimum balance of around $200,000 to $500,000 to make an SMSF cost-effective. With lower balances, annual running costs — typically $2,000 to $5,000 for administration, audit, and accounting — represent a large percentage of your fund.",
  },
  {
    q: "What are the ongoing costs of an SMSF?",
    a: "Typical annual SMSF costs include an ATO supervisory levy (around $259 per year), an independent audit (around $400 to $900), accounting and tax preparation (around $1,500 to $3,000), and any investment platform or brokerage fees. Total costs commonly range from $2,000 to $5,000 per year.",
  },
  {
    q: "Can an SMSF invest in property?",
    a: "Yes. SMSFs can invest in residential and commercial property, subject to rules. You cannot buy residential property from a related party or live in it. Commercial property can be purchased from a related party if at market value, making SMSFs popular with business owners who want to hold their business premises inside super.",
  },
  {
    q: "What is a bare trust and limited recourse borrowing arrangement?",
    a: "An SMSF can borrow to buy assets using a Limited Recourse Borrowing Arrangement (LRBA). The asset is held in a bare trust until the loan is repaid, protecting the rest of the fund from the lender. Once repaid, the asset transfers to the SMSF. LRBAs are complex and require specialist advice.",
  },
]);

export default function SMSFCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(smsfFaqLd) }} />
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
