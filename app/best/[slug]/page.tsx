import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import {
  getCategoryBySlug,
  getAllCategorySlugs,
} from "@/lib/best-broker-categories";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  REVIEW_AUTHOR,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";
import { getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import { trackClick } from "@/lib/tracking";
import BrokerCard from "@/components/BrokerCard";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";
import ScrollReveal from "@/components/ScrollReveal";
import type { LeadSegment } from "@/components/ContextualLeadMagnet";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

const SLUG_TO_SEGMENT: Record<string, LeadSegment> = {
  beginners: "beginner-guide",
  "us-shares": "us-shares-guide",
  "low-fees": "fee-audit",
  "chess-sponsored": "fee-audit",
  smsf: "smsf-checklist",
  crypto: "fee-audit",
  "low-fx-fees": "us-shares-guide",
};

// ── Static params for ISR ──
export async function generateStaticParams() {
  return getAllCategorySlugs().map((slug) => ({ slug }));
}

// ── Dynamic metadata ──
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) return {};
  const ogImageUrl = `/api/og?title=${encodeURIComponent(cat.h1)}&subtitle=${encodeURIComponent(cat.metaDescription.slice(0, 80))}&type=best`;
  return {
    title: cat.title,
    description: cat.metaDescription,
    alternates: { canonical: `/best/${slug}` },
    openGraph: {
      title: cat.title,
      description: cat.metaDescription,
      url: absoluteUrl(`/best/${slug}`),
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: cat.h1 }],
    },
    twitter: { card: "summary_large_image" as const },
  };
}

export default async function BestBrokerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) notFound();

  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active");

  const allBrokers = (brokers as Broker[]) || [];
  const filtered = allBrokers.filter(cat.filter).sort(cat.sort);
  const topPick = filtered[0] || null;

  // ── JSON-LD: Article + ItemList + FAQ + Breadcrumb ──
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: cat.h1,
    description: cat.metaDescription,
    url: absoluteUrl(`/best/${slug}`),
    datePublished: "2026-02-01",
    dateModified: new Date().toISOString().split("T")[0],
    author: {
      "@type": "Person",
      name: REVIEW_AUTHOR.name,
      jobTitle: REVIEW_AUTHOR.jobTitle,
      url: absoluteUrl("/reviewers/editorial-team"),
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: absoluteUrl("/icon.png") },
    },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: cat.h1,
    numberOfItems: filtered.length,
    itemListElement: filtered.slice(0, 10).map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      url: absoluteUrl(`/broker/${b.slug}`),
    })),
  };

  const faqJsonLd =
    cat.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: cat.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Best Brokers", url: absoluteUrl("/best") },
    { name: cat.h1 },
  ]);

  const allCategories = getAllCategorySlugs()
    .map(getCategoryBySlug)
    .filter((c) => c && c.slug !== slug) as NonNullable<
    ReturnType<typeof getCategoryBySlug>
  >[];

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-green-700">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/best" className="hover:text-green-700">
              Best Brokers
            </Link>
            <span className="mx-2">/</span>
            <span className="text-green-700">{cat.h1.replace("Best ", "").replace(" in Australia", "")}</span>
          </nav>

          {/* Header */}
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            {cat.h1}
          </h1>
          <p className="text-slate-600 mb-2">{cat.intro}</p>
          <p className="text-xs text-slate-400 mb-2">
            {ADVERTISER_DISCLOSURE_SHORT}
          </p>

          {/* Author byline */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-4 pb-4 border-b border-slate-100">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              Reviewed by{" "}
              <Link href="/reviewers/editorial-team" className="font-semibold text-slate-700 hover:text-green-700 transition-colors">
                {REVIEW_AUTHOR.name}
              </Link>
              <span className="text-slate-400">· {REVIEW_AUTHOR.jobTitle}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Updated February 2026
            </span>
          </div>

{/* Our selection criteria */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8">
            <h2 className="text-lg font-bold text-green-900 mb-2">
              How We Selected These Brokers
            </h2>
            <ScrollReveal animation="scroll-check-stagger" as="ul" className="space-y-1.5">
              {cat.criteria.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-green-600 font-bold mt-0.5">✓</span>
                  {c}
                </li>
              ))}
            </ScrollReveal>
            <p className="text-xs text-slate-500 mt-3">
              Methodology:{" "}
              <Link href="/how-we-verify" className="text-green-700 hover:text-green-800 underline">
                How we verify fees and rank brokers
              </Link>
            </p>
          </div>

          {/* Top Pick highlight */}
          {topPick && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Our Top Pick
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold">
                    <Link href={`/broker/${topPick.slug}`} className="hover:text-green-700 transition-colors">
                      {topPick.name}
                    </Link>
                  </h3>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {topPick.tagline}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="text-amber">{renderStars(topPick.rating || 0)}</span>
                    <span className="text-slate-500">{topPick.rating}/5</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">{topPick.asx_fee || "N/A"} ASX</span>
                    {topPick.chess_sponsored && (
                      <>
                        <span className="text-slate-400">·</span>
                        <span className="text-green-600 font-semibold text-xs">CHESS</span>
                      </>
                    )}
                  </div>
                </div>
                <a
                  href={getAffiliateLink(topPick)}
                  target="_blank"
                  rel={AFFILIATE_REL}
                  className="shrink-0 px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors text-center"
                >
                  {getBenefitCta(topPick, "compare")}
                </a>
              </div>
            </div>
          )}

          {/* All qualifying brokers */}
          <h2 className="text-2xl font-bold mb-4">
            All Qualifying Brokers ({filtered.length})
          </h2>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto mb-8">
            <ScrollReveal animation="table-row-stagger" as="table" className="w-full border border-slate-200 rounded-lg">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-sm">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">Broker</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">ASX Fee</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">US Fee</th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">FX Rate</th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">CHESS</th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">Rating</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((broker, i) => (
                  <tr key={broker.id} className={`hover:bg-slate-50 ${i === 0 ? "bg-amber-50/40" : ""}`}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/broker/${broker.slug}`} className="font-semibold text-brand hover:text-green-700 transition-colors">
                        {broker.name}
                      </Link>
                      {i === 0 && (
                        <div className="text-[0.6rem] font-extrabold text-amber-600 uppercase tracking-wide">
                          Top Pick
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{broker.asx_fee || "N/A"}</td>
                    <td className="px-4 py-3 text-sm">{broker.us_fee || "N/A"}</td>
                    <td className="px-4 py-3 text-sm">{broker.fx_rate != null ? `${broker.fx_rate}%` : "N/A"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={broker.chess_sponsored ? "text-green-600 font-semibold" : "text-red-500"}>
                        {broker.chess_sponsored ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-amber">{renderStars(broker.rating || 0)}</span>
                      <span className="text-sm text-slate-500 ml-1">{broker.rating}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a
                        href={getAffiliateLink(broker)}
                        target="_blank"
                        rel={AFFILIATE_REL}
                        className="inline-block px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
                      >
                        {getBenefitCta(broker, "compare")}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ScrollReveal>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-4 mb-8">
            {filtered.map((broker, i) => (
              <BrokerCard
                key={broker.id}
                broker={broker}
                badge={i === 0 ? "Top Pick" : undefined}
                context="compare"
              />
            ))}
          </div>
          <CompactDisclaimerLine />

          {/* Editorial sections */}
          <div className="space-y-8 mb-10">
            {cat.sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-xl font-bold mb-2">{section.heading}</h2>
                <p className="text-slate-600 leading-relaxed">{section.body}</p>
              </section>
            ))}
          </div>

          {/* Contextual lead magnet */}
          <div className="mb-10">
            <ContextualLeadMagnet segment={SLUG_TO_SEGMENT[slug] || "fee-audit"} />
          </div>

          {/* FAQ section */}
          {cat.faqs.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {cat.faqs.map((faq, i) => (
                  <details key={i} className="border border-slate-200 rounded-lg">
                    <summary className="px-4 py-3 font-semibold text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                      {faq.question}
                    </summary>
                    <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Related links */}
          <div className="bg-slate-50 rounded-xl p-5 mb-8">
            <h3 className="text-lg font-bold mb-3">Related Guides</h3>
            <div className="flex flex-wrap gap-2">
              {cat.relatedLinks.map((link, i) => (
                <Link
                  key={i}
                  href={link.href}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-sm text-slate-700 hover:border-green-700 hover:text-green-700 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Cross-links to other best-for categories */}
          <div className="border-t border-slate-100 pt-8">
            <h3 className="text-lg font-bold mb-4">
              More &quot;Best Broker&quot; Guides
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {allCategories.slice(0, 6).map((otherCat) => (
                <Link
                  key={otherCat.slug}
                  href={`/best/${otherCat.slug}`}
                  className="block p-3 border border-slate-200 rounded-lg hover:border-green-700 hover:bg-green-50/50 transition-colors"
                >
                  <span className="text-sm font-semibold text-slate-800">
                    {otherCat.h1.replace(" in Australia", "")}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
