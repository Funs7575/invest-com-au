import type { Metadata } from "next";
import { Suspense } from "react";
import { CURRENT_YEAR, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import BorrowingPowerClient from "./BorrowingPowerClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Borrowing Power Calculator (${CURRENT_YEAR}) — How Much Can I Borrow?`,
  description:
    "Estimate your borrowing power across three lender types (major bank, mid-tier, specialist). Uses APRA assessment rates, HEM living expenses, and credit card commitments. Australian mortgage calculator.",
  alternates: { canonical: `${SITE_URL}/tools/borrowing-power-calculator` },
  openGraph: {
    title: `Borrowing Power Calculator (${CURRENT_YEAR})`,
    description:
      "How much can you borrow? Compare estimates across conservative, standard, and specialist lenders using APRA assessment rates.",
    url: `${SITE_URL}/tools/borrowing-power-calculator`,
  },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Tools", url: "/tools" },
  { name: "Borrowing Power Calculator", url: "/tools/borrowing-power-calculator" },
]);

const calcLd = calculatorJsonLd({
  name: "Borrowing Power Calculator",
  description:
    "Estimate how much you can borrow across three lender types. Uses APRA-mandated assessment rates, HEM living expenses, credit card commitments, and your income and deposit details.",
  path: "/tools/borrowing-power-calculator",
});

const faqLd = faqJsonLd([
  {
    q: "How do banks calculate borrowing power?",
    a: "Lenders calculate borrowing capacity by taking your gross income, deducting a living expenses benchmark (HEM or actual expenses, whichever is higher), deducting existing debt repayments (at stressed rates), then dividing the remaining net income by the stressed mortgage repayment rate (current + 3% APRA buffer). The result is the maximum loan amount at which net income covers all commitments.",
  },
  {
    q: "What reduces your borrowing power in Australia?",
    a: "Key factors that reduce borrowing capacity: HECS/HELP debt (typically 1-3% per year is treated as a repayment obligation), existing home loans or investment loans, personal loans, credit card limits (often 3.8% per month of total limit is used regardless of actual balance), car loans, childcare costs, private school fees, and declared living expenses above HEM benchmarks.",
  },
  {
    q: "How does a bigger deposit increase borrowing power?",
    a: "A larger deposit reduces the loan amount needed, which reduces the required repayments. It also removes the LMI requirement above 80% LVR (saving $5,000-$20,000+ depending on loan size). More importantly, a lower LVR gives access to better interest rates (often 0.1-0.5% lower), which further increases your serviceable loan amount at the same income.",
  },
  {
    q: "Does HECS debt affect mortgage borrowing power?",
    a: "Yes, significantly. Lenders use HECS/HELP repayment obligations as a commitment deducted from assessable income. The compulsory repayment rate rises with income (from 1% at $51k to 10% above $137k in 2024-25). On a $50,000 HELP debt and $100,000 income, the lender might deduct $7,500/yr from your assessable income — reducing your borrowing capacity by approximately $120,000-$160,000 depending on the rate.",
  },
  {
    q: "What's the difference between pre-approval and formal approval?",
    a: "A pre-approval (or conditional approval) is an in-principle assessment based on the information you provide; it's not a binding commitment from the lender. Formal (unconditional) approval comes after the lender verifies all documents, values the specific property, and confirms no material change in your financial situation. Always make your offer or bid subject to formal finance approval — pre-approvals lapse (typically 90 days) and can be withdrawn if circumstances change.",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "Borrowing Power Calculator — How Much Can I Borrow?",
  path: "/tools/borrowing-power-calculator",
  selectors: ["h1"],
});

export default function BorrowingPowerPage() {
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
        <BorrowingPowerClient />
      </Suspense>
    </>
  );
}
