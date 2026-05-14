import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import HomeHero from "@/components/HomeHero";
import HomeRouteCards from "@/components/HomeRouteCards";
import CountryToolsStripWrapper from "@/components/country-mode/CountryToolsStripWrapper";
import HomePathfinder from "@/components/HomePathfinder";
import GetMatchedEmbed from "@/components/get-matched/GetMatchedEmbed";
import HomeListingsTeaser, { type HomeListing } from "@/components/HomeListingsTeaser";
import HomeAdvisorsTeaser, { type HomeAdvisor } from "@/components/HomeAdvisorsTeaser";
import HomePostAJob from "@/components/HomePostAJob";
import HomeCompareDeepDive, { type CompareBroker } from "@/components/HomeCompareDeepDive";
import HomeCrossBorder from "@/components/HomeCrossBorder";
import HomeFridayBriefing from "@/components/HomeFridayBriefing";
import CountryListingsPreview from "@/components/country-mode/CountryListingsPreview";
import CountryExpertsPreview from "@/components/country-mode/CountryExpertsPreview";
import CountryComparePreview from "@/components/country-mode/CountryComparePreview";
import CountryPopularLinks from "@/components/country-mode/CountryPopularLinks";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import MobileBottomNav from "@/components/MobileBottomNav";
import { ORGANIZATION_JSONLD, SITE_URL } from "@/lib/seo";

export const metadata = {
  title: {
    absolute:
      "Compare Investing Platforms, Browse Investments for Sale, Find Experts — Invest.com.au",
  },
  description:
    "Compare brokers, crypto, super and savings. Browse Australian investments for sale — businesses, farmland, mining, property. Find a verified expert, or get matched in 60 seconds. Independent. ASIC-registered. General information only.",
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

  const BROKER_LISTING_COLUMNS =
    "id, name, slug, color, logo_url, rating, asx_fee, asx_fee_value, platform_type, sponsorship_tier, promoted_placement, editors_pick, status";

  const [
    { data: brokers },
    { count: professionalCount },
    { data: professionals },
    { count: listingCount },
    { data: listings },
  ] = await Promise.all([
    supabase
      .from("brokers")
      .select(BROKER_LISTING_COLUMNS)
      .eq("status", "active")
      .order("promoted_placement", { ascending: false })
      .order("rating", { ascending: false })
      .limit(80),
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
    supabase
      .from("investment_listings")
      .select(
        "id, title, slug, vertical, location_state, location_city, price_display, images, listing_type, key_metrics, status",
      )
      .eq("status", "active")
      .order("listing_type", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const brokerCount = brokers?.length || 0;
  const totalListingCount = listingCount ?? 0;
  const totalProfessionalCount = professionalCount ?? 0;

  const compareBrokers: ReadonlyArray<CompareBroker> = ((brokers as Broker[]) || []).map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    platform_type: b.platform_type ?? null,
    logo_url: b.logo_url ?? null,
    color: b.color ?? null,
    rating: b.rating ?? null,
    asx_fee: b.asx_fee ?? null,
    asx_fee_value: b.asx_fee_value ?? null,
    sponsorship_tier: b.sponsorship_tier ?? null,
    promoted_placement: b.promoted_placement ?? false,
    editors_pick: b.editors_pick ?? false,
  }));

  const advisorList: ReadonlyArray<HomeAdvisor> = (professionals ?? []) as HomeAdvisor[];

  // Live route-card preview slices — feed real data into the four cards on
  // the homepage so each one shows what's inside instead of just an icon.
  const topBrokersForCards = compareBrokers
    .slice(0, 6)
    .map((b) => ({ name: b.name, asx_fee: b.asx_fee }));

  const topAdvisorsForCards = advisorList
    .filter((a) => a.photo_url)
    .slice(0, 5)
    .map((a) => ({ name: a.name, photo_url: a.photo_url ?? null }));

  // Hero reel — needs broker color for the panel-1 dot.
  const topBrokersForHero = compareBrokers
    .slice(0, 3)
    .map((b) => ({ name: b.name, asx_fee: b.asx_fee, color: b.color }));

  const topAdvisorsForHero = advisorList
    .filter((a) => a.photo_url)
    .slice(0, 4)
    .map((a) => ({ name: a.name, photo_url: a.photo_url ?? null }));

  // Curate listings for the homepage teaser:
  //   1. Prefer listings with at least one image (better hero unit)
  //   2. Weight by paid tier: premium > featured > standard
  //   3. Round-robin across verticals so the grid isn't dominated by one category
  const rawListings = (listings ?? []) as HomeListing[];
  const tierWeight: Record<string, number> = { premium: 3, featured: 2, standard: 1 };
  const scored = rawListings
    .map((l) => ({
      l,
      hasImg: !!(l.images && l.images.length > 0 && l.images[0]),
      tier: tierWeight[l.listing_type ?? "standard"] ?? 0,
    }))
    .sort((a, b) => {
      if (a.hasImg !== b.hasImg) return a.hasImg ? -1 : 1;
      return b.tier - a.tier;
    });

  const perVerticalCap = 2;
  const verticalCounts = new Map<string, number>();
  const curated: HomeListing[] = [];
  const overflow: HomeListing[] = [];
  for (const { l } of scored) {
    const used = verticalCounts.get(l.vertical) ?? 0;
    if (used < perVerticalCap) {
      curated.push(l);
      verticalCounts.set(l.vertical, used + 1);
    } else {
      overflow.push(l);
    }
  }
  const listingList: ReadonlyArray<HomeListing> = [...curated, ...overflow].slice(0, 60);

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
              "Compare brokers, crypto, super and savings. Browse Australian investments for sale — businesses, farmland, mining, property. Find a verified expert, or get matched in 60 seconds. Independent. ASIC-registered. General information only.",
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

      <ScrollFadeIn>
        <section className="container-custom my-10">
          <GetMatchedEmbed context="homepage" />
        </section>
      </ScrollFadeIn>

      <ScrollFadeIn>
        <HomePathfinder />
      </ScrollFadeIn>

      {/* Country Mode preview wrappers — read iv_intent_country cookie in
      their own subtree so the rest of the homepage stays ISR-cacheable.
      Each renders nothing when no country selected, when the country has
      no homepage* filters configured, or when the filtered slice falls
      below the supply threshold. The global teasers below carry the
      experience in those cases. See docs/architecture/country-mode.md. */}
      <CountryComparePreview />

      <ScrollFadeIn>
        <HomeCompareDeepDive brokers={compareBrokers} />
      </ScrollFadeIn>

      <CountryListingsPreview />

      <ScrollFadeIn>
        <HomeListingsTeaser listings={listingList} totalCount={totalListingCount} />
      </ScrollFadeIn>

      <CountryExpertsPreview />

      <ScrollFadeIn>
        <HomeAdvisorsTeaser advisors={advisorList} totalCount={totalProfessionalCount} />
      </ScrollFadeIn>

      <ScrollFadeIn>
        <HomePostAJob />
      </ScrollFadeIn>

      <ScrollFadeIn>
        <HomeCrossBorder />
      </ScrollFadeIn>

      <ScrollFadeIn>
        <HomeFridayBriefing />
      </ScrollFadeIn>

      <ScrollFadeIn>
        <CountryToolsStripWrapper />
      </ScrollFadeIn>

      <MobileBottomNav />
    </div>
  );
}
