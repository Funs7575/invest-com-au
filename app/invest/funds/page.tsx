import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
import FundsDirectoryClient, { type FundListing } from "./FundsDirectoryClient";

export const revalidate = 600;

export const metadata: Metadata = {
  title: `Australian Investment Funds Directory (${CURRENT_YEAR}) — Managed, Syndicated, Infrastructure & Wholesale`,
  description:
    "Browse Australian managed funds, syndicated property funds, infrastructure funds, and wholesale unlisted funds. Filter by minimum investment, SIV-complying, retail-accessible. Register interest and connect with fund managers.",
  alternates: { canonical: `${SITE_URL}/invest/funds` },
  openGraph: {
    title: `Australian Investment Funds Directory (${CURRENT_YEAR})`,
    description:
      "Managed funds, syndicated property, infrastructure, and wholesale funds in Australia. Filter by fund type, minimum investment, SIV eligibility.",
    url: `${SITE_URL}/invest/funds`,
  },
};

async function fetchFunds(): Promise<FundListing[]> {
  try {
    const supabase = createAdminClient();
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
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Investment Funds" },
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
                Invest
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Investment Funds</span>
            </nav>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Australian Investment Funds &amp; Opportunities
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Browse Australian managed, syndicated property, infrastructure,
              and wholesale unlisted funds — with transparent minimums, target
              returns, and fund sizes. Filter for retail-accessible or
              SIV-complying options. Register interest and connect with AFSL-licensed
              fund managers.
            </p>
            <p className="text-xs text-slate-400 mt-4 max-w-2xl">
              General information only — not financial product advice. Always
              read the relevant PDS or Information Memorandum and consider your
              own circumstances before investing.
            </p>
          </div>
        </section>

        <Suspense fallback={<div className="min-h-[60vh]" />}>
          <FundsDirectoryClient funds={funds} />
        </Suspense>
      </div>
    </>
  );
}
