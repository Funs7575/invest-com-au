/**
 * /scenarios/compare/[preset] — shareable comparison preset page.
 *
 * Server component: statically generated at build time for every preset slug.
 * Hands off to `PresetCompareClient` for the interactive delta view.
 *
 * SEO: Article + ItemList JSON-LD + BreadcrumbList.
 * AFSL: GENERAL_ADVICE_WARNING is displayed by the client component.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { itemListJsonLd } from "@/lib/schema-markup";
import { getPreset, PRESET_SLUGS, allPresetMeta } from "@/lib/scenario-presets";
import PresetCompareClient from "./PresetCompareClient";

// ─── SSG: build all preset pages at compile time ──────────────────────────────

export async function generateStaticParams() {
  return PRESET_SLUGS.map((slug) => ({ preset: slug }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ preset: string }>;
}): Promise<Metadata> {
  const { preset: slug } = await params;
  const p = getPreset(slug);
  if (!p) return {};

  const description = `${p.summary.slice(0, 150)}… General information only — not personal advice.`;

  return {
    title: `${p.title} — Scenario Comparison`,
    description,
    alternates: { canonical: `/scenarios/compare/${slug}` },
    openGraph: {
      title: `${p.title} — ${SITE_NAME}`,
      description,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(p.title)}&subtitle=Scenario+Comparison&type=tool`,
          width: 1200,
          height: 630,
        },
      ],
    },
    robots: "index, follow",
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PresetComparePage({
  params,
}: {
  params: Promise<{ preset: string }>;
}) {
  const { preset: slug } = await params;
  const preset = getPreset(slug);
  if (!preset) notFound();

  // BreadcrumbList JSON-LD
  const bcLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Scenarios", url: absoluteUrl("/scenarios") },
    { name: "Compare Presets", url: absoluteUrl("/scenarios/compare") },
    { name: preset.title },
  ]);

  // Article JSON-LD — describes this comparison page as editorial content
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: preset.title,
    description: preset.summary.slice(0, 300),
    url: absoluteUrl(`/scenarios/compare/${slug}`),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: absoluteUrl("/"),
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/scenarios/compare/${slug}`),
    },
  };

  // ItemList JSON-LD — the two scenarios being compared
  const itemListLd = itemListJsonLd(preset.title, [
    {
      position: 1,
      name: preset.a.label,
      url: `/scenarios/compare/${slug}#scenario-a`,
      description: preset.a.description,
    },
    {
      position: 2,
      name: preset.b.label,
      url: `/scenarios/compare/${slug}#scenario-b`,
      description: preset.b.description,
    },
  ]);

  // ItemList of ALL presets for sitelinks / related-content discovery
  const allPresetsLd = itemListJsonLd("Scenario Comparison Presets", [
    ...allPresetMeta().map((p, i) => ({
      position: i + 1,
      name: p.title,
      url: `/scenarios/compare/${p.slug}`,
      description: p.summary.slice(0, 120),
    })),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bcLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(allPresetsLd) }}
      />
      <PresetCompareClient preset={preset} />
    </>
  );
}
