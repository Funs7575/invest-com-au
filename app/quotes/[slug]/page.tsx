import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import QuoteBidsClient from "./QuoteBidsClient";
import CountdownPill from "./CountdownPill";
import QuoteQAClient from "./QuoteQAClient";
import InstantMatchPanel from "./InstantMatchPanel";
import ReopenJobClient from "./ReopenJobClient";
import {
  getFeeBenchmark,
  percentileInfoForBid,
  type FeePercentileInfo,
} from "@/lib/fee-benchmark";
import { logger } from "@/lib/logger";
import DecisionKit from "@/components/decision-kit/DecisionKit";
import { loadDecisionKit } from "@/lib/decision-kit/load";
import {
  auctionRoundsEnabled,
  normaliseVisibility,
  shouldHideBidAmounts,
  finalRoundActive,
  bidWasCountered,
  isFinalRoundBid,
  normaliseCounterStatus,
} from "@/lib/auction-rounds";
import QuoteMechanismExplainer from "./QuoteMechanismExplainer";

const log = logger("quote-detail-page");

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
  contact_email: string | null;
  status: string;
  ends_at: string;
  winning_bid_id: number | null;
  created_at: string;
  // Idea #11 — read fail-soft (undefined when columns absent / migration unrun).
  bid_visibility?: string | null;
  final_round_started_at?: string | null;
  final_round_ends_at?: string | null;
}

interface BidRow {
  id: number;
  bid_amount: number;
  status: string;
  created_at: string;
  advisor_id: number;
  // Idea #11 — round + counter columns; fail-soft.
  round_number?: number | null;
  counter_status?: string | null;
  counter_amount?: number | null;
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
    .select("id, slug, job_title, job_description, budget_band, advisor_types, location, contact_name, contact_email, status, ends_at, winning_bid_id, created_at")
    .eq("slug", slug)
    .eq("is_public", true)
    .eq("source", "public_job")
    .maybeSingle();

  if (!jobRaw) notFound();
  const job = jobRaw as JobData & { contact_email: string | null };

  // Decision Kit owner check — same email-as-key model as the accept flow:
  // the verified owner is the visitor who arrived with ?email= matching the
  // email they posted with. Drives the (flag-gated) scorecard surface; the
  // comparison matrix + call scripts render for everyone.
  const ownerEmail =
    email && (job.contact_email ?? "").toLowerCase() === email.toLowerCase().trim()
      ? email.toLowerCase().trim()
      : null;

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

  // ── Idea #11 — sealed bids / best-and-final / counter-offers ──────────────
  // The whole mechanic is gated by the auction_rounds flag (keyed by the
  // poster's email for sticky rollout). Reads of the new columns are done in a
  // SEPARATE, fail-soft query so that if the migration hasn't been applied the
  // existing selects above never break — the page degrades to today's behaviour.
  const roundsEnabled = await auctionRoundsEnabled(job.contact_email);
  let visibility: "open" | "sealed" = "open";
  const counterByBidId: Record<number, { status: string; amount: number | null }> = {};
  const finalRoundBidIds = new Set<number>();
  let isFinalRoundLive = false;

  if (roundsEnabled) {
    try {
      const { data: roundsJob } = await supabase
        .from("advisor_auctions")
        .select("bid_visibility, final_round_started_at, final_round_ends_at")
        .eq("id", job.id)
        .maybeSingle();
      if (roundsJob) {
        visibility = normaliseVisibility(
          (roundsJob as { bid_visibility?: string | null }).bid_visibility,
        );
        job.bid_visibility = (roundsJob as { bid_visibility?: string | null }).bid_visibility ?? null;
        job.final_round_started_at =
          (roundsJob as { final_round_started_at?: string | null }).final_round_started_at ?? null;
        job.final_round_ends_at =
          (roundsJob as { final_round_ends_at?: string | null }).final_round_ends_at ?? null;
        isFinalRoundLive = finalRoundActive(job);
      }

      const { data: roundsBids } = await supabase
        .from("advisor_auction_bids")
        .select("id, round_number, counter_status, counter_amount")
        .eq("auction_id", job.id);
      for (const rb of (roundsBids ?? []) as BidRow[]) {
        if (isFinalRoundBid(rb)) finalRoundBidIds.add(rb.id);
        const cs = normaliseCounterStatus(rb.counter_status);
        if (cs) counterByBidId[rb.id] = { status: cs, amount: rb.counter_amount ?? null };
      }
    } catch (err) {
      // Columns absent / dormant — keep today's behaviour.
      log.warn("Auction-rounds read failed (dormant)", {
        slug: job.slug,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // WHO-SEES-WHAT: hide bid amounts (and the fee-percentile chips + Decision Kit
  // amount column) when the auction is sealed, still open, and the viewer is NOT
  // the verified owner. The owner (consumer) always sees their own auction's
  // amounts; everyone else sees count only until close.
  const hideBidAmounts = shouldHideBidAmounts(job, ownerEmail != null);

  // Q&A thread (public)
  const { data: qaRaw } = await supabase
    .from("quote_qa")
    .select(`
      id, advisor_id, author_display_name, body, is_question, parent_id, created_at,
      professionals:advisor_id ( slug, type, verified )
    `)
    .eq("auction_id", job.id)
    .eq("is_removed", false)
    .order("created_at", { ascending: true });
  const qa = (qaRaw ?? []) as unknown as Parameters<typeof QuoteQAClient>[0]["initial"];

  const excludeAdvisorIds = bids.map((b) => b.professionals?.id).filter((id): id is number => id != null);

  // Fee-benchmark context per bid (only when the matching service-type ×
  // state cell met the minimum sample). Never let benchmark issues break
  // the quote page — the chip simply doesn't render.
  // Idea #11: when bid amounts are hidden (sealed, pre-reveal, non-owner) the
  // percentile chips are derived from those amounts, so they must hide too —
  // skip building feeContext entirely for this viewer.
  const feeContext: Record<number, FeePercentileInfo> = {};
  const primaryType = job.advisor_types?.[0];
  if (primaryType && bids.length > 0 && !hideBidAmounts) {
    try {
      const benchmark = await getFeeBenchmark();
      for (const b of bids) {
        const info = percentileInfoForBid(benchmark, primaryType, job.location, b.bid_amount);
        if (info) feeContext[b.id] = info;
      }
    } catch (err) {
      log.warn("Fee benchmark unavailable for quote page", {
        slug: job.slug,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Decision Kit — compose a respondent comparison + intro-call scripts from
  // the active bids (cheapest first, matching the bid list order). Fails soft;
  // an empty kit simply doesn't render. Scorecards are flag-gated + owner-only.
  const activeBids = bids.filter(
    (b) => b.professionals?.id != null && b.status !== "withdrawn",
  );
  const decisionKit =
    activeBids.length > 0
      ? await loadDecisionKit({
          briefId: job.id,
          ownerEmail,
          serviceType: job.advisor_types?.[0] ?? null,
          inputs: activeBids.map((b) => ({
            professionalId: b.professionals!.id,
            // Hide the amount column from the Decision Kit matrix too when
            // amounts are sealed from this viewer (idea #11).
            amountCents: hideBidAmounts ? null : b.bid_amount,
            bidId: b.id,
          })),
        })
      : null;

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

      {/* Compact light header — house directory idiom (B14) */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-5 md:pt-5">
          <nav
            aria-label="Breadcrumb"
            className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[11px] md:text-xs text-slate-500"
          >
            <Link href="/quotes" className="hover:text-slate-700">All quotes</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-600">{job.location || "Australia"}</span>
          </nav>

          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-[1.9rem] max-w-3xl">
            {job.job_title}
          </h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
              <Icon name="map-pin" size={12} className="text-slate-500" />
              {job.location || "AU"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700">
              <Icon name="wallet" size={12} className="text-slate-500" />
              {BUDGET_LABELS[job.budget_band] || "Budget TBD"}
            </span>
            <CountdownPill endsAt={job.ends_at} status={job.status} />
            <span className="text-xs text-slate-500">
              {bids.length} {bids.length === 1 ? "quote" : "quotes"}
            </span>
            {roundsEnabled && visibility === "sealed" && (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">
                <Icon name="lock" size={11} />
                Sealed bids
              </span>
            )}
            {roundsEnabled && isFinalRoundLive && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">
                <Icon name="zap" size={11} />
                Final round live
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-6 md:py-8">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
          {/* Job description */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <h2 className="text-base font-bold text-slate-900 mb-3">Request details</h2>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{job.job_description}</p>

              {job.advisor_types && job.advisor_types.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
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

            {/* Instant matches — only when there are no bids yet */}
            {bids.length === 0 && job.status === "open" && (
              <InstantMatchPanel
                advisorTypes={job.advisor_types ?? []}
                locationState={job.location}
                excludeAdvisorIds={excludeAdvisorIds}
              />
            )}

            {/* Re-open block — only when expired with no winner */}
            {isClosedByStatus && !job.winning_bid_id && (
              <ReopenJobClient slug={job.slug} ownerEmailFromUrl={email || ""} />
            )}

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
                isFinalRound: finalRoundBidIds.has(b.id),
                wasCountered: bidWasCountered(b),
                counter: counterByBidId[b.id]
                  ? {
                      status: counterByBidId[b.id]!.status,
                      amount: counterByBidId[b.id]!.amount,
                    }
                  : null,
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
              feeContext={feeContext}
              ownerEmailFromUrl={email || ""}
              hideBidAmounts={hideBidAmounts}
              isOwner={ownerEmail != null}
              roundsEnabled={roundsEnabled}
              finalRoundLive={isFinalRoundLive}
              finalRoundEndsAt={job.final_round_ends_at ?? null}
              finalRoundStarted={Boolean(job.final_round_started_at)}
            />

            {/* Decision Kit — respondent comparison, intro-call scripts, and
                (flag-gated, owner-only) post-call scorecards. */}
            {decisionKit && decisionKit.respondents.length > 0 && (
              <DecisionKit
                slug={job.slug}
                contactEmail={ownerEmail}
                respondents={decisionKit.respondents}
                script={decisionKit.script}
                amountLabel="Quote"
                scorecardsEnabled={decisionKit.scorecardsEnabled}
                initialScorecards={decisionKit.initialScorecards}
              />
            )}

            {/* Public Q&A */}
            <QuoteQAClient slug={job.slug} initial={qa} ownerEmailFromUrl={email || ""} />
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Icon name="info" size={14} className="text-slate-500" />
                How this works
              </h3>
              <ol className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
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

            {/* Idea #11 — factual mechanism explainer (sealed / final round /
                counter), only when the flag is on. Compliance footer included. */}
            {roundsEnabled && (
              <QuoteMechanismExplainer visibility={visibility} isOwner={ownerEmail != null} />
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Icon name="shield-check" size={14} className="text-amber-700" />
                Trust &amp; safety
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed">
                Every advisor on Invest.com.au has had their <strong>AFSL, ASIC, or TPB licence verified</strong>. We monitor licence status weekly and auto-pause anyone who lapses.
              </p>
            </div>

            <Button
              href="/quotes/post"
              className="w-full"
              icon={<Icon name="arrow-right" size={14} />}
            >
              Post your own quote
            </Button>
          </aside>
        </div>
      </section>
    </>
  );
}
