import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";
import XRayClient from "./XRayClient";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600;

export const metadata = {
  title: "Portfolio X-Ray — Analyse Your Investment Holdings",
  description:
    "Free portfolio analysis tool for Australian investors. Get diversification scores, sector breakdowns, concentration risk alerts, fee drag analysis, and personalised recommendations.",
  openGraph: {
    title: "Portfolio X-Ray — Analyse Your Investment Holdings",
    description:
      "Upload your holdings and get instant analysis: diversification score, sector & geographic breakdown, concentration risk, fee drag, and dividend yield estimates.",
    images: [
      {
        url: "/api/og?title=Portfolio+X-Ray&subtitle=Analyse+Your+Investment+Holdings&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/portfolio-xray" },
};

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Portfolio X-Ray Tool",
    description:
      "Analyse your investment portfolio for diversification, sector breakdown, concentration risk, and fee optimisation. Free tool for Australian investors.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/portfolio-xray"),
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
  };
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-4xl px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="h-4 w-96 rounded bg-slate-200" />
          <div className="h-64 rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default async function PortfolioXRayPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, name, slug, color, logo_url, icon, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, affiliate_url, rating, platform_type, status")
    .eq("status", "active")
    .eq("platform_type", "share_broker")
    .order("rating", { ascending: false });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Portfolio X-Ray" },
  ]);

  const portfolioXRayFaq = faqJsonLd([
    {
      q: "What is portfolio X-Ray and what does it analyse?",
      a: "Portfolio X-Ray is a free investment analysis tool for Australian investors. It analyses your holdings to generate a diversification score, sector and geographic breakdown, concentration risk alerts, estimated fee drag, and dividend yield estimates. Simply enter your stock and ETF holdings to get an instant snapshot of your portfolio's strengths and weaknesses.",
    },
    {
      q: "How do I use the portfolio X-Ray tool?",
      a: "Enter each of your investment holdings — including ASX stocks, ETFs, and US-listed securities — along with the quantity or value held. The tool will automatically calculate your portfolio's allocation across sectors and geographies, flag any concentration risks, and provide a diversification score. No account creation is required.",
    },
    {
      q: "What is a good diversification score for an Australian portfolio?",
      a: "A diversification score above 70 is generally considered well-diversified for an Australian investor. This typically means your portfolio spans multiple sectors (e.g. financials, resources, technology, healthcare), has some international exposure beyond the ASX, and avoids heavy concentration in any single stock or sector. Scores below 50 often indicate over-exposure to one or two holdings or sectors.",
    },
    {
      q: "What is concentration risk in an investment portfolio?",
      a: "Concentration risk occurs when a large portion of your portfolio is held in a single stock, sector, or geographic region. For example, if 40% of your portfolio is in one company, a sharp fall in that stock could significantly harm your overall returns. Portfolio X-Ray flags positions where any single holding exceeds recommended thresholds, helping you identify where rebalancing may reduce risk.",
    },
    {
      q: "Is the portfolio X-Ray tool free to use?",
      a: "Yes, the portfolio X-Ray tool on invest.com.au is completely free to use. There is no account required and no subscription fee. The tool is designed to help Australian investors quickly understand their portfolio's diversification and risk profile without needing expensive financial planning software.",
    },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {portfolioXRayFaq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(portfolioXRayFaq) }} />}
      <Suspense fallback={<LoadingFallback />}>
        <XRayClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
    </>
  );
}
