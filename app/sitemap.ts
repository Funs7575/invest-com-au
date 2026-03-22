import { createClient } from "@/lib/supabase/server";
import type { MetadataRoute } from "next";
import { getAllCategorySlugs } from "@/lib/best-broker-categories";
import { getAllCostScenarioSlugs } from "@/lib/cost-scenarios";
import { getAllCitySlugs } from "@/lib/cities";
import { getAllGuideSlugs } from "@/lib/how-to-guides";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";
  const supabase = await createClient();

  // Static pages with tiered priorities
  const highPriority = new Set(["/compare", "/start", "/quiz", "/reviews", "/deals", "/share-trading", "/crypto", "/savings", "/super", "/cfd", "/versus", "/how-to"]);
  const medPriority = new Set(["/calculators", "/articles", "/scenarios", "/switch", "/stories", "/benchmark", "/health-scores", "/alerts", "/whats-new", "/costs", "/fee-impact"]);
  // Everything else (about, how-we-earn, privacy, methodology, terms, etc.) → 0.4

  const staticPages = [
    "", "/compare", "/versus", "/reviews", "/calculators",
    "/articles", "/scenarios", "/start", "/quiz", "/deals", "/stories", "/about", "/how-we-earn", "/privacy",
    "/methodology", "/how-we-verify", "/terms", "/switch", "/editorial-policy", "/benchmark",
    "/health-scores", "/alerts", "/whats-new", "/costs", "/fee-impact", "/fee-alerts", "/score",
    "/glossary", "/complaints", "/contact", "/advisors", "/find-advisor",
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
    
    "/portfolio-calculator",
    "/advisor-apply", "/switching-calculator", "/savings-calculator",
    "/share-trading", "/crypto", "/savings", "/super", "/cfd",
    "/how-to",
    // Additional public pages
    "/tools", "/rates", "/properties", "/pro", "/jobs",
    "/advertise", "/advertiser-terms",
    // More advisor-guides
    "/advisor-guides/how-to-choose-real-estate-agent",
    // Calculators
    "/mortgage-calculator", "/retirement-calculator", "/smsf-calculator",
    "/debt-calculator", "/property-yield-calculator", "/fee-impact",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: (path === "" || highPriority.has(path) ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: path === "" ? 1.0 : highPriority.has(path) ? 0.9 : medPriority.has(path) ? 0.7 : 0.4,
  }));

  // Dynamic broker pages
  const { data: brokers } = await supabase
    .from("brokers")
    .select("slug, updated_at")
    .eq("status", "active");

  const brokerPages = (brokers || []).map((b) => ({
    url: `${baseUrl}/broker/${b.slug}`,
    lastModified: b.updated_at ? new Date(b.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic article pages
  const { data: articles } = await supabase
    .from("articles")
    .select("slug, updated_at");

  const articlePages = (articles || []).map((a) => ({
    url: `${baseUrl}/article/${a.slug}`,
    lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Dynamic scenario pages
  const { data: scenarios } = await supabase
    .from("scenarios")
    .select("slug, updated_at");

  const scenarioPages = (scenarios || []).map((s) => ({
    url: `${baseUrl}/scenario/${s.slug}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Best Broker for X hub pages
  const bestPages = [
    { url: `${baseUrl}/best`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.9 },
    ...getAllCategorySlugs().map((slug) => ({
      url: `${baseUrl}/best/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  // Dynamic team member pages (authors + reviewers)
  const { data: teamMembers } = await supabase
    .from("team_members")
    .select("slug, role, updated_at")
    .eq("status", "active");

  const authorPages = (teamMembers || []).map((m) => ({
    url: `${baseUrl}/authors/${m.slug}`,
    lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  const reviewerPages = (teamMembers || [])
    .filter((m) => m.role === "expert_reviewer" || m.role === "editor")
    .map((m) => ({
      url: `${baseUrl}/reviewers/${m.slug}`,
      lastModified: m.updated_at ? new Date(m.updated_at) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    }));

  // Dynamic regulatory alert pages
  const { data: alerts } = await supabase
    .from("regulatory_alerts")
    .select("slug, updated_at")
    .eq("status", "published");

  const alertPages = (alerts || []).map((a) => ({
    url: `${baseUrl}/alerts/${a.slug}`,
    lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Dynamic quarterly report pages
  const { data: reports } = await supabase
    .from("quarterly_reports")
    .select("slug, updated_at")
    .eq("status", "published");

  const reportPages = (reports || []).map((r) => ({
    url: `${baseUrl}/reports/${r.slug}`,
    lastModified: r.updated_at ? new Date(r.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Cost scenario pages
  const costPages = getAllCostScenarioSlugs().map((slug) => ({
    url: `${baseUrl}/costs/${slug}`,
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

  const versusPages = versusPopularPairs.map((pair) => ({
    url: `${baseUrl}/versus/${pair}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Dynamic advisor profile pages
  const { data: professionals } = await supabase
    .from("professionals")
    .select("slug, updated_at")
    .eq("status", "active");

  const advisorPages = (professionals || []).map((p) => ({
    url: `${baseUrl}/advisor/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Programmatic advisor type + state pages
  const advisorTypes = ["smsf-accountants", "financial-planners", "property-advisors", "tax-agents", "mortgage-brokers", "estate-planners", "insurance-brokers", "buyers-agents", "real-estate-agents", "wealth-managers", "aged-care-advisors", "crypto-advisors", "debt-counsellors"];
  const states = ["nsw", "vic", "qld", "wa", "sa", "tas", "act", "nt"];

  const advisorTypePages = advisorTypes.map((type) => ({
    url: `${baseUrl}/advisors/${type}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const advisorStatePages = advisorTypes.flatMap((type) =>
    states.map((state) => ({
      url: `${baseUrl}/advisors/${type}/${state}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }))
  );

  // Advisor type + city pages (e.g. /advisors/financial-planners/sydney)
  const advisorCities = ["sydney", "melbourne", "brisbane", "perth", "adelaide", "gold-coast", "canberra", "hobart", "darwin", "newcastle", "wollongong", "geelong", "sunshine-coast", "townsville", "cairns", "toowoomba", "ballarat", "bendigo", "launceston", "central-coast"];
  const advisorCityPages = advisorTypes.flatMap((type) =>
    advisorCities.map((city) => ({
      url: `${baseUrl}/advisors/${type}/${city}`,
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
    // Financial planners — all major cities
    "sydney-financial-planner", "melbourne-financial-planner", "brisbane-financial-planner",
    "perth-financial-planner", "adelaide-financial-planner", "canberra-financial-planner",
    "gold-coast-financial-planner", "hobart-financial-planner", "darwin-financial-planner",
    "newcastle-financial-planner", "wollongong-financial-planner", "geelong-financial-planner",
    "sunshine-coast-financial-planner", "townsville-financial-planner",
    // SMSF accountants — major cities
    "sydney-smsf", "melbourne-smsf", "brisbane-smsf",
    "perth-smsf", "adelaide-smsf", "canberra-smsf", "gold-coast-smsf",
    // Tax agents — major cities
    "sydney-tax-agent", "melbourne-tax-agent", "brisbane-tax-agent",
    "perth-tax-agent", "adelaide-tax-agent", "canberra-tax-agent",
    // Mortgage brokers — all major cities
    "sydney-mortgage-broker", "melbourne-mortgage-broker", "brisbane-mortgage-broker",
    "perth-mortgage-broker", "gold-coast-mortgage-broker", "adelaide-mortgage-broker",
    "canberra-mortgage-broker", "hobart-mortgage-broker", "newcastle-mortgage-broker",
    "wollongong-mortgage-broker", "geelong-mortgage-broker", "sunshine-coast-mortgage-broker",
    // Property & buyers agents
    "sydney-property-advisor", "melbourne-property-advisor", "brisbane-property-advisor",
    "perth-property-advisor", "adelaide-property-advisor",
    "sydney-buyers-agent", "melbourne-buyers-agent", "brisbane-buyers-agent",
    "perth-buyers-agent", "gold-coast-buyers-agent", "adelaide-buyers-agent",
    "canberra-buyers-agent", "newcastle-buyers-agent", "sunshine-coast-buyers-agent",
    // Accountants
    "sydney-accountant", "melbourne-accountant", "brisbane-accountant",
    "perth-accountant", "adelaide-accountant",
    // Wealth managers
    "sydney-wealth-manager", "melbourne-wealth-manager", "brisbane-wealth-manager",
    "perth-wealth-manager",
    // Estate planners
    "sydney-estate-planner", "melbourne-estate-planner", "brisbane-estate-planner",
    // Insurance brokers
    "sydney-insurance-broker", "melbourne-insurance-broker", "brisbane-insurance-broker",
    // Real estate agents
    "sydney-real-estate-agent", "melbourne-real-estate-agent", "brisbane-real-estate-agent",
    "perth-real-estate-agent", "gold-coast-real-estate-agent",
  ];
  const advisorLocationPages = advisorLocationSlugs.map(slug => ({
    url: `${baseUrl}/find-advisor/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // How-to guide pages
  const howToPages = getAllGuideSlugs().map((slug) => ({
    url: `${baseUrl}/how-to/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Expert articles (advisor-authored)
  const { data: expertArticleSlugs } = await supabase
    .from("advisor_articles")
    .select("slug, published_at")
    .eq("status", "published");

  const expertArticlePages = (expertArticleSlugs || []).map((a) => ({
    url: `${baseUrl}/expert/${a.slug}`,
    lastModified: a.published_at ? new Date(a.published_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // City / location investing pages
  const investingCityPages = [
    { url: `${baseUrl}/investing`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.7 },
    ...getAllCitySlugs().map((slug) => ({
      url: `${baseUrl}/investing/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  // Individual glossary term pages
  const { GLOSSARY_ENTRIES } = await import("@/lib/glossary");
  const glossaryPages = GLOSSARY_ENTRIES.map((entry) => ({
    url: `${baseUrl}/glossary/${entry.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.4,
  }));

  // Advisor firm pages
  const { data: firms } = await supabase
    .from("advisor_firms")
    .select("slug")
    .eq("status", "active");
  const firmPages = (firms || []).map((f) => ({
    url: `${baseUrl}/firm/${f.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Property listing pages
  const { data: propertyListings } = await supabase
    .from("property_listings")
    .select("slug, updated_at")
    .in("status", ["active", "coming_soon"]);
  const propertyListingPages = (propertyListings || []).map((l) => ({
    url: `${baseUrl}/property/listings/${l.slug}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Property static hub pages
  const propertyHubPages = [
    { url: `${baseUrl}/property`, priority: 0.8 },
    { url: `${baseUrl}/property/listings`, priority: 0.8 },
    { url: `${baseUrl}/property/suburbs`, priority: 0.7 },
    { url: `${baseUrl}/property/buyer-agents`, priority: 0.7 },
  ].map((p) => ({ ...p, lastModified: new Date(), changeFrequency: "weekly" as const }));

  return [...staticPages, ...bestPages, ...costPages, ...brokerPages, ...articlePages, ...scenarioPages, ...authorPages, ...reviewerPages, ...alertPages, ...reportPages, ...versusPages, ...howToPages, ...expertArticlePages, ...advisorPages, ...advisorTypePages, ...advisorStatePages, ...advisorCityPages, ...advisorLocationPages, ...investingCityPages, ...glossaryPages, ...firmPages, ...propertyListingPages, ...propertyHubPages];
}
