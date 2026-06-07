import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getOpportunityCategories,
  getInvestCategoryBySlug,
  getCategoryDbFilter,
} from "@/lib/invest-categories";
import { getInvestGuide } from "@/lib/invest-guides";
import { getInvestGuideListings } from "@/lib/invest-guide-data";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, UPDATED_LABEL, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import InvestListingCard from "@/components/InvestListingCard";
import Icon from "@/components/Icon";

export const revalidate = 3600;

/**
 * Programmatic "How to invest in X in Australia" guide (Wave 7 SEO).
 *
 * One authoritative page per opportunity vertical, unifying the
 * high-intent how-to / minimum-investment / tax-treatment queries the
 * gap audit flagged. Lives at /how-to-invest-in/[vertical] — a
 * dedicated namespace that avoids the static-vs-dynamic routing
 * collision under /invest/* (most verticals have a static dir there).
 *
 * Editorial content is hand-authored per vertical (lib/invest-guides);
 * the minimum-investment and live-opportunities sections are pulled
 * from the marketplace DB at render time so the page is self-updating,
 * not a static doorway.
 */

export async function generateStaticParams() {
  return getOpportunityCategories().map((c) => ({ vertical: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ vertical: string }>;
}): Promise<Metadata> {
  const { vertical } = await params;
  const cat = getInvestCategoryBySlug(vertical);
  if (!cat || cat.intent !== "opportunity") {
    return { title: "Investment guide", robots: { index: false } };
  }
  const title = `How to Invest in ${cat.label} in Australia (${CURRENT_YEAR})`;
  const description = `How to invest in ${cat.label.toLowerCase()} in Australia: step-by-step process, minimum investment, tax treatment (CGT, GST, FIRB) and key risks. Plus live ${cat.label.toLowerCase()} opportunities on the marketplace.`;
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: absoluteUrl(`/how-to-invest-in/${vertical}`) },
    openGraph: { title, description, url: absoluteUrl(`/how-to-invest-in/${vertical}`), type: "article", images: [{ url: `/api/og?title=${encodeURIComponent("How to Invest in " + cat.label)}&sub=${encodeURIComponent("Step-by-Step · Tax · Risks · " + CURRENT_YEAR)}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function HowToInvestPage({
  params,
}: {
  params: Promise<{ vertical: string }>;
}) {
  const { vertical } = await params;
  const cat = getInvestCategoryBySlug(vertical);
  if (!cat || cat.intent !== "opportunity") notFound();

  const guide = getInvestGuide(cat.slug, cat.label);
  const filter = getCategoryDbFilter(cat);

  const { listings, count, minTicketAud } = await getInvestGuideListings(
    filter.verticals,
    filter.subCategories,
  );

  const faqs = cat.faqs ?? [];
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: cat.label, url: absoluteUrl(`/invest?category=${cat.slug}`) },
    { name: `How to invest` },
  ]);
  const faqSchema = faqJsonLd(faqs.map((f) => ({ q: f.question, a: f.answer })));

  const browseHref = `/invest?category=${cat.slug}`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      <article className="bg-white text-slate-900">
        <div className="container-custom max-w-4xl py-8 md:py-12">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-5">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href="/invest" className="hover:text-slate-900">Invest</Link>
            <span className="mx-1.5">/</span>
            <Link href={browseHref} className="hover:text-slate-900">{cat.label}</Link>
            <span className="mx-1.5">/</span>
            <span className="text-slate-700">How to invest</span>
          </nav>

          {/* Hero */}
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
              Investment guide · {UPDATED_LABEL}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              How to invest in {cat.label.toLowerCase()} in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-600 leading-relaxed">
              {cat.intro}
            </p>
            {count > 0 && (
              <div className="mt-4">
                <Link
                  href={browseHref}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 transition-colors"
                >
                  See {count} live {count === 1 ? "opportunity" : "opportunities"}
                  <Icon name="arrow-right" size={14} />
                </Link>
              </div>
            )}
          </header>

          {/* How to invest — steps */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-extrabold mb-4">
              How to invest in {cat.label.toLowerCase()} — step by step
            </h2>
            <ol className="space-y-3">
              {guide.howTo.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-sm md:text-base text-slate-700 leading-relaxed pt-0.5">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Minimum investment */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-extrabold mb-3">
              How much do you need to invest in {cat.label.toLowerCase()}?
            </h2>
            <p className="text-sm md:text-base text-slate-700 leading-relaxed">{guide.minimum}</p>
            {minTicketAud != null && (
              <p className="mt-3 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                <span className="font-semibold text-slate-900">On our marketplace right now:</span>{" "}
                {cat.label.toLowerCase()} opportunities start from about{" "}
                <span className="font-bold text-emerald-700">
                  ${minTicketAud.toLocaleString("en-AU")}
                </span>.{" "}
                <Link href={browseHref} className="text-emerald-700 underline underline-offset-2 hover:text-emerald-900">
                  Browse all {count}
                </Link>
              </p>
            )}
          </section>

          {/* Tax treatment */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-extrabold mb-3">
              Tax treatment of {cat.label.toLowerCase()} in Australia
            </h2>
            <p className="text-sm md:text-base text-slate-700 leading-relaxed">{guide.tax}</p>
            <p className="mt-2 text-xs text-slate-500">
              General information only — not tax advice. Confirm your situation with a registered tax agent.
              Each marketplace listing has an after-tax return estimator that models these rates by investment structure.
            </p>
          </section>

          {/* Key risks */}
          <section className="mb-10">
            <h2 className="text-xl md:text-2xl font-extrabold mb-3">Key risks</h2>
            <ul className="space-y-2">
              {guide.risks.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm md:text-base text-slate-700">
                  <span className="shrink-0 text-amber-500 mt-0.5"><Icon name="alert-triangle" size={15} /></span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Live opportunities */}
          {listings.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-xl md:text-2xl font-extrabold">
                  Live {cat.label.toLowerCase()} opportunities
                </h2>
                <Link href={browseHref} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1">
                  View all {count}
                  <Icon name="arrow-right" size={13} />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {listings.map((l) => (
                  <InvestListingCard key={l.id} listing={l} />
                ))}
              </div>
            </section>
          )}

          {/* FAQ */}
          {faqs.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl md:text-2xl font-extrabold mb-4">Frequently asked questions</h2>
              <div className="space-y-3">
                {faqs.map((f, i) => (
                  <details key={i} className="group rounded-lg border border-slate-200 bg-white">
                    <summary className="cursor-pointer px-4 py-3 font-semibold text-sm md:text-base text-slate-900 flex items-center justify-between gap-2">
                      {f.question}
                      <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform"><Icon name="chevron-down" size={16} /></span>
                    </summary>
                    <p className="px-4 pb-4 text-sm text-slate-700 leading-relaxed">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Cross-link callout */}
          <aside className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-2xl p-5 md:p-6">
            <div className="flex items-start gap-3">
              <span className="shrink-0 rounded-lg p-2 bg-emerald-100 text-emerald-700">
                <Icon name="trending-up" size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base md:text-lg font-bold text-slate-900">
                  Ready to browse {cat.label.toLowerCase()}?
                </h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  See every live {cat.label.toLowerCase()} opportunity on the marketplace — filter by
                  ticket size, location, FIRB eligibility and more, and model the after-tax return on each.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    href={browseHref}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 transition-colors"
                  >
                    Browse {cat.label.toLowerCase()}
                    <Icon name="arrow-right" size={14} />
                  </Link>
                  <Link
                    href="/find-advisor"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900 px-2 py-2"
                  >
                    Get matched to an advisor
                    <Icon name="arrow-right" size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </aside>

          {/* Compliance */}
          <div className="mt-8 border border-amber-200 bg-amber-50 rounded-lg px-4 py-3 text-xs text-slate-600 leading-relaxed">
            <strong className="text-slate-700">General Advice Warning:</strong> {GENERAL_ADVICE_WARNING}
          </div>
        </div>
      </article>
    </>
  );
}
