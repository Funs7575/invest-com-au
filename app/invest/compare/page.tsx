import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { InvestmentListing } from "@/lib/types";
import { logger } from "@/lib/logger";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import InvestCompareClient from "./InvestCompareClient";
import Icon from "@/components/Icon";

const log = logger("invest-compare");

export const metadata: Metadata = {
  title: `Compare investment opportunities | ${SITE_NAME}`,
  description: "Side-by-side comparison of investment listings — kind, ticket size, yield, FIRB eligibility, SIV-complying status, fees and structure.",
  alternates: { canonical: "/invest/compare" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

/**
 * Side-by-side comparison surface for /invest. Up to 4 listings rendered
 * as a horizontally-scrolling table of normalised attributes per row
 * (kind, asking, yield, location, structure flags, key metrics).
 *
 * Listings are loaded by slug. The slug list comes from either:
 *   - `?ids=slug1,slug2,slug3` on the URL (share-able), or
 *   - localStorage shortlist (read client-side by InvestCompareClient
 *     when the URL has no `ids`).
 *
 * The server fetches whichever set of listings the URL specifies (when
 * present) so initial paint shows rows; the client takes over when the
 * URL is empty and hydrates from localStorage.
 */
export default async function CompareListingsPage({ searchParams }: PageProps) {
  const { ids } = await searchParams;
  const slugs = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);

  let listings: InvestmentListing[] = [];
  if (slugs.length > 0) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("investment_listings")
        .select("*")
        .in("slug", slugs)
        .eq("status", "active");
      if (error) {
        log.warn("listings compare fetch failed", { error: error.message });
      } else {
        // Re-order to match the URL slug order so a share-link is stable.
        const order = new Map(slugs.map((s, i) => [s, i] as const));
        listings = ((data ?? []) as InvestmentListing[]).sort(
          (a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99),
        );
      }
    } catch (err) {
      log.error("listings compare threw", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Opportunities", url: absoluteUrl("/invest") },
    { name: "Compare" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className="container-custom max-w-6xl py-5 md:py-8">
        <nav className="text-xs md:text-sm text-slate-500 mb-3">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/invest" className="hover:text-slate-900">Opportunities</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Compare</span>
        </nav>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Compare opportunities</h1>
            <p className="text-sm text-slate-600 mt-1">
              Side-by-side view of up to 4 listings — kind, ticket size, yield, flags, key metrics.
            </p>
          </div>
          <Link
            href="/invest"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Icon name="arrow-left" size={14} />
            Back to marketplace
          </Link>
        </div>

        <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-2xl" />}>
          <InvestCompareClient initialListings={listings} initialSlugs={slugs} />
        </Suspense>
      </div>
    </>
  );
}
