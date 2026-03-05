import { createClient } from "@/lib/supabase/server";
import type { MetadataRoute } from "next";
import { getAllCategorySlugs } from "@/lib/best-broker-categories";
import { getAllCostScenarioSlugs } from "@/lib/cost-scenarios";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";
  const supabase = await createClient();

  // Static pages with tiered priorities
  const highPriority = new Set(["/compare", "/quiz", "/reviews", "/deals", "/pro"]);
  const medPriority = new Set(["/versus", "/calculators", "/articles", "/scenarios", "/switch", "/stories", "/benchmark", "/health-scores", "/alerts", "/reports", "/whats-new", "/costs", "/fee-impact", "/advertise"]);
  // Everything else (about, how-we-earn, privacy, methodology, terms, etc.) → 0.4

  const staticPages = [
    "", "/compare", "/versus", "/reviews", "/calculators",
    "/articles", "/scenarios", "/quiz", "/deals", "/stories", "/about", "/how-we-earn", "/privacy",
    "/methodology", "/how-we-verify", "/terms", "/switch", "/editorial-policy", "/pro", "/benchmark",
    "/health-scores", "/alerts", "/reports", "/whats-new", "/costs", "/fee-impact",
    "/advertise", "/glossary", "/complaints", "/contact", "/consultations", "/courses", "/advisors",
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
    // Share brokers
    "stake-vs-commsec", "cmc-markets-vs-moomoo", "interactive-brokers-vs-saxo",
    "stake-vs-moomoo", "selfwealth-vs-cmc-markets", "commsec-vs-nabtrade",
    "stake-vs-selfwealth", "moomoo-vs-commsec", "interactive-brokers-vs-cmc-markets",
    "superhero-vs-stake", "cmc-markets-vs-commsec", "webull-vs-stake",
    "superhero-vs-commsec", "saxo-vs-cmc-markets", "moomoo-vs-selfwealth",
    "tiger-brokers-vs-moomoo", "stake-vs-interactive-brokers", "commsec-vs-selfwealth",
    "nabtrade-vs-selfwealth", "cmc-markets-vs-selfwealth",
    // Crypto exchanges
    "coinspot-vs-swyftx",
    // Robo-advisors
    "stockspot-vs-raiz", "stockspot-vs-spaceship", "raiz-vs-spaceship",
    "stockspot-vs-vanguard-personal-investor", "spaceship-vs-six-park",
    // Research tools
    "simply-wall-st-vs-tradingview", "simply-wall-st-vs-morningstar",
    "tradingview-vs-morningstar", "simply-wall-st-vs-stock-doctor",
    // CFD & Forex
    "pepperstone-vs-ig-markets", "pepperstone-vs-cmc-markets-cfds",
    "ig-markets-vs-plus500", "cmc-markets-cfds-vs-plus500",
    // Super funds
    "australiansuper-vs-hostplus", "australiansuper-vs-unisuper",
    "hostplus-vs-rest-super", "australiansuper-vs-qsuper",
    // Cross-type (popular search queries)
    "stockspot-vs-vanguard-vap", "raiz-vs-spaceship",
    "brickx-vs-vanguard-vap",
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

  return [...staticPages, ...bestPages, ...costPages, ...brokerPages, ...articlePages, ...scenarioPages, ...authorPages, ...reviewerPages, ...alertPages, ...reportPages, ...versusPages, ...advisorPages];
}
