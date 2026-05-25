import type { Metadata } from "next";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  SITE_NAME,
} from "@/lib/seo";
import ComplianceFooter from "@/components/ComplianceFooter";
import ShouldISwitchClient from "./ShouldISwitchClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Should I Switch Broker? Savings Calculator (${CURRENT_YEAR}) — ${SITE_NAME}`,
  description:
    "See how much you'd save per year by switching Australian broker. Enter your current platform, trade size, and frequency — we compute the annual cost across every major broker and rank the top three cheapest alternatives.",
  alternates: { canonical: "/tools/should-i-switch" },
  openGraph: {
    title: "Should I Switch Broker? — Annual Savings Calculator",
    description:
      "Compare your current broker against every Australian platform. Live brokerage + FX math shows exactly how much you'd save by switching.",
    url: absoluteUrl("/tools/should-i-switch"),
    images: [
      {
        url: "/api/og?title=Should+I+Switch+Broker%3F&subtitle=Annual+Savings+Calculator&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const appLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: `Should I Switch Broker? — ${SITE_NAME}`,
  description:
    "Free interactive tool that calculates your annual broker cost and ranks the cheapest alternatives for your trading profile.",
  url: absoluteUrl("/tools/should-i-switch"),
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Tools", url: absoluteUrl("/tools") },
  {
    name: "Should I Switch Broker?",
    url: absoluteUrl("/tools/should-i-switch"),
  },
]);

function Loading() {
  return (
    <div className="py-5 md:py-12 animate-pulse">
      <div className="container-custom max-w-3xl">
        <div className="h-6 w-64 bg-slate-100 rounded mb-4" />
        <div className="h-48 bg-slate-100 rounded-2xl mb-6" />
        <div className="h-96 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

export default async function ShouldISwitchPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, inactivity_fee, cta_text, benefit_cta, affiliate_url, sponsorship_tier, status, platform_type",
    )
    .eq("status", "active")
    .eq("is_crypto", false)
    .order("name");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <Suspense fallback={<Loading />}>
        <ShouldISwitchClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
      <div className="container-custom pb-8">
        <ComplianceFooter variant="calculator" />
      </div>
    </>
  );
}
