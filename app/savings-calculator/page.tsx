import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import SavingsCalculatorClient from "./SavingsCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";
import CalcToPlanBridge from "@/components/get-matched/CalcToPlanBridge";
import RelatedCalculators from "@/components/RelatedCalculators";

export const revalidate = 3600;

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

const savingsFaqLd = faqJsonLd([
  {
    q: "What is a high-interest savings account?",
    a: "A high-interest savings account pays a higher variable rate than a standard bank account, typically between 4% and 6% p.a. in Australia. Most require you to meet monthly conditions — such as depositing a minimum amount or growing your balance — to earn the bonus rate.",
  },
  {
    q: "How is savings account interest calculated?",
    a: "Interest is calculated daily on your closing balance and credited monthly. The formula is: daily interest = (balance × annual rate) ÷ 365. Over a month, the total is the sum of all daily amounts. Rates are quoted as an annual percentage but applied daily.",
  },
  {
    q: "What is the difference between a base rate and a bonus rate?",
    a: "The base rate is paid unconditionally. The bonus rate is an additional amount paid only when you meet the account's monthly conditions, such as depositing $1,000 or making no withdrawals. The advertised rate is usually the combined base + bonus rate.",
  },
  {
    q: "Are savings accounts protected in Australia?",
    a: "Yes. Under the Financial Claims Scheme (FCS), the Australian Government guarantees deposits up to $250,000 per account holder per authorised deposit-taking institution (ADI). This covers banks, credit unions, and building societies regulated by APRA.",
  },
  {
    q: "How often should I compare savings rates?",
    a: "Savings rates change frequently, especially during Reserve Bank of Australia (RBA) rate cycles. It is worth comparing rates every 3–6 months, or whenever the RBA changes the cash rate, to ensure you are earning one of the highest available rates.",
  },
]);

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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(savingsFaqLd) }} />
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
