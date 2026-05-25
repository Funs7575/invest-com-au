import type { Metadata } from "next";
import { CURRENT_YEAR, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import CompoundInterestClient from "./CompoundInterestClient";
import ComplianceFooter from "@/components/ComplianceFooter";
import RelatedCalculators from "@/components/RelatedCalculators";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Compound Interest Calculator Australia — Investment Growth (${CURRENT_YEAR})`,
  description:
    "Calculate how your investments grow with compound interest. Enter your initial investment, regular contributions, interest rate and time period to see your final balance and total interest earned.",
  alternates: { canonical: "/compound-interest-calculator" },
  openGraph: {
    title: "Compound Interest Calculator — Investment Growth",
    description:
      "Free compound interest calculator for Australian investors. See the power of compounding on your lump sum and regular contributions.",
    images: [
      {
        url: "/api/og?title=Compound+Interest+Calculator&subtitle=Investment+Growth+%26+Compounding&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const softwareLd = calculatorJsonLd({
  name: "Compound Interest Calculator",
  description:
    "Calculate the future value of your investments with compound interest, including regular contributions and different compounding frequencies.",
  path: "/compound-interest-calculator",
});

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Calculators", url: absoluteUrl("/calculators") },
  { name: "Compound Interest Calculator", url: absoluteUrl("/compound-interest-calculator") },
]);

const faqLd = faqJsonLd([
  {
    q: "What is compound interest?",
    a: "Compound interest is interest calculated on both the initial principal and the accumulated interest from previous periods. Unlike simple interest, compounding causes your money to grow exponentially over time — often called 'the eighth wonder of the world'.",
  },
  {
    q: "How often should I compound my investments?",
    a: "The more frequently interest compounds, the more you earn. Monthly compounding is common for savings accounts and many investment returns. However, the difference between monthly and daily compounding is relatively small — what matters more is starting early and keeping your money invested.",
  },
  {
    q: "What is a realistic compound interest rate for Australian investments?",
    a: "The Australian share market (ASX 200) has historically returned around 9-10% per annum including dividends over the long term. Diversified ETFs targeting global equities have returned 7-10% p.a. High-interest savings accounts currently offer 4-5%. Use a conservative 5-7% for long-term planning to account for inflation and fees.",
  },
  {
    q: "How do regular contributions affect compound growth?",
    a: "Regular contributions dramatically accelerate compound growth. Even small monthly additions — say $200/month — can add hundreds of thousands of dollars to your final balance over a 30-year period, because each contribution also compounds over time.",
  },
  {
    q: "Is compound interest taxable in Australia?",
    a: "Yes. Interest and investment returns that compound within a taxable account are assessable income in the year they are earned or realised. Returns inside superannuation are taxed at a concessional 15% (accumulation phase) or 0% (pension phase), which is why compounding inside super is so powerful over a long investment horizon.",
  },
  {
    q: "How does inflation affect compound interest returns in Australia?",
    a: "Inflation erodes the real value of compound returns. If your investment returns 8% p.a. and inflation runs at 3%, your real return is approximately 5%. The RBA targets an inflation band of 2–3% over the medium term. For long-term planning, subtract the expected inflation rate from your nominal return to estimate real purchasing-power growth.",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "Compound Interest Calculator Australia — Investment Growth",
  path: "/compound-interest-calculator",
  selectors: ["h1", ".calculator-result-summary"],
});

export default function CompoundInterestCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }} />
      <CompoundInterestClient />
      <div className="container-custom pb-8">
        <RelatedCalculators
          items={[
            { name: "Savings Calculator", description: "Compare savings accounts and see how your balance grows with different rates.", href: "/savings-calculator" },
            { name: "FIRE Calculator", description: "Find your Financial Independence number and the years until you can retire.", href: "/fire-calculator" },
            { name: "Dividend Reinvestment Calculator", description: "Model the compounding effect of reinvesting dividends over time.", href: "/dividend-reinvestment-calculator" },
          ]}
        />
        <ComplianceFooter variant="calculator" />
      </div>

    </>
  );
}
