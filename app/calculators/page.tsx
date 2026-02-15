import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { Suspense } from "react";
import CalculatorsClient from "./CalculatorsClient";

export const metadata = {
  title: "Investment Calculators — Invest.com.au",
  description:
    "Free Australian investment calculators: franking credits, broker switching costs, FX fees, capital gains tax, and CHESS sponsorship lookup.",
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
