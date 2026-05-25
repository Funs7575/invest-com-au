import { Suspense } from "react";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import CgtClient from "./CgtClient";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Capital Gains Tax (CGT) Calculator — Australian Investors ${CURRENT_YEAR}`,
  description:
    "Estimate capital gains tax on Australian share sales. Includes the 50% CGT discount for assets held over 12 months and applies your marginal tax rate.",
  alternates: { canonical: "/cgt-calculator" },
  openGraph: {
    title: `CGT Calculator ${CURRENT_YEAR} — Australian Investors`,
    description:
      "Free CGT calculator with the 50% discount rule built in. See how much capital gains tax you'll pay on your share sales at your marginal rate.",
    url: absoluteUrl("/cgt-calculator"),
    images: [
      {
        url: "/api/og?title=CGT+Calculator&subtitle=Australian+Investors&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const softwareLd = calculatorJsonLd({
  name: "CGT Calculator",
  description:
    "Free capital gains tax calculator for Australian investors. Includes 50% CGT discount for long-term holdings and calculates tax at marginal rate.",
  path: "/cgt-calculator",
});

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Calculators", url: absoluteUrl("/calculators") },
  { name: "CGT Calculator", url: absoluteUrl("/cgt-calculator") },
]);

const faqLd = faqJsonLd([
  {
    q: "What is capital gains tax in Australia?",
    a: "CGT is the tax you pay on profits from selling investment assets like shares, ETFs, property or crypto. It's not a separate tax — your net capital gain is added to your assessable income and taxed at your marginal rate.",
  },
  {
    q: "When do I pay CGT?",
    a: "CGT is triggered by a CGT event, usually when you sell, gift or transfer an asset. You report the gain in your tax return for the financial year of the sale and pay it as part of your normal annual tax assessment.",
  },
  {
    q: "How is the 50% CGT discount calculated?",
    a: "If you hold an asset for more than 12 months as an individual or trust, you discount the gross capital gain by 50% before adding it to taxable income. SMSFs get 33.3%, and companies receive no CGT discount.",
  },
  {
    q: "Can I offset losses against capital gains?",
    a: "Yes. Capital losses offset capital gains in the same financial year. Unused losses carry forward indefinitely against future gains, but not against regular income. Losses apply before the 50% discount.",
  },
  {
    q: "Is my main residence CGT-exempt?",
    a: "Yes, generally. Your main residence is exempt provided it has been your principal place of residence, sits on land under 2 hectares, and hasn't been used to produce income. Partial exemptions apply in mixed-use cases.",
  },
]);

function Loading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-4 w-48 bg-slate-100 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default function CgtCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Suspense fallback={<Loading />}>
        <CgtClient />
      </Suspense>
      <div className="container-custom pb-8"><ComplianceFooter variant="calculator" /></div>

    </>
  );
}
