import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import InvestmentIncomeTaxClient from "./InvestmentIncomeTaxClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Investment Income Tax Calculator — Australia ${CURRENT_YEAR}`,
  description:
    "Estimate tax on investment income — interest, franked/unfranked dividends, and capital gains — at Australia's progressive tax rates plus Medicare levy.",
  alternates: { canonical: "/investment-income-tax-calculator" },
  openGraph: {
    title: `Investment Income Tax Calculator ${CURRENT_YEAR} — Australia`,
    description:
      "Free calculator: combine interest, dividends (with franking credits) and capital gains to see your total tax bill at your marginal rate.",
    url: absoluteUrl("/investment-income-tax-calculator"),
    images: [
      {
        url: "/api/og?title=Investment+Income+Tax+Calculator&subtitle=Australian+Investors&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const softwareLd = calculatorJsonLd({
  name: "Investment Income Tax Calculator",
  description:
    "Free Australian investment income tax calculator. Combines interest, franked and unfranked dividends, and net capital gains (with the 50% CGT discount), then applies the progressive resident tax scale and Medicare levy to estimate your tax bill or refund.",
  path: "/investment-income-tax-calculator",
});

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Calculators", url: absoluteUrl("/calculators") },
  { name: "Investment Income Tax Calculator", url: absoluteUrl("/investment-income-tax-calculator") },
]);

const faqLd = faqJsonLd([
  {
    q: "How is investment income taxed in Australia?",
    a: "There is no separate investment income tax rate. Interest, dividends and net capital gains are added to your other assessable income (such as salary) and taxed together at the progressive resident tax rates, plus the 2% Medicare levy. Franked dividends carry a franking credit that reduces the tax, and assets held more than 12 months qualify for a 50% capital gains discount.",
  },
  {
    q: "Do I pay tax on dividends and franking credits?",
    a: "Yes. You include the cash dividend plus its attached franking credit (the grossed-up amount) in your taxable income, then claim the franking credit as a refundable tax offset. If your marginal rate is below the 30% company rate you receive a refund of the excess; if above, you pay top-up tax.",
  },
  {
    q: "How is the capital gains component calculated?",
    a: "Your gross capital gain (sale proceeds minus cost base) is added to assessable income. If you held the asset for more than 12 months as an individual, only half the gain is assessable thanks to the 50% CGT discount. The discounted gain is then taxed at your marginal rate.",
  },
  {
    q: "Why does my salary affect the tax on my investments?",
    a: "Australia uses a progressive tax scale, so your investment income is taxed at the marginal rate of the bracket it lands in once stacked on top of your salary. A high salary can push even modest investment income into the 37% or 45% bracket, which is why this calculator asks for your other taxable income.",
  },
  {
    q: "What does this calculator not include?",
    a: "It is a simplified estimate. It does not model the Medicare levy surcharge, low-income tax offset, HELP/HECS repayments, the 45-day franking holding rule, capital losses or carry-forward, or non-resident, super-fund and company tax rates. Always confirm your position with a registered tax agent.",
  },
]);

function Loading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-4 w-48 bg-slate-100 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function InvestmentIncomeTaxCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Suspense fallback={<Loading />}>
        <InvestmentIncomeTaxClient />
      </Suspense>
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>
    </>
  );
}
