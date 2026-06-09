import type { Metadata } from "next";
import { Suspense } from "react";
import { CURRENT_YEAR, breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import ETPCalculatorClient from "./ETPCalculatorClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `ETP Calculator (${CURRENT_YEAR}) — Employment Termination Payment Tax Estimator`,
  description:
    "Calculate tax on your Employment Termination Payment (ETP) — tax-free threshold, concessional ETP rate (17% or 32%), and net payout vs marginal rate.",
  alternates: { canonical: `${SITE_URL}/tools/etp-calculator` },
  openGraph: {
    title: `ETP Tax Calculator (${CURRENT_YEAR})`,
    description:
      "Estimate tax on your redundancy ETP — tax-free threshold, 17%/32% concessional rate, and net payout.",
    url: `${SITE_URL}/tools/etp-calculator`,
    images: [{ url: `/api/og?title=${encodeURIComponent("ETP Tax Calculator")}&sub=${encodeURIComponent("Employment Termination Payment · Tax Treatment · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Tools", url: "/tools" },
  { name: "ETP Calculator", url: "/tools/etp-calculator" },
]);

const calcLd = calculatorJsonLd({
  name: "Employment Termination Payment (ETP) Tax Calculator",
  description:
    "Calculate the tax on your genuine redundancy ETP — including the tax-free threshold, concessional ETP tax rate, and net payout after tax.",
  path: "/tools/etp-calculator",
});

const faqLd = faqJsonLd([
  {
    q: "What is the ETP tax-free threshold for genuine redundancy?",
    a: "For FY2025-26 the tax-free threshold is $12,524 base plus $6,264 for each completed year of service. Only whole years count — partial years do not increase the threshold.",
  },
  {
    q: "What tax rate applies to the taxable ETP component?",
    a: "For a Life Benefit ETP (genuine redundancy): 32% if you are under age 60, or 17% if you are 60 or over. These concessional rates apply up to the ETP cap ($245,000 for FY2025-26). Any amount above the cap is taxed at 47%.",
  },
  {
    q: "Is unused annual leave included in the ETP?",
    a: "No. Unused annual leave and long service leave payouts are separate from the ETP and are taxed as ordinary income at your marginal rate, not the concessional ETP rates.",
  },
]);

export default function ETPCalculatorPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calcLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Suspense>
        <ETPCalculatorClient />
      </Suspense>
    </>
  );
}
