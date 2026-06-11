import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, dealsHubJsonLd, REVIEW_AUTHOR, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
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

export const revalidate = 1800;

const DEALS_FAQS = [
  {
    q: "What types of deals and promotions are listed?",
    a: "The deals hub lists current verified promotions from active Australian investing platforms: share brokers, crypto exchanges, robo-advisors, and financial planning services. Deal types include: zero-brokerage introductory periods (e.g. 10 free trades for new accounts), cash bonuses for opening and funding a new account, referral rewards, fee credits for transferring an existing portfolio, and reduced FX rates for a limited period. All deals are sourced directly from platform websites and verified before listing.",
  },
  {
    q: "Are the deals on this page current and verified?",
    a: "Yes. Deals are checked against each platform's current promotional pages when they are added and reviewed on an ongoing basis. The deals hub refreshes every 30 minutes via ISR. When a deal expires or changes, we update or remove it within 24 hours of becoming aware of the change. If you click through to a deal and find it has expired, please report it to hello@invest.com.au and we'll verify and update within one business day.",
  },
  {
    q: "Does Invest.com.au earn money from deals?",
    a: "Yes. When you click through to a platform using a deal link on this page, Invest.com.au may earn an affiliate referral fee from the platform. This has no effect on the deals we list — we show deals from all platforms, including platforms that do not pay us a referral fee. The existence or size of an affiliate relationship does not influence our editorial ratings. Our commercial relationships are described in full at /how-we-earn.",
  },
  {
    q: "How do I claim a deal?",
    a: "Click 'Claim deal' or 'Get offer' on the deal card — this takes you to the platform's own promotional page or sign-up flow. The deal terms and eligibility requirements are set by the platform, not by Invest.com.au. Read the full terms on the platform's page before signing up. Invest.com.au cannot resolve disputes about deal fulfilment — contact the platform directly if a promotion is not applied to your account.",
  },
];

const dealsFaqLd = faqJsonLd(DEALS_FAQS);

export default async function DealsPage() {
  // Defensive fetch — both queries are independent. A broken advisors
  // query shouldn't wipe out the broker deals grid (or vice versa).
  // The explicit Broker[] and AdvisorRow[] types are load-bearing here:
  // without them TS infers `unknown[]` from `any` destructuring which
  // breaks the DealsClient advisors prop signature downstream.
  type AdvisorRow = {
    slug: string;
    name: string;
    firm_name: string | null;
    type: string;
    location_display: string | null;
    rating: number | null;
    review_count: number | null;
    photo_url: string | null;
    fee_description: string | null;
    verified: boolean | null;
    offer_text: string | null;
    offer_terms: string | null;
    offer_expiry: string | null;
    offer_active: boolean | null;
  };

  let allBrokers: Broker[] = [];
  let topAdvisors: AdvisorRow[] = [];
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
    allBrokers = (brokersRes.data as Broker[] | null) ?? [];
    topAdvisors = (advisorsRes.data as AdvisorRow[] | null) ?? [];
  } catch {
    // Silent degrade — empty deal hub renders without 503ing.
  }

  const dealBrokers: Broker[] = sortWithSponsorship(allBrokers);

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
      {dealsFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(dealsFaqLd) }}
        />
      )}

      <div className="pt-5 pb-8 md:py-12">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb + disclosure */}
          <div className="flex items-center justify-between mb-3 md:mb-5">
            <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <span className="mx-1.5 md:mx-2">/</span>
              <span className="text-slate-700">Deals</span>
            </nav>
            <a
              href="#advertiser-disclosure"
              className="text-[0.69rem] text-slate-500 underline hover:text-slate-600 transition-colors shrink-0"
            >
              Disclosure
            </a>
          </div>

          {/* SEO h1 — visually compact since hero banner handles the visual impact */}
          <h1 className="sr-only">Deals & Promotions</h1>

          {dealBrokers.length > 0 ? (
            // Cast via unknown to bridge the null-vs-undefined nullability
            // mismatch between Supabase's `| null` columns and the client
            // component's `?:` optional fields. Shape is compatible at
            // runtime — only the nullability representation differs.
            <DealsClient
              deals={dealBrokers}
              advisors={topAdvisors as unknown as Parameters<typeof DealsClient>[0]["advisors"]}
            />
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
                          <span className="text-[0.58rem] text-slate-500">({advisor.review_count} reviews)</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="text-center mt-3">
                <Link href="/find-advisor" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-600 text-slate-900 text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors">
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
          <div className="mt-3 md:mt-6 text-[0.69rem] md:text-xs text-slate-500 text-center">
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

      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {DEALS_FAQS.map((faq) => (
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
