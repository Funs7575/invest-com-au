import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, dealsHubJsonLd, REVIEW_AUTHOR } from "@/lib/seo";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import { sortWithSponsorship } from "@/lib/sponsorship";
import DealsClient from "./DealsClient";

export const metadata: Metadata = {
  title: "Broker Deals & Promotions (2026) — Verified Offers",
  description:
    "Current verified deals and promotions from Australian share trading platforms and crypto exchanges. Updated regularly with expiry dates and terms.",
  alternates: { canonical: "/deals" },
  openGraph: {
    title: "Broker Deals & Promotions (2026) — Verified Offers",
    description:
      "Current verified deals and promotions from Australian share trading platforms and crypto exchanges. Updated regularly.",
    url: "/deals",
    images: [
      {
        url: "/api/og?title=Broker+Deals+%26+Promotions&subtitle=Verified+Offers+from+Australian+Platforms&type=default",
        width: 1200,
        height: 630,
        alt: "Broker Deals & Promotions",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export const revalidate = 1800; // ISR: revalidate every 30 minutes (deals change frequently)

export default async function DealsPage() {
  const supabase = await createClient();
  const { data: allBrokers } = await supabase
    .from("brokers")
    .select("id, name, slug, color, icon, rating, deal, deal_text, deal_expiry, deal_terms, deal_verified_date, deal_category, cta_text, affiliate_url, sponsorship_tier, benefit_cta, status")
    .eq("status", "active")
    .eq("deal", true)
    .order("rating", { ascending: false });

  const dealBrokers: Broker[] = sortWithSponsorship((allBrokers || []) as Broker[]);

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Deals & Promotions" },
  ]);

  const itemList = dealsHubJsonLd(dealBrokers);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />

      <div className="pt-5 pb-8 md:py-12">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-2 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Deals</span>
          </nav>

          {/* Header — compact on mobile */}
          <div className="flex items-start justify-between gap-3 mb-1 md:mb-3">
            <h1 className="text-2xl md:text-4xl font-extrabold">
              Deals & Promotions
            </h1>
            <a
              href="#advertiser-disclosure"
              className="text-[0.69rem] text-slate-400 underline hover:text-slate-600 transition-colors shrink-0 mt-1.5"
            >
              Disclosure
            </a>
          </div>
          <p className="text-xs md:text-base text-slate-500 mb-4 md:mb-6 max-w-2xl">
            Verified offers from Australian trading platforms, updated regularly.
          </p>

          {dealBrokers.length > 0 ? (
            <DealsClient deals={dealBrokers} />
          ) : (
            <div className="text-center py-10 md:py-16">
              <div className="text-3xl md:text-4xl mb-3">📭</div>
              <h2 className="text-lg md:text-xl font-bold text-slate-700 mb-1.5">No Active Deals</h2>
              <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6 max-w-md mx-auto">
                Check back soon or compare brokers by fees instead.
              </p>
              <Link
                href="/compare"
                className="inline-block px-5 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-all"
              >
                Compare Brokers →
              </Link>
            </div>
          )}

          {/* Affiliate disclosure */}
          <div id="advertiser-disclosure" className="text-[0.69rem] md:text-xs text-slate-500 mt-6 md:mt-8 text-center">
            <p>{ADVERTISER_DISCLOSURE_SHORT}</p>
          </div>

          {/* E-E-A-T footer */}
          <div className="mt-3 md:mt-6 text-[0.69rem] md:text-xs text-slate-400 text-center">
            <p>
              Verified by{" "}
              <a href={REVIEW_AUTHOR.url} className="underline hover:text-slate-900">
                {REVIEW_AUTHOR.name}
              </a>
              .{" "}
              <Link href="/how-we-earn" className="underline hover:text-slate-900">
                How we earn
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
