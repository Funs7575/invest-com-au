import type { Metadata } from "next";
import { CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import RetirementCalculatorClient from "./RetirementCalculatorClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Retirement Calculator — How Much Do You Need? (${CURRENT_YEAR})`,
  description: "Project your superannuation balance at retirement, see how long it will last, and find out if you're on track. Free Australian retirement calculator.",
  alternates: { canonical: "/retirement-calculator" },
  openGraph: {
    title: "Retirement Calculator — How Much Do You Need?",
    description: "Project your super balance at retirement, see how long it lasts, and get a personalised gap analysis.",
    images: [{ url: "/api/og?title=Retirement+Calculator&subtitle=How+much+do+you+need%3F&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
};

const faqLd = faqJsonLd([
  {
    q: "How much super do I need to retire in Australia?",
    a: "The Association of Superannuation Funds of Australia (ASFA) estimates a comfortable retirement requires around $595,000 for a single person and $690,000 for a couple (2024 figures), assuming you also receive the Age Pension. Your personal target depends on your desired lifestyle, retirement age, and whether you own your home.",
  },
  {
    q: "What is the 4% rule for retirement?",
    a: "The 4% rule suggests you can withdraw 4% of your portfolio in the first year of retirement and adjust for inflation annually, with a historically high probability of funds lasting 30+ years. For longer retirements of 40+ years, many Australian financial planners recommend a more conservative 3–3.5% withdrawal rate.",
  },
  {
    q: "How long will my superannuation last?",
    a: "How long your super lasts depends on your balance at retirement, your annual drawdown, investment returns, and fees. This calculator projects your balance year by year so you can see when — or if — your super is likely to run out under different scenarios.",
  },
  {
    q: "When can I access my superannuation?",
    a: "You can access your super when you reach your preservation age (between 55 and 60 depending on your birth year) and meet a condition of release, such as retiring or turning 65. From age 60, most super withdrawals are tax-free for Australians.",
  },
  {
    q: "How much should I be saving for retirement?",
    a: "As a general rule, saving 15–20% of your gross income (including the 11.5% compulsory Superannuation Guarantee) from an early age gives most Australians a good chance of a comfortable retirement. Voluntary concessional contributions up to the $30,000 annual cap are tax-effective ways to boost your super balance.",
  },
  {
    q: "What is the Age Pension and will I qualify?",
    a: "The Australian Age Pension is a government income support payment available from age 67 to people who meet residency and income/assets means tests. Many retirees receive a part pension even with significant savings. The full single rate is around $29,800 per year (2024–25).",
  },
]);

export default function RetirementCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorJsonLd({ name: "Retirement Calculator", description: "Project your superannuation at retirement and find out if you're on track for the retirement you want.", path: "/retirement-calculator" })) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <RetirementCalculatorClient />
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
