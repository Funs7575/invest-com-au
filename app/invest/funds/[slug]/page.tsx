import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import ListingEnquiryForm from "@/components/ListingEnquiryForm";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("investment_listings")
    .select("title, description, key_metrics, siv_complying")
    .eq("slug", slug)
    .eq("vertical", "fund")
    .single();

  if (!data) return { title: "Investment Fund | Invest.com.au" };
  const sivLabel = data.siv_complying ? " — SIV Complying" : "";
  const title = `${data.title}${sivLabel} Australian Fund (${CURRENT_YEAR})`;
  return {
    title,
    description: data.description?.slice(0, 160) ?? `Australian investment fund. ${sivLabel ? "SIV-complying." : ""}`,
    alternates: { canonical: `${SITE_URL}/invest/funds/${slug}` },
    openGraph: { title, url: `${SITE_URL}/invest/funds/${slug}` },
  };
}

function formatCents(cents: number): string {
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}K`;
  return `$${(cents / 100).toLocaleString("en-AU")}`;
}

export default async function FundDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("slug", slug)
    .eq("vertical", "fund")
    .single();

  if (!listing) notFound();
  const l = listing as InvestmentListing;

  const { data: related } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("vertical", "fund")
    .eq("status", "active")
    .neq("slug", slug)
    .limit(3);

  const relatedListings = (related ?? []) as InvestmentListing[];
  const km = l.key_metrics ?? {};

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Investment Funds", url: `${SITE_URL}/invest/funds` },
    { name: l.title },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 text-white py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest/listings?vertical=fund" className="hover:text-white transition-colors">Investment Funds</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <span className="text-slate-300 truncate max-w-[160px]">{l.title}</span>
          </nav>

          <div className="flex flex-wrap gap-2 mb-3">
            {l.listing_type === "featured" && (
              <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2.5 py-0.5 rounded-full">Featured</span>
            )}
            {l.siv_complying && (
              <span className="bg-purple-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">SIV Complying</span>
            )}
            {l.industry && (
              <span className="bg-indigo-700 text-indigo-100 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                {l.industry.replace(/_/g, " ")}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold mb-2">{l.title}</h1>
          {l.location_state && (
            <div className="flex items-center gap-1.5 text-slate-300 text-sm">
              <Icon name="map-pin" size={14} />
              Australia
            </div>
          )}
        </div>
      </section>

      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Minimum Investment</p>
                    <p className="text-3xl font-extrabold text-slate-900">
                      {l.price_display ?? (km.min_investment_cents ? formatCents(km.min_investment_cents as number) : "Contact for details")}
                    </p>
                  </div>
                  {!!km.target_return_percent && (
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Target Return</p>
                      <p className="text-xl font-bold text-green-700">{String(km.target_return_percent)}% p.a.</p>
                    </div>
                  )}
                </div>
              </div>

              {Object.keys(km).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-4">Fund Details</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(km).map(([key, value]) => (
                      <div key={key} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 capitalize mb-1">{key.replace(/_/g, " ")}</p>
                        <p className="text-sm font-bold text-slate-900">
                          {typeof value === "number" && key.includes("cents") ? formatCents(value) : String(value)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {l.description && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-3">About This Fund</h2>
                  <div className="prose prose-slate prose-sm max-w-none">
                    {l.description.split("\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>
              )}

              {l.siv_complying && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 flex gap-4">
                  <Icon name="star" size={20} className="text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-purple-900 text-sm mb-1">SIV Complying Fund</p>
                    <p className="text-sm text-purple-700">
                      This fund qualifies as a complying investment under the Significant Investor Visa (Subclass 188C) framework. Investing in this fund can count towards your $5M SIV requirement. Always confirm eligibility with a registered migration agent.
                    </p>
                    <Link href="/foreign-investment" className="inline-flex items-center gap-1 text-purple-700 font-semibold text-xs mt-2 hover:text-purple-900">
                      SIV complete guide <Icon name="arrow-right" size={11} />
                    </Link>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="text-xs text-slate-500 leading-relaxed">
                  <strong>Important:</strong> Investment in managed funds involves risk. Past performance is not indicative of future results. This is not financial advice. Please read the fund&apos;s Product Disclosure Statement (PDS) and consider seeking independent financial advice before investing.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-6 sticky top-20">
                <h2 className="text-base font-bold text-slate-900 mb-1">Request Fund Information Pack</h2>
                <p className="text-xs text-slate-500 mb-4">
                  Receive the fund&apos;s PDS and speak with the fund manager.
                </p>
                <ListingEnquiryForm listingId={l.id} listingTitle={l.title} vertical="fund" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-6">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{l.views ?? 0}</p>
                  <p className="text-xs text-slate-500">Views</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{l.enquiries ?? 0}</p>
                  <p className="text-xs text-slate-500">Enquiries</p>
                </div>
              </div>
            </div>
          </div>

          {relatedListings.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-extrabold text-slate-900 mb-6">Other Investment Funds</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedListings.map((rel) => (
                  <ListingCard key={rel.id} listing={rel} vertical="fund" />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="py-10 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <Link
            href="/invest/listings?vertical=fund"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Browse All Investment Funds
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
