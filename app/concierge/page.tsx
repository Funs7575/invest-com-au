import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, SITE_NAME } from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";
import ConciergeClient from "./ConciergeClient";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Investment Concierge — Ask Invest.com.au (${CURRENT_YEAR})`,
  description:
    "Ask anything about Australian investing platforms, SMSF structures, foreign investor rules, funds, advisors or ETFs. Free AI concierge — no personal financial advice, always points to a licensed adviser for personal questions.",
  alternates: { canonical: "/concierge" },
  robots: {
    index: true,
    follow: true,
  },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Concierge", url: absoluteUrl("/concierge") },
]);

const applicationLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `Invest.com.au Concierge — ${SITE_NAME}`,
  description:
    "AI-powered concierge for Australian investment platforms, advisors, and opportunities.",
  url: absoluteUrl("/concierge"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

export default function ConciergePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(applicationLd) }}
      />
      <ConciergeClient />
      <div className="container-custom pb-8 pt-2">
        <ComplianceFooter variant="default" />
      </div>
    </>
  );
}
