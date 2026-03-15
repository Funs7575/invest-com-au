import type { Metadata } from "next";
import { CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import RetirementCalculatorClient from "./RetirementCalculatorClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Retirement Calculator — How Much Do You Need? (${CURRENT_YEAR})`,
  description: "Project your superannuation balance at retirement, see how long it will last, and find out if you're on track. Free Australian retirement calculator.",
  alternates: { canonical: "/retirement-calculator" },
  openGraph: {
    title: `Retirement Calculator — How Much Do You Need? | ${SITE_NAME}`,
    description: "Project your super balance at retirement, see how long it lasts, and get a personalised gap analysis.",
    images: [{ url: "/api/og?title=Retirement+Calculator&subtitle=How+much+do+you+need%3F&type=default", width: 1200, height: 630 }],
  },
};

export default function RetirementCalculatorPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `Retirement Calculator — ${SITE_NAME}`,
    description: "Project your superannuation at retirement and find out if you're on track for the retirement you want.",
    url: "https://invest.com.au/retirement-calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <RetirementCalculatorClient />
    </>
  );
}
