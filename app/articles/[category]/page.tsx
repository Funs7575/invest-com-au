import { permanentRedirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { absoluteUrl, CURRENT_YEAR } from "@/lib/seo";

export const revalidate = 3600;

/**
 * Allowlist of article categories that have dedicated landing URLs.
 * Must match the values in articles.category and the CATEGORY_LABELS
 * map in app/articles/page.tsx.
 */
const CATEGORIES: Record<string, string> = {
  tax: "Tax",
  beginners: "Beginners",
  smsf: "SMSF",
  strategy: "Strategy",
  news: "News",
  reviews: "Reviews",
  crypto: "Crypto",
  etfs: "ETFs",
  "robo-advisors": "Robo-Advisors",
  "research-tools": "Research Tools",
  super: "Super",
  property: "Property",
  "cfd-forex": "CFD & Forex",
};

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const label = CATEGORIES[category];
  if (!label) return {};
  const title = `${label} Articles & Guides (${CURRENT_YEAR}) — Invest.com.au`;
  return {
    title,
    description: `${label} articles and guides for Australian investors. Beginner-friendly explanations, tax strategies, and broker reviews curated by Invest.com.au.`,
    alternates: { canonical: absoluteUrl(`/articles/${category}`) },
    openGraph: {
      title,
      url: absoluteUrl(`/articles/${category}`),
    },
  };
}

/**
 * /articles/[category] exists as a clean SEO URL for each known
 * article category. Under the hood we reuse the /articles hub's
 * existing category filter by redirecting to /articles?category=<slug>.
 *
 * Using a permanent redirect keeps the URL structure flexible — if
 * we later build bespoke category templates, we only need to swap
 * the redirect out for a real render. Until then, the hub page's
 * cluster + filter logic does the heavy lifting.
 */
export default async function ArticlesCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!CATEGORIES[category]) notFound();
  permanentRedirect(`/articles?category=${encodeURIComponent(category)}`);
}
