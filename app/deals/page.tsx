import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, dealsHubJsonLd, REVIEW_AUTHOR, CURRENT_YEAR } from "@/lib/seo";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import { sortWithSponsorship } from "@/lib/sponsorship";
import DealsClient from "./DealsClient";
import Icon from "@/components/Icon";

const dealsTitle = `Platform Deals & Promotions (${CURRENT_YEAR})`;

export const metadata: Metadata = {
  title: dealsTitle,
  description:
    "Current deals and promotions from Australian investing platforms. Verified offers from share trading, crypto, robo-advisors and more.",
  alternates: { canonical: "/deals" },
  openGraph: {
    title: dealsTitle,
    description:
      "Current verified deals and promotions from Australian investing platforms — share brokers, crypto, robo-advisors & more. Updated regularly.",
    url: "/deals",
    images: [
      {
        url: "/api/og?title=Platform+Deals+%26+Promotions&subtitle=Verified+Offers+from+Australian+Platforms&type=default",
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
  // Defensive fetch — both queries are independent. A broken advisors
  // query shouldn't wipe out the broker deals grid (or vice versa).
  let allBrokers: unknown[] = [];
  let topAdvisors: unknown[] = [];
  try {
    const supabase = await createClient();
    const [brokersRes, advisorsRes] = await Promise.all([
      supabase
        .from("brokers")
        .select("id, name, slug, color, icon, logo_url, rating, deal, deal_text, deal_expiry, deal_terms, deal_verified_date, deal_category, platform_type, cta_text, affiliate_url, sponsorship_tier, benefit_cta, status")
        .eq("status", "active")
        .eq("deal", true)
        .order("rating", { ascending: false }),
      supabase
        .from("professionals")
        .select("slug, name, firm_name, type, location_display, rating, review_count, photo_url, fee_description, verified, offer_text, offer_terms, offer_expiry, offer_active")
        .eq("status", "active")
        .eq("verified", true)
        .order("rating", { ascending: false })
        .order("review_count", { ascending: false })
        .limit(6),
    ]);
    allBrokers = brokersRes.data ?? [];
    topAdvisors = advisorsRes.data ?? [];
  } catch {
    // Silent degrade — empty deal hub renders without 503ing.
  }

  const dealBrokers: Broker[] = sortWithSponsorship(allBrokers as Broker[]);

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
          {/* Breadcrumb + disclosure */}
          <div className="flex items-center justify-between mb-3 md:mb-5">
            <nav className="text-xs md:text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <span className="mx-1.5 md:mx-2">/</span>
              <span className="text-slate-700">Deals</span>
            </nav>
            <a
              href="#advertiser-disclosure"
              className="text-[0.69rem] text-slate-400 underline hover:text-slate-600 transition-colors shrink-0"
            >
              Disclosure
            </a>
          </div>

          {/* SEO h1 — visually compact since hero banner handles the visual impact */}
          <h1 className="sr-only">Deals & Promotions</h1>

          {dealBrokers.length > 0 ? (
            <DealsClient deals={dealBrokers} advisors={topAdvisors || []} />
          ) : (
            <div className="text-center py-10 md:py-16">
              <div className="text-3xl md:text-4xl mb-3">📭</div>
              <h2 className="text-lg md:text-xl font-bold text-slate-700 mb-1.5">No Active Deals</h2>
              <p className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6 max-w-md mx-auto">
                Check back soon or compare platforms by fees instead.
              </p>
              <Link
                href="/compare"
                className="inline-block px-5 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-all"
              >
                Compare Platforms →
              </Link>
            </div>
          )}

          {/* Featured Advisors */}
          {(topAdvisors?.length ?? 0) > 0 && (
            <div className="mt-8 md:mt-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base md:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Icon name="users" size={18} className="text-amber-500" />
                    Verified Financial Advisors
                  </h2>
                  <p className="text-[0.65rem] md:text-xs text-slate-500 mt-0.5">Send a free enquiry to a verified professional — exclusive, no obligation</p>
                </div>
                <Link href="/advisors" className="text-xs font-semibold text-amber-600 hover:text-amber-800 transition-colors hidden md:flex items-center gap-1">
                  Browse all advisors &rarr;
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(topAdvisors as { slug: string; name: string; firm_name: string; type: string; location_display: string; rating: number; review_count: number; photo_url: string; fee_description: string }[]).map((advisor) => {
                  const typeLabel = advisor.type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                  return (
                    <Link
                      key={advisor.slug}
                      href={`/advisor/${advisor.slug}`}
                      className="flex items-start gap-3 p-3.5 bg-white border border-amber-100 rounded-xl hover:border-amber-300 hover:shadow-md transition-all group"
                    >
                      <Image
                        src={advisor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(advisor.name)}&size=80&background=7c3aed&color=fff`}
                        alt={advisor.name}
                        width={48}
                        height={48}
                        className="rounded-full shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">{advisor.name}</p>
                        <p className="text-[0.65rem] text-slate-500">{advisor.firm_name}</p>
                        <p className="text-[0.6rem] text-amber-600 font-medium mt-0.5">{typeLabel} &middot; {advisor.location_display}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[0.62rem] text-amber-600 font-bold">{advisor.rating}/5</span>
                          <span className="text-[0.58rem] text-slate-400">({advisor.review_count} reviews)</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="text-center mt-3">
                <Link href="/find-advisor" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors">
                  <Icon name="search" size={14} className="text-amber-200" />
                  Find Your Advisor
                </Link>
              </div>
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
