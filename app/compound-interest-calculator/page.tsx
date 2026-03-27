import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import CompoundInterestClient from "./CompoundInterestClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Compound Interest Calculator Australia — Investment Growth (${CURRENT_YEAR})`,
  description:
    "Calculate how your investments grow with compound interest. Enter your initial investment, regular contributions, interest rate and time period to see your final balance and total interest earned.",
  alternates: { canonical: "/compound-interest-calculator" },
  openGraph: {
    title: `Compound Interest Calculator — Investment Growth | ${SITE_NAME}`,
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `Compound Interest Calculator — ${SITE_NAME}`,
  description:
    "Calculate the future value of your investments with compound interest, including regular contributions and different compounding frequencies.",
  url: "https://invest.com.au/compound-interest-calculator",
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
      name: "Compound Interest Calculator",
      item: "https://invest.com.au/compound-interest-calculator",
    },
  ],
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is compound interest?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Compound interest is interest calculated on both the initial principal and the accumulated interest from previous periods. Unlike simple interest, compounding causes your money to grow exponentially over time — often called 'the eighth wonder of the world'.",
      },
    },
    {
      "@type": "Question",
      name: "How often should I compound my investments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The more frequently interest compounds, the more you earn. Monthly compounding is common for savings accounts and many investment returns. However, the difference between monthly and daily compounding is relatively small — what matters more is starting early and keeping your money invested.",
      },
    },
    {
      "@type": "Question",
      name: "What is a realistic compound interest rate for Australian investments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The Australian share market (ASX 200) has historically returned around 9-10% per annum including dividends over the long term. Diversified ETFs targeting global equities have returned 7-10% p.a. High-interest savings accounts currently offer 4-5%. Use a conservative 5-7% for long-term planning to account for inflation and fees.",
      },
    },
    {
      "@type": "Question",
      name: "How do regular contributions affect compound growth?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Regular contributions dramatically accelerate compound growth. Even small monthly additions — say $200/month — can add hundreds of thousands of dollars to your final balance over a 30-year period, because each contribution also compounds over time.",
      },
    },
  ],
};

export default function CompoundInterestCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <CompoundInterestClient />
    </>
  );
}
