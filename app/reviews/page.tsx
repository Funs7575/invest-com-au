import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { absoluteUrl } from "@/lib/seo";
import ReviewsClient from "./ReviewsClient";

export const metadata = {
  title: "Platform Reviews",
  description: "In-depth, honest reviews of every major Australian investing platform — share brokers, crypto exchanges, robo-advisors, super funds, property platforms & more.",
  openGraph: {
    title: "Platform Reviews — Invest.com.au",
    description: "In-depth, honest reviews of every major Australian investing platform — share brokers, crypto exchanges, robo-advisors, super funds & more.",
    images: [{ url: "/api/og?title=Platform+Reviews&subtitle=Honest+reviews+of+every+Australian+investing+platform&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/reviews" },
};

export const revalidate = 3600; // ISR: revalidate every hour

export default async function ReviewsPage() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from('brokers')
    .select('id, name, slug, color, icon, logo_url, rating, tagline, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, platform_type, deal, cta_text, affiliate_url, sponsorship_tier, benefit_cta, status')
    .eq('status', 'active')
    .order('rating', { ascending: false });

  const allBrokers = (brokers as Broker[]) || [];

  // JSON-LD structured data for search results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Australian Investing Platform Reviews",
    description: "In-depth, honest reviews of every major Australian investing platform.",
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
        <h1 className="text-2xl md:text-4xl font-extrabold mb-1 md:mb-2">Platform Reviews</h1>
        <p className="text-xs md:text-base text-slate-500 mb-4 md:mb-8">
          Real fees, real analysis, no fluff. Covering share brokers, crypto exchanges, robo-advisors, super funds &amp; more.
        </p>

        <ReviewsClient brokers={allBrokers} />
      </div>
    </div>
    </>
  );
}
