import type { Metadata } from "next";
import { CURRENT_YEAR, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import DividendReinvestmentClient from "./DividendReinvestmentClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Dividend Reinvestment Calculator (DRP) Australia (${CURRENT_YEAR})`,
  description:
    "Calculate how reinvesting dividends grows your share portfolio through compounding. Model DRP vs cash dividends, share price growth and your final portfolio value.",
  alternates: { canonical: "/dividend-reinvestment-calculator" },
  openGraph: {
    title: "Dividend Reinvestment Calculator (DRP)",
    description:
      "Free DRP calculator for Australian investors. See how reinvesting dividends accelerates your portfolio growth compared to taking cash.",
    images: [
      {
        url: "/api/og?title=Dividend+Reinvestment+Calculator&subtitle=DRP+vs+Cash+Dividends&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const softwareLd = calculatorJsonLd({
  name: "Dividend Reinvestment Calculator",
  description:
    "Model the long-term portfolio growth difference between reinvesting dividends (DRP) versus taking them as cash.",
  path: "/dividend-reinvestment-calculator",
});

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Calculators", url: absoluteUrl("/calculators") },
  { name: "Dividend Reinvestment Calculator", url: absoluteUrl("/dividend-reinvestment-calculator") },
]);

const faqLd = faqJsonLd([
  {
    q: "What is a Dividend Reinvestment Plan (DRP)?",
    a: "A Dividend Reinvestment Plan (DRP) automatically uses your cash dividends to purchase additional shares in the same company or ETF, usually at a slight discount to the market price. This compounds your returns over time by continuously increasing your share count without any transaction fees.",
  },
  {
    q: "How much difference does DRP make over 20 years?",
    a: "Reinvesting dividends can make a dramatic difference over long periods. For a portfolio with a 4% dividend yield and 6% capital growth, choosing DRP over cash dividends can result in a final portfolio value 60-80% higher over 20 years, due to the compounding effect of continuously buying more shares.",
  },
  {
    q: "Are reinvested dividends taxed in Australia?",
    a: "Yes. In Australia, dividends are taxed in the year they are paid, regardless of whether you receive them as cash or reinvest them via DRP. The ATO treats reinvested dividends as assessable income. You also establish a new cost base for each parcel of shares acquired through DRP, which affects your future capital gains calculations.",
  },
  {
    q: "Which Australian ETFs offer DRP?",
    a: "Most major Australian ETFs offer DRP, including Vanguard (VAS, VGS, VDHG), iShares (IVV, IOZ), BetaShares (A200, NDQ, DHHF) and others. Check the fund's PDS or your broker's DRP enrolment options to confirm availability.",
  },
]);

export default function DividendReinvestmentCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <DividendReinvestmentClient />
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
