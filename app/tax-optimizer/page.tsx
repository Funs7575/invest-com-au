import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";
import TaxOptimizerClient from "./TaxOptimizerClient";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = {
  title: "Tax Optimization Engine — Minimise Your Investment Tax",
  description:
    "Free CGT calculator and tax optimisation tool for Australian investors. Find tax-loss harvesting opportunities, check CGT discount eligibility, estimate franking credits, and identify your top tax-saving moves.",
  openGraph: {
    title: "Tax Optimization Engine — Minimise Your Investment Tax",
    description:
      "Calculate capital gains tax, find tax-loss harvesting opportunities, check CGT discount eligibility, and estimate franking credit offsets.",
    images: [
      {
        url: "/api/og?title=Tax+Optimization+Engine&subtitle=Minimise+Your+Investment+Tax&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/tax-optimizer" },
};

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Tax Optimization Engine",
    description:
      "Calculate CGT, find tax-loss harvesting opportunities, check CGT discount eligibility, and estimate franking credits for Australian investors.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/tax-optimizer"),
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

export default async function TaxOptimizerPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, name, slug, color, logo_url, icon, affiliate_url, rating, platform_type, status")
    .eq("status", "active")
    .eq("platform_type", "share_broker")
    .order("rating", { ascending: false });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Tax Optimization Engine" },
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
        <TaxOptimizerClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
    </>
  );
}
