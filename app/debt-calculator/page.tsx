import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import DebtCalculatorClient from "./DebtCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Debt Consolidation Calculator — Could You Save? (${CURRENT_YEAR})`,
  description: "Calculate whether consolidating your debts into a single loan could save you money. Compare interest costs, monthly payments, and payoff timelines.",
  alternates: { canonical: "/debt-calculator" },
  openGraph: {
    title: "Debt Consolidation Calculator — Could You Save?",
    description: "Enter your debts and see if consolidation could reduce your interest costs, lower your monthly payments, and help you become debt-free sooner.",
    images: [{ url: "/api/og?title=Debt+Consolidation+Calculator&subtitle=Could+you+save%3F&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
};

export default function DebtCalculatorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `Debt Consolidation Calculator — ${SITE_NAME}`,
    description: "Calculate whether consolidating your debts into a single loan could save you money on interest and monthly payments.",
    url: "https://invest.com.au/debt-calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <DebtCalculatorClient />
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
