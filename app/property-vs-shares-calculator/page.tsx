import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import PropertyVsSharesClient from "./PropertyVsSharesClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Property vs Shares Calculator Australia (${CURRENT_YEAR})`,
  description:
    "Compare the long-term returns of leveraged property investment against an equivalent shares portfolio. Model capital growth, rental yield, mortgage costs and dividends side by side.",
  alternates: { canonical: "/property-vs-shares-calculator" },
  openGraph: {
    title: "Property vs Shares Calculator",
    description:
      "Free property vs shares calculator for Australians. Compare leveraged property returns against shares with dividends over your chosen time horizon.",
    images: [
      {
        url: "/api/og?title=Property+vs+Shares+Calculator&subtitle=Compare+Investment+Returns&type=default",
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
  name: `Property vs Shares Calculator — ${SITE_NAME}`,
  description:
    "Compare leveraged property investment returns against a diversified share portfolio for Australian investors.",
  url: "https://invest.com.au/property-vs-shares-calculator",
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
      name: "Property vs Shares Calculator",
      item: "https://invest.com.au/property-vs-shares-calculator",
    },
  ],
};

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is property or shares a better investment in Australia?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Both asset classes have historically delivered strong long-term returns in Australia. Property benefits from leverage (allowing you to control a large asset with a smaller deposit) and Australia's cultural preference for bricks-and-mortar. Shares offer greater liquidity, lower transaction costs, diversification, and no management burden. The 'better' investment depends on your timeline, risk tolerance, tax situation, and access to capital.",
      },
    },
    {
      "@type": "Question",
      name: "What has Australian property returned historically?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Australian residential property has returned approximately 6-8% per annum in capital growth over the long term, with significant variation between cities and periods. Adding gross rental yield of 3-4% brings total gross returns to around 9-12%, though net returns after mortgage interest, maintenance, rates, insurance and management fees are considerably lower.",
      },
    },
    {
      "@type": "Question",
      name: "What have Australian shares returned historically?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The ASX 200 has returned approximately 9-10% per annum including fully franked dividends over the long term. Broad international share market exposure (e.g., via global ETFs) has returned similar figures. Unlike property, shares are not leveraged by default, which means lower risk but also lower amplification of gains.",
      },
    },
    {
      "@type": "Question",
      name: "Does leverage make property a better investment?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Leverage amplifies both gains and losses. If property grows faster than the cost of debt (mortgage interest rate), leverage increases your return on equity. However, leverage also means you carry risk if property values fall or interest rates rise significantly. Shares can also be leveraged via margin loans, though this is less common in Australia than mortgage-backed property investment.",
      },
    },
  ],
};

export default function PropertyVsSharesCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <PropertyVsSharesClient />
    </>
  );
}
