import { createClient } from "@/lib/supabase/server";
import type { MetadataRoute } from "next";
import { getAllCategorySlugs } from "@/lib/best-broker-categories";
import { getAllCostScenarioSlugs } from "@/lib/cost-scenarios";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";
  const supabase = await createClient();

  // Static pages with tiered priorities
  const highPriority = new Set(["/compare", "/quiz", "/reviews", "/deals", "/pro"]);
  const medPriority = new Set(["/versus", "/calculators", "/articles", "/scenarios", "/switch", "/stories", "/benchmark", "/health-scores", "/alerts", "/reports", "/whats-new", "/costs", "/fee-impact", "/courses"]);
  // Everything else (about, how-we-earn, privacy, methodology, terms, etc.) → 0.4

  const staticPages = [
    "", "/compare", "/versus", "/reviews", "/calculators",
    "/articles", "/scenarios", "/quiz", "/deals", "/stories", "/about", "/how-we-earn", "/privacy",
    "/methodology", "/how-we-verify", "/terms", "/switch", "/editorial-policy", "/pro", "/benchmark",
    "/health-scores", "/alerts", "/reports", "/whats-new", "/costs", "/fee-impact", "/courses",
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

  // Dynamic course pages
  const { data: courses } = await supabase
    .from("courses")
    .select("slug, updated_at")
    .eq("status", "published");

  const coursePages = (courses || []).map((c) => ({
    url: `${baseUrl}/courses/${c.slug}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticPages, ...bestPages, ...costPages, ...brokerPages, ...articlePages, ...scenarioPages, ...authorPages, ...reviewerPages, ...alertPages, ...reportPages, ...coursePages];
}
