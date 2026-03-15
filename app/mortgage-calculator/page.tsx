import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import MortgageCalculatorClient from "./MortgageCalculatorClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Mortgage Repayment Calculator — How Much Will You Pay? (${CURRENT_YEAR})`,
  description: "Calculate your mortgage repayments, total interest and compare rate scenarios. See exactly what your home loan will cost over 25 or 30 years.",
  alternates: { canonical: "/mortgage-calculator" },
  openGraph: {
    title: `Mortgage Repayment Calculator — How Much Will You Pay? | ${SITE_NAME}`,
    description: "Enter your loan amount and interest rate. See your monthly repayments, total interest, and how different rates change the cost.",
    images: [{ url: "/api/og?title=Mortgage+Calculator&subtitle=How+much+will+you+pay%3F&type=default", width: 1200, height: 630 }],
  },
};

export default function MortgageCalculatorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `Mortgage Repayment Calculator — ${SITE_NAME}`,
    description: "Calculate your mortgage repayments and compare interest rate scenarios for Australian home loans.",
    url: "https://invest.com.au/mortgage-calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MortgageCalculatorClient />
    </>
  );
}
