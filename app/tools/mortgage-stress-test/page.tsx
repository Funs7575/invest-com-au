import type { Metadata } from "next";
import { Suspense } from "react";
import { CURRENT_YEAR, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import MortgageStressTestClient from "./MortgageStressTestClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Mortgage Stress Test Calculator (${CURRENT_YEAR}) — Can You Handle Rate Rises?`,
  description:
    "See how your mortgage repayments change as interest rates rise and find out when you'd hit housing stress (30% of gross income). Tests up to +5% above your current rate including the APRA buffer scenario.",
  alternates: { canonical: `${SITE_URL}/tools/mortgage-stress-test` },
  openGraph: {
    title: `Mortgage Stress Test Calculator (${CURRENT_YEAR})`,
    description:
      "Find your repayment breakeven rate and test nine rate-rise scenarios including APRA's mandatory 3% buffer.",
    url: `${SITE_URL}/tools/mortgage-stress-test`,
  },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Tools", url: "/tools" },
  { name: "Mortgage Stress Test", url: "/tools/mortgage-stress-test" },
]);

const calcLd = calculatorJsonLd({
  name: "Mortgage Stress Test Calculator",
  description:
    "Test your mortgage repayments across nine rate-rise scenarios from your current rate to +5%. Find the breakeven rate where you'd hit housing stress (30% of gross income) and see the APRA +3% buffer impact.",
  path: "/tools/mortgage-stress-test",
});

const faqLd = faqJsonLd([
  {
    q: "What is a mortgage stress test?",
    a: "A mortgage stress test calculates whether you could afford repayments if interest rates rose by a buffer above your current rate. APRA requires Australian lenders to assess borrowers at a minimum 3% serviceability buffer above the loan rate (or a floor of 4.5%, whichever is higher). The test simulates higher repayments to ensure borrowers can absorb rate rises.",
  },
  {
    q: "How much of income is considered mortgage stress?",
    a: "The commonly-used threshold is spending more than 30% of gross household income on housing costs (mortgage principal + interest + rates + insurance). Some economists use 30% of pre-tax income for any household; others use 30% of after-tax income to reflect actual cash-flow stress. Households spending 50%+ of gross income on housing are considered severely stressed.",
  },
  {
    q: "What happens if I fail a lender's stress test?",
    a: "Your loan application may be declined, or the maximum loan amount offered will be lower than requested. You can respond by: increasing the deposit, reducing the loan term, choosing a lower-priced property, waiting to pay down other debts first, or applying jointly with a higher-income co-borrower. You cannot 'pass' a stress test by picking a lender who doesn't apply the buffer — APRA prudential rules apply to all authorised deposit-taking institutions.",
  },
  {
    q: "Has the APRA serviceability buffer changed?",
    a: "APRA increased the serviceability buffer from 2.5% to 3.0% in October 2021 as part of its macroprudential toolkit, as house prices and debt-to-income ratios were rising rapidly. As of mid-2026 the buffer remains at 3.0%. Some non-bank lenders apply a 2% buffer (below APRA supervision), but most major banks and credit unions use 3%.",
  },
  {
    q: "What is debt-to-income (DTI) ratio and why do lenders care?",
    a: "The DTI ratio divides total debt (mortgage + personal loans + credit cards × 3.8 monthly limit) by gross annual income. APRA has flagged concern when loans are originated at DTI > 6×. Borrowers with DTI > 7-8× may face automatic additional scrutiny or lender-imposed caps. Reducing outstanding consumer debt before applying improves your DTI materially.",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "Mortgage Stress Test Calculator",
  path: "/tools/mortgage-stress-test",
  selectors: ["h1"],
});

export default function MortgageStressTestPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calcLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }}
      />
      <Suspense>
        <MortgageStressTestClient />
      </Suspense>
    </>
  );
}
