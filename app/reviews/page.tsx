import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Broker, Professional } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import ReviewsClient from "./ReviewsClient";

export const metadata = {
  title: "Platform & Advisor Reviews",
  description: "Real reviews of every major Australian investing platform and financial advisor — share brokers, crypto exchanges, super funds, financial planners & more.",
  openGraph: {
    title: "Platform & Advisor Reviews",
    description: "Real reviews of every major Australian investing platform and financial advisor — share brokers, crypto exchanges, super funds, financial planners & more.",
    images: [{ url: "/api/og?title=Platform+%26+Advisor+Reviews&subtitle=Honest+reviews+of+every+Australian+investing+platform+and+advisor&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/reviews" },
};

export const revalidate = 3600;

const REVIEWS_FAQS = [
  {
    q: "How does Invest.com.au collect platform and advisor reviews?",
    a: "Reviews on Invest.com.au come from two sources: (1) Editorial reviews — written by the Invest.com.au editorial team based on hands-on testing of each platform, verified fee schedules, and ASIC register checks. Editorial reviews are not influenced by commercial relationships; (2) User reviews — submitted by registered users who have actively used the platform. User reviews are moderated for authenticity (we require account verification) and cannot be incentivised by platforms — platforms cannot pay to remove negative reviews.",
  },
  {
    q: "Can platforms pay to improve their review scores?",
    a: "No. Editorial star ratings are assigned by the Invest.com.au editorial team using a documented scoring rubric and are not available for purchase. Platforms can pay for sponsored placements (which are clearly labelled 'Sponsored' or 'Featured Partner') but this has no effect on their editorial star rating or review content. Our editorial independence policy is described in detail at /editorial-policy.",
  },
  {
    q: "How are star ratings calculated for platforms?",
    a: "Editorial ratings are composite scores across five dimensions: fees (35%), features and tools (25%), platform usability and reliability (20%), customer support quality (10%), and regulatory/safety standing (10%). Each dimension is scored by our editorial team against a documented rubric. The composite 0–5 score is updated at least annually and immediately when a material change occurs (pricing change, regulatory action, major feature launch). Detailed methodology is at /methodology.",
  },
  {
    q: "Can I leave a review for a platform I've used?",
    a: "Yes. Registered Invest.com.au users can leave reviews for any platform they have actively used. Navigate to the platform's review page and click 'Write a review'. You will need a verified account (email confirmation required). Reviews are moderated before publishing — we remove reviews that are unverifiable, spam, or that violate our community guidelines. Platforms are notified of new reviews and may respond publicly.",
  },
];

const reviewsFaqLd = faqJsonLd(REVIEWS_FAQS);

export default async function ReviewsPage() {
  const supabase = await createClient();

  const [{ data: brokers }, { data: advisors }] = await Promise.all([
    supabase
      .from('brokers')
      .select('id, name, slug, color, icon, logo_url, rating, tagline, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, platform_type, deal, cta_text, affiliate_url, sponsorship_tier, benefit_cta, status')
      .eq('status', 'active')
      .order('rating', { ascending: false }),
    supabase
      .from('professionals')
      .select('id, slug, name, firm_name, type, location_display, rating, review_count, photo_url, verified, specialties, fee_description, offer_text, offer_terms, offer_active')
      .eq('status', 'active')
      .order('rating', { ascending: false })
      .order('review_count', { ascending: false }),
  ]);

  const allBrokers = (brokers as Broker[]) || [];
  const allAdvisors = (advisors || []) as (Professional & { id: number })[];

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Reviews" },
  ]);

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
    {reviewsFaqLd && (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsFaqLd) }}
      />
    )}
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-2 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Reviews</span>
        </nav>

        {/* Header */}
        <h1 className="text-2xl md:text-4xl font-extrabold mb-1 md:mb-2">Platform & Advisor Reviews</h1>
        <p className="text-xs md:text-base text-slate-500 mb-4 md:mb-8">
          Real reviews of every major Australian investing platform and financial advisor — share brokers, crypto exchanges, super funds, financial planners &amp; more.
        </p>

        <ReviewsClient brokers={allBrokers} advisors={allAdvisors} />
      </div>
    </div>

    <div className="border-t border-slate-200 bg-white">
      <div className="container-custom max-w-4xl py-8 md:py-10">
        <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {REVIEWS_FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
