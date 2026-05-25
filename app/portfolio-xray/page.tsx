import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";
import XRayClient from "./XRayClient";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

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
      <Suspense fallback={<LoadingFallback />}>
        <XRayClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
    </>
  );
}
