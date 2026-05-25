import type { Metadata } from "next";
import { Suspense } from "react";
import { CURRENT_YEAR, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
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
    q: "What is housing stress?",
    a: "Housing stress is a commonly used benchmark defined as spending more than 30% of gross household income on housing costs. Research from the Reserve Bank of Australia and AHURI (Australian Housing and Urban Research Institute) uses this threshold to identify households under mortgage or rental pressure. Spending above 40% is often classified as severe housing stress.",
  },
  {
    q: "What is the APRA serviceability buffer?",
    a: "APRA requires authorised deposit-taking institutions to assess mortgage applications at the borrower's actual loan rate plus a minimum 3 percentage point buffer. This ensures you can continue servicing the loan even if rates rise significantly after settlement. Non-bank lenders not regulated by APRA may apply a lower buffer (typically 2.5%), though many use the same 3% standard.",
  },
  {
    q: "Does this calculator include all housing costs?",
    a: "No — this calculator covers principal and interest repayments only. Full housing costs include council rates, building insurance, strata levies (for units and townhouses), and maintenance or repair costs. A more complete stress test adds 1–2% of property value per year for these ongoing costs. If you include them, your effective stress threshold will be reached at a lower interest rate.",
  },
  {
    q: "What should I do if I am in housing stress?",
    a: "If your repayments already exceed 30% of gross income, or would do so at the current APRA buffer rate, consider: refinancing to a lower rate (a mortgage broker can compare 30+ lenders for free), extending the loan term to reduce monthly repayments, making a lump-sum principal reduction using savings or an offset account, or contacting your lender about a hardship arrangement. Early action preserves more options than waiting until repayments become unmanageable.",
  },
]);

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
      <Suspense>
        <MortgageStressTestClient />
      </Suspense>
    </>
  );
}
