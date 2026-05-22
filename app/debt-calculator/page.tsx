import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
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

const softwareLd = calculatorJsonLd({
  name: "Debt Consolidation Calculator",
  description: "Calculate whether consolidating your debts into a single loan could save you money on interest and monthly payments.",
  path: "/debt-calculator",
});

const FAQ_ITEMS = [
  {
    q: "What is debt consolidation and how does it work in Australia?",
    a: "Debt consolidation combines multiple debts — such as credit cards, personal loans, and buy-now-pay-later balances — into a single loan with one repayment and (ideally) a lower interest rate. In Australia, consolidation loans typically range from 6% to 20% p.a., compared to credit card rates of 17–22% p.a., so switching can reduce both your monthly repayment and total interest paid.",
  },
  {
    q: "Will debt consolidation hurt my credit score in Australia?",
    a: "Applying for a new consolidation loan triggers a hard credit enquiry, which can temporarily lower your credit score by a few points. However, once you close high-balance accounts and consistently make on-time repayments, your score typically improves within 6–12 months. Lenders check your Equifax, Experian, or illion credit file — the impact is minor compared to missed repayments.",
  },
  {
    q: "What types of debt can I consolidate in Australia?",
    a: "You can consolidate most unsecured debts: credit cards, store cards, personal loans, buy-now-pay-later accounts (Afterpay, Zip), and medical debt. Secured debts like car loans or home loans can also be rolled into a mortgage (called debt recycling), but this extends your loan term and converts unsecured debt to secured debt, which carries different risks.",
  },
  {
    q: "Are there fees for debt consolidation loans in Australia?",
    a: "Most personal loan lenders charge an establishment fee ($0–$600) and potentially an early repayment fee if you pay off the loan ahead of schedule. Some balance transfer credit cards charge a transfer fee of 1–3%. Always calculate the total cost of consolidation — fees plus interest over the loan term — against what you'd pay staying on current debts.",
  },
  {
    q: "How long should a debt consolidation loan term be in Australia?",
    a: "Shorter loan terms (1–3 years) minimise total interest paid but require higher monthly repayments. Longer terms (5–7 years) lower monthly repayments but increase total interest cost. ASIC's MoneySmart recommends choosing the shortest term your budget allows. If consolidation only makes sense with a 7-year term, the interest savings may be smaller than they appear.",
  },
  {
    q: "What is the average credit card interest rate in Australia?",
    a: "As of 2025, the average standard credit card interest rate in Australia is approximately 19–20% p.a., with low-rate cards typically charging 10–14% p.a. The RBA publishes monthly credit card statistics showing the weighted-average rate across all cards. Consolidating high-rate card balances into a personal loan at 8–12% p.a. is the most common reason Australians use debt consolidation.",
  },
];

const faqLd = faqJsonLd(FAQ_ITEMS);
const speakableLd = speakableWebPageJsonLd({
  name: "Debt Consolidation Calculator — Could You Save?",
  path: "/debt-calculator",
  selectors: ["h1", ".calculator-result-summary"],
});

export default function DebtCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }} />
      <DebtCalculatorClient />
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
