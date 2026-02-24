import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Metadata } from "next";
import { Suspense } from "react";
import FeeImpactClient from "./FeeImpactClient";
import { absoluteUrl } from "@/lib/seo";

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
    ? `Fee Impact Calculator${subtitle} — Invest.com.au`
    : "Personal Fee Impact Calculator — See Your Annual Broker Costs";

  const description = hasParams
    ? `See your total annual broker fees for${subtitle.replace(" — ", " ")} across every Australian broker.`
    : "Enter your trading habits to see exactly what you pay in broker fees each year — brokerage, FX fees, and inactivity charges across every Australian broker.";

  return {
    title,
    description,
    openGraph: {
      title: hasParams
        ? `Fee Impact Calculator${subtitle} — Invest.com.au`
        : "Personal Fee Impact Calculator — Invest.com.au",
      description: hasParams
        ? `See your total annual broker fees for${subtitle.replace(" — ", " ")} across every Australian broker.`
        : "Calculate your total annual broker fees and see how much you could save by switching.",
      images: [
        {
          url: `/api/og?title=${encodeURIComponent("Fee Impact Calculator")}&subtitle=${encodeURIComponent(subtitle ? subtitle.replace(" — ", "") : "See your annual broker costs")}&type=default`,
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
      "Calculate your total annual broker fees across every Australian broker based on your real trading habits.",
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
    .select("*")
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
    </>
  );
}

function FeeImpactLoading() {
  return (
    <div className="py-12">
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
