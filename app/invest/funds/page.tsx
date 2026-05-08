import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import FundsDirectoryClient, { type FundListing } from "./FundsDirectoryClient";
import VerticalMarketplaceListings from "@/components/marketplace/VerticalMarketplaceListings";

export const revalidate = 600;

export const metadata: Metadata = {
  title: `Australian Investment Fund Opportunities (${CURRENT_YEAR}) — Managed, Syndicated, Wholesale & SIV-Relevant`,
  description:
    "Browse Australian managed, syndicated, infrastructure, wholesale and SIV-relevant fund opportunities. Filter by minimum investment, retail-accessible or wholesale. General information only — no fund is the 'best fund for you' without personal advice.",
  alternates: { canonical: `${SITE_URL}/invest/funds` },
  openGraph: {
    title: `Australian Investment Fund Opportunities (${CURRENT_YEAR})`,
    description:
      "Managed, syndicated, infrastructure, wholesale and SIV-relevant fund opportunities in Australia. Filter by fund type, minimum investment, foreign-investor eligibility.",
    url: `${SITE_URL}/invest/funds`,
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
      <div className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
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

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Australian Investment Fund Opportunities
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Browse Australian managed, syndicated property, infrastructure,
              and wholesale unlisted funds — with transparent minimums, target
              returns, and fund sizes. Filter for retail-accessible or
              SIV-relevant options. Register interest and connect with AFSL-licensed
              fund managers.
            </p>
            <div className="mt-4 px-4 py-3 rounded-lg bg-amber-100/10 border border-amber-300/30 text-sm text-amber-50 max-w-2xl">
              <strong>General information only — not financial product advice.</strong>{" "}
              No fund is the &ldquo;best fund for you&rdquo; without personal
              advice. Past performance is not a reliable indicator of future
              returns.
            </div>
            <p className="text-xs text-slate-400 mt-3 max-w-2xl">
              Always read the relevant PDS or Information Memorandum and
              consider your own circumstances before registering interest.
            </p>
            <p className="text-xs text-slate-400 mt-2 max-w-2xl">
              Looking to compare super funds, savings accounts, share-trading
              platforms or ETFs?{" "}
              <Link href="/compare" className="underline hover:no-underline">
                Visit Compare
              </Link>
              .
            </p>
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
                href="/quiz"
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
      </div>
    </>
  );
}
