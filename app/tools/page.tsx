import ToolsClient from "./ToolsClient";
import JsonLd from "@/components/JsonLd";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const metadata = {
  title: "Best Financial Tools & Apps in Australia (2026)",
  description:
    "Discover the best fintech tools and apps for Australian investors and savers. Compare budgeting apps, investing platforms, tax software, super tools, and more.",
  openGraph: {
    title: "Best Financial Tools & Apps in Australia (2026)",
    description:
      "Compare the best fintech tools for budgeting, investing, tax, super, banking, and crypto in Australia.",
    images: [
      {
        url: "/api/og?title=Best+Financial+Tools&subtitle=Apps+%26+Fintech+for+Australians&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/tools" },
};

export const revalidate = 3600;

const toolsFaqLd = faqJsonLd([
  {
    q: "What financial tools are available for Australian investors?",
    a: "Invest.com.au offers free tools for comparing broker fees (trade cost calculator, FX calculator, fee simulator), estimating taxes (CGT calculator, franking credits, withholding tax), analysing property investments (yield calculator, negative gearing, buy-vs-rent), super and retirement (FHSS calculator, salary sacrifice, retirement projector), and SMSF compliance (eligibility checker, setup decision tool). All tools are free and reflect current Australian tax rates.",
  },
  {
    q: "How do I compare Australian broker fees?",
    a: "Use the trade cost calculator or fee simulator. Enter your typical trade size, number of trades per month, and whether you trade US shares. The tools calculate annual brokerage at each platform — Pearler, SelfWealth, Moomoo, CMC Markets, Commsec, Interactive Brokers — and rank them cheapest first for your profile. Remember to factor in FX fees for US trades, which can exceed the stated brokerage.",
  },
  {
    q: "Is a salary sacrifice calculator free?",
    a: "Yes. The salary sacrifice optimiser is free. It shows your before-tax versus after-tax position when you redirect part of your salary into super before income tax is applied. The calculator uses FY2025-26 tax rates and accounts for Division 293 tax (which applies a 30% contributions tax rate for people with income above $250,000 combined). No sign-up required.",
  },
  {
    q: "What is an SMSF eligibility checker?",
    a: "The SMSF eligibility checker is a step-by-step tool that screens whether a given asset class (residential property, commercial property, shares, collectables, crypto) can legally be held in a self-managed super fund. It covers SISA s62 sole purpose test, related-party acquisition rules, collectables storage and insurance requirements, in-house asset limits, and LRBA constraints. It does not provide financial advice — always seek a licensed SMSF specialist.",
  },
]);

export default function ToolsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Financial Tools & Apps" },
  ]);
  return (
    <>
      <JsonLd data={breadcrumb} testId="tools-jsonld" />
      {toolsFaqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolsFaqLd) }} />}
      <ToolsClient />
    </>
  );
}
