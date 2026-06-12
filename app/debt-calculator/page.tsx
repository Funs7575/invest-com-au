import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import DebtCalculatorClient from "./DebtCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

const DEBT_FAQS = [
  {
    q: "Does debt consolidation save money?",
    a: "Debt consolidation saves money only if the new loan's interest rate is lower than the weighted average rate across all existing debts. It also depends on fees, the new loan term, and your repayment discipline. Consolidating a credit card at 20% interest into a personal loan at 12% saves money on interest — but extending the term from 2 years to 7 years may result in paying more total interest even at the lower rate. Use the calculator above to compare your specific scenario.",
  },
  {
    q: "What debts can be consolidated in Australia?",
    a: "Most unsecured debts can be consolidated: credit cards, personal loans, buy now pay later balances, and store cards. You generally cannot consolidate secured debts (like a car loan or mortgage) unless you refinance with a secured facility. Some lenders will allow a secured personal loan (e.g. using home equity) to consolidate unsecured debt — this can lower the rate but puts your home at risk.",
  },
  {
    q: "Does debt consolidation hurt your credit score?",
    a: "Applying for a consolidation loan triggers a hard credit enquiry, which may temporarily reduce your score. However, if consolidation results in closing credit card accounts (lowering total available credit) or reduces your credit utilisation ratio, the net effect over time can be neutral or positive. Making on-time payments on the new consolidated loan consistently improves your score.",
  },
  {
    q: "What is the average interest rate for a debt consolidation loan in Australia?",
    a: "Personal loan rates for debt consolidation in Australia typically range from 6.99% to 24.99% p.a., with the rate depending on your credit score, loan amount, and lender. Borrowers with excellent credit (700+) generally access rates between 7–12%. Banks and credit unions often offer competitive secured personal loans at 6–10%. Comparison rates include fees — always use the comparison rate, not the advertised rate, when comparing lenders.",
  },
];

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
  const faqLd = faqJsonLd(DEBT_FAQS);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorJsonLd({ name: "Debt Consolidation Calculator", description: "Calculate whether consolidating your debts into a single loan could save you money on interest and monthly payments.", path: "/debt-calculator" })) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      <DebtCalculatorClient />
      <section className="container-custom pb-6 pt-2">
        <h2 className="text-xl font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="max-w-3xl space-y-3">
          {DEBT_FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
