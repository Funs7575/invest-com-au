import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import MortgageCalculatorClient from "./MortgageCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";
import CalcToPlanBridge from "@/components/get-matched/CalcToPlanBridge";
import RelatedCalculators from "@/components/RelatedCalculators";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Mortgage Repayment Calculator — How Much Will You Pay? (${CURRENT_YEAR})`,
  description: "Calculate your mortgage repayments, total interest and compare rate scenarios. See exactly what your home loan will cost over 25 or 30 years.",
  alternates: { canonical: "/mortgage-calculator" },
  openGraph: {
    title: "Mortgage Repayment Calculator — How Much Will You Pay?",
    description: "Enter your loan amount and interest rate. See your monthly repayments, total interest, and how different rates change the cost.",
    images: [{ url: "/api/og?title=Mortgage+Calculator&subtitle=How+much+will+you+pay%3F&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
};

const faqLd = faqJsonLd([
  {
    q: "How much can I borrow for a home loan in Australia?",
    a: "Australian lenders typically allow you to borrow up to 4–6× your gross annual income, subject to a serviceability assessment. Lenders also apply a minimum 3% interest rate buffer above the loan rate to ensure you can afford repayments if rates rise. Your borrowing power depends on income, existing debts, living expenses, and the size of your deposit.",
  },
  {
    q: "What is the difference between principal and interest (P&I) and interest-only repayments?",
    a: "With P&I repayments, each payment reduces your loan balance as well as covering interest, so you build equity and pay off the loan over its term. Interest-only repayments cover just the interest for a set period (typically 1–5 years), leaving the principal unchanged — total interest paid over the life of the loan is higher.",
  },
  {
    q: "How does a mortgage offset account work?",
    a: "An offset account is a transaction account linked to your home loan. The balance in the offset account is subtracted from your loan balance before interest is calculated each day. For example, a $500,000 loan with $50,000 in an offset account is charged interest as if the balance were $450,000, reducing interest without reducing your available cash.",
  },
  {
    q: "What is LVR (Loan-to-Value Ratio) on a home loan?",
    a: "LVR is your loan amount expressed as a percentage of the property's value. A $400,000 loan on an $800,000 property is 50% LVR. Lenders generally require Lenders Mortgage Insurance (LMI) when LVR exceeds 80%, which can add thousands of dollars to the cost of your loan.",
  },
  {
    q: "How do extra repayments reduce a mortgage?",
    a: "Extra repayments directly reduce your principal, which lowers the interest charged in subsequent periods. Because interest compounds daily on most Australian mortgages, even small regular extra repayments can shave years off the loan term and save tens of thousands of dollars in interest. Most variable-rate loans allow unlimited extra repayments; fixed-rate loans often cap extra repayments during the fixed term.",
  },
]);

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <MortgageCalculatorClient />
      <div className="container-custom pb-8">
        <RelatedCalculators
          items={[
            { name: "Property vs Shares Calculator", description: "Compare the long-run return of property versus a share portfolio side by side.", href: "/property-vs-shares-calculator" },
            { name: "Savings Calculator", description: "Model how quickly you can save your deposit with different contribution rates.", href: "/savings-calculator" },
            { name: "CGT Calculator", description: "Estimate capital gains tax when you sell an investment property.", href: "/cgt-calculator" },
          ]}
        />
        <CalcToPlanBridge goal="home" />
        <ComplianceFooter variant="calculator" />
      </div>

    </>
  );
}
