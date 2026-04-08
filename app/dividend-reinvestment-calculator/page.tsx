import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import DividendReinvestmentClient from "./DividendReinvestmentClient";

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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `Dividend Reinvestment Calculator — ${SITE_NAME}`,
  description:
    "Model the long-term portfolio growth difference between reinvesting dividends (DRP) versus taking them as cash.",
  url: "https://invest.com.au/dividend-reinvestment-calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://invest.com.au" },
    { "@type": "ListItem", position: 2, name: "Calculators", item: "https://invest.com.au/calculators" },
    {
      "@type": "ListItem",
      position: 3,
      name: "Dividend Reinvestment Calculator",
      item: "https://invest.com.au/dividend-reinvestment-calculator",
    },
  ],
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a Dividend Reinvestment Plan (DRP)?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A Dividend Reinvestment Plan (DRP) automatically uses your cash dividends to purchase additional shares in the same company or ETF, usually at a slight discount to the market price. This compounds your returns over time by continuously increasing your share count without any transaction fees.",
      },
    },
    {
      "@type": "Question",
      name: "How much difference does DRP make over 20 years?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Reinvesting dividends can make a dramatic difference over long periods. For a portfolio with a 4% dividend yield and 6% capital growth, choosing DRP over cash dividends can result in a final portfolio value 60-80% higher over 20 years, due to the compounding effect of continuously buying more shares.",
      },
    },
    {
      "@type": "Question",
      name: "Are reinvested dividends taxed in Australia?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. In Australia, dividends are taxed in the year they are paid, regardless of whether you receive them as cash or reinvest them via DRP. The ATO treats reinvested dividends as assessable income. You also establish a new cost base for each parcel of shares acquired through DRP, which affects your future capital gains calculations.",
      },
    },
    {
      "@type": "Question",
      name: "Which Australian ETFs offer DRP?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most major Australian ETFs offer DRP, including Vanguard (VAS, VGS, VDHG), iShares (IVV, IOZ), BetaShares (A200, NDQ, DHHF) and others. Check the fund's PDS or your broker's DRP enrolment options to confirm availability.",
      },
    },
  ],
};

export default function DividendReinvestmentCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <DividendReinvestmentClient />
    </>
  );
}
