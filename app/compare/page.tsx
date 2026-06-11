import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import Icon from "@/components/Icon";
import CompareClient from "./CompareClient";
import GetMatchedEmbed from "@/components/get-matched/GetMatchedEmbed";
import { absoluteUrl, UPDATED_LABEL } from "@/lib/seo";
import { COMPARE_CATEGORY_COUNT, COMPARE_PLATFORM_TYPES, isCompareListable } from "@/lib/compare-engine";
import { speakableWebPageJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";
import HomeToolsStrip from "@/components/HomeToolsStrip";
import DirectoryBanners from "@/components/foreign-investment/DirectoryBanners";
import DirectoryHero from "@/components/directory/DirectoryHero";
import NextActions from "@/components/NextActions";

export const metadata = {
  title: "Compare Investing Platforms — Fees, Features & Safety",
  description: `Compare fees, features & safety across Australian investing platforms — shares, crypto, super & more. ${UPDATED_LABEL}.`,
  openGraph: {
    title: "Compare Platforms Side-by-Side",
    description: "Side-by-side comparison of fees, features, and safety for Australian platforms — shares, robo-advisors, crypto exchanges & more.",
    images: [{ url: "/api/og?title=Compare+Investing+Platforms&subtitle=Fees,+features+%26+safety+side-by-side&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/compare" },
};

export const revalidate = 1800; // ISR: revalidate every 30 min (core product page)

// Dedicated comparison pages that aren't covered by the in-page category pills
// (separate datasets/guides). Rendered as a quiet secondary link row on the
// /compare index — see SC-7 in docs/plans/DIRECTORY_UX_UNIFICATION.md.
const SPECIALISED_COMPARES: { label: string; href: string }[] = [
  { label: "Share trading", href: "/share-trading" },
  { label: "ETFs", href: "/compare/etfs" },
  { label: "Crypto", href: "/crypto" },
  { label: "Super funds", href: "/compare/super" },
  { label: "Savings", href: "/savings" },
  { label: "CFD & forex", href: "/cfd" },
  { label: "Insurance", href: "/compare/insurance" },
  { label: "Non-residents", href: "/compare/non-residents" },
];

function ComparePageSkeleton() {
  return (
    <div className="pt-5 pb-8 md:py-12">
      <div className="container-custom animate-pulse">
        <div className="h-7 w-48 md:h-10 md:w-80 bg-slate-200 rounded mb-1.5 md:mb-3" />
        <div className="h-3.5 w-56 md:h-5 md:w-64 bg-slate-100 rounded mb-3 md:mb-6" />
        {/* Mobile: filter + search row */}
        <div className="md:hidden flex gap-2 mb-3">
          <div className="h-8 w-16 bg-slate-100 rounded-full" />
          <div className="h-8 flex-1 bg-slate-100 rounded-full" />
        </div>
        {/* Desktop: filter pills */}
        <div className="hidden md:flex gap-2 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 w-20 bg-slate-100 rounded-full" />
          ))}
        </div>
        {/* Desktop table */}
        <div className="hidden md:block border border-slate-200 rounded-xl overflow-hidden">
          <div className="h-12 bg-slate-50 border-b border-slate-200" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center h-16 border-b border-slate-100 px-4 gap-4">
              <div className="w-5 h-5 bg-slate-100 rounded" />
              <div className="w-10 h-10 bg-slate-100 rounded-lg" />
              <div className="h-4 w-32 bg-slate-100 rounded" />
              <div className="h-4 w-20 bg-slate-100 rounded ml-auto" />
              <div className="h-4 w-20 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-100 rounded" />
              <div className="h-9 w-28 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 bg-slate-200 rounded-lg" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-slate-200 rounded mb-1" />
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-10 bg-slate-50 rounded-md" />
                ))}
              </div>
              <div className="h-9 bg-slate-200 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

async function CompareData() {
  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from('brokers')
    .select("id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, platform_type, deal, deal_text, deal_expiry, editors_pick, tagline, cta_text, affiliate_url, sponsorship_tier, benefit_cta, updated_at, fee_last_checked, fee_verified_date, status, promoted_placement, cpa_value, affiliate_priority, fee_source_url, fee_source_tcs_url, deal_source, min_deposit, payment_methods, markets, platforms, regulated_by, accepts_non_residents, requires_australian_address")
    .eq('status', 'active')
    // Revenue-weighted: promoted first, then by rating
    .order('promoted_placement', { ascending: false })
    .order('rating', { ascending: false });

  const activeBrokers = (brokers as Broker[]) || [];
  // JSON-LD must describe the same population the table can render — not the
  // full tracked universe (which includes platform types with no compare
  // category, e.g. CFD platforms that live on /cfd).
  const listableBrokers = activeBrokers.filter(isCompareListable);

  // JSON-LD structured data for search results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Compare Australian Investing Platforms",
    description: "Side-by-side comparison of fees, features, and safety for Australian share trading platforms.",
    numberOfItems: listableBrokers.length,
    itemListElement: listableBrokers.slice(0, 10).map((b: Broker, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      url: absoluteUrl(`/broker/${b.slug}`),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CompareClient brokers={activeBrokers} />
    </>
  );
}

export default async function ComparePage() {
  // Lightweight head-only count for the hero stat tiles — keeps the dark
  // stat-led hero consistent with /invest and /advisors without waiting on the
  // full broker payload (that still streams via <CompareData> in Suspense).
  type DealBroker = { name: string; slug: string; deal_text: string | null; affiliate_url: string | null };
  let platformCount = 0;
  let dealBroker: DealBroker | null = null;
  let latestFeeCheck: string | null = null;
  try {
    const supabase = await createClient();
    const [{ count }, { data: deal }, { data: fresh }] = await Promise.all([
      // Count only platforms the comparison table can actually list. The
      // predicate is derived from the table's own category schemas
      // (COMPARE_PLATFORM_TYPES + the crypto pill's is_crypto escape), so the
      // hero stat and the table row count cannot drift apart again
      // (2026-06-10 audit: hero claimed 115 tracked, table listed 83).
      supabase
        .from("brokers")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .or(`platform_type.in.(${COMPARE_PLATFORM_TYPES.join(",")}),is_crypto.eq.true`),
      // Top live broker deal — surfaced as a slim promo strip inside the hero.
      supabase
        .from("brokers")
        .select("name, slug, deal_text, affiliate_url")
        .eq("status", "active")
        .eq("deal", true)
        .not("deal_text", "is", null)
        .order("promoted_placement", { ascending: false })
        .order("affiliate_priority", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Most recent fee check — drives the hero freshness claim.
      supabase
        .from("brokers")
        .select("fee_last_checked")
        .eq("status", "active")
        .not("fee_last_checked", "is", null)
        .order("fee_last_checked", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    platformCount = count ?? 0;
    dealBroker = (deal as DealBroker | null) ?? null;
    latestFeeCheck = (fresh as { fee_last_checked: string | null } | null)?.fee_last_checked ?? null;
  } catch {
    platformCount = 0;
  }
  const platformLabel = platformCount > 0 ? `${platformCount}` : "100+";

  // Only claim "rechecked weekly" while the data backs it. The page also
  // renders FeesFreshnessIndicator ("Fees checked N days ago") from the same
  // column, so a hardcoded "weekly" goes visibly false the moment the recheck
  // pipeline stalls — a skeptical visitor sees both lines on one screen.
  const checkedAt = latestFeeCheck ? new Date(latestFeeCheck) : null;
  const checkedAtValid = checkedAt !== null && !isNaN(checkedAt.getTime());
  const daysSinceFeeCheck = checkedAtValid
    ? Math.floor((Date.now() - checkedAt.getTime()) / 86_400_000)
    : null;
  const feesCheckedWeekly = daysSinceFeeCheck !== null && daysSinceFeeCheck <= 8;
  const lastVerifiedLabel = checkedAtValid
    ? checkedAt.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
    : null;

  const dealPromo = dealBroker ? (
    <div className="flex items-center justify-between gap-3">
      <p className="flex min-w-0 items-center gap-2 text-[12.5px] text-white/80 md:text-[13px]">
        <Icon name="flame" size={14} className="shrink-0 text-coral-400" />
        <span className="truncate">
          <strong className="font-semibold text-white">{dealBroker.name}</strong>
          {dealBroker.deal_text ? <span className="text-white/60"> — {dealBroker.deal_text}</span> : null}
        </span>
      </p>
      <a
        href={dealBroker.affiliate_url ? `/go/${dealBroker.slug}` : `/broker/${dealBroker.slug}`}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className="shrink-0 rounded-lg bg-coral-500 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-coral-400"
      >
        Claim &rarr;
      </a>
    </div>
  ) : null;
  const heroStats = [
    { v: platformLabel, l: "Platforms tracked" },
    // Derived from CATEGORY_SCHEMAS — the hardcoded "9" went stale when a
    // tenth category shipped. Computed counts can't drift.
    { v: `${COMPARE_CATEGORY_COUNT}`, l: "Categories" },
    feesCheckedWeekly
      ? { v: "Weekly", l: "Fees rechecked" }
      : { v: lastVerifiedLabel ?? "Dated", l: "Fees last verified" },
    { v: "Free", l: "Independent" },
  ];

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://invest.com.au" },
      { "@type": "ListItem", position: 2, name: "Compare Platforms", item: "https://invest.com.au/compare" },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "What is the cheapest share trading platform in Australia?", acceptedAnswer: { "@type": "Answer", text: "Several platforms offer $0 ASX brokerage including CMC Markets (first trade per day) and Moomoo. Use our comparison table above to filter by lowest fees for your trading frequency." } },
      { "@type": "Question", name: "What does CHESS sponsored mean?", acceptedAnswer: { "@type": "Answer", text: "CHESS sponsorship means your shares are held directly in your name on the ASX sub-register via a HIN (Holder Identification Number). If your broker fails, your shares are protected. Not all brokers offer CHESS sponsorship." } },
      { "@type": "Question", name: "How do I choose the best investing platform?", acceptedAnswer: { "@type": "Answer", text: "Consider your trading frequency, preferred markets (ASX, US, crypto), fee sensitivity, and whether you need CHESS sponsorship. Our 60-second quiz can help you narrow down the best match for your situation." } },
    ],
  };

  // Speakable: the H1 + intro paragraph are the extractable AI-citation answer
  // region for "compare Australian investing platforms" queries.
  const speakableLd = speakableWebPageJsonLd({
    path: "/compare",
    name: "Compare Australian Investment Platforms",
    selectors: ["[data-speakable='compare-hero']"],
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }}
      />
      {/* SC-7: the sticky top CompareNav tab-bar was removed from the /compare
          index — it duplicated the in-page category pills (the single category
          control here) and read as a second, conflicting filter row. The
          specialised comparison pages it linked to are preserved as a quiet,
          clearly-secondary link row below the toolbar (see SPECIALISED_COMPARES). */}
      {/* Shared dark stat-led directory hero (matches /invest + /advisors).
          Server-rendered H1 streams immediately for crawlers; the speakable
          region is preserved via speakableId. */}
      <DirectoryHero
        breadcrumbLabel="Compare Platforms"
        pill={feesCheckedWeekly ? { label: "Live fee tracking", live: true } : undefined}
        headlineLead="Compare Australian investing platforms."
        headlineAccent={
          feesCheckedWeekly
            ? `${platformLabel} tracked · fees rechecked weekly.`
            : lastVerifiedLabel
              ? `${platformLabel} tracked · fees last verified ${lastVerifiedLabel}.`
              : `${platformLabel} tracked.`
        }
        subtitle="Side-by-side comparison of fees, features, and safety for Australian share trading, crypto, super and robo-advisor platforms."
        stats={heroStats}
        speakableId="compare-hero"
        promo={dealPromo}
      >
        <DirectoryBanners surface="compare" />
      </DirectoryHero>
      {/* Specialised comparisons — quiet link row (replaces the duplicate sticky
          CompareNav). Text links, deliberately not pill-styled, so they read as
          "go to a dedicated comparison" rather than "filter this table". */}
      <nav className="container-custom max-w-6xl pt-3" aria-label="Specialised comparisons">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs md:text-sm text-slate-500">
          <span className="font-semibold text-slate-700">Specialised comparisons:</span>
          {SPECIALISED_COMPARES.map((item, i) => (
            <span key={item.href} className="inline-flex items-center gap-x-3">
              {i > 0 && <span aria-hidden className="text-slate-300">·</span>}
              <Link href={item.href} className="hover:text-amber-700 hover:underline">
                {item.label}
              </Link>
            </span>
          ))}
        </div>
      </nav>
      <Suspense fallback={<ComparePageSkeleton />}>
        <CompareData />
      </Suspense>
      {/* Get-matched moved below the table — keeps the comparison itself near the
          fold; this is the "still not sure? build a plan" catch for scrollers. */}
      <div className="container-custom max-w-6xl pt-6">
        <GetMatchedEmbed context="platform_compare" />
      </div>
      {/* Personalised next-action strip — suppresses compare CTA since the user is already here */}
      <Suspense fallback={null}>
        <NextActions surface="compare" />
      </Suspense>
      <HomeToolsStrip />
      {/* Visible FAQ accordion — mirrors FAQPage JSON-LD for AI citation */}
      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {faqLd.mainEntity.map((item: { name: string; acceptedAnswer: { text: string } }) => (
              <details key={item.name} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {item.name}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{item.acceptedAnswer.text}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
      <div className="container-custom pb-8">
        <ComplianceFooter />
      </div>
    </>
  );
}
