import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import CurrencyConverterClient from "./CurrencyConverterClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "AUD Currency Converter — Australian Dollar to USD, GBP, EUR + 12 more",
  description:
    "Convert Australian dollars to and from 15 currencies. Includes a reference table of key Australian thresholds (FIRB, visa minimums, super caps) in the target currency.",
  alternates: { canonical: absoluteUrl("/tools/currency-converter") },
  openGraph: {
    title: "AUD Currency Converter",
    description:
      "Convert AUD to USD, GBP, EUR, JPY, SGD, NZD and more. Plus Australian FIRB threshold and super cap reference table.",
    url: absoluteUrl("/tools/currency-converter"),
  },
};

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Tools", url: absoluteUrl("/tools") },
  { name: "AUD Currency Converter" },
]);

export default function CurrencyConverterPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <CurrencyConverterClient />
    </>
  );
}
