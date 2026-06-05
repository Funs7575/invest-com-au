import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BEST_FOR_COMBOS, getBestForCombo } from "@/lib/invest-best-for";
import { getBestForListings } from "@/lib/invest-best-for-data";
import { getInvestCategoryBySlug } from "@/lib/invest-categories";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR, UPDATED_LABEL, SITE_NAME } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import InvestListingCard from "@/components/InvestListingCard";
import InvestOpportunitiesCallout from "@/components/invest/InvestOpportunitiesCallout";
import Icon from "@/components/Icon";

export const revalidate = 3600;

/**
 * Programmatic /invest/best-for/[combo] landing pages (Wave 8 SEO).
 *
 * High-intent pages that intersect an opportunity vertical with an
 * investor archetype ("best commercial property for SMSF", "best funds
 * for SIV applicants"). Dedicated static `best-for` segment — no
 * collision with the /invest/<vertical>/ dirs. Each page pairs authored
 * rationale with a live sample of matching listings and a deep-link into
 * the pre-filtered marketplace.
 */

export function generateStaticParams() {
  return BEST_FOR_COMBOS.map((c) => ({ combo: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ combo: string }>;
}): Promise<Metadata> {
  const { combo: slug } = await params;
  const combo = getBestForCombo(slug);
  if (!combo) return { title: "Best investments by profile", robots: { index: false } };
  const title = `${combo.title} (${CURRENT_YEAR})`;
  const description = combo.intro.slice(0, 155);
  const url = absoluteUrl(`/invest/best-for/${combo.slug}`);
  return {
    title: `${title} | ${SITE_NAME}`,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image" },
  };
}

export default async function BestForComboPage({
  params,
}: {
  params: Promise<{ combo: string }>;
}) {
  const { combo: slug } = await params;
  const combo = getBestForCombo(slug);
  if (!combo) notFound();

  const { listings, total } = await getBestForListings(combo);
  const cat = getInvestCategoryBySlug(combo.categorySlug);
  const browseHref = `/invest?${combo.filterQuery}`;

  // Related combos: prefer ones sharing this investor profile, then fill
  // with others. Cap at 4.
  const related = [
    ...BEST_FOR_COMBOS.filter((c) => c.slug !== combo.slug && c.profileLabel === combo.profileLabel),
    ...BEST_FOR_COMBOS.filter((c) => c.slug !== combo.slug && c.profileLabel !== combo.profileLabel),
  ].slice(0, 4);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: combo.title },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <div className="container-custom max-w-5xl py-8 md:py-12">
        <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-5">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/invest" className="hover:text-slate-900">Invest</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">{combo.verticalLabel} for {combo.profileLabel}</span>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
            Best for {combo.profileLabel} · {UPDATED_LABEL}
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            {combo.title}
          </h1>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed">{combo.intro}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link
              href={browseHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 transition-colors"
            >
              {total > 0
                ? `Browse ${total} matching ${total === 1 ? "opportunity" : "opportunities"}`
                : "Browse the marketplace"}
              <Icon name="arrow-right" size={14} />
            </Link>
            {cat && (
              <Link
                href={`/invest/${cat.slug}`}
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
              >
                {cat.label} overview
                <Icon name="arrow-right" size={13} />
              </Link>
            )}
          </div>
        </header>

        {/* Why this fits */}
        <section className="mb-10">
          <h2 className="text-xl md:text-2xl font-extrabold mb-4">
            Why {combo.verticalLabel} suits {combo.profileLabel}
          </h2>
          <ul className="space-y-3">
            {combo.why.map((reason, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 text-emerald-600"><Icon name="check-circle" size={18} /></span>
                <span className="text-sm md:text-base text-slate-700 leading-relaxed">{reason}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Live matching listings */}
        {listings.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-xl md:text-2xl font-extrabold">Matching opportunities</h2>
              <Link href={browseHref} className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1">
                View all {total}
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

        {/* Related combos */}
        {related.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold mb-3">More curated picks</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {related.map((c) => (
                <Link
                  key={c.slug}
                  href={`/invest/best-for/${c.slug}`}
                  className="group rounded-xl border border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40 p-4 transition-colors"
                >
                  <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-800">{c.title}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.intro}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mb-8">
          <InvestOpportunitiesCallout
            icon="target"
            heading="Not sure which structure fits?"
            blurb="Compare every opportunity type side by side, filter by ticket size, FIRB eligibility and SMSF-suitability, and shortlist what fits your mandate."
            href={browseHref}
            ctaLabel="Open the marketplace"
            secondary={{ label: "Browse all opportunities", href: "/invest" }}
          />
        </div>

        <div className="border border-amber-200 bg-amber-50 rounded-lg px-4 py-3 text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-700">General Advice Warning:</strong> {GENERAL_ADVICE_WARNING}
        </div>
      </div>
    </>
  );
}
