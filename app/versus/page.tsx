import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import VersusClient from "./VersusClient";

export const revalidate = 1800;

export const metadata = {
  title: "Broker vs Broker",
  description:
    "Compare two Australian brokers side by side. See fees, features, CHESS sponsorship, and our honest pick.",
  openGraph: {
    title: "Broker vs Broker — Invest.com.au",
    description: "Compare two Australian brokers side by side. See fees, features, CHESS sponsorship, and our honest pick.",
    images: [{ url: "/api/og?title=Broker+vs+Broker&subtitle=Compare+any+two+brokers+side-by-side&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/versus" },
};

export default async function VersusPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("id, name, slug, color, icon, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, inactivity_fee, pros, cons, cta_text, affiliate_url, sponsorship_tier, benefit_cta, status")
    .eq("status", "active")
    .order("name");

  return (
    <Suspense fallback={<VersusLoading />}>
      <VersusClient brokers={(brokers as Broker[]) || []} />
    </Suspense>
  );
}

function VersusLoading() {
  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom max-w-5xl">
        <div className="h-3 md:h-5 w-32 md:w-48 bg-slate-200 rounded animate-pulse mb-2 md:mb-6" />
        <div className="h-6 md:h-10 w-52 md:w-96 bg-slate-200 rounded animate-pulse mb-1 md:mb-2" />
        <div className="h-3 md:h-5 w-44 md:w-80 bg-slate-100 rounded animate-pulse mb-3 md:mb-8" />
        <div className="bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl p-3.5 md:p-8 animate-pulse">
          <div className="h-3 w-36 bg-slate-200 rounded mb-3" />
          <div className="flex flex-col md:flex-row gap-2 md:gap-4">
            <div className="flex-1 h-12 md:h-14 bg-slate-200 rounded-lg" />
            <div className="flex-1 h-12 md:h-14 bg-slate-200 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
