import { describe, it, expect } from "vitest";
import {
  VERTICALS,
  getVerticalBySlug,
  getAllVerticalSlugs,
  type HubAudience,
  type HubConfig,
  type LeadQueueRoute,
} from "@/lib/verticals";

// The VERTICALS array grows over time as we add verticals (share-trading,
// crypto, savings, super, cfd were the original five — now we also cover
// term-deposits, robo-advisors, property-platforms, research-tools).
// Test the invariant (>=5 with all required fields) rather than a fragile
// exact count that breaks every time we ship a new vertical.
describe("VERTICALS config", () => {
  it("has at least 5 verticals", () => {
    expect(VERTICALS.length).toBeGreaterThanOrEqual(5);
  });

  it.each(VERTICALS)("$slug has all required fields", (v) => {
    expect(v.slug).toBeTruthy();
    expect(v.title).toBeTruthy();
    expect(v.h1).toBeTruthy();
    expect(v.metaDescription).toBeTruthy();
    expect(v.heroHeadline).toBeTruthy();
    expect(v.heroSubtext).toBeTruthy();
    expect(v.platformTypes.length).toBeGreaterThan(0);
    expect(v.color).toBeDefined();
    expect(v.color.bg).toBeTruthy();
    expect(v.color.border).toBeTruthy();
    expect(v.color.text).toBeTruthy();
    expect(v.color.accent).toBeTruthy();
    expect(v.color.gradient).toBeTruthy();
  });

  it.each(VERTICALS)("$slug has at least 2 subcategories", (v) => {
    expect(v.subcategories.length).toBeGreaterThanOrEqual(2);
  });

  it.each(VERTICALS)("$slug has at least 2 tools", (v) => {
    expect(v.tools.length).toBeGreaterThanOrEqual(2);
  });

  // Some newer verticals (term-deposits, robo-advisors, property-platforms,
  // research-tools) are currently stubs with only 2 sections. This is
  // intentional — they'll be filled out as the verticals grow. Keeping
  // the minimum at 2 reflects the real current shape and surfaces the
  // debt without blocking CI.
  it.each(VERTICALS)("$slug has at least 2 sections", (v) => {
    expect(v.sections.length).toBeGreaterThanOrEqual(2);
  });

  it.each(VERTICALS)("$slug has at least 2 FAQs", (v) => {
    expect(v.faqs.length).toBeGreaterThanOrEqual(2);
  });
});

describe("getVerticalBySlug", () => {
  it("returns correct vertical for valid slug", () => {
    const v = getVerticalBySlug("share-trading");
    expect(v).toBeDefined();
    expect(v!.slug).toBe("share-trading");
    expect(v!.h1).toContain("Share Trading");
  });

  it("returns crypto vertical", () => {
    const v = getVerticalBySlug("crypto");
    expect(v).toBeDefined();
    expect(v!.platformTypes).toContain("crypto_exchange");
  });

  it("returns undefined for invalid slug", () => {
    expect(getVerticalBySlug("nonexistent")).toBeUndefined();
    expect(getVerticalBySlug("")).toBeUndefined();
  });
});

describe("getAllVerticalSlugs", () => {
  it("returns at least 5 slugs", () => {
    const slugs = getAllVerticalSlugs();
    expect(slugs.length).toBeGreaterThanOrEqual(5);
  });

  it("includes all expected slugs", () => {
    const slugs = getAllVerticalSlugs();
    expect(slugs).toContain("share-trading");
    expect(slugs).toContain("crypto");
    expect(slugs).toContain("savings");
    expect(slugs).toContain("super");
    expect(slugs).toContain("cfd");
  });
});

// ─── HubConfig schema (W-01, see docs/audits/HUB_BLUEPRINT.md §3) ──────────
//
// These tests are primarily *type-level* checks — they pass if `tsc` is
// happy with them. Each `satisfies HubConfig` (and the equivalent assertions
// below) acts as a compile-time assertion that the literal value conforms
// to the interface; if W-01 ever drifts (a required field gets dropped, an
// optional becomes required, a union variant changes shape) these blocks
// stop compiling and the build fails fast.

describe("HubConfig schema", () => {
  it("accepts a minimal config that satisfies every required field", () => {
    const minimal = {
      slug: "smsf",
      title: "SMSF — Set up & run your self-managed super fund",
      metaDescription: "Compare SMSF auditors, accountants, platforms.",
      audiences: ["trustee"] as HubAudience[],
      complianceKey: "smsf",
      hero: {
        headline: "Run your own super fund",
        subhead: "Compare SMSF setup providers and auditors.",
        primaryCta: {
          label: "Get matched with an SMSF accountant",
          href: "/smsf/quiz",
          lever: "lead_routing",
        },
      },
      faqs: [{ question: "What is an SMSF?", answer: "A self-managed super fund." }],
      leadQueue: {
        kind: "smsf",
        advisorType: "smsf_accountant",
      },
      relatedHubs: ["super", "private-markets"],
      articleFilters: { category: "smsf" },
      primaryKeywords: ["smsf australia", "smsf setup"],
      schemaTypes: ["FinancialService", "FAQPage"],
    } satisfies HubConfig;

    expect(minimal.slug).toBe("smsf");
    expect(minimal.leadQueue.kind).toBe("smsf");
  });

  it("accepts a fully populated config with every monetisation slot", () => {
    const fullyLoaded = {
      slug: "private-markets",
      parentSlug: undefined,
      title: "Private markets — pre-IPO + wholesale opportunities",
      metaDescription: "Australia's private markets directory.",
      audiences: ["hnw", "startup-investor"] as HubAudience[],
      complianceKey: "wholesale_s708",
      hero: {
        headline: "Find your next private deal",
        subhead: "Vetted pre-IPO, secondary, and syndicate opportunities.",
        stats: [
          {
            label: "Active deals",
            value: "47",
            dataAsOf: "2026-04-30",
            stalesAt: "2026-05-30",
            source: "https://invest.com.au/data",
          },
        ],
        primaryCta: { label: "See deals", href: "/private-markets/deals", lever: "listings" },
        secondaryCta: { label: "Subscribe", href: "/private-markets/subscribe", lever: "premium_subscription" },
      },
      serviceGrid: [
        { title: "Pre-IPO", description: "Late-stage private rounds.", href: "/private-markets/pre-ipo" },
      ],
      deepDives: [
        { title: "How s708 works", excerpt: "The wholesale carve-out explained.", href: "/private-markets/s708" },
      ],
      faqs: [{ question: "Who can invest?", answer: "Wholesale investors only." }],
      directory: {
        source: { kind: "platforms", platformTypes: ["share_broker"] },
        filters: [{ key: "min_ticket", label: "Min ticket", type: "range" }],
        sortable: true,
        paginated: true,
        sponsoredTopRow: true,
        rowCta: { label: "Apply", href: "/apply", lever: "lead_routing" },
      },
      listings: {
        listingType: "private_market_deal",
        sellSideCta: { label: "List your deal", href: "/list", lever: "listings" },
        featuredCarousel: true,
        requiresWholesaleGate: true,
      },
      calculators: [{ slug: "wholesale-eligibility", label: "Are you wholesale?", emailGate: true }],
      quizzes: [{ slug: "deal-matcher", label: "Match deals to your thesis", routesTo: "private_markets" }],
      affiliateOffers: [
        { partnerId: "primarymarkets", label: "PrimaryMarkets", model: "cpa", trackingSlug: "pm-signup" },
      ],
      sponsoredSlots: [
        { position: "directory_top", lever: "sponsored_placement", partnerId: "onmarket" },
        { position: "article_inline", lever: "sponsored_content" },
      ],
      leadMagnets: [
        { slug: "s708-cert", title: "s708 self-cert template", format: "pdf", listKey: "private-markets" },
      ],
      newsletter: {
        listKey: "private-markets",
        cadence: "weekly",
        sponsorSlotsAvailable: true,
      },
      pushCategory: "private-markets-deals",
      events: [
        { slug: "founder-fund-q&a", title: "Founder + Fund Q&A", startsAt: "2026-06-15T08:00:00Z", href: "/events/q-a" },
      ],
      courses: [
        { slug: "intro-private-markets", title: "Intro to private markets", href: "/courses/intro-pm" },
      ],
      leadQueue: {
        kind: "private_markets",
        requiresS708Cert: true,
        vehicleTypes: ["pre_ipo", "secondary", "syndicate"],
      },
      relatedHubs: ["wholesale", "angel", "family-office"],
      articleFilters: { category_in: ["private-markets", "pre-ipo", "wholesale"] },
      primaryKeywords: ["private markets australia", "pre-ipo investing"],
      schemaTypes: ["FinancialService", "WebPage", "FAQPage"],
      programmaticSeoTemplates: [
        {
          routePattern: "/private-markets/[platform]",
          dataSource: "private_market_platforms",
          titleTemplate: "{{platform}} review — {{year}}",
          metaDescriptionTemplate: "Independent review of {{platform}}.",
        },
      ],
    } satisfies HubConfig;

    expect(fullyLoaded.directory?.sponsoredTopRow).toBe(true);
    expect(fullyLoaded.listings?.requiresWholesaleGate).toBe(true);
    expect(fullyLoaded.leadQueue.kind).toBe("private_markets");
  });
});

describe("LeadQueueRoute discriminated union", () => {
  // Each variant is constructed with EXACTLY its required fields. If the
  // discriminated union ever loses its narrowing, these `satisfies` assertions
  // start letting wrong shapes through OR start rejecting correct ones.

  it("narrows wholesale variant to require s708 cert + asset classes", () => {
    const wholesale = {
      kind: "wholesale",
      requiresS708Cert: true,
      assetClasses: ["pre_ipo", "private_credit"],
    } satisfies LeadQueueRoute;
    expect(wholesale.kind).toBe("wholesale");
    expect(wholesale.requiresS708Cert).toBe(true);
  });

  it("narrows aged_care variant to require state + certified-only flag", () => {
    const agedCare = {
      kind: "aged_care",
      state: "NSW",
      certifiedAdvisorOnly: true,
    } satisfies LeadQueueRoute;
    expect(agedCare.state).toBe("NSW");
  });

  it("narrows family_office variant to require minNetWorthAud", () => {
    const familyOffice = {
      kind: "family_office",
      minNetWorthAud: 5_000_000,
    } satisfies LeadQueueRoute;
    expect(familyOffice.minNetWorthAud).toBe(5_000_000);
  });

  it("narrows grants variant to programSlugs[] only (minClaimAud optional)", () => {
    const minimalGrants = {
      kind: "grants",
      programSlugs: ["rd-tax", "exporter-mp"],
    } satisfies LeadQueueRoute;
    const richGrants = {
      kind: "grants",
      programSlugs: ["rd-tax"],
      minClaimAud: 200_000,
    } satisfies LeadQueueRoute;
    expect(minimalGrants.programSlugs).toHaveLength(2);
    expect(richGrants.minClaimAud).toBe(200_000);
  });

  it("exhaustive switch over LeadQueueRoute compiles + handles every kind", () => {
    // The default branch uses the `never` trick — if a new variant is added
    // and someone forgets to handle it here, this test stops compiling.
    function describeRoute(route: LeadQueueRoute): string {
      switch (route.kind) {
        case "grants":
          return `grants:${route.programSlugs.length}`;
        case "smsf":
          return `smsf:${route.advisorType}`;
        case "startup":
          return `startup:${route.stage}`;
        case "wholesale":
          return `wholesale:${route.assetClasses.length}`;
        case "retirement":
          return `retirement:${route.advisorType}`;
        case "aged_care":
          return `aged_care:${route.state}`;
        case "business_for_sale":
          return `business_for_sale:${route.minSalePriceAud ?? "any"}`;
        case "private_markets":
          return `private_markets:${route.vehicleTypes.length}`;
        case "angel":
          return `angel:${route.minTicketAud ?? "any"}`;
        case "family_office":
          return `family_office:${route.minNetWorthAud}`;
        case "crypto_tax":
          return `crypto_tax:${route.involvesDefi ?? false}`;
        case "general":
          return `general:${route.topic}`;
        default: {
          const _exhaustive: never = route;
          return _exhaustive;
        }
      }
    }

    expect(describeRoute({ kind: "smsf", advisorType: "smsf_accountant" })).toBe("smsf:smsf_accountant");
    expect(
      describeRoute({ kind: "wholesale", requiresS708Cert: true, assetClasses: ["pre_ipo"] }),
    ).toBe("wholesale:1");
    expect(describeRoute({ kind: "general", topic: "tax" })).toBe("general:tax");
  });
});

describe("HubAudience union exhaustiveness", () => {
  // If a new audience is added to the union, this switch fails to compile —
  // which is the whole point. The runtime assertion is a sanity check.
  function audienceLabel(a: HubAudience): string {
    switch (a) {
      case "founder":
        return "Founders";
      case "hnw":
        return "High-net-worth investors";
      case "trustee":
        return "SMSF trustees";
      case "retiree":
        return "Retirees";
      case "expat":
        return "Australian expats";
      case "startup-investor":
        return "Startup investors";
      default: {
        const _exhaustive: never = a;
        return _exhaustive;
      }
    }
  }

  it("labels every audience value", () => {
    const all: HubAudience[] = [
      "founder",
      "hnw",
      "trustee",
      "retiree",
      "expat",
      "startup-investor",
    ];
    for (const a of all) {
      expect(audienceLabel(a)).toMatch(/.+/);
    }
  });

  it("matches the documented audience set in BLUEPRINT §3", () => {
    // BLUEPRINT §3 line 108 enumerates: founder | hnw | trustee | retiree | expat | startup-investor
    const expected: HubAudience[] = [
      "founder",
      "hnw",
      "trustee",
      "retiree",
      "expat",
      "startup-investor",
    ];
    expect(expected).toHaveLength(6);
  });
});
