import { createClient } from "@/lib/supabase/server";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest-com-au.vercel.app";
  const supabase = await createClient();

  // Static pages
  const staticPages = [
    "", "/compare", "/versus", "/reviews", "/calculators",
    "/articles", "/scenarios", "/quiz", "/about", "/how-we-earn", "/privacy",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
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

  return [...staticPages, ...brokerPages, ...articlePages, ...scenarioPages];
}
