import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import SavingsCalculatorClient from "./SavingsCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";
import CalcToPlanBridge from "@/components/get-matched/CalcToPlanBridge";
import RelatedCalculators from "@/components/RelatedCalculators";

export const revalidate = 3600;

const FAQ_ITEMS = [
  {
    q: "What is a good savings account interest rate in Australia?",
    a: "As of 2025, the best savings account rates in Australia sit between 5.00% and 5.50% p.a. (including introductory or bonus-rate conditions). The RBA cash rate target heavily influences these rates — when the cash rate falls, most savings rates follow. Compare accounts regularly, as bonus-rate periods often expire after 3–4 months.",
  },
  {
    q: "How does compound interest work on a savings account?",
    a: "Australian savings accounts typically compound interest monthly. Your interest earned each month is added to your balance, and the next month's interest is calculated on the larger amount. Over time this compounding effect meaningfully increases your total return compared to simple interest.",
  },
  {
    q: "Are savings account interest rates taxable in Australia?",
    a: "Yes. Interest earned on Australian savings accounts is assessable income and must be declared in your tax return. Your bank will report interest paid to the ATO. The interest is taxed at your marginal rate — which could be 0%, 19%, 32.5%, 37%, or 45% plus the 2% Medicare levy.",
  },
  {
    q: "What is a bonus interest rate on Australian savings accounts?",
    a: "Many Australian savings accounts offer a base rate plus a bonus rate that applies only when you meet monthly conditions — such as depositing a minimum amount, making a set number of transactions, or not making withdrawals. Missing the conditions in a given month means you only earn the lower base rate.",
  },
  {
    q: "Should I keep my emergency fund in a high-interest savings account?",
    a: "Yes. ASIC's MoneySmart guidelines recommend keeping 3–6 months of living expenses as an emergency fund in a liquid, high-interest savings account — not in shares or term deposits that restrict access. A savings account lets you access funds within a business day while still earning a competitive rate.",
  },
  {
    q: "What is the difference between a savings account and a term deposit?",
    a: "A savings account lets you deposit and withdraw freely (with some bonus-rate conditions), while a term deposit locks your money for a fixed period — typically 1 month to 5 years — in exchange for a fixed rate. Term deposits suit money you won't need until maturity; savings accounts suit funds you may need access to.",
  },
];

const faqLd = faqJsonLd(FAQ_ITEMS);
const speakableLd = speakableWebPageJsonLd({
  name: "Savings Rate Calculator — Are You Earning Enough?",
  path: "/savings-calculator",
  selectors: ["h1", ".calculator-result-summary"],
});

export const metadata: Metadata = {
  title: `Savings Rate Calculator — Are You Earning Enough? (${CURRENT_YEAR})`,
  description: "Compare your current savings rate against Australia's best accounts. See exactly how much extra interest you could earn by switching.",
  alternates: { canonical: "/savings-calculator" },
  openGraph: {
    title: "Savings Rate Calculator — How Much Are You Leaving on the Table?",
    description: "Enter your savings balance and current rate. See how much more you could earn at Australia's top savings accounts.",
    images: [{ url: "/api/og?title=Savings+Calculator&subtitle=Are+you+earning+enough%3F&type=default", width: 1200, height: 630 }],
  },
};

export default async function SavingsCalculatorPage() {
  const supabase = await createClient();
  const { data: accounts } = await supabase
    .from("brokers")
    .select("id, slug, name, platform_type, asx_fee, rating, affiliate_url, color, icon, logo_url, min_deposit")
    .eq("status", "active")
    .eq("platform_type", "savings_account")
    .order("rating", { ascending: false });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorJsonLd({ name: "Savings Rate Calculator", description: "Compare savings account interest rates and calculate how much more you could earn.", path: "/savings-calculator" })) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }} />
      <SavingsCalculatorClient accounts={accounts || []} />
      <div className="container-custom pb-8">
        <RelatedCalculators
          items={[
            { name: "Compound Interest Calculator", description: "Model long-term investment growth with regular contributions and compound returns.", href: "/compound-interest-calculator" },
            { name: "FIRE Calculator", description: "Calculate your Financial Independence number and retirement timeline.", href: "/fire-calculator" },
            { name: "Mortgage Calculator", description: "See how much of your savings you could put toward a home deposit.", href: "/mortgage-calculator" },
          ]}
        />
        <CalcToPlanBridge
          goal="grow"
          headline="Want to start investing instead of just saving?"
          subtitle="Compare brokers, get matched with platforms, or talk to verified pros. Takes 60 seconds."
        />
        <ComplianceFooter variant="calculator" />
      </div>

    </>
  );
}
