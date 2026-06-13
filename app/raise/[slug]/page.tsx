import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { guideBySlug, GUIDE_SLUGS, CSF_PLATFORMS } from "@/lib/raise/guides";
import { PATHWAYS } from "@/lib/raise/pathways";
import { CAPITAL_RAISING_NOTE, GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import GrantAlertsSignup from "@/components/grants/GrantAlertsSignup";

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDE_SLUGS.map((slug) => ({ slug }));
}

interface Params {
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) return {};
  return {
    title: `${guide.title} | Invest.com.au`,
    description: guide.metaDescription,
    alternates: { canonical: `${SITE_URL}/raise/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.metaDescription,
      url: `${SITE_URL}/raise/${guide.slug}`,
      type: "article",
    },
  };
}

export default async function RaiseGuidePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (!guide) notFound();

  const pathway = PATHWAYS[guide.pathwayId];
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Raise", url: absoluteUrl("/raise") },
    { name: pathway.label, url: absoluteUrl(`/raise/${guide.slug}`) },
  ]);
  const faqSchema = faqJsonLd(guide.faqs);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-3xl">
            <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-3">
              <Link href="/raise" className="hover:text-white">Raise</Link>
              <span aria-hidden> / </span>
              <span className="text-slate-300">{pathway.label}</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4">{guide.title}</h1>
            {/* Answer-first TL;DR (GEO: extraction-ready) */}
            <p id="tldr" className="text-slate-200 leading-relaxed border-l-4 border-amber-400 pl-4">
              {guide.tldr}
            </p>
          </div>
        </section>

        <section className="py-10">
          <div className="container-custom max-w-3xl space-y-8">
            {/* Fast facts */}
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500">Typical amounts</p>
                <p className="font-bold text-slate-900 mt-1">{pathway.typicalAmounts}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500">Timeline</p>
                <p className="font-bold text-slate-900 mt-1">{pathway.typicalTimeline}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500">What it costs</p>
                <p className="font-bold text-slate-900 mt-1">{pathway.cost}</p>
              </div>
            </div>

            {guide.sections.map((s) => (
              <div key={s.heading}>
                <h2 className="text-xl font-extrabold text-slate-900 mb-2">{s.heading}</h2>
                <p className="text-slate-700 leading-relaxed">{s.body}</p>
              </div>
            ))}

            {guide.showCsfPlatformTable && (
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 mb-2">
                  Licensed CSF platforms in Australia
                </h2>
                <p className="text-sm text-slate-700 mb-3">
                  CSF offers can only run on the platform of an ASIC-licensed crowd-sourced funding
                  intermediary. This is a factual reference list — <strong>we have no commercial
                  relationship with any CSF intermediary</strong>, this is not a recommendation of
                  any platform, and offers live on their sites, not ours. Always confirm current
                  fees and licensing directly with the platform.
                </p>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm" aria-label="Licensed Australian CSF intermediaries — factual comparison">
                    <thead>
                      <tr className="bg-slate-50">
                        <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Platform</th>
                        <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Focus</th>
                        <th scope="col" className="px-4 py-3 text-left font-extrabold text-slate-700">Fees</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {CSF_PLATFORMS.map((p) => (
                        <tr key={p.name} className="align-top">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <a
                              href={p.url}
                              rel="nofollow noopener noreferrer"
                              target="_blank"
                              className="hover:underline inline-flex items-center gap-1"
                            >
                              {p.name}
                              <Icon name="external-link" size={12} className="text-slate-500" aria-hidden />
                            </a>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{p.focus}</td>
                          <td className="px-4 py-3 text-slate-700">{p.fees}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-600 mt-2">
                  Platform list verified June 2026. Equitise is excluded — it entered voluntary
                  administration in late 2024. Listing order is alphabetical by market share
                  reporting, not a ranking.
                </p>
              </div>
            )}

            {guide.pathwayId === "grants" && <GrantAlertsSignup sourcePage={`/raise/${guide.slug}`} />}

            {/* FAQs */}
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-3">Frequently asked questions</h2>
              <div className="space-y-4">
                {guide.faqs.map((f) => (
                  <div key={f.q} className="rounded-xl border border-slate-200 p-4">
                    <h3 className="font-extrabold text-slate-900 text-sm mb-1">{f.q}</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Next steps */}
            <div className="rounded-2xl bg-slate-900 text-white p-6">
              <h2 className="text-lg font-extrabold mb-1">Not sure this is your pathway?</h2>
              <p className="text-sm text-slate-300 mb-4">
                Run the Pathway Finder — ten questions, all seven pathways ranked for your
                situation with honest trade-offs.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/raise/pathway-finder"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-extrabold px-4 py-2.5"
                >
                  Find your funding pathway <Icon name="arrow-right" size={14} aria-hidden />
                </Link>
                {pathway.nextSteps.map((s) =>
                  s.href.startsWith(`/raise/${guide.slug}`) ? null : (
                    <Link
                      key={s.href}
                      href={s.href}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 hover:border-amber-400 text-white text-sm font-bold px-4 py-2.5"
                    >
                      {s.label}
                    </Link>
                  ),
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-600 leading-relaxed">{CAPITAL_RAISING_NOTE}</p>
              <p className="text-xs text-slate-600 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
