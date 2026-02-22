import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import CompareClient from "./CompareClient";
import { absoluteUrl } from "@/lib/seo";

export const metadata = {
  title: "Compare Australian Brokers",
  description: "Side-by-side comparison of fees, features, and safety for Australian share trading platforms. Updated February 2026.",
  openGraph: {
    title: "Compare Australian Brokers — Invest.com.au",
    description: "Side-by-side comparison of fees, features, and safety for Australian share trading platforms.",
    images: [{ url: "/api/og?title=Compare+Australian+Brokers&subtitle=Fees,+features+%26+safety+side-by-side&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/compare" },
};

export const revalidate = 3600; // ISR: revalidate every hour

function ComparePageSkeleton() {
  return (
    <div className="py-12">
      <div className="container-custom">
        <div className="h-10 w-80 bg-slate-200 rounded mb-3 animate-pulse" />
        <div className="h-5 w-64 bg-slate-100 rounded mb-6 animate-pulse" />
        <div className="h-14 w-full bg-slate-100 rounded-lg mb-4 animate-pulse" />
        <div className="flex gap-2 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 w-20 bg-slate-100 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="h-12 bg-slate-50 border-b border-slate-200" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center h-16 border-b border-slate-100 px-4 gap-4">
              <div className="w-5 h-5 bg-slate-100 rounded animate-pulse" />
              <div className="w-10 h-10 bg-slate-100 rounded-lg animate-pulse" />
              <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-20 bg-slate-100 rounded animate-pulse ml-auto" />
              <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-12 bg-slate-100 rounded animate-pulse" />
              <div className="h-9 w-32 bg-green-100 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function ComparePage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .order('rating', { ascending: false });

  const activeBrokers = (brokers as Broker[]) || [];

  // JSON-LD structured data for search results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Compare Australian Brokers",
    description: "Side-by-side comparison of fees, features, and safety for Australian share trading platforms.",
    numberOfItems: activeBrokers.length,
    itemListElement: activeBrokers.slice(0, 10).map((b: Broker, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      url: absoluteUrl(`/broker/${b.slug}`),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={<ComparePageSkeleton />}>
        <CompareClient brokers={activeBrokers} />
      </Suspense>
    </>
  );
}
