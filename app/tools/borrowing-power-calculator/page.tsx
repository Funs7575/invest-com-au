import type { Metadata } from "next";
import { Suspense } from "react";
import { CURRENT_YEAR, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import BorrowingPowerClient from "./BorrowingPowerClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Borrowing Power Calculator (${CURRENT_YEAR}) — How Much Can I Borrow?`,
  description:
    "Estimate borrowing power across three lender types (major bank, mid-tier, specialist). Uses APRA assessment rates, HEM expenses, and liabilities.",
  alternates: { canonical: `${SITE_URL}/tools/borrowing-power-calculator` },
  openGraph: {
    title: `Borrowing Power Calculator (${CURRENT_YEAR})`,
    description:
      "How much can you borrow? Compare estimates across conservative, standard, and specialist lenders using APRA assessment rates.",
    url: `${SITE_URL}/tools/borrowing-power-calculator`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Borrowing Power Calculator")}&sub=${encodeURIComponent("How Much Can I Borrow · LVR · Income · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
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
    q: "How is borrowing power calculated in Australia?",
    a: "Australian lenders calculate borrowing power by first working out your net monthly income after tax. They then subtract estimated living expenses (based on the Household Expenditure Measure or HEM), monthly credit card commitments (typically 3–3.8% of your combined card limits), and any existing loan repayments. The remaining surplus is your maximum monthly repayment. Lenders then work backwards from that repayment figure at an assessment rate (your actual rate + a buffer of 2.5–3%) to determine the maximum loan principal.",
  },
  {
    q: "What is the APRA assessment rate buffer?",
    a: "APRA requires all authorised deposit-taking institutions (banks, credit unions) to assess borrowers at at least 3 percentage points above the loan's interest rate. For a loan at 6.2%, the assessment rate would be at least 9.2%. This is a serviceability buffer to ensure borrowers can still repay if rates rise significantly. Some non-bank lenders not regulated by APRA may apply a smaller buffer (e.g. 2.5%).",
  },
  {
    q: "Why does my credit card limit reduce borrowing power even if I don't carry a balance?",
    a: "Lenders assume you could draw your full credit card limit at any time and then struggle to repay the loan. Standard practice is to treat 3–3.8% of your total credit card limits as a monthly commitment regardless of your actual spending. If you have unused credit cards, cancelling them before applying for a home loan can materially increase your borrowing power.",
  },
  {
    q: "Does having a guarantor increase borrowing power?",
    a: "A guarantor (typically a parent) provides additional security against their own property, which removes the need for LMI when your deposit is below 20%. This doesn't directly increase borrowing power — that's still determined by your income and expenses — but it can allow you to borrow up to 80% or more of a more expensive property without saving a larger deposit. Check with a mortgage broker whether a family guarantee suits your situation.",
  },
]);

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
      <Suspense>
        <BorrowingPowerClient />
      </Suspense>
    </>
  );
}
