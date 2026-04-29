import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
import QuoteBidsClient from "./QuoteBidsClient";
import CountdownPill from "./CountdownPill";

export const dynamic = "force-dynamic";

const BUDGET_LABELS: Record<string, string> = {
  under_500: "Under $500",
  "500_2k": "$500 – $2,000",
  "2k_5k": "$2,000 – $5,000",
  "5k_10k": "$5,000 – $10,000",
  "10k_plus": "$10,000+",
  not_sure: "Budget TBD",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("advisor_auctions")
    .select("job_title")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  const title = data?.job_title || "Quote request";
  return {
    title: `${title} — Get Advisor Quotes (${CURRENT_YEAR})`,
    description: `Open quote request on Invest.com.au: "${title}". Verified Australian advisors are submitting quotes now — compare and pick the best.`,
    alternates: { canonical: `${SITE_URL}/quotes/${slug}` },
  };
}

interface JobData {
  id: number;
  slug: string;
  job_title: string;
  job_description: string;
  budget_band: string;
  advisor_types: string[] | null;
  location: string | null;
  contact_name: string | null;
  status: string;
  ends_at: string;
  winning_bid_id: number | null;
  created_at: string;
}

interface BidRow {
  id: number;
  bid_amount: number;
  status: string;
  created_at: string;
  advisor_id: number;
  professionals: {
    id: number;
    slug: string;
    name: string;
    firm_name: string | null;
    type: string;
    photo_url: string | null;
    rating: number | null;
    review_count: number | null;
    location_display: string | null;
    verified: boolean;
  } | null;
}

export default async function QuoteDetailPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { slug } = await params;
  const { email } = await searchParams;

  const supabase = await createClient();

  const { data: jobRaw } = await supabase
    .from("advisor_auctions")
    .select("id, slug, job_title, job_description, budget_band, advisor_types, location, contact_name, status, ends_at, winning_bid_id, created_at")
    .eq("slug", slug)
    .eq("is_public", true)
    .eq("source", "public_job")
    .maybeSingle();

  if (!jobRaw) notFound();
  const job = jobRaw as JobData;

  const { data: bidsRaw } = await supabase
    .from("advisor_auction_bids")
    .select(`
      id,
      bid_amount,
      status,
      created_at,
      advisor_id,
      professionals:advisor_id (
        id,
        slug,
        name,
        firm_name,
        type,
        photo_url,
        rating,
        review_count,
        location_display,
        verified
      )
    `)
    .eq("auction_id", job.id)
    .order("bid_amount", { ascending: true });

  const bids = (bidsRaw as unknown as BidRow[]) || [];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Quotes", url: `${SITE_URL}/quotes` },
    { name: job.job_title },
  ]);

  const jobPostingLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "title": job.job_title,
    "description": job.job_description,
    "datePosted": job.created_at,
    "validThrough": job.ends_at,
    "employmentType": "CONTRACTOR",
    "jobLocationType": "TELECOMMUTE",
    "applicantLocationRequirements": {
      "@type": "Country",
      "name": "AU",
    },
    "jobLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "AU",
        "addressRegion": job.location || "AU",
      },
    },
    "hiringOrganization": {
      "@type": "Organization",
      "name": "Invest.com.au",
      "sameAs": SITE_URL,
    },
    "directApply": true,
    "url": `${SITE_URL}/quotes/${job.slug}`,
  };

  const isClosedByStatus = job.status !== "open";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingLd) }} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
          <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
            <Link href="/quotes" className="text-slate-400 hover:text-white">All quotes</Link>
            <Icon name="chevron-right" size={12} className="text-slate-500" />
            <span className="text-slate-300">{job.location || "Australia"}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold mb-4 max-w-3xl">{job.job_title}</h1>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full font-medium">
              <Icon name="map-pin" size={12} className="inline mr-1" />
              {job.location || "AU"}
            </span>
            <span className="bg-white/10 border border-white/20 px-3 py-1 rounded-full font-medium">
              <Icon name="wallet" size={12} className="inline mr-1" />
              {BUDGET_LABELS[job.budget_band] || "Budget TBD"}
            </span>
            <CountdownPill endsAt={job.ends_at} status={job.status} />
            <span className="text-slate-400 text-xs">
              {bids.length} {bids.length === 1 ? "quote" : "quotes"}
            </span>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-10 sm:py-14">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Job description */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-base font-bold text-slate-900 mb-3">Request details</h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{job.job_description}</p>

              {job.advisor_types && job.advisor_types.length > 0 && (
                <div className="mt-5 pt-5 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Advisor types requested</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.advisor_types.map((t) => (
                      <span key={t} className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bids — interactive client */}
            <QuoteBidsClient
              slug={job.slug}
              jobStatus={job.status}
              winningBidId={job.winning_bid_id}
              isExpired={isClosedByStatus}
              bids={bids.map((b) => ({
                id: b.id,
                bid_amount: b.bid_amount,
                status: b.status,
                created_at: b.created_at,
                advisor: b.professionals
                  ? {
                      id: b.professionals.id,
                      slug: b.professionals.slug,
                      name: b.professionals.name,
                      firm_name: b.professionals.firm_name,
                      type: b.professionals.type,
                      photo_url: b.professionals.photo_url,
                      rating: b.professionals.rating,
                      review_count: b.professionals.review_count,
                      location_display: b.professionals.location_display,
                      verified: b.professionals.verified,
                    }
                  : null,
              }))}
              ownerEmailFromUrl={email || ""}
            />
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Icon name="info" size={14} className="text-slate-500" />
                How this works
              </h3>
              <ol className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <li className="flex gap-2">
                  <span className="bg-amber-500 text-slate-900 w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
                  <span>Verified advisors review your request and submit fixed-fee or hourly quotes.</span>
                </li>
                <li className="flex gap-2">
                  <span className="bg-amber-500 text-slate-900 w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
                  <span>Compare quotes, ratings, and credentials. Click an advisor&apos;s name to see their full profile.</span>
                </li>
                <li className="flex gap-2">
                  <span className="bg-amber-500 text-slate-900 w-5 h-5 rounded-full font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
                  <span>Verify with the email you used to post, then accept the quote you want. Your details only go to the chosen advisor.</span>
                </li>
              </ol>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Icon name="shield-check" size={14} className="text-amber-700" />
                Trust &amp; safety
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                Every advisor on Invest.com.au has had their <strong>AFSL, ASIC, or TPB licence verified</strong>. We monitor licence status weekly and auto-pause anyone who lapses.
              </p>
            </div>

            <Link
              href="/quotes/post"
              className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-xl text-sm w-full"
            >
              Post your own quote
              <Icon name="arrow-right" size={14} />
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
