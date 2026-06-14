import { createClient } from "@/lib/supabase/server";
import SinceYouWereHere from "@/components/SinceYouWereHere";
import { getActiveBrokersListing } from "@/lib/cached-data";
import HomeHero from "@/components/HomeHero";
import HomeRouteCards from "@/components/HomeRouteCards";
import CountryToolsStripWrapper from "@/components/country-mode/CountryToolsStripWrapper";
import HomeGetMatched from "@/components/HomeGetMatched";
import HomeListingsTeaser, { type HomeListing } from "@/components/HomeListingsTeaser";
import HomeAdvisorsTeaser, { type HomeAdvisor } from "@/components/HomeAdvisorsTeaser";
import HomeSquadOfTheMonth from "@/components/HomeSquadOfTheMonth";
import HomeUpcomingEvents from "@/components/HomeUpcomingEvents";
import HomePostAJob from "@/components/HomePostAJob";
import HomeCrossBorder from "@/components/HomeCrossBorder";
import HomeFridayBriefing from "@/components/HomeFridayBriefing";
import CountryListingsPreview from "@/components/country-mode/CountryListingsPreview";
import CountryExpertsPreview from "@/components/country-mode/CountryExpertsPreview";
import CountryComparePreview from "@/components/country-mode/CountryComparePreview";
import CountryPopularLinks from "@/components/country-mode/CountryPopularLinks";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import HomepagePersonalisedStrip from "@/components/HomepagePersonalisedStrip";
import HomeMarketToday from "@/components/HomeMarketToday";
import HomeFeedSection from "@/components/HomeFeedSection";
import { curateHomepageListings } from "@/lib/home-listing-curation";
import { ORGANIZATION_JSONLD, SITE_URL } from "@/lib/seo";
import { Suspense } from "react";

export const metadata = {
  title: {
    absolute:
      "Compare Investing Platforms, Browse Investments for Sale, Find Experts — Invest.com.au",
  },
  description:
    "Compare brokers, super, crypto and savings. Browse investments for sale — farmland, mining, property. Find a verified expert or get matched fast.",
  openGraph: {
    title:
      "Compare Investing Platforms, Browse Investments for Sale, Find Experts — Invest.com.au",
    description:
      "Compare platforms, browse Australian investments for sale, find experts, or get matched in 60 seconds.",
    url: "/",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image" as const,
    title:
      "Compare Investing Platforms, Browse Investments for Sale, Find Experts — Invest.com.au",
    description:
      "Compare platforms, browse Australian investments for sale, find experts, or get matched in 60 seconds.",
  },
  alternates: { canonical: "/" },
};

export const revalidate = 3600;

export default async function HomePage() {
  const supabase = await createClient();

  const [
    allActiveBrokers,
    { count: professionalCount },
    { data: professionals },
    { count: listingCount },
    { data: listings },
  ] = await Promise.all([
    // Cached cross-worker via lib/cached-data.ts (24h unstable_cache).
    // Returns all active brokers sorted by rating; we re-sort below to
    // prefer promoted_placement and trim to 80 (matching prior query).
    getActiveBrokersListing(),
    supabase
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("professionals")
      .select(
        "slug, name, firm_name, type, location_display, location_state, rating, review_count, photo_url, fee_description, specialties, verified",
      )
      .eq("status", "active")
      .eq("verified", true)
      .order("rating", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(18),
    supabase
      .from("investment_listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    // No tier ordering here — `listing_type` is text, so DESC puts
    // "standard" above "premium"/"featured" and starves the curation
    // window of imaged paid listings. Fetch the active set newest-first
    // and let curateHomepageListings do the actual ranking.
    supabase
      .from("investment_listings")
      .select(
        "id, title, slug, vertical, sub_category, listing_kind, location_state, location_city, price_display, asking_price_cents, images, listing_type, key_metrics, status",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  // Match prior query ordering (promoted_placement DESC, rating DESC, limit 80).
  const brokers = [...allActiveBrokers]
    .sort((a, b) => {
      const promotedDiff =
        Number(b.promoted_placement ?? 0) - Number(a.promoted_placement ?? 0);
      if (promotedDiff !== 0) return promotedDiff;
      return (b.rating ?? 0) - (a.rating ?? 0);
    })
    .slice(0, 80);

  const brokerCount = brokers.length;
  const totalListingCount = listingCount ?? 0;
  const totalProfessionalCount = professionalCount ?? 0;

  const advisorList: ReadonlyArray<HomeAdvisor> = (professionals ?? []) as HomeAdvisor[];

  // Live route-card preview slices — feed real data into the four cards on
  // the homepage so each one shows what's inside instead of just an icon.
  const topBrokersForCards = brokers
    .slice(0, 6)
    .map((b) => ({ name: b.name, asx_fee: b.asx_fee ?? null }));

  const topAdvisorsForCards = advisorList
    .filter((a) => a.photo_url)
    .slice(0, 5)
    .map((a) => ({ name: a.name, photo_url: a.photo_url ?? null }));

  // Hero reel — needs broker color for the panel-1 dot.
  const topBrokersForHero = brokers
    .slice(0, 3)
    .map((b) => ({ name: b.name, asx_fee: b.asx_fee ?? null, color: b.color ?? null }));

  const topAdvisorsForHero = advisorList
    .filter((a) => a.photo_url)
    .slice(0, 4)
    .map((a) => ({ name: a.name, photo_url: a.photo_url ?? null }));

  // Curate listings for the homepage teaser — image-first, paid-tier
  // weighted, vertical round-robin, equity raises excluded, paid
  // placements capped in the visible window. Pure + unit-tested in
  // lib/home-listing-curation.ts.
  const rawListings = (listings ?? []) as HomeListing[];
  const listingList: ReadonlyArray<HomeListing> = curateHomepageListings(rawListings).slice(0, 60);

  const topListingsForCards = listingList
    .filter((l) => l.images && l.images.length > 0 && l.images[0])
    .slice(0, 3)
    .map((l) => ({
      id: l.id,
      title: l.title,
      image: (l.images && l.images[0]) ? l.images[0] : null,
    }));

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            ...ORGANIZATION_JSONLD,
            description:
              "Compare brokers, crypto, super and savings. Browse Australian investments for sale — businesses, farmland, mining, property. Find a verified expert, or get matched in 60 seconds. Independent since 1996. General information only.",
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: "How do I choose between Australian investing platforms?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Compare key fees, FX rates, available markets, CHESS sponsorship and features. Use the platform tools at ${SITE_URL}/compare to filter platforms by your own criteria. General information only — always check licensing, fees and suitability.`,
                },
              },
              {
                "@type": "Question",
                name: "Where can I browse Australian investments for sale?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Browse the marketplace at ${SITE_URL}/invest — businesses for sale, mining, farmland, commercial property, renewable energy projects, franchises, IPOs and more. These are real opportunities listed by owners and operators, not recommendations; always perform due diligence.`,
                },
              },
              {
                "@type": "Question",
                name: "How do I find an Australian financial expert or adviser?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Browse specialists at ${SITE_URL}/advisors — financial advisers, mortgage brokers, buyer's agents, SMSF accountants, tax agents and cross-border specialists. Introductions only — always check licensing, authorisation, fees and suitability.`,
                },
              },
              {
                "@type": "Question",
                name: "What does Get matched do?",
                acceptedAnswer: {
                  "@type": "Answer",
                  text: `Get matched is a short 4-question flow at ${SITE_URL}/quiz that routes you to the right next step — a platform to compare, an opportunity to browse, an expert to contact, or a guide to read — based on your situation. 60 seconds. No email needed.`,
                },
              },
            ],
          }),
        }}
      />

      {/* Personalised strip — visible to signed-in and returning visitors;
          renders null for anonymous / first-time visitors. Wrapped in its
          own Suspense so the async auth read never blocks the ISR-cached
          static content below. The single welcome-back surface — saved
          items, quiz resume and recommendations all live here. */}
      <HomepagePersonalisedStrip />
      {/* D10: factual fee changes on brokers this visitor actually viewed
          (anonymous, localStorage-diffed). Renders nothing without a change. */}
      <SinceYouWereHere />

      <HomeHero
        topBrokers={topBrokersForHero}
        topListings={topListingsForCards}
        topAdvisors={topAdvisorsForHero}
        brokerCount={brokerCount}
        listingCount={totalListingCount}
        advisorCount={totalProfessionalCount}
      />

      {/* Temporarily hidden for the next few months. Keep the component intact
          so the homepage AI concierge entry can be restored without rebuilding it. */}

      {/* Decision Cockpit (Phase 0) — personalised activity feed for logged-in
          users, directly under the hero (renders null for anonymous visitors,
          who get the marketing hero alone). Streams in via Suspense so the ISR
          shell stays cacheable. See docs/plans/DECISION_COCKPIT.md. */}
      <Suspense fallback={null}>
        <HomeFeedSection />
      </Suspense>

      {/* One "Today's market" band — Invest Score gauge, standout rate and
          latest rate changes in a single card (was three stacked strips). */}
      <HomeMarketToday />

      <ScrollFadeIn>
        <HomeRouteCards
          listingCount={totalListingCount}
          professionalCount={totalProfessionalCount}
          brokerCount={brokerCount}
          topBrokers={topBrokersForCards}
          topListings={topListingsForCards}
          topAdvisors={topAdvisorsForCards}
        />
      </ScrollFadeIn>

      <CountryPopularLinks />

      {/* Country Mode preview wrappers — read iv_intent_country cookie in
      their own subtree so the rest of the homepage stays ISR-cacheable.
      Each renders nothing when no country selected, when the country has
      no homepage* filters configured, or when the filtered slice falls
      below the supply threshold. The global teasers below carry the
      experience in those cases. See docs/architecture/country-mode.md. */}
      <CountryComparePreview />

      <CountryListingsPreview />

      <ScrollFadeIn>
        <HomeListingsTeaser listings={listingList} totalCount={totalListingCount} />
      </ScrollFadeIn>

      {/* Single consolidated get-matched band — the one catch-all funnel,
          placed after platforms + opportunities and leading into experts.
          Replaces the former top-of-page triple-up (goal-chip grid +
          pathfinder 3-step) and the duplicate advisor how-it-works block. */}
      <ScrollFadeIn>
        <HomeGetMatched />
      </ScrollFadeIn>

      <CountryExpertsPreview />

      {/* Experts band — advisor grid, then the compact squad spotlight,
          upcoming-events strip and post-a-request strip dock underneath
          as one visual unit. */}
      <ScrollFadeIn>
        <HomeAdvisorsTeaser advisors={advisorList} totalCount={totalProfessionalCount} />
      </ScrollFadeIn>

      <HomeSquadOfTheMonth />

      <HomeUpcomingEvents />

      <HomePostAJob />

      <ScrollFadeIn>
        <HomeCrossBorder />
      </ScrollFadeIn>

      <ScrollFadeIn>
        <CountryToolsStripWrapper />
      </ScrollFadeIn>

      <ScrollFadeIn>
        <HomeFridayBriefing />
      </ScrollFadeIn>
    </div>
  );
}
