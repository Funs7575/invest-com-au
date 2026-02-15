import { Suspense } from "react";
import VersusClient from "./VersusClient";

export const metadata = {
  title: "Broker vs Broker — Invest.com.au",
  description:
    "Compare two Australian brokers side by side. See fees, features, CHESS sponsorship, and our honest pick.",
};

export default function VersusPage() {
  return (
    <Suspense fallback={<VersusLoading />}>
      <VersusClient />
    </Suspense>
  );
}

function VersusLoading() {
  return (
    <div className="py-12">
      <div className="container-custom max-w-4xl">
        <div className="h-5 w-48 bg-slate-200 rounded animate-pulse mb-6" />
        <div className="h-10 w-96 bg-slate-200 rounded animate-pulse mb-2" />
        <div className="h-5 w-80 bg-slate-100 rounded animate-pulse mb-8" />
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 h-14 bg-slate-200 rounded-lg animate-pulse" />
          <div className="flex-1 h-14 bg-slate-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
