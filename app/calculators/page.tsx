import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";
import CalculatorsClient from "./CalculatorsClient";

export const metadata = {
  title: "Investing Tools & Calculators",
  description:
    "Free tools for Australian investors: compare broker fees, estimate capital gains tax, calculate FX costs on US shares, and check CHESS sponsorship.",
  openGraph: {
    title: "Investing Tools & Calculators — Invest.com.au",
    description: "Free tools for Australian investors: compare broker fees, estimate tax, calculate FX costs on US shares.",
    images: [{ url: "/api/og?title=Investing+Tools&subtitle=Compare+fees,+estimate+tax+%26+more&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/calculators" },
};

export default async function CalculatorsPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("*")
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
    <div className="py-12">
      <div className="container-custom">
        <div className="h-10 w-80 bg-slate-200 rounded animate-pulse mb-4" />
        <div className="h-6 w-96 bg-slate-100 rounded animate-pulse mb-10" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-14">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-5 animate-pulse">
              <div className="h-8 w-8 bg-slate-200 rounded mb-2" />
              <div className="h-4 w-20 bg-slate-200 rounded mb-1" />
              <div className="h-3 w-28 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
