import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, dealsHubJsonLd, REVIEW_AUTHOR } from "@/lib/seo";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
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

export default async function DealsPage() {
  const supabase = await createClient();
  const { data: allBrokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active")
    .eq("deal", true)
    .order("rating", { ascending: false });

  const dealBrokers: Broker[] = (allBrokers || []) as Broker[];

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

      <div className="py-12">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-green-700">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-green-700">Deals & Promotions</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            Broker Deals & Promotions
          </h1>
          <p className="text-slate-600 mb-2 max-w-2xl">
            Current verified offers from Australian trading platforms. Every deal is
            checked against the broker&apos;s website before being listed.
          </p>

          {/* Compliance */}
          <div className="flex justify-end mb-6">
            <a
              href="#advertiser-disclosure"
              className="text-xs text-gray-400 underline hover:text-gray-600 transition-colors"
            >
              Advertiser Disclosure
            </a>
          </div>

          {dealBrokers.length > 0 ? (
            <DealsClient deals={dealBrokers} />
          ) : (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">📭</div>
              <h2 className="text-xl font-bold text-slate-700 mb-2">No Active Deals Right Now</h2>
              <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                We regularly update this page with verified broker promotions.
                Check back soon or compare brokers by fees instead.
              </p>
              <Link
                href="/compare"
                className="inline-block px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 hover:scale-105 hover:shadow-[0_0_12px_rgba(21,128,61,0.3)] transition-all duration-200"
              >
                Compare Brokers →
              </Link>
            </div>
          )}

          {/* Affiliate disclosure */}
          <div id="advertiser-disclosure" className="text-[0.6rem] text-slate-500 mt-8 text-center">
            <p>{ADVERTISER_DISCLOSURE_SHORT}</p>
          </div>

          {/* E-E-A-T footer */}
          <div className="mt-6 text-xs text-slate-400 text-center">
            <p>
              Deals verified by{" "}
              <a href={REVIEW_AUTHOR.url} className="underline hover:text-green-700">
                {REVIEW_AUTHOR.name}
              </a>
              . We check deal availability against official broker websites.{" "}
              <Link href="/how-we-earn" className="underline hover:text-green-700">
                How we earn
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
