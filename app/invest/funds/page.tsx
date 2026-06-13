import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

const FUNDS_FAQS = [
  {
    q: "What is the difference between a managed fund and an ETF in Australia?",
    a: "Both pool investor capital and provide diversified exposure, but they differ structurally. A managed fund (also called a managed investment scheme or MIS) is typically priced daily and accessed via the fund manager's website or a platform; units are bought and sold at the end-of-day Net Asset Value (NAV). An ETF (Exchange Traded Fund) trades intraday on the ASX like a share — you buy it through any broker at the live market price. Managed funds often have higher minimums ($5,000–$50,000) and may carry redemption queues; ETFs can be bought for the price of one unit. Tax efficiency also differs: ETFs tend to generate less capital gain distributions because creation/redemption is done in-kind.",
  },
  {
    q: "What is a wholesale investor in Australia?",
    a: "A wholesale investor (also called a sophisticated investor in some contexts) is a person who meets certain thresholds under the Corporations Act: net assets of $2.5M or gross income of $250,000 in the last two financial years (certified by an accountant), or is investing $500,000 or more in a single product. Wholesale classification unlocks access to investment products not available to retail investors — including many managed funds, unlisted property syndicates, and private credit offerings — because these products are exempt from certain disclosure requirements. The classification applies per investment and per year.",
  },
  {
    q: "What fees should I watch for in Australian managed funds?",
    a: "Key fees to scrutinise: (1) management fee (MER) — expressed as % p.a. of NAV, typically 0.1–2.5% depending on active vs passive; (2) performance fee — charged when the fund outperforms its benchmark, typically 10–20% of excess return; (3) buy/sell spread — built into the entry/exit price to cover transaction costs; (4) platform fee — if you access the fund via a super or investment platform (e.g. BT Panorama, Macquarie Wrap), an additional fee layer applies; (5) indirect cost ratio (ICR) — additional costs that reduce returns but aren't charged directly. Check the Product Disclosure Statement (PDS) — the total cost figure (TCR or 'cost of product') is the most comparable metric.",
  },
  {
    q: "How are investment fund returns taxed in Australia?",
    a: "Managed fund income and capital gain distributions are taxed in the year they're distributed to unitholders — even if you reinvest them. Your tax return will include a tax statement (sometimes called a 'tax distribution statement') showing the components: Australian income, foreign income, CGT discounted gains, and franking credits. You include each component in your return under the appropriate income category. Losses within the fund cannot be passed through to unitholders — they stay inside the fund. For ETFs, the same rules apply to distributions; capital gains on selling ETF units directly are subject to standard CGT rules.",
  },
];

const fundsFaqLd = faqJsonLd(FUNDS_FAQS);
import { createClient } from "@/lib/supabase/server";
import FundsDirectoryClient, { type FundListing } from "./FundsDirectoryClient";
import VerticalMarketplaceListings from "@/components/marketplace/VerticalMarketplaceListings";

export const revalidate = 600;

export const metadata: Metadata = {
  title: `Australian Investment Fund Opportunities (${CURRENT_YEAR}) — Managed, Syndicated, Wholesale & SIV-Relevant`,
  description:
    "Browse Australian managed, syndicated, infrastructure, and wholesale fund opportunities. Filter by minimum investment or retail/wholesale eligibility.",
  alternates: { canonical: `${SITE_URL}/invest/funds` },
  openGraph: {
    title: `Australian Investment Fund Opportunities (${CURRENT_YEAR})`,
    description:
      "Managed, syndicated, infrastructure, wholesale and SIV-relevant fund opportunities in Australia. Filter by fund type, minimum investment, foreign-investor eligibility.",
    url: `${SITE_URL}/invest/funds`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Managed Funds Australia")}&sub=${encodeURIComponent("Active vs Index · Platforms · Fees · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

async function fetchFunds(): Promise<FundListing[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("fund_listings")
      .select(
        "id, title, slug, fund_type, manager_name, description, min_investment_cents, target_return_percent, fund_size_cents, open_to_retail, siv_complying, firb_relevant, featured, featured_tier, status",
      )
      .eq("status", "active")
      .order("featured", { ascending: false })
      .order("featured_tier", { ascending: false, nullsFirst: false })
      .order("fund_size_cents", { ascending: false, nullsFirst: false });
    return (data as FundListing[] | null) || [];
  } catch {
    return [];
  }
}

export default async function FundsPage() {
  const funds = await fetchFunds();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Opportunities", url: `${SITE_URL}/invest` },
    { name: "Fund opportunities" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {fundsFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(fundsFaqLd) }} />
      )}
      <div className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-5 md:py-7">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-500 mb-2"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">
                Opportunities
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Fund opportunities</span>
            </nav>

            <h1 className="text-2xl md:text-3xl font-extrabold leading-tight mb-1.5 max-w-3xl">
              Australian Investment Fund Opportunities
            </h1>
            <p className="text-[13px] md:text-sm text-slate-300 leading-snug max-w-3xl line-clamp-2">
              Browse Australian managed, syndicated property, infrastructure,
              and wholesale unlisted funds — with transparent minimums, target
              returns, and fund sizes. Filter for retail-accessible or
              SIV-relevant options. Register interest and connect with AFSL-licensed
              fund managers.
            </p>
            <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-100/10 border border-amber-300/30 text-xs text-amber-50/90 max-w-2xl">
              <strong>General information only — not financial product advice.</strong>{" "}
              No fund is the &ldquo;best fund for you&rdquo; without personal advice.
              Always read the relevant PDS/IM before registering interest.{" "}
              <Link href="/compare" className="underline hover:no-underline">
                Compare super, savings, shares &amp; ETFs →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Section anchor strip ── */}
        <div className="border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="container-custom flex flex-wrap gap-x-6 gap-y-2 py-3 text-xs md:text-sm">
            <a
              href="#directory"
              className="font-semibold text-slate-700 hover:text-amber-700"
            >
              Fund directory
            </a>
            <a
              href="#sponsored"
              className="font-semibold text-slate-700 hover:text-amber-700"
            >
              Sponsored &amp; curated
            </a>
            <a
              href="#advice"
              className="font-semibold text-slate-700 hover:text-amber-700"
            >
              Need advice first?
            </a>
          </div>
        </div>

        {/* ── 1. Fund directory ── */}
        <section id="directory" aria-labelledby="directory-heading">
          <div className="container-custom pt-8 md:pt-10">
            <h2
              id="directory-heading"
              className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2"
            >
              Fund directory
            </h2>
            <p className="text-sm text-slate-600 max-w-3xl">
              All active funds in the directory. Use the filters to narrow by
              fund type, minimum investment and retail/wholesale eligibility.
            </p>
          </div>
          <Suspense fallback={<div className="min-h-[60vh]" />}>
            <FundsDirectoryClient funds={funds} />
          </Suspense>
        </section>

        {/* ── 2. Sponsored / curated fund opportunities ──
            investment_listings rows with vertical='funds'. Separate from
            the fund_listings directory above — editorial-curated
            syndicated and SIV-tagged opportunities. Disclosed advertiser
            relationship. */}
        <section id="sponsored" aria-labelledby="sponsored-heading" className="bg-slate-50">
          <VerticalMarketplaceListings
            vertical="funds"
            accent="amber"
            limit={6}
            heading="Sponsored &amp; curated fund opportunities"
            sub="Editorial-curated investment opportunities tagged 'funds' in our marketplace — syndicated, SIV-relevant, and wholesale deal flow. Featured placements are paid; selection is editorial."
            id="sponsored-listings"
          />
        </section>

        {/* ── 3. Need advice before registering interest? ── */}
        <section
          id="advice"
          aria-labelledby="advice-heading"
          className="py-10 md:py-14 bg-white border-t border-slate-200"
        >
          <div className="container-custom max-w-5xl">
            <h2
              id="advice-heading"
              className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2"
            >
              Need advice before registering interest?
            </h2>
            <p className="text-sm text-slate-600 mb-6 max-w-3xl">
              Fund opportunities are general information only. For
              personal financial product advice — including suitability,
              tax, foreign-investor and SMSF implications — speak to a
              licensed adviser. Three ways to get help:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <Link
                href="/advisors?type=financial"
                className="group block rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-amber-300 transition-all"
              >
                <h3 className="font-bold text-base text-slate-900 group-hover:text-amber-700 mb-1">
                  Find an adviser
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Browse verified financial advisers, SMSF accountants and
                  wealth managers. Filter by location and specialty.
                </p>
              </Link>
              <Link
                href="/get-matched"
                className="group block rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-amber-300 transition-all"
              >
                <h3 className="font-bold text-base text-slate-900 group-hover:text-amber-700 mb-1">
                  Get matched
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Answer up to 6 questions to match you with platforms or
                  advisers that fit your situation.
                </p>
              </Link>
              <Link
                href="/quotes/post"
                className="group block rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md hover:border-amber-300 transition-all"
              >
                <h3 className="font-bold text-base text-slate-900 group-hover:text-amber-700 mb-1">
                  Post a request
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tell verified advisers what you need help with — they
                  quote you. Free to post; no obligation.
                </p>
              </Link>
            </div>
          </div>
        </section>

        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {FUNDS_FAQS.map((faq) => (
                <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                  <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-500 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
