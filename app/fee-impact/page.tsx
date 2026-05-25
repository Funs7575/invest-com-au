import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Metadata } from "next";
import { Suspense } from "react";
import FeeImpactClient from "./FeeImpactClient";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import LeadMagnet from "@/components/LeadMagnet";
import { absoluteUrl } from "@/lib/seo";

export const revalidate = 1800;

/* ──────────────────────────────────────────────
   Dynamic metadata based on searchParams
   ────────────────────────────────────────────── */

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const hasParams = params.asx || params.us || params.size;

  let subtitle = "";
  if (params.asx && Number(params.asx) > 0) {
    subtitle += `${params.asx} ASX`;
  }
  if (params.us && Number(params.us) > 0) {
    subtitle += `${subtitle ? " + " : ""}${params.us} US`;
  }
  if (subtitle) {
    subtitle = ` — ${subtitle} trades/mo`;
  }
  if (params.size && Number(params.size) > 0) {
    subtitle += ` @ $${Number(params.size).toLocaleString("en-AU")}`;
  }

  const title = hasParams
    ? `Fee Impact Calculator${subtitle}`
    : "Personal Fee Impact Calculator — See Your Annual Broker Costs";

  const description = hasParams
    ? `See your total annual platform fees for${subtitle.replace(" — ", " ")} across every Australian platform.`
    : "Enter your trading habits to see exactly what you pay in broker fees each year — brokerage, FX fees, and inactivity charges across every Australian platform.";

  return {
    title,
    description,
    openGraph: {
      title: hasParams
        ? `Fee Impact Calculator${subtitle}`
        : "Personal Fee Impact Calculator",
      description: hasParams
        ? `See your total annual platform fees for${subtitle.replace(" — ", " ")} across every Australian platform.`
        : "Calculate your total annual platform fees and see how much you could save by switching.",
      images: [
        {
          url: `/api/og?title=${encodeURIComponent("Fee Impact Calculator")}&subtitle=${encodeURIComponent(subtitle ? subtitle.replace(" — ", "") : "See your annual platform costs")}&type=default`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image" as const },
    alternates: { canonical: "/fee-impact" },
  };
}

function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Personal Fee Impact Calculator",
    description:
      "Calculate your total annual platform fees across every Australian platform based on your real trading habits.",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/fee-impact"),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "AUD",
    },
    provider: {
      "@type": "Organization",
      name: "Invest.com.au",
      url: absoluteUrl("/"),
    },
  };
}

export default async function FeeImpactPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, inactivity_fee, chess_sponsored, smsf_support, is_crypto, cta_text, affiliate_url, sponsorship_tier, benefit_cta, status")
    .eq("status", "active")
    .eq("is_crypto", false)
    .order("name");

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
      />
      <Suspense fallback={<FeeImpactLoading />}>
        <FeeImpactClient brokers={(brokers as Broker[]) || []} />
      </Suspense>
      <div className="container-custom max-w-4xl pb-6 md:pb-12">
        <AdvisorPrompt context="tax" heading="Fees eating into your returns?" description="A tax agent can help you deduct investment-related expenses and minimise your capital gains tax." />
        <div className="mt-6">
          <LeadMagnet />
        </div>
      </div>
    </>
  );
}

function FeeImpactLoading() {
  return (
    <div className="py-5 md:py-12">
      <div className="container-custom">
        <div className="h-10 w-80 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-6 w-96 bg-slate-100 rounded animate-pulse mb-10" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-8">
            <div className="h-96 bg-slate-100 rounded-xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
