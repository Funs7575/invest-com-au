import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { absoluteUrl } from "@/lib/seo";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata = {
  title: "Broker Reviews",
  description: "In-depth, honest reviews of every major Australian share trading platform. Fees, pros, cons, and our verdict.",
  openGraph: {
    title: "Broker Reviews — Invest.com.au",
    description: "In-depth, honest reviews of every major Australian share trading platform. Fees, pros, cons, and our verdict.",
    images: [{ url: "/api/og?title=Broker+Reviews&subtitle=Honest+reviews+of+every+Australian+broker&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/reviews" },
};

export const revalidate = 3600; // ISR: revalidate every hour

export default async function ReviewsPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'active')
    .order('rating', { ascending: false });

  const allBrokers = (brokers as Broker[]) || [];
  const shareBrokers = allBrokers.filter((b: Broker) => !b.is_crypto);
  const cryptoBrokers = allBrokers.filter((b: Broker) => b.is_crypto);

  // JSON-LD structured data for search results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Australian Broker Reviews",
    description: "In-depth, honest reviews of every major Australian share trading platform.",
    numberOfItems: allBrokers.length,
    itemListElement: allBrokers.slice(0, 10).map((b: Broker, i: number) => ({
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
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom">
        {/* Breadcrumb */}
        <nav className="text-xs md:text-sm text-slate-500 mb-2 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Reviews</span>
        </nav>

        {/* Header */}
        <h1 className="text-2xl md:text-4xl font-extrabold mb-1 md:mb-2">Broker Reviews</h1>
        <p className="text-xs md:text-base text-slate-500 mb-4 md:mb-8">
          Real fees, real analysis, no fluff.
        </p>

        {/* Share Trading Brokers */}
        <h2 className="text-base md:text-xl font-extrabold mb-2.5 md:mb-4">Share Trading Brokers</h2>
        <ScrollReveal animation="scroll-stagger-children" className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6 mb-8 md:mb-12">
          {shareBrokers.map((broker: Broker) => (
            <BrokerReviewCard key={broker.id} broker={broker} />
          ))}
        </ScrollReveal>

        {/* Crypto Exchanges */}
        {cryptoBrokers.length > 0 && (
          <>
            <h2 className="text-base md:text-xl font-extrabold mb-2.5 md:mb-4">Crypto Exchanges</h2>
            <ScrollReveal animation="scroll-stagger-children" className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6">
              {cryptoBrokers.map((broker: Broker) => (
                <BrokerReviewCard key={broker.id} broker={broker} />
              ))}
            </ScrollReveal>
          </>
        )}
      </div>
    </div>
    </>
  );
}

function BrokerReviewCard({ broker }: { broker: Broker }) {
  return (
    <Link
      href={`/broker/${broker.slug}`}
      className="border border-slate-200 rounded-xl overflow-hidden hover-lift hover:scale-[1.02] transition-all flex flex-col"
    >
      <div className="p-3 md:p-5 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
          <div
            className="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold shrink-0"
            style={{ background: `${broker.color}20`, color: broker.color }}
          >
            {broker.icon || broker.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm md:text-lg font-bold leading-tight truncate">{broker.name}</h2>
            <div className="text-xs text-amber">
              {'★'.repeat(Math.floor(broker.rating || 0))}
              <span className="text-slate-400 ml-1 text-[0.69rem]">{broker.rating}/5</span>
            </div>
          </div>
        </div>

        {/* Tagline — hidden on mobile to save space */}
        {broker.tagline && (
          <p className="hidden md:block text-sm text-slate-600 mb-3 line-clamp-2">{broker.tagline}</p>
        )}

        {/* Fees — compact inline on mobile */}
        <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400 md:text-slate-500">ASX Fee</span>
            <span className="font-semibold">{broker.asx_fee || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400 md:text-slate-500">FX Rate</span>
            <span className="font-semibold">{broker.fx_rate != null ? `${broker.fx_rate}%` : 'N/A'}</span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1 md:gap-2 mt-2 md:mt-3">
          {broker.chess_sponsored && (
            <span className="px-1.5 md:px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[0.62rem] md:text-[0.69rem] rounded border border-emerald-200 font-semibold">CHESS</span>
          )}
          {broker.smsf_support && (
            <span className="px-1.5 md:px-2 py-0.5 bg-blue-50 text-blue-700 text-[0.62rem] md:text-[0.69rem] rounded border border-blue-200 font-semibold">SMSF</span>
          )}
          {broker.deal && (
            <span className="px-1.5 md:px-2 py-0.5 bg-amber-50 text-amber-700 text-[0.62rem] md:text-[0.69rem] rounded border border-amber-200 font-semibold">Deal</span>
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="px-3 md:px-5 py-2 md:py-3 bg-slate-50 border-t border-slate-200 text-center mt-auto">
        <span className="text-xs md:text-sm font-semibold text-slate-700">Read Review →</span>
      </div>
    </Link>
  );
}
