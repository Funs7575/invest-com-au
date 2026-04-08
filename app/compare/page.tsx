import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import CompareClient from "./CompareClient";
import CompareNav from "./CompareNav";
import { absoluteUrl, UPDATED_LABEL } from "@/lib/seo";

export const metadata = {
  title: "Compare Investing Platforms — Fees & Features",
  description: `Compare fees, features & safety across Australian investing platforms — shares, crypto, super & more. ${UPDATED_LABEL}.`,
  openGraph: {
    title: "Compare Platforms Side-by-Side",
    description: "Side-by-side comparison of fees, features, and safety for Australian platforms — shares, robo-advisors, crypto exchanges & more.",
    images: [{ url: "/api/og?title=Compare+Investing+Platforms&subtitle=Fees,+features+%26+safety+side-by-side&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/compare" },
};

export const revalidate = 3600; // ISR: revalidate every hour

function ComparePageSkeleton() {
  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom animate-pulse">
        <div className="h-7 w-48 md:h-10 md:w-80 bg-slate-200 rounded mb-1.5 md:mb-3" />
        <div className="h-3.5 w-56 md:h-5 md:w-64 bg-slate-100 rounded mb-3 md:mb-6" />
        {/* Mobile: filter + search row */}
        <div className="md:hidden flex gap-2 mb-3">
          <div className="h-8 w-16 bg-slate-100 rounded-full" />
          <div className="h-8 flex-1 bg-slate-100 rounded-full" />
        </div>
        {/* Desktop: filter pills */}
        <div className="hidden md:flex gap-2 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 w-20 bg-slate-100 rounded-full" />
          ))}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden">
          <div className="h-12 bg-slate-50 border-b border-slate-200" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center h-16 border-b border-slate-100 px-4 gap-4">
              <div className="w-5 h-5 bg-slate-100 rounded" />
              <div className="w-10 h-10 bg-slate-100 rounded-lg" />
              <div className="h-4 w-32 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded ml-auto" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-9 w-28 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 bg-slate-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-10 bg-slate-50 rounded-md" />
                ))}
              </div>
              <div className="h-9 bg-slate-200 rounded-lg" />
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
    .select("id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, platform_type, deal, deal_text, deal_expiry, editors_pick, tagline, cta_text, affiliate_url, sponsorship_tier, benefit_cta, updated_at, fee_last_checked, status, promoted_placement, cpa_value, affiliate_priority")
    .eq('status', 'active')
    // Revenue-weighted: promoted first, then by rating
    .order('promoted_placement', { ascending: false })
    .order('rating', { ascending: false });

  const activeBrokers = (brokers as Broker[]) || [];

  // JSON-LD structured data for search results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Compare Australian Investing Platforms",
    description: "Side-by-side comparison of fees, features, and safety for Australian share trading platforms.",
    numberOfItems: activeBrokers.length,
    itemListElement: activeBrokers.slice(0, 10).map((b: Broker, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      url: absoluteUrl(`/broker/${b.slug}`),
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://invest.com.au" },
      { "@type": "ListItem", position: 2, name: "Compare Platforms", item: "https://invest.com.au/compare" },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "What is the cheapest share trading platform in Australia?", acceptedAnswer: { "@type": "Answer", text: "Several platforms offer $0 ASX brokerage including CMC Markets (first trade per day) and Moomoo. Use our comparison table above to filter by lowest fees for your trading frequency." } },
      { "@type": "Question", name: "What does CHESS sponsored mean?", acceptedAnswer: { "@type": "Answer", text: "CHESS sponsorship means your shares are held directly in your name on the ASX sub-register via a HIN (Holder Identification Number). If your broker fails, your shares are protected. Not all brokers offer CHESS sponsorship." } },
      { "@type": "Question", name: "How do I choose the best investing platform?", acceptedAnswer: { "@type": "Answer", text: "Consider your trading frequency, preferred markets (ASX, US, crypto), fee sensitivity, and whether you need CHESS sponsorship. Our 60-second quiz can help you narrow down the best match for your situation." } },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Suspense><CompareNav /></Suspense>
      <Suspense fallback={<ComparePageSkeleton />}>
        <CompareClient brokers={activeBrokers} />
      </Suspense>
    </>
  );
}
