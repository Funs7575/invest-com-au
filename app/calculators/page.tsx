import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import type { Metadata } from "next";
import { Suspense } from "react";
import CalculatorsClient from "./CalculatorsClient";

export const revalidate = 1800;

/* ──────────────────────────────────────────────
   Dynamic metadata based on searchParams
   ────────────────────────────────────────────── */

const CALC_TITLES: Record<string, string> = {
  "trade-cost": "Trade Cost Calculator",
  fx: "FX Cost Calculator",
  switching: "Broker Switching Simulator",
  cgt: "Capital Gains Tax Estimator",
  franking: "Franking Credits Calculator",
  chess: "CHESS Sponsorship Lookup",
  "fee-impact": "Fee Impact Calculator",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const calc = typeof params.calc === "string" ? params.calc : undefined;
  const calcTitle = calc ? CALC_TITLES[calc] : undefined;

  // Build a dynamic subtitle from params
  let subtitle = "";
  if (calc === "trade-cost" && params.tc_amt) {
    subtitle = ` — $${Number(params.tc_amt).toLocaleString("en-AU")} ${params.tc_mkt === "us" ? "US" : "ASX"} Trade`;
  } else if (calc === "fx" && params.fx_amt) {
    subtitle = ` — $${Number(params.fx_amt).toLocaleString("en-AU")} Conversion`;
  } else if (calc === "cgt" && params.cg_amt) {
    subtitle = ` — $${Number(params.cg_amt).toLocaleString("en-AU")} Gain`;
  } else if (calc === "franking" && params.fr_dy) {
    subtitle = ` — ${params.fr_dy}% Yield`;
  }

  const title = calcTitle
    ? `${calcTitle}${subtitle} — Invest.com.au`
    : "Investing Tools & Calculators";

  const description = calcTitle
    ? `Use the free ${calcTitle} to compare broker fees and make smarter investing decisions.`
    : "Free tools for Australian investors: compare broker fees, estimate capital gains tax, calculate FX costs on US shares, and check CHESS sponsorship.";

  return {
    title,
    description,
    openGraph: {
      title: calcTitle ? `${calcTitle}${subtitle} — Invest.com.au` : "Investing Tools & Calculators — Invest.com.au",
      description: calcTitle
        ? `Use the free ${calcTitle} to compare broker fees and make smarter investing decisions.`
        : "Free tools for Australian investors: compare broker fees, estimate tax, calculate FX costs on US shares.",
      images: [{ url: `/api/og?title=${encodeURIComponent(calcTitle || "Investing Tools")}&subtitle=${encodeURIComponent(subtitle ? subtitle.replace(" — ", "") : "Compare fees, estimate tax & more")}&type=default`, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" as const },
    alternates: { canonical: "/calculators" },
  };
}

export default async function CalculatorsPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, name, slug, color, icon, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, cta_text, affiliate_url, sponsorship_tier, benefit_cta, status")
    .eq("status", "active")
    .order("name");

  return (
    <Suspense fallback={<CalculatorsLoading />}>
      <CalculatorsClient brokers={(brokers as Broker[]) || []} />
    </Suspense>
  );
}

function CalculatorsLoading() {
  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom">
        <div className="h-6 md:h-10 w-36 md:w-80 bg-slate-200 rounded animate-pulse mb-1 md:mb-4 md:mx-auto" />
        <div className="h-3.5 md:h-6 w-56 md:w-96 bg-slate-100 rounded animate-pulse mb-2.5 md:mb-10 md:mx-auto" />
        {/* Mobile: horizontal pills skeleton */}
        <div className="md:hidden flex gap-1.5 overflow-hidden mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-20 bg-slate-100 rounded-full animate-pulse shrink-0" />
          ))}
        </div>
        {/* Desktop: grid skeleton */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-7 gap-4 mb-14">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-5 animate-pulse">
              <div className="h-8 w-8 bg-slate-200 rounded mb-2" />
              <div className="h-4 w-20 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
        <div className="h-48 md:h-64 bg-slate-100 rounded-xl md:rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}
