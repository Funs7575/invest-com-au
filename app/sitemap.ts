import { createClient } from "@/lib/supabase/server";
import type { MetadataRoute } from "next";
import { QUESTIONS } from "@/lib/questions-data";
import { getAllCategorySlugs } from "@/lib/best-broker-categories";
import { getAllCostScenarioSlugs } from "@/lib/cost-scenarios";
import { getAllCitySlugs } from "@/lib/cities";
import { getAllGuideSlugs } from "@/lib/how-to-guides";
import {
  getOpportunityCategories,
  getAllSubcategorySlugs,
} from "@/lib/invest-categories";
import { BEST_FOR_COMBOS } from "@/lib/invest-best-for";
import { STATE_SURCHARGES } from "@/lib/firb-data";
import { listingUrl } from "@/lib/listing-url";
import type { InvestListingVertical, PlatformType } from "@/lib/types";
import { generateVersusPairs } from "@/lib/versus-pairs";
import { BCP47_TAG } from "@/lib/i18n/locales";
import { AUSTRALIAN_STATES } from "@/lib/seo/best-pages";
import { getEnabledIntents } from "@/lib/getmatched/intents";
import { logger } from "@/lib/logger";
import {
  registerMeta as adviserRegisterMeta,
  allRegisterAdvisers,
} from "@/lib/adviser-register";
import { superFundsMeta, allSuperFunds } from "@/lib/super-funds";
import { ghostTickersMeta, allGhostTickers } from "@/lib/ghost-tickers";
import { postcodeAtlasMeta, allPostcodes } from "@/lib/postcode-atlas";
import { FEE_DRAG_SCENARIOS } from "@/lib/fee-drag";
import { CGT_SCENARIOS } from "@/lib/cgt-scenarios";

const log = logger("sitemap");

// Regenerate each shard at most once per day — avoids per-request DB queries
export const revalidate = 86400;

// ─── Shard IDs ────────────────────────────────────────────────────────────────
// 0  static pages
// 1  localized / hreflang pages
// 2  brokers + best/best-for + versus + cost scenarios
// 3  articles + scenarios + reports + alerts
// 4  advisors (profiles, type×state, type×city, find-advisor)
// 5  glossary + how-to + invest-categories + marketplace
// 6  property + suburb guides + investing-cities
// 7  misc (authors, reviewers, quotes, newsletter, grants, investingFor, events, afsl, feed)
// 8  community thread pages (/community/[category]/[threadId])
// ─────────────────────────────────────────────────────────────────────────────

export function generateSitemaps() {
  return [
    { id: 0 },
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 4 },
    { id: 5 },
    { id: 6 },
    { id: 7 },
    { id: 8 },
  ];
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";
}

async function getSupabase() {
  const hasSupabase = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return hasSupabase ? await createClient() : null;
}

// ─── Shard builders ───────────────────────────────────────────────────────────

async function buildShard0(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const highPriority = new Set(["/compare", "/get-matched", "/reviews", "/deals", "/share-trading", "/crypto", "/savings", "/super", "/cfd", "/term-deposits", "/robo-advisors", "/versus", "/how-to", "/invest", "/foreign-investment", "/global-investing", "/etfs", "/insurance", "/tax", "/property", "/grants", "/grants/rd-tax-incentive", "/smsf/setup", "/smsf/crypto", "/smsf/property", "/sell-business", "/sell-business/valuation", "/dividends", "/dividends/franking-credits", "/negative-gearing", "/lump-sum-investing", "/lump-sum-investing/redundancy", "/lump-sum-investing/inheritance", "/halal-investing", "/learn", "/first-home-buyer", "/redundancy", "/inheritance", "/raise"]);
  const medPriority = new Set(["/calculators", "/articles", "/scenarios", "/switch", "/stories", "/benchmark", "/health-scores", "/alerts", "/whats-new", "/costs", "/fee-impact", "/fee-alerts", "/rate-alerts", "/compound-interest-calculator", "/dividend-reinvestment-calculator", "/fire-calculator", "/property-vs-shares-calculator", "/super-contributions-calculator", "/tco-calculator", "/invest/mining", "/invest/buy-business", "/invest/farmland", "/invest/commercial-property", "/invest/renewable-energy", "/invest/startups", "/compare/non-residents", "/compare/money-transfer", "/grants/emdg", "/grants/industry-growth-program", "/grants/eligibility-quiz", "/smsf/investment-strategy", "/smsf/checklist", "/sell-business/checklist", "/visa-investment", "/dividends/calculator", "/negative-gearing/calculator", "/lump-sum-investing/calculator",
    "/wealth-stack", "/startup/grants", "/lic-screener", "/tools/subscription-audit",
    "/questions", ...QUESTIONS.map((q) => `/questions/${q.slug}`)]);

  const staticPaths = [
    "", "/compare", "/versus", "/reviews", "/calculators",
    "/term-deposits", "/robo-advisors", "/property-platforms", "/research-tools",
    "/invest", "/invest/funds",
    "/invest/listings", "/invest/alternatives/platforms", "/invest/alternatives/guides",
    // Browse-Opportunities (intent: opportunity) — IA refactor 2026-05-07.
    // The 4 Compare-tagged slugs (forex, managed-funds, dividend-investing,
    // ipos) are 301-redirected via next.config.ts and intentionally absent
    // from the sitemap. The 13 Guide-tagged slugs (sector hubs +
    // smsf/options-trading/reits/bonds/hybrid-securities/crypto-staking/
    // ipo-calendar/commodities) stay live but are surfaced lower-priority.
    "/invest/mining", "/invest/buy-business", "/invest/franchise",
    "/invest/farmland", "/invest/commercial-property", "/invest/renewable-energy",
    "/invest/startups", "/invest/private-credit", "/invest/alternatives",
    "/invest/infrastructure", "/invest/private-equity", "/invest/pre-ipo",
    "/invest/royalties", "/invest/income-assets", "/invest/digital-infrastructure",
    "/invest/public-social-infrastructure", "/invest/carbon-environmental-markets",
    // Sector hubs (intent: guide)
    "/invest/oil-gas", "/invest/lithium", "/invest/uranium", "/invest/hydrogen", "/invest/gold",
    // Asset-class education (intent: guide) — kept for SEO continuity
    "/invest/smsf", "/invest/options-trading", "/invest/reits",
    "/invest/bonds", "/invest/hybrid-securities", "/invest/crypto-staking",
    "/invest/ipo-calendar", "/invest/commodities",
    "/smsf", "/smsf/auditors",
    "/research",
    // /invest/X/listings pages are generated programmatically in shard 2 via
    // getOpportunityCategories() — do NOT hardcode them here to avoid duplication.
    // These non-opportunity invest paths (aquaculture, livestock, etc.) are
    // guide-only and have no /listings subdirectory.
    "/invest/aquaculture",
    "/invest/livestock",
    "/invest/venture-capital",
    "/invest/litigation-funding",
    "/invest/insurance-linked-securities",
    "/foreign-investment/united-states", "/foreign-investment/japan", "/foreign-investment/india",
    "/foreign-investment/malaysia", "/foreign-investment/new-zealand", "/foreign-investment/south-korea",
    "/foreign-investment/saudi-arabia",
    "/compare/non-residents",
    "/compare/super", "/compare/etfs", "/compare/insurance",
    "/articles", "/scenarios", "/get-matched", "/deals", "/stories", "/about", "/how-we-earn", "/privacy",
    "/privacy/data-collection", "/privacy/data-rights",
    "/methodology", "/how-we-verify", "/terms", "/switch", "/editorial-policy", "/benchmark",
    "/billing-policy",
    "/health-scores", "/alerts", "/whats-new", "/costs", "/fee-impact", "/fee-alerts", "/rate-alerts", "/score",
    "/glossary", "/complaints", "/contact", "/advisors", "/find-advisor/life-event", "/afsl-lookup", "/community",
    "/community/share-trading", "/community/etfs-index-funds", "/community/crypto",
    "/community/super-retirement", "/community/property", "/community/tax-strategy",
    "/community/broker-reviews", "/community/beginners", "/community/off-topic",
    "/advisor-terms", "/broker-terms", "/content-license", "/expert", "/for-advisors", "/advisor-guides",
    "/advisor-guides/how-to-choose-smsf-accountant",
    "/advisor-guides/how-to-choose-financial-planner",
    "/advisor-guides/how-to-choose-tax-agent-investments",
    "/advisor-guides/how-to-choose-property-investment-advisor",
    "/advisor-guides/how-to-choose-mortgage-broker",
    "/advisor-guides/how-to-choose-estate-planner",
    "/advisor-guides/how-to-choose-insurance-broker",
    "/advisor-guides/how-to-choose-buyers-agent",
    "/advisor-guides/how-to-choose-wealth-manager",
    "/advisor-guides/how-to-choose-aged-care-advisor",
    "/advisor-guides/how-to-choose-crypto-advisor",
    "/advisor-guides/how-to-choose-debt-counsellor",
    "/advisor-guides/compare",
    "/advisor-guides/smsf-accountant-vs-diy",
    "/advisor-guides/financial-planner-vs-robo-advisor",
    "/advisor-guides/tax-agent-vs-accountant",
    "/advisor-guides/mortgage-broker-vs-bank",
    "/advisor-guides/buyers-agent-vs-diy",

    "/advisor-apply", "/switching-calculator", "/savings-calculator",
    "/quick-audit", "/portfolio-xray", "/tax-optimizer", "/fee-simulator",
    "/trade-cost-calculator", "/us-share-costs-calculator", "/cgt-calculator",
    "/tools", "/tools/should-i-switch", "/tools/visa-investment-calculator", "/tools/withholding-tax-calculator",
    "/tools/alternative-returns", "/tools/smsf-checker", "/tools/currency-converter",
    "/tools/buy-vs-rent", "/tools/salary-sacrifice", "/tools/smsf-setup",
    "/tools/fhss-calculator",
    "/tools/mortgage-stress-test",
    "/tools/borrowing-power-calculator",
    "/tools/etp-calculator",
    "/tools/etf-overlap", "/tools/dividend-calendar", "/tools/portfolio-stress-test",
    "/tools/state-grants-calculator", "/tools/dasp-calculator",
    "/lic-screener",
    "/just",
    "/just/retired", "/just/inherited", "/just/made-redundant",
    "/just/got-married", "/just/had-a-baby", "/just/bought-a-house",
    "/just/sold-a-business", "/just/started-investing",
    "/tools/salary-sacrifice-optimiser",
    "/tools/cgt-calculator",
    "/tools/subscription-audit",
    "/startup/grants",
    "/wealth-stack",
    "/redundancy",
    "/inheritance",
    "/pricing",
    "/firb-fee-estimator", "/non-resident-dividend-calculator", "/non-resident-cgt-checker",
    "/franking-credits-calculator", "/investment-income-tax-calculator", "/chess-lookup",
    "/share-trading", "/crypto", "/crypto/quiz", "/savings", "/super", "/super/quiz", "/cfd",
    "/how-to",
    // Revenue-expansion hubs
    "/grants", "/grants/rd-tax-incentive", "/grants/emdg",
    "/grants/industry-growth-program", "/grants/eligibility-quiz",
    "/raise", "/raise/pathway-finder",
    "/raise/equity-crowdfunding", "/raise/angel-investment", "/raise/venture-capital",
    "/raise/business-debt", "/raise/government-grants", "/raise/bootstrapping",
    "/raise/selling-your-business",
    "/smsf/setup", "/smsf/crypto", "/smsf/property",
    "/smsf/investment-strategy", "/smsf/checklist", "/smsf/quiz",
    "/sell-business", "/sell-business/valuation", "/sell-business/checklist",
    "/visa-investment",
    "/dividends", "/dividends/franking-credits", "/dividends/calculator", "/dividends/quiz",
    "/wholesale", "/wholesale/quiz",
    "/property/quiz",
    "/etfs/quiz",
    "/insurance/quiz",
    "/negative-gearing", "/negative-gearing/calculator", "/negative-gearing/quiz",
    "/lump-sum-investing", "/lump-sum-investing/redundancy",
    "/lump-sum-investing/inheritance", "/lump-sum-investing/calculator", "/lump-sum-investing/quiz",
    "/foreign-investment/quiz",
    "/sell-business/quiz",
    "/halal-investing", "/halal-investing/quiz",
    "/first-home-buyer/quiz",
    "/learn",
    "/learn/new-investor", "/learn/choosing-a-broker", "/learn/retirement-and-super",
    "/learn/tax-smart-investing", "/learn/foreign-investor",
    // Global investing hub (outbound — AU residents → world)
    "/global-investing",
    // Foreign investment hub — hreflang-aware entries generated in shard 1.
    // Non-localised sub-pages remain here; UAE is also in shard 1 (ar variant).
    "/foreign-investment/super",
    "/foreign-investment/compare", "/foreign-investment/crypto",
    "/foreign-investment/shares", "/foreign-investment/energy",
    "/foreign-investment/savings", "/foreign-investment/cfd",
    "/foreign-investment/send-money-australia",
    "/foreign-investment/hong-kong", "/foreign-investment/china",
    "/foreign-investment/singapore", "/foreign-investment/united-kingdom",
    "/foreign-investment/guides",
    "/foreign-investment/guides/buy-property-australia-foreigner",
    "/foreign-investment/guides/stamp-duty-foreign-buyers",
    "/foreign-investment/guides/property-ban-2025",
    "/foreign-investment/guides/firb-application-guide",
    "/foreign-investment/guides/non-resident-bank-account",
    // Super sub-pages
    "/super/contributions", "/super/consolidation", "/super/leaving-australia",
    // ETF sub-pages
    "/etfs/bonds", "/etfs/international", "/etfs/sectors",
    // Insurance sub-pages
    "/insurance/tpd", "/insurance/trauma",
    // Tax sub-pages (not in newHubPages)
    // Property sub-pages
    "/property/finance",
    // Additional public pages
    "/rates", "/properties", "/pro",
    "/advertise", "/advertise/packages", "/advertise/featured-placement", "/advertiser-terms", "/accessibility",
    "/fsg", "/legal", "/developer-terms", "/consultations",
    "/courses", "/reports", "/portfolio",
    "/advisor-signup",
    "/quotes", "/quotes/post", "/quotes/recent-wins",
    "/press",
    "/about/careers",
    // More advisor-guides
    "/advisor-guides/how-to-choose-real-estate-agent",
    // Calculators
    "/mortgage-calculator", "/retirement-calculator", "/smsf-calculator",
    "/debt-calculator", "/property-yield-calculator",
    "/compound-interest-calculator", "/dividend-reinvestment-calculator",
    "/fire-calculator", "/property-vs-shares-calculator",
    "/super-contributions-calculator", "/tco-calculator",
    // CPD & events hub
    "/academy", "/events", "/certificate",
    // For-advisors sub-pages
    "/for-advisors/pricing",
    // Provider directory
    "/providers", "/provider-apply", "/for-providers",
    // Advisor tools
    "/advisors/leaderboard", "/advisors/compare",
    // Content tools
    "/switch-scripts",
    // New hub pages added during content rebuild
    "/family-office", "/alt-assets", "/mortgage",
    "/retirement", "/retirement/pension-phase", "/retirement/annuities",
    "/retirement/annuities-vs-abp", "/retirement/age-pension",
    "/retirement/how-much-do-you-need", "/retirement/age-pension-assets-test",
    "/retirement/reverse-mortgage", "/retirement/deeming-rates",
    "/retirement/income-test", "/retirement/work-bonus",
    "/retirement/downsizer-contribution", "/retirement/retirement-income",
    "/aged-care", "/aged-care/rad-vs-dap", "/aged-care/costs",
    "/aged-care/means-test", "/aged-care/home-care-packages",
    "/aged-care/home-vs-residential", "/aged-care/centrelink",
    "/aged-care/family-home", "/aged-care/facilities",
    "/home-loans", "/home-loans/variable", "/home-loans/fixed",
    "/home-loans/refinancing", "/home-loans/investment",
    "/home-loans/offset-redraw", "/home-loans/bridging-finance",
    "/home-loans/construction-loans", "/home-loans/interest-only",
    "/home-loans/lmi", "/home-loans/compare",
    "/first-home-buyer/fhss-guide", "/first-home-buyer/first-home-guarantee",
    "/first-home-buyer/deposit-guide", "/first-home-buyer/stamp-duty",
    "/first-home-buyer/shared-equity", "/first-home-buyer/grants",
    "/global-investing/tax", "/global-investing/tax/cgt-on-foreign-shares",
    "/global-investing/tax/us-estate-tax", "/global-investing/tax/fito",
    "/global-investing/tax/w-8ben",
    "/global-investing/lics", "/global-investing/currency",
    "/global-investing/bonds", "/global-investing/property",
    "/global-investing/crypto",
    "/global-investing/guides/chess-vs-custodial-international",
    "/global-investing/guides/ibkr-australia-setup",
    "/global-investing/currency/best-fx-providers",
    "/global-investing/etfs", "/global-investing/etfs/us", "/global-investing/etfs/global",
    "/global-investing/shares/us",
    "/global-investing/calculators/direct-vs-asx-cost",
    "/super/death-benefit", "/super/compare-guide", "/super/division-296", "/super/funds", "/asx/delisted", "/postcodes", "/super/fee-drag",
    "/super/catch-up-contributions",
    "/super/co-contribution", "/super/spouse-contributions",
    "/super/transition-to-retirement", "/super/insurance",
    "/super/pension-phase",
    "/tax/salary-sacrifice", "/tax/trusts", "/tax/medicare",
    "/tax/estate-planning", "/tax/rental-property", "/tax/investment-income",
    "/tax/work-from-home", "/tax/record-keeping", "/tax/hecs-help",
    "/tax/foreign-income", "/tax/fringe-benefits", "/tax/small-business",
    "/invest/ipos", "/invest/dollar-cost-averaging",
    "/invest/lump-sum-vs-dca", "/invest/tax-loss-harvesting",
    "/invest/ethical-investing", "/invest/fire", "/invest/value-investing",
    "/invest/passive-vs-active", "/invest/shares-vs-property",
    "/invest/growth-investing", "/invest/rebalancing",
    "/invest/dividend-reinvestment", "/invest/index-funds",
    "/invest/etfs",
    "/property/depreciation", "/property/equity-access",
    "/property/positive-gearing",
    "/smsf/borrowing", "/smsf/wind-up",
    "/embed", "/embed/licensing",
    // New hub pages (static portions)
    "/etfs", "/etfs/asx-200", "/etfs/us-exposure", "/etfs/dividends",
    "/etfs/screener",
    "/etfs/vas", "/etfs/a200", "/etfs/ivv", "/etfs/ndq", "/etfs/vgs",
    "/etfs/vts", "/etfs/vhy", "/etfs/stw", "/etfs/ioz", "/etfs/ethi",
    "/etfs/vgad", "/etfs/hack", "/etfs/vaf", "/etfs/iwld",
    "/etfs/vs/vas-vs-a200", "/etfs/vs/vas-vs-stw", "/etfs/vs/ioz-vs-vas",
    "/etfs/vs/ivv-vs-vts", "/etfs/vs/ndq-vs-ivv", "/etfs/vs/vgs-vs-ivv",
    "/etfs/vs/vhy-vs-hvst", "/etfs/vs/vhy-vs-vas",
    "/insurance", "/insurance/life", "/insurance/income-protection",
    "/insurance/health", "/insurance/home-contents",
    "/tax", "/tax/capital-gains", "/tax/franking-credits",
    "/tax/negative-gearing", "/tax/crypto",
    "/fee-tracker",
    "/super/smsf",
    "/advisors/international-tax-specialists",
    "/advisors/firb-specialists",
    "/advisors/migration-agents",
    "/brokers/full-service",
    // Testimonials, feed, tax-return hub
    "/testimonials",
    "/feed",
    "/tax-return",
    // Insights, market data & methodology hubs
    "/insights", "/insights/state-of-australian-investing",
    "/market-pulse", "/rates/today", "/reports/annual",
    "/methodology/invest-score", "/advisor/trust-score-methodology",
    "/brokerage-fee-index",
    // Daily data-news surfaces
    "/today", "/fees/today", "/calendar",
    // Business finance + advisor jobs + careers demand probe
    "/business-finance", "/advisor-jobs", "/careers",
  ];

  return staticPaths.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: (path === "" || highPriority.has(path) ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: path === "" ? 1.0 : highPriority.has(path) ? 0.9 : medPriority.has(path) ? 0.7 : 0.4,
  }));
}

async function buildShard1(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();

  const LOCALE_GROUPS: Array<{
    canonical: string;
    canonicalPriority: number;
    localePaths: Partial<Record<"zh" | "ko" | "ar", string>>;
  }> = [
    { canonical: "/foreign-investment",           canonicalPriority: 0.9, localePaths: { zh: "/zh/foreign-investment",           ko: "/ko/foreign-investment"           } },
    { canonical: "/foreign-investment/siv",        canonicalPriority: 0.7, localePaths: { zh: "/zh/foreign-investment/siv",        ko: "/ko/foreign-investment/siv"        } },
    { canonical: "/foreign-investment/property",   canonicalPriority: 0.7, localePaths: { zh: "/zh/foreign-investment/property",   ko: "/ko/foreign-investment/property"   } },
    { canonical: "/foreign-investment/tax",        canonicalPriority: 0.7, localePaths: { zh: "/zh/foreign-investment/tax",        ko: "/ko/foreign-investment/tax"        } },
    { canonical: "/foreign-investment/united-arab-emirates", canonicalPriority: 0.7, localePaths: { ar: "/ar/foreign-investment/united-arab-emirates" } },
  ];

  return LOCALE_GROUPS.flatMap(
    ({ canonical, canonicalPriority, localePaths }) => {
      const languages: Record<string, string> = {
        [BCP47_TAG.en]: `${base}${canonical}`,
        "x-default": `${base}${canonical}`,
      };
      for (const [locale, localePath] of Object.entries(localePaths) as [keyof typeof BCP47_TAG, string][]) {
        languages[BCP47_TAG[locale]] = `${base}${localePath}`;
      }
      const alternates = { languages };
      return [
        { url: `${base}${canonical}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: canonicalPriority, alternates },
        ...Object.values(localePaths).map((localePath) => ({
          url: `${base}${localePath}`,
          lastModified: new Date(),
          changeFrequency: "weekly" as const,
          priority: Math.min(canonicalPriority, 0.7) as number,
          alternates,
        })),
      ];
    },
  );
}

async function buildShard2(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const supabase = await getSupabase();

  // Dynamic broker pages
  const { data: brokers } = supabase
    ? await supabase.from("brokers").select("slug, updated_at").eq("status", "active")
    : { data: null };

  const brokerPages = (brokers || []).map((b) => ({
    url: `${base}/broker/${b.slug}`,
    lastModified: b.updated_at ? new Date(b.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Best Broker for X hub pages
  const bestPages = [
    { url: `${base}/best`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.9 },
    ...getAllCategorySlugs().map((slug) => ({
      url: `${base}/best/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  // Dynamic /best-for/[slug] scenarios
  const { data: bestForScenarios } = supabase
    ? await supabase
        .from("best_for_scenarios")
        .select("slug, updated_at")
        .eq("status", "active")
    : { data: null };
  const bestForPages = [
    { url: `${base}/best-for`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.85 },
    ...(bestForScenarios || []).map((s: { slug: string; updated_at: string | null }) => ({
      url: `${base}/best-for/${s.slug}`,
      lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    })),
  ];

  // Cost scenario pages
  const costPages = getAllCostScenarioSlugs().map((slug) => ({
    url: `${base}/costs/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // SEO versus comparison pages (popular pairs)
  const versusPopularPairs = [
    // Share brokers — core comparisons
    "stake-vs-commsec", "cmc-markets-vs-moomoo", "interactive-brokers-vs-saxo",
    "stake-vs-moomoo", "selfwealth-vs-cmc-markets", "commsec-vs-nabtrade",
    "stake-vs-selfwealth", "moomoo-vs-commsec", "interactive-brokers-vs-cmc-markets",
    "superhero-vs-stake", "cmc-markets-vs-commsec", "webull-vs-stake",
    "superhero-vs-commsec", "saxo-vs-cmc-markets", "moomoo-vs-selfwealth",
    "tiger-brokers-vs-moomoo", "stake-vs-interactive-brokers", "commsec-vs-selfwealth",
    "nabtrade-vs-selfwealth", "cmc-markets-vs-selfwealth",
    // Share brokers — additional combos
    "pearler-vs-stake", "pearler-vs-selfwealth", "superhero-vs-moomoo",
    "superhero-vs-selfwealth", "etoro-vs-stake", "etoro-vs-commsec",
    "etoro-vs-moomoo", "sharesies-vs-stake", "sharesies-vs-superhero",
    "webull-vs-moomoo", "webull-vs-commsec", "tiger-brokers-vs-stake",
    "tiger-brokers-vs-commsec", "opentrader-vs-selfwealth", "opentrader-vs-commsec",
    "pearler-vs-superhero", "ig-vs-commsec", "ig-vs-stake",
    "nabtrade-vs-commsec", "nabtrade-vs-stake", "nabtrade-vs-moomoo",
    // Crypto exchanges — expanded
    "coinspot-vs-swyftx", "swyftx-vs-kraken", "coinspot-vs-kraken",
    "coinspot-vs-coinjar", "swyftx-vs-coinjar", "coinspot-vs-independent-reserve",
    "swyftx-vs-independent-reserve", "coinspot-vs-digital-surge",
    "coinspot-vs-crypto-com", "swyftx-vs-crypto-com", "kraken-vs-coinjar",
    // Robo-advisors
    "stockspot-vs-raiz", "stockspot-vs-spaceship", "raiz-vs-spaceship",
    "stockspot-vs-vanguard-personal-investor", "spaceship-vs-six-park",
    "raiz-vs-vanguard-personal-investor", "stockspot-vs-six-park",
    "raiz-vs-six-park", "spaceship-vs-vanguard-personal-investor",
    "investsmart-vs-stockspot", "betashares-direct-vs-stockspot",
    "commbank-pocket-vs-raiz", "commbank-pocket-vs-spaceship",
    // Research tools
    "simply-wall-st-vs-tradingview", "simply-wall-st-vs-morningstar",
    "tradingview-vs-morningstar", "simply-wall-st-vs-stock-doctor",
    "tradingview-vs-stock-doctor", "morningstar-vs-stock-doctor",
    // CFD & Forex — expanded
    "pepperstone-vs-ig-markets", "pepperstone-vs-cmc-markets-cfds",
    "ig-markets-vs-plus500", "cmc-markets-cfds-vs-plus500",
    "ic-markets-vs-pepperstone", "ic-markets-vs-ig-markets",
    "fp-markets-vs-pepperstone", "fp-markets-vs-ic-markets",
    "axi-vs-pepperstone", "axi-vs-ic-markets", "eightcap-vs-pepperstone",
    "fusion-markets-vs-ic-markets", "thinkmarkets-vs-pepperstone",
    // Super funds — expanded
    "australiansuper-vs-hostplus", "australiansuper-vs-unisuper",
    "hostplus-vs-rest-super", "australiansuper-vs-qsuper",
    "australiansuper-vs-aware-super", "hostplus-vs-unisuper",
    "australiansuper-vs-hesta", "australiansuper-vs-cbus",
    "hostplus-vs-cbus", "unisuper-vs-qsuper", "hesta-vs-cbus",
    "rest-super-vs-cbus", "australiansuper-vs-rest-super",
    "australiansuper-vs-colonial-first-state", "hostplus-vs-aware-super",
    // Savings accounts
    "ing-savings-maximiser-vs-ubank-save", "ing-savings-maximiser-vs-macquarie-savings",
    "ubank-save-vs-macquarie-savings", "boq-future-saver-vs-ing-savings-maximiser",
    "westpac-life-vs-ing-savings-maximiser", "me-bank-savings-vs-ubank-save",
    "anz-plus-save-vs-ing-savings-maximiser",
    // Term deposits
    "judo-bank-td-vs-ing-term-deposit", "judo-bank-td-vs-macquarie-term-deposit",
    "ing-term-deposit-vs-macquarie-term-deposit", "boq-term-deposit-vs-judo-bank-td",
    // Cross-type (popular search queries)
    "stockspot-vs-vanguard-vap", "brickx-vs-vanguard-vap",
    "commsec-vs-vanguard-personal-investor", "stake-vs-spaceship",
    "commbank-pocket-vs-stake", "superhero-vs-raiz",

    // Share brokers — extended combos
    "pearler-vs-commsec", "pearler-vs-moomoo", "pearler-vs-interactive-brokers",
    "webull-vs-selfwealth", "webull-vs-interactive-brokers", "webull-vs-superhero",
    "tiger-brokers-vs-selfwealth", "tiger-brokers-vs-interactive-brokers",
    "etoro-vs-interactive-brokers", "etoro-vs-selfwealth", "etoro-vs-superhero",
    "ig-vs-moomoo", "ig-vs-selfwealth", "ig-vs-interactive-brokers",
    "sharesies-vs-commsec", "sharesies-vs-moomoo", "sharesies-vs-pearler",
    "opentrader-vs-stake", "opentrader-vs-moomoo",
    "nabtrade-vs-interactive-brokers", "nabtrade-vs-cmc-markets",
    "saxo-vs-interactive-brokers", "saxo-vs-stake", "saxo-vs-moomoo",
    "vanguard-personal-investor-vs-commsec", "vanguard-personal-investor-vs-stake",
    "betashares-direct-vs-commsec", "betashares-direct-vs-pearler",
    "hm-bradfield-vs-commsec", "hm-bradfield-vs-stake",

    // Crypto — more pairs
    "coinspot-vs-btcmarkets", "swyftx-vs-btcmarkets", "coinjar-vs-btcmarkets",
    "coinspot-vs-binance", "swyftx-vs-binance", "kraken-vs-binance",
    "coinspot-vs-bybit", "swyftx-vs-bybit", "binance-vs-bybit",
    "coinspot-vs-gemini", "coinspot-vs-cointree",
    "digital-surge-vs-swyftx", "digital-surge-vs-coinspot",
    "independent-reserve-vs-btcmarkets", "kraken-vs-independent-reserve",

    // Robo-advisors — more pairs
    "stockspot-vs-betashares-direct", "raiz-vs-betashares-direct",
    "spaceship-vs-betashares-direct", "stockspot-vs-pearler",
    "raiz-vs-pearler", "spaceship-vs-pearler",
    "vanguard-personal-investor-vs-stockspot", "six-park-vs-vanguard-personal-investor",
    "investsmart-vs-raiz", "investsmart-vs-spaceship",

    // Super funds — more pairs
    "aware-super-vs-hesta", "aware-super-vs-cbus", "aware-super-vs-rest-super",
    "sunsuper-vs-australiansuper", "sunsuper-vs-hostplus",
    "ngsuper-vs-australiansuper", "ngsuper-vs-hostplus",
    "legalsuper-vs-australiansuper", "media-super-vs-australiansuper",
    "spirit-super-vs-australiansuper", "tasplan-vs-australiansuper",
    "hostplus-vs-rest-super", "unisuper-vs-aware-super",
    "cbus-vs-rest-super", "hesta-vs-rest-super",
    "colonial-first-state-vs-australiansuper",
    "amp-super-vs-australiansuper", "bt-super-vs-australiansuper",
    "mercer-super-vs-australiansuper",

    // Savings accounts — more pairs
    "macquarie-savings-vs-boq-future-saver",
    "ubank-save-vs-boq-future-saver", "westpac-life-vs-ubank-save",
    "westpac-life-vs-macquarie-savings", "bankwest-bonus-saver-vs-ing-savings-maximiser",
    "commbank-netbank-saver-vs-ing-savings-maximiser",
    "anz-plus-save-vs-ubank-save", "anz-plus-save-vs-macquarie-savings",
    "nab-reward-saver-vs-ing-savings-maximiser",
    "suncorp-growth-saver-vs-ing-savings-maximiser",
    "rabobank-premium-saver-vs-ing-savings-maximiser",
    "rabobank-premium-saver-vs-macquarie-savings",

    // Term deposits — more pairs
    "judo-bank-td-vs-rabobank-td", "judo-bank-td-vs-commbank-term-deposit",
    "macquarie-term-deposit-vs-commbank-term-deposit",
    "ing-term-deposit-vs-commbank-term-deposit",
    "bankwest-term-deposit-vs-judo-bank-td",
    "auswide-term-deposit-vs-judo-bank-td",

    // CFD — more pairs
    "pepperstone-vs-plus500", "ic-markets-vs-plus500",
    "ig-markets-vs-cmc-markets-cfds", "ig-markets-vs-fp-markets",
    "axi-vs-ig-markets", "axi-vs-fp-markets",
    "eightcap-vs-ic-markets", "eightcap-vs-ig-markets",
    "fusion-markets-vs-pepperstone", "fusion-markets-vs-ig-markets",
    "thinkmarkets-vs-ic-markets", "thinkmarkets-vs-ig-markets",
    "axitrader-vs-pepperstone", "activtrades-vs-pepperstone",
  ];

  // Programmatic versus pairs — generated from live broker inventory
  let generatedPairSlugs: string[] = [];
  let editorialSlugs: string[] = [];
  if (supabase) {
    const [versusRowsRes, editorialRowsRes] = await Promise.all([
      supabase
        .from("brokers")
        .select("slug, name, rating, platform_type")
        .eq("status", "active"),
      supabase.from("versus_editorials").select("slug"),
    ]);
    const versusRows = versusRowsRes.data;
    if (versusRows && versusRows.length > 0) {
      generatedPairSlugs = generateVersusPairs(
        versusRows as { slug: string; name: string; rating: number | null; platform_type: PlatformType }[],
      )
        .slice(0, 400)
        .map((p) => p.slug);
    }
    editorialSlugs =
      ((editorialRowsRes.data ?? []) as { slug: string }[]).map((r) => r.slug);
  }
  const editorialSlugSet = new Set(editorialSlugs);
  const allVersusPairs = Array.from(
    new Set([...versusPopularPairs, ...generatedPairSlugs, ...editorialSlugs]),
  );

  const versusPages = allVersusPairs.map((pair) => {
    const hasEditorial = editorialSlugSet.has(pair);
    const isHandCurated = versusPopularPairs.includes(pair);
    return {
      url: `${base}/versus/${pair}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: hasEditorial ? 0.9 : isHandCurated ? 0.8 : 0.6,
    };
  });

  // Dynamic commodity sector stocks + ETFs pages
  const { data: commoditySectors } = supabase
    ? await supabase
        .from("commodity_sectors")
        .select("slug")
        .eq("status", "active")
    : { data: null };
  const commodityPages = (commoditySectors || []).flatMap(
    (s: { slug: string }) => [
      {
        url: `${base}/invest/${s.slug}/stocks`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
      {
        url: `${base}/invest/${s.slug}/etfs`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      },
    ],
  );

  // Individual stock detail pages
  const { data: commodityStocks } = supabase
    ? await supabase
        .from("commodity_stocks")
        .select("sector_slug, ticker")
        .eq("status", "active")
    : { data: null };
  const stockDetailPages = (commodityStocks || []).map(
    (s: { sector_slug: string; ticker: string }) => ({
      url: `${base}/invest/${s.sector_slug}/stocks/${s.ticker.toLowerCase()}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }),
  );

  // Broker transfer guides
  const { data: transferGuides } = supabase
    ? await supabase
        .from("broker_transfer_guides")
        .select("broker_slug, updated_at")
    : { data: null };
  const transferGuidePages = [
    { url: `${base}/how-to/transfer-from`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 },
    ...(transferGuides || []).map(
      (g: { broker_slug: string; updated_at: string | null }) => ({
        url: `${base}/how-to/transfer-from/${g.broker_slug}`,
        lastModified: g.updated_at ? new Date(g.updated_at) : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      }),
    ),
  ];

  // Full-service stockbroker firm detail pages
  const { data: stockbrokerFirms } = supabase
    ? await supabase
        .from("professionals")
        .select("slug, updated_at")
        .in("type", ["stockbroker_firm", "private_wealth_manager"])
        .eq("status", "active")
    : { data: null };
  const stockbrokerFirmPages = (stockbrokerFirms || []).map((f) => ({
    url: `${base}/brokers/full-service/${f.slug}`,
    lastModified: f.updated_at ? new Date(f.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Category listing pages — /invest/{slug}/listings for all opportunity categories.
  // Static invest hub pages (/invest, /invest/listings, /invest/alternatives, etc.) live in shard 0.
  const investCategoryPages = getOpportunityCategories().map((c) => c.slug).map((slug) => ({
    url: `${base}/invest/${slug}/listings`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Sub-category listing pages
  const investSubcategoryPages = getAllSubcategorySlugs().map(({ category, subcategory }) => ({
    url: `${base}/invest/${category}/listings/${subcategory}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Curated "best {vertical} for {profile}" landing pages.
  const investBestForPages = BEST_FOR_COMBOS.map((c) => ({
    url: `${base}/invest/best-for/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Per-state investment landing pages (/invest-in/{state}).
  const investStatePages = STATE_SURCHARGES.map((s) => ({
    url: `${base}/invest-in/${s.stateCode.toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Individual investment listing detail pages
  const { data: investListings } = supabase
    ? await supabase.from("investment_listings").select("slug, vertical, sub_category, updated_at").eq("status", "active")
    : { data: null };

  const investListingPages = (investListings || []).map((l) => ({
    url: `${base}${listingUrl(l as { vertical: InvestListingVertical; sub_category?: string; slug: string })}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...brokerPages,
    ...bestPages,
    ...bestForPages,
    ...costPages,
    ...versusPages,
    ...commodityPages,
    ...stockDetailPages,
    ...transferGuidePages,
    ...stockbrokerFirmPages,
    ...investCategoryPages,
    ...investSubcategoryPages,
    ...investBestForPages,
    ...investStatePages,
    ...investListingPages,
  ];
}

async function buildShard3(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const supabase = await getSupabase();

  // Dynamic article pages — only published
  const { data: articles } = supabase
    ? await supabase
        .from("articles")
        .select("slug, updated_at")
        .eq("status", "published")
    : { data: null };

  const articlePages = (articles || []).map((a) => ({
    url: `${base}/article/${a.slug}`,
    lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Dynamic scenario pages
  const { data: scenarios } = supabase
    ? await supabase.from("scenarios").select("slug, updated_at")
    : { data: null };

  const scenarioPages = (scenarios || []).map((s) => ({
    url: `${base}/scenario/${s.slug}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Dynamic regulatory alert pages
  const { data: alerts } = supabase
    ? await supabase.from("regulatory_alerts").select("slug, updated_at").eq("status", "published")
    : { data: null };

  const alertPages = (alerts || []).map((a) => ({
    url: `${base}/alerts/${a.slug}`,
    lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Dynamic quarterly report pages
  const { data: reports } = supabase
    ? await supabase.from("quarterly_reports").select("slug, updated_at").eq("status", "published")
    : { data: null };

  const reportPages = (reports || []).map((r) => ({
    url: `${base}/reports/${r.slug}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Expert articles (advisor-authored)
  const { data: expertArticleSlugs } = supabase
    ? await supabase.from("advisor_articles").select("slug, published_at").eq("status", "published")
    : { data: null };

  const expertArticlePages = (expertArticleSlugs || []).map((a) => ({
    url: `${base}/expert/${a.slug}`,
    lastModified: a.published_at ? new Date(a.published_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...articlePages, ...scenarioPages, ...alertPages, ...reportPages, ...expertArticlePages];
}

async function buildShard4(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const supabase = await getSupabase();

  // Adviser Register Atlas — the hub plus one page per current adviser on
  // the file-backed ASIC extract. Excluded entirely while the bundled
  // dataset is the synthetic preview (those pages are noindex'd).
  // Super Fund Performance Explorer — per-fund pages over the APRA
  // extract; excluded while the bundled dataset is the synthetic preview.
  // ASX Ghost Tickers — per-company pages over the removed-companies
  // extract; excluded while the bundled dataset is the synthetic preview.
  // Postcode Wealth Atlas — per-postcode pages over the ATO extract;
  // excluded while the bundled dataset is the synthetic preview.
  // CGT scenario pages — pure-math static pages, always included.
  const cgtScenarioPages: MetadataRoute.Sitemap = CGT_SCENARIOS.map((s) => ({
    url: `${base}/cgt-calculator/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "yearly" as const,
    priority: 0.55,
  }));

  // Fee-drag scenario pages — pure-math static pages, always included.
  const feeDragPages: MetadataRoute.Sitemap = FEE_DRAG_SCENARIOS.map((s) => ({
    url: `${base}/super/fee-drag/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "yearly" as const,
    priority: 0.55,
  }));

  const postcodePages: MetadataRoute.Sitemap = postcodeAtlasMeta().sample
    ? []
    : allPostcodes().map((p) => ({
        url: `${base}/postcodes/${p.postcode}`,
        lastModified: new Date(postcodeAtlasMeta().extractedAt),
        changeFrequency: "yearly" as const,
        priority: 0.5,
      }));

  const ghostTickerPages: MetadataRoute.Sitemap = ghostTickersMeta().sample
    ? []
    : allGhostTickers().map((t) => ({
        url: `${base}/asx/delisted/${t.slug}`,
        lastModified: new Date(ghostTickersMeta().extractedAt),
        changeFrequency: "yearly" as const,
        priority: 0.5,
      }));

  const superFundPages: MetadataRoute.Sitemap = superFundsMeta().sample
    ? []
    : allSuperFunds().map((f) => ({
        url: `${base}/super/funds/${f.slug}`,
        lastModified: new Date(superFundsMeta().extractedAt),
        changeFrequency: "monthly" as const,
        priority: 0.55,
      }));

  const registerPages: MetadataRoute.Sitemap = adviserRegisterMeta().sample
    ? []
    : [
        {
          url: `${base}/adviser-register`,
          lastModified: new Date(adviserRegisterMeta().extractedAt),
          changeFrequency: "weekly" as const,
          priority: 0.7,
        },
        ...allRegisterAdvisers().map((a) => ({
          url: `${base}/adviser-register/${a.slug}`,
          lastModified: new Date(adviserRegisterMeta().extractedAt),
          changeFrequency: "weekly" as const,
          priority: 0.5,
        })),
      ];

  // Dynamic advisor profile pages
  const { data: professionals } = supabase
    ? await supabase.from("professionals").select("slug, updated_at").eq("status", "active")
    : { data: null };

  const advisorPages = (professionals || []).map((p) => ({
    url: `${base}/advisor/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Programmatic /find/[advisor-type]/[city] pages
  const { data: findAdvisorRows } = supabase
    ? await supabase
        .from("professionals")
        .select("type, location_suburb")
        .eq("status", "active")
        .not("location_suburb", "is", null)
    : { data: null };
  const findAdvisorSeen = new Set<string>();
  const findAdvisorCityPages = (findAdvisorRows || [])
    .flatMap((row: { type: string; location_suburb: string | null }) => {
      if (!row.location_suburb) return [];
      const typeSlug = row.type.replace(/_/g, "-");
      const citySlug = row.location_suburb.toLowerCase().replace(/\s+/g, "-");
      const key = `${typeSlug}:${citySlug}`;
      if (findAdvisorSeen.has(key)) return [];
      findAdvisorSeen.add(key);
      return [{ url: `${base}/find/${typeSlug}/${citySlug}`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.65 }];
    })
    .slice(0, 2000);

  // Advisor type + state pages
  const advisorTypes = ["smsf-accountants", "financial-planners", "property-advisors", "tax-agents", "mortgage-brokers", "estate-planners", "insurance-brokers", "buyers-agents", "real-estate-agents", "wealth-managers", "aged-care-advisors", "crypto-advisors", "debt-counsellors", "grant-writers"];
  const states = ["nsw", "vic", "qld", "wa", "sa", "tas", "act", "nt"];

  const advisorTypePages = advisorTypes.map((type) => ({
    url: `${base}/advisors/${type}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const advisorStatePages = advisorTypes.flatMap((type) =>
    states.map((state) => ({
      url: `${base}/advisors/${type}/${state}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))
  );

  // Advisor type + city pages
  const advisorCities = ["sydney", "melbourne", "brisbane", "perth", "adelaide", "gold-coast", "canberra", "hobart", "darwin", "newcastle", "wollongong", "geelong", "sunshine-coast", "townsville", "cairns", "toowoomba", "ballarat", "bendigo", "launceston", "central-coast"];
  const advisorCityPages = advisorTypes.flatMap((type) =>
    advisorCities.map((city) => ({
      url: `${base}/advisors/${type}/${city}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))
  );

  const advisorLocationSlugs = [
    // Major cities
    "sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra", "hobart", "darwin", "gold-coast",
    "newcastle", "wollongong", "geelong", "sunshine-coast", "townsville", "cairns", "toowoomba",
    "ballarat", "bendigo", "launceston", "central-coast",
    // City + type combos (high search volume)
    "sydney-financial-planner", "melbourne-financial-planner", "brisbane-financial-planner",
    "perth-financial-planner", "adelaide-financial-planner", "canberra-financial-planner",
    "gold-coast-financial-planner", "hobart-financial-planner", "darwin-financial-planner",
    "newcastle-financial-planner", "wollongong-financial-planner", "geelong-financial-planner",
    "sunshine-coast-financial-planner", "townsville-financial-planner",
    "sydney-smsf", "melbourne-smsf", "brisbane-smsf",
    "perth-smsf", "adelaide-smsf", "canberra-smsf", "gold-coast-smsf",
    "sydney-tax-agent", "melbourne-tax-agent", "brisbane-tax-agent",
    "perth-tax-agent", "adelaide-tax-agent", "canberra-tax-agent",
    "sydney-mortgage-broker", "melbourne-mortgage-broker", "brisbane-mortgage-broker",
    "perth-mortgage-broker", "gold-coast-mortgage-broker", "adelaide-mortgage-broker",
    "canberra-mortgage-broker", "hobart-mortgage-broker", "newcastle-mortgage-broker",
    "wollongong-mortgage-broker", "geelong-mortgage-broker", "sunshine-coast-mortgage-broker",
    "sydney-property-advisor", "melbourne-property-advisor", "brisbane-property-advisor",
    "perth-property-advisor", "adelaide-property-advisor",
    "sydney-buyers-agent", "melbourne-buyers-agent", "brisbane-buyers-agent",
    "perth-buyers-agent", "gold-coast-buyers-agent", "adelaide-buyers-agent",
    "canberra-buyers-agent", "newcastle-buyers-agent", "sunshine-coast-buyers-agent",
    "sydney-accountant", "melbourne-accountant", "brisbane-accountant",
    "perth-accountant", "adelaide-accountant",
    "sydney-wealth-manager", "melbourne-wealth-manager", "brisbane-wealth-manager",
    "perth-wealth-manager",
    "sydney-estate-planner", "melbourne-estate-planner", "brisbane-estate-planner",
    "sydney-insurance-broker", "melbourne-insurance-broker", "brisbane-insurance-broker",
    "sydney-real-estate-agent", "melbourne-real-estate-agent", "brisbane-real-estate-agent",
    "perth-real-estate-agent", "gold-coast-real-estate-agent",
  ];
  const advisorLocationPages = advisorLocationSlugs.map(slug => ({
    url: `${base}/find-advisor/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Advisor firm pages
  const { data: firms } = supabase
    ? await supabase.from("advisor_firms").select("slug").eq("status", "active")
    : { data: null };
  const firmPages = (firms || []).map((f) => ({
    url: `${base}/firm/${f.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...advisorPages,
    ...findAdvisorCityPages,
    ...advisorTypePages,
    ...advisorStatePages,
    ...advisorCityPages,
    ...advisorLocationPages,
    ...firmPages,
    ...registerPages,
    ...superFundPages,
    ...ghostTickerPages,
    ...postcodePages,
    ...feeDragPages,
    ...cgtScenarioPages,
  ];
}

async function buildShard5(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();

  // Individual glossary term pages
  const { FULL_GLOSSARY_ENTRIES: GLOSSARY_ENTRIES } = await import("@/lib/glossary-extended");
  const glossaryPages = GLOSSARY_ENTRIES.map((entry) => ({
    url: `${base}/glossary/${entry.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  // How-to guide pages
  const howToPages = getAllGuideSlugs().map((slug) => ({
    url: `${base}/how-to/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // "How to invest in X" programmatic guides — one per opportunity
  // vertical (Wave 7). High-intent SEO pages with live marketplace data.
  const howToInvestPages = getOpportunityCategories().map((c) => ({
    url: `${base}/how-to-invest-in/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // ── /topic/[slug] content-category pages ──
  // Slugs sourced from TOPIC_LABELS in app/topic/[slug]/page.tsx — no DB query needed.
  // No bare `/topic` hub URL is emitted: the app defines only app/topic/[slug]/page.tsx
  // (there is no app/topic/page.tsx), so a `/topic` entry would point crawlers at a 404.
  const TOPIC_SLUGS = [
    "tax", "beginners", "smsf", "strategy", "news", "reviews",
    "crypto", "etfs", "robo-advisors", "research-tools", "super",
    "property", "cfd-forex",
  ] as const;
  const topicPages = TOPIC_SLUGS.map((slug) => ({
    url: `${base}/topic/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // ── /marketplace hub + intent + intent×state pages ──
  const enabledIntents = await getEnabledIntents();
  const marketplaceHubPage = {
    url: `${base}/marketplace`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  };
  const marketplaceIntentPages = enabledIntents.map((i) => ({
    url: `${base}/marketplace/${i.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const marketplaceIntentStatePages = enabledIntents.flatMap((i) =>
    AUSTRALIAN_STATES.map((s) => ({
      url: `${base}/marketplace/${i.slug}/${s.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  );

  return [
    ...glossaryPages,
    ...howToPages,
    ...howToInvestPages,
    ...topicPages,
    marketplaceHubPage,
    ...marketplaceIntentPages,
    ...marketplaceIntentStatePages,
  ];
}

async function buildShard6(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const supabase = await getSupabase();

  // Property listing pages
  const { data: propertyListings } = supabase
    ? await supabase.from("property_listings").select("slug, updated_at").in("status", ["active", "coming_soon"])
    : { data: null };
  const propertyListingPages = (propertyListings || []).map((l) => ({
    url: `${base}/property/listings/${l.slug}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic suburb guide pages
  const { data: suburbSlugs } = supabase
    ? await supabase.from("suburb_data").select("slug").not("slug", "is", null)
    : { data: null };

  const suburbGuidePages = (suburbSlugs || []).map((s) => ({
    url: `${base}/property/suburbs/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // AA-05: /[suburb]/property-investing programmatic pages
  const suburbInvestingPages = (suburbSlugs || []).map((s) => ({
    url: `${base}/${s.slug}/property-investing`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Property static hub pages
  const propertyHubPages = [
    { url: `${base}/property`, priority: 0.8 },
    { url: `${base}/property/listings`, priority: 0.8 },
    { url: `${base}/property/suburbs`, priority: 0.7 },
    { url: `${base}/property/buyer-agents`, priority: 0.7 },
    { url: `${base}/property/foreign-investment`, priority: 0.8 },
  ].map((p) => ({ ...p, lastModified: new Date(), changeFrequency: "weekly" as const }));

  // City / location investing pages
  const investingCityPages = [
    { url: `${base}/investing`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    ...getAllCitySlugs().map((slug) => ({
      url: `${base}/investing/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  return [
    ...propertyListingPages,
    ...suburbGuidePages,
    ...suburbInvestingPages,
    ...propertyHubPages,
    ...investingCityPages,
  ];
}

async function buildShard7(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const supabase = await getSupabase();

  // Dynamic team member pages (authors + reviewers)
  const { data: teamMembers } = supabase
    ? await supabase.from("team_members").select("slug, role, updated_at").eq("status", "active")
    : { data: null };

  const authorPages = (teamMembers || []).map((m) => ({
    url: `${base}/authors/${m.slug}`,
    lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  const reviewerPages = (teamMembers || [])
    .filter((m) => m.role === "expert_reviewer" || m.role === "editor")
    .map((m) => ({
      url: `${base}/reviewers/${m.slug}`,
      lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));

  // Newsletter archive & edition pages
  const { data: newsletterEditions } = supabase
    ? await supabase
        .from("newsletter_editions")
        .select("edition_date, created_at")
        .eq("status", "sent")
    : { data: null };

  const newsletterArchivePage = {
    url: `${base}/newsletter`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  };

  const newsletterEditionPages = (newsletterEditions || []).map((e) => ({
    url: `${base}/newsletter/${e.edition_date}`,
    lastModified: e.created_at ? new Date(e.created_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  // Public quote request pages
  const { data: publicJobs } = supabase
    ? await supabase
        .from("advisor_auctions")
        .select("slug, created_at")
        .eq("is_public", true)
        .eq("source", "public_job")
        .eq("status", "open")
    : { data: null };

  const quoteJobPages = (publicJobs || []).map((j) => ({
    url: `${base}/quotes/${j.slug}`,
    lastModified: j.created_at ? new Date(j.created_at) : new Date(),
    changeFrequency: "hourly" as const,
    priority: 0.6,
  }));

  // Category × location landing pages
  const QUOTE_TYPES = [
    "smsf_accountant", "financial_planner", "property_advisor", "tax_agent",
    "mortgage_broker", "estate_planner", "insurance_broker", "buyers_agent",
    "wealth_manager", "aged_care_advisor", "crypto_advisor", "business_broker",
    "migration_agent",
  ];
  const QUOTE_STATES = ["nsw", "vic", "qld", "wa", "sa", "tas", "act", "nt"];
  const quoteCategoryStatePages = QUOTE_TYPES.flatMap((t) =>
    QUOTE_STATES.map((s) => ({
      url: `${base}/quotes/by/${t}/${s}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  );

  // ── AA-02: /grants/[industry] programmatic pages ──
  const grantsIndustrySlugs = [
    "tech", "biotech", "agriculture", "manufacturing", "clean-energy",
    "mining", "healthcare", "export", "creative", "defence",
  ];
  const grantsIndustryPages = grantsIndustrySlugs.map((slug) => ({
    url: `${base}/grants/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // ── AA-03: /grants/[state]/[program] programmatic pages ──
  const grantsStatePrograms: [string, string][] = [
    ["nsw", "mvp-ventures"],
    ["nsw", "technology-adoption"],
    ["vic", "launchvic"],
    ["vic", "vic-innovation-network"],
    ["qld", "ignite-ideas"],
    ["qld", "advance-qld"],
    ["wa", "collab-vouchers"],
    ["sa", "sa-techvoucher"],
    ["tas", "tas-entrepreneur-fund"],
    ["act", "act-innovation-fund"],
    ["nt", "nt-business-innovation"],
  ];
  const grantsStateProgramPages = grantsStatePrograms.map(([state, program]) => ({
    url: `${base}/grants/${state}/${program}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // ── AA-06: /investing-for/[occupation] programmatic pages ──
  const investingForSlugs = [
    "doctor", "nurse", "dentist", "pharmacist", "vet",
    "lawyer", "accountant", "engineer", "architect", "financial-planner", "it-professional",
    "public-servant", "teacher", "police-officer", "military",
    "small-business-owner", "startup-founder", "executive", "real-estate-agent", "farmer",
    "tradesperson", "pilot", "miner",
    "freelancer", "contractor", "sports-professional",
  ];
  const investingForIndexPage = {
    url: `${base}/investing-for`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.75,
  };
  const investingForPages = investingForSlugs.map((slug) => ({
    url: `${base}/investing-for/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.65,
  }));

  // ── CPD events — /events/[id] detail pages ──
  const { data: publishedEvents } = supabase
    ? await supabase
        .from("advisor_events")
        .select("id, updated_at")
        .eq("status", "published")
        .gte("starts_at", new Date().toISOString())
    : { data: null };
  const eventDetailPages = (publishedEvents || []).map((ev: { id: number; updated_at: string | null }) => ({
    url: `${base}/events/${ev.id}`,
    lastModified: ev.updated_at ? new Date(ev.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.65,
  }));

  // ── CO-03: /afsl/[number] — dynamic AFSL licensee SEO pages ──
  const { data: afslLicensees } = supabase
    ? await supabase
        .from("afsl_register")
        .select("afsl_number, last_verified_at")
        .in("status", ["current", "suspended"])
    : { data: null };
  const afslPages = (afslLicensees || []).map((l: { afsl_number: string; last_verified_at: string | null }) => ({
    url: `${base}/afsl/${l.afsl_number}`,
    lastModified: l.last_verified_at ? new Date(l.last_verified_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [
    ...authorPages,
    ...reviewerPages,
    newsletterArchivePage,
    ...newsletterEditionPages,
    ...quoteJobPages,
    ...quoteCategoryStatePages,
    ...grantsIndustryPages,
    ...grantsStateProgramPages,
    investingForIndexPage,
    ...investingForPages,
    ...eventDetailPages,
    ...afslPages,
  ];
}

async function buildShard8(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  const supabase = await getSupabase();
  if (!supabase) return [];

  // Supabase REST caps a single select at 1,000 rows, but the community can hold
  // more public threads than that, so page through every non-removed thread
  // (ordered by id for stable ranges) instead of silently dropping the rest.
  // (If the community ever exceeds ~50k threads this shard must be split further
  // to stay within the sitemaps-protocol 50,000-URL-per-file limit.)
  const PAGE_SIZE = 1000;
  const entries: MetadataRoute.Sitemap = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: threads } = await supabase
      .from("forum_threads")
      .select("id, category_slug, updated_at")
      .eq("is_removed", false)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    const page = (threads || []) as { id: number; category_slug: string; updated_at: string | null }[];
    for (const t of page) {
      entries.push({
        url: `${base}/community/${t.category_slug}/${t.id}`,
        lastModified: t.updated_at ? new Date(t.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.5,
      });
    }
    if (page.length < PAGE_SIZE) break;
  }

  return entries;
}

// ─── Main export ──────────────────────────────────────────────────────────────
// Next.js calls `sitemap({ id })` for each ID returned by `generateSitemaps`.
// It automatically builds a sitemap index at `/sitemap.xml` that references
// each shard at `/sitemap/0.xml`, `/sitemap/1.xml`, … `/sitemap/7.xml`.
// robots.ts already points to `/sitemap.xml` so no change is needed there.

export default async function sitemap({
  id,
}: {
  // Next 16's generated dynamic-sitemap route (next-metadata-route-loader)
  // calls `handler({ id: targetIdPromise })` — `id` arrives as a PROMISE that
  // resolves to the base filename string ("0"), NOT a bare number/string.
  // Older docs/tests assumed a plain number, so the param type is widened to
  // reflect every form the runtime can actually pass.
  id: number | string | Promise<number | string | undefined> | undefined;
}): Promise<MetadataRoute.Sitemap> {
  // Root cause of the all-empty-shards prod failure: in Next 16 the runtime
  // passes `id` as a *Promise* (`targetIdPromise`), so `String(id)` was
  // "[object Promise]" → `parseInt(...)` === NaN → switch fell through to
  // `default: []`, serving an empty <urlset> for EVERY shard (including the
  // fully-static 0 & 1 that have no DB dependency). #1316 (`Number(id)`) and
  // #1326 (`parseInt(id)`) both still assumed a synchronous string and only
  // tested "0"/"0.xml", so CI stayed green while Google got empty sitemaps.
  //
  // Robust parse: await the value (a no-op for non-Promises), then pull the
  // first digit run and map it to a shard. Tolerant of "0", "0.xml",
  // "sitemap/0", "/sitemap/0.xml", a bare number, or a Promise of any of these.
  const resolved = await id;
  const digits = /(\d+)/.exec(String(resolved ?? ""))?.[1];
  const shard = digits ? parseInt(digits, 10) : NaN;
  switch (shard) {
    case 0: return buildShard0();
    case 1: return buildShard1();
    case 2: return buildShard2();
    case 3: return buildShard3();
    case 4: return buildShard4();
    case 5: return buildShard5();
    case 6: return buildShard6();
    case 7: return buildShard7();
    case 8: return buildShard8();
    default:
      // Never fail silently again: an unrecognised id means empty sitemaps.
      log.warn("sitemap: unrecognised shard id — serving empty urlset", {
        resolved: String(resolved ?? ""),
        shard,
      });
      return [];
  }
}
