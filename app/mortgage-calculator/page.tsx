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

const mortgageFaqLd = faqJsonLd([
  {
    q: "How are mortgage repayments calculated in Australia?",
    a: "Monthly repayments are calculated using the standard annuity formula: P × (r(1+r)^n) / ((1+r)^n − 1), where P is the principal, r is the monthly interest rate (annual rate ÷ 12), and n is the total number of monthly payments. For a $600,000 loan at 6% p.a. over 30 years, the monthly repayment is approximately $3,597.",
  },
  {
    q: "What is the difference between principal and interest and interest-only repayments?",
    a: "With principal and interest (P&I) repayments, each payment covers part of the loan balance and part of the interest, so the loan reduces over time. With interest-only repayments, you only pay the interest each month and the loan balance does not reduce. Interest-only periods are typically 1 to 5 years and result in higher total repayments over the loan term.",
  },
  {
    q: "How does an offset account reduce my mortgage?",
    a: "An offset account is a transaction account linked to your mortgage. The balance in the offset account reduces the loan balance on which interest is calculated each day. For example, a $600,000 loan with a $50,000 offset account charges interest only on $550,000. This can save thousands in interest and shorten your loan term.",
  },
  {
    q: "Should I fix or go variable on my mortgage?",
    a: "A fixed rate locks your repayment for 1 to 5 years, giving certainty but less flexibility (break fees apply if you refinance or make large extra repayments). A variable rate moves with the market — it can fall when the RBA cuts rates but rise when rates increase. Many borrowers split their loan between fixed and variable to get partial certainty while retaining some flexibility.",
  },
  {
    q: "How much deposit do I need to buy a home in Australia?",
    a: "Most lenders require a minimum 5% deposit, but you will pay Lenders Mortgage Insurance (LMI) on loans above 80% LVR. With a 20% deposit you avoid LMI, which can cost $10,000 to $30,000+ on a typical property. First home buyers may access the First Home Guarantee (formerly FHLDS) with as little as 5% deposit and no LMI.",
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(mortgageFaqLd) }} />
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
