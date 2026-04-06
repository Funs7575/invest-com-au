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
    .select("title, description, location_state, price_display")
    .eq("slug", slug)
    .eq("vertical", "business")
    .single();

  if (!data) return { title: "Business for Sale | Invest.com.au" };

  const title = `${data.title} — Business for Sale ${data.location_state ? `in ${data.location_state}` : "in Australia"} (${CURRENT_YEAR})`;
  return {
    title,
    description: data.description?.slice(0, 160) ?? `Business for sale. ${data.price_display ?? ""}`,
    alternates: { canonical: `${SITE_URL}/invest/buy-business/listings/${slug}` },
    openGraph: { title, url: `${SITE_URL}/invest/buy-business/listings/${slug}` },
  };
}

function formatCents(cents: number): string {
  if (cents >= 1_000_000_00) return `$${(cents / 1_000_000_00).toFixed(1)}M`;
  if (cents >= 1_000_00) return `$${(cents / 1_000_00).toFixed(0)}K`;
  return `$${(cents / 100).toLocaleString("en-AU")}`;
}

export default async function BusinessListingDetailPage({
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
    .eq("vertical", "business")
    .single();

  if (!listing) notFound();

  const l = listing as InvestmentListing;

  // Fetch related listings
  const { data: related } = await supabase
    .from("investment_listings")
    .select("*")
    .eq("vertical", "business")
    .eq("status", "active")
    .neq("slug", slug)
    .eq("location_state", l.location_state ?? "")
    .limit(3);

  const relatedListings = (related ?? []) as InvestmentListing[];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Buy a Business", url: `${SITE_URL}/invest/buy-business` },
    { name: "Listings", url: `${SITE_URL}/invest/buy-business/listings` },
    { name: l.title },
  ]);

  const km = l.key_metrics ?? {};
  const location = [l.location_city, l.location_state].filter(Boolean).join(", ");

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Hero */}
      <section className="bg-white border-b border-slate-100 py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest/listings?vertical=business" className="hover:text-slate-900 transition-colors">Businesses for Sale</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium truncate max-w-[160px]">{l.title}</span>
          </nav>

          <div className="flex flex-wrap gap-2 mb-3">
            {l.listing_type === "featured" && (
              <span className="bg-amber-500 text-slate-900 text-xs font-bold px-2.5 py-0.5 rounded-full">Featured</span>
            )}
            {l.listing_type === "premium" && (
              <span className="bg-yellow-400 text-slate-900 text-xs font-bold px-2.5 py-0.5 rounded-full">Premium</span>
            )}
            {l.firb_eligible && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">FIRB Eligible</span>
            )}
            {l.industry && (
              <span className="bg-slate-700 text-slate-200 text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize">
                {l.industry.replace(/_/g, " ")}
              </span>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold mb-2 text-slate-900">{l.title}</h1>
          {location && (
            <div className="flex items-center gap-1.5 text-slate-600 text-sm">
              <Icon name="map-pin" size={14} />
              {location}
            </div>
          )}
        </div>
      </section>

      {/* Main content */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Price card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Asking Price</p>
                    <p className="text-3xl font-extrabold text-slate-900">
                      {l.price_display ?? (l.asking_price_cents ? formatCents(l.asking_price_cents) : "Price on application")}
                    </p>
                  </div>
                  {l.annual_profit_cents && (
                    <div className="text-right">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Annual Net Profit</p>
                      <p className="text-xl font-bold text-green-700">{formatCents(l.annual_profit_cents)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Key metrics */}
              {Object.keys(km).length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-4">Key Metrics</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(km).map(([key, value]) => (
                      <div key={key} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 capitalize mb-1">{key.replace(/_/g, " ")}</p>
                        <p className="text-sm font-bold text-slate-900">
                          {typeof value === "number" && key.includes("cents")
                            ? formatCents(value)
                            : String(value)}
                        </p>
                      </div>
                    ))}
                    {l.annual_revenue_cents && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Annual Revenue</p>
                        <p className="text-sm font-bold text-slate-900">{formatCents(l.annual_revenue_cents)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {l.description && (
                <div className="bg-white border border-slate-200 rounded-xl p-6">
                  <h2 className="text-base font-bold text-slate-900 mb-3">About This Business</h2>
                  <div className="prose prose-slate prose-sm max-w-none">
                    {l.description.split("\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* FIRB info */}
              {l.firb_eligible && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex gap-4">
                  <Icon name="globe" size={20} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-900 text-sm mb-1">FIRB Eligible</p>
                    <p className="text-sm text-blue-700">
                      This business is eligible for foreign investment under the Foreign Investment Review Board framework. FIRB approval may be required for foreign buyers. Our advisors can guide you through the process.
                    </p>
                    <Link href="/foreign-investment" className="inline-flex items-center gap-1 text-blue-700 font-semibold text-xs mt-2 hover:text-blue-900">
                      Learn about FIRB <Icon name="arrow-right" size={11} />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Enquiry form */}
            <div className="space-y-5">
              <div className="bg-white border border-slate-200 rounded-xl p-6 sticky top-20">
                <h2 className="text-base font-bold text-slate-900 mb-1">Enquire About This Listing</h2>
                <p className="text-xs text-slate-500 mb-4">
                  Send a confidential enquiry directly to the listing representative.
                </p>
                <ListingEnquiryForm
                  listingId={l.id}
                  listingTitle={l.title}
                  vertical="business"
                />
              </div>

              {/* Stats */}
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

          {/* Related listings */}
          {relatedListings.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-extrabold text-slate-900 mb-6">Similar Businesses in {l.location_state}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedListings.map((rel) => (
                  <ListingCard key={rel.id} listing={rel} vertical="business" />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* List CTA */}
      <section className="py-10 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <p className="text-slate-500 text-sm mb-4">Looking for more opportunities?</p>
          <Link
            href="/invest/listings?vertical=business"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Browse All Businesses for Sale
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
