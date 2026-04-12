import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import SMSFCalculatorClient from "./SMSFCalculatorClient";

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

export default function SMSFCalculatorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `SMSF Eligibility Calculator — ${SITE_NAME}`,
    description: "Calculate whether a Self-Managed Super Fund is worth it compared to your current super fund.",
    url: "https://invest.com.au/smsf-calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SMSFCalculatorClient />
    </>
  );
}
