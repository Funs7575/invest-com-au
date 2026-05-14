import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd } from "@/lib/schema-markup";
import SMSFCalculatorClient from "./SMSFCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";
import CalcToPlanBridge from "@/components/get-matched/CalcToPlanBridge";

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

export default function SMSFCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <SMSFCalculatorClient />
      <div className="container-custom pb-8">
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
