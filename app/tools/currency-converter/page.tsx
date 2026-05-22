import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
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

const CURRENCY_CONVERTER_FAQ_LD = faqJsonLd([
  {
    q: "What exchange rate does this currency converter use?",
    a: "This currency converter uses mid-market exchange rates sourced from a daily feed. Rates are updated once per day and are intended as a reference for financial planning. They do not reflect the buy/sell spread that banks, brokers, or FX providers apply to actual transactions.",
  },
  {
    q: "How do I convert AUD to USD?",
    a: "Enter the amount in Australian dollars (AUD) in the amount field, select AUD as the source currency and USD as the target currency, then press Convert. The tool instantly shows the converted value at the current mid-market rate, plus a reference table of key Australian financial thresholds expressed in USD.",
  },
  {
    q: "What is the current AUD exchange rate?",
    a: "The AUD exchange rate fluctuates daily based on global currency markets. This tool displays the latest mid-market rate updated each day. For the most current live rate before executing a transaction, always check directly with your bank or FX provider, as rates can move significantly intraday.",
  },
  {
    q: "Are there fees on currency conversion for investors?",
    a: "This tool does not charge any fees — it is a free reference calculator. However, when you actually convert currency through a bank, broker, or FX platform, fees typically apply in the form of a spread between the buy and sell rates, plus sometimes a fixed transfer fee. Specialist FX brokers (e.g., Wise, OFX) generally offer tighter spreads than the major Australian banks for large transfers.",
  },
  {
    q: "How do currency fluctuations affect Australian investors holding overseas assets?",
    a: "When the AUD falls against a foreign currency, the Australian-dollar value of overseas assets (shares, property, bonds) rises — delivering a currency gain on top of any asset-level return. Conversely, a rising AUD reduces the local-currency value of those holdings. Australian investors with unhedged international exposure should factor in currency risk when assessing overall portfolio returns and when calculating thresholds such as FIRB approval limits or super contribution caps in a foreign currency context.",
  },
]);

export default function CurrencyConverterPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {CURRENCY_CONVERTER_FAQ_LD && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(CURRENCY_CONVERTER_FAQ_LD) }}
        />
      )}
      <CurrencyConverterClient />
    </>
  );
}
