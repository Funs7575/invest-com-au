import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import CurrencyHedgingCostClient from "./CurrencyHedgingCostClient";

export const revalidate = 3600;

const PATH = "/global-investing/calculators/currency-hedging-cost";

export const metadata: Metadata = {
  title: "Currency Hedging Cost Calculator — AUD-Hedged ETF Drag",
  description:
    "Estimate the annual cost or benefit of hedging a foreign-currency position back to AUD using interest rate parity — the mechanism behind AUD-hedged ETF drag (e.g. IHVV vs IVV).",
  alternates: { canonical: PATH },
  openGraph: {
    title: "Currency Hedging Cost Calculator — Interest Rate Parity",
    description:
      "Free calculator showing the annual carry cost (or benefit) of hedging USD, JPY, EUR or SGD equity positions back to AUD.",
    url: absoluteUrl(PATH),
    images: [
      {
        url: "/api/og?title=Currency+Hedging+Cost+Calculator&subtitle=AUD-Hedged+ETF+Drag&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const softwareLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: `Currency Hedging Cost Calculator — ${SITE_NAME}`,
  description:
    "Free currency-hedging cost calculator for Australian investors. Models the annual carry cost or benefit of hedging foreign-currency equity positions back to AUD using Covered Interest Rate Parity.",
  url: absoluteUrl(PATH),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Global Investing", url: absoluteUrl("/global-investing") },
  { name: "Calculators", url: absoluteUrl("/global-investing/calculators") },
  { name: "Currency Hedging Cost", url: absoluteUrl(PATH) },
]);

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Why does currency hedging cost money?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Under Covered Interest Rate Parity, a currency forward prices in the interest-rate differential between the two currencies. When AUD rates are higher than the foreign currency's rates, you sell the foreign currency forward at a discount to spot — that discount is the hedging drag.",
      },
    },
    {
      "@type": "Question",
      name: "Why has IHVV underperformed IVV?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "IHVV is the AUD-hedged version of the iShares S&P 500 ETF. When AUD interest rates sit above US rates, rolling the FX hedge costs roughly the rate differential per year, so the hedged fund lags the unhedged IVV by approximately that amount, all else equal.",
      },
    },
    {
      "@type": "Question",
      name: "Can currency hedging ever be a benefit?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. When the foreign currency's interest rate is higher than AUD's — for example hedging a JPY position while Japanese rates are near zero relative to AUD — you sell the foreign currency forward at a premium, creating positive carry (a hedging benefit) rather than a cost.",
      },
    },
  ],
};

export default function CurrencyHedgingCostPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <CurrencyHedgingCostClient />
    </>
  );
}
