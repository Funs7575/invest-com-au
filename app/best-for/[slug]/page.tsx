import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  rankBrokersForScenario,
  type BrokerForScoring,
  type ScenarioInput,
} from "@/lib/best-for-scorer";
import { absoluteUrl, breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { itemListJsonLd, faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600;

interface ScenarioRow {
  slug: string;
  h1: string;
  intro: string;
  meta_description: string;
  scoring_weights: Record<string, number>;
  required_attrs: string[] | null;
  category_filter: string | null;
  target_user: string;
  body_sections: Array<{ heading: string; body: string }> | null;
  status: string;
}

async function getScenario(slug: string): Promise<ScenarioRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("best_for_scenarios")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return (data as ScenarioRow | null) || null;
}

async function getBrokers(): Promise<BrokerForScoring[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brokers")
    .select(
      "id, slug, name, status, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, inactivity_fee, chess_sponsored, smsf_support, platform_type, tagline, color",
    )
    .eq("status", "active")
    .limit(200);
  return (data as BrokerForScoring[] | null) || [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scenario = await getScenario(slug);
  if (!scenario) return { title: "Not found", robots: "noindex" };
  const title = `${scenario.h1} (${CURRENT_YEAR})`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent(scenario.h1)}&subtitle=${encodeURIComponent(scenario.meta_description.slice(0, 80))}&type=best`;
  return {
    title,
    description: scenario.meta_description,
    alternates: { canonical: `${SITE_URL}/best-for/${slug}` },
    openGraph: {
      title,
      description: scenario.meta_description,
      url: absoluteUrl(`/best-for/${slug}`),
      type: "website",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: scenario.h1 }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description: scenario.meta_description,
      images: [ogImageUrl],
    },
  };
}

/**
 * /best-for/[slug] — programmatic SEO page.
 *
 * Every row in best_for_scenarios is a live page without any
 * extra code — the scoring_weights field drives the ranking and
 * the page renders the top 5 brokers with a score breakdown,
 * a "why this broker" explainer, and an advisor CTA for
 * high-intent readers.
 *
 * Unknown slugs return 404 so Google doesn't index a blank page.
 */
export default async function BestForPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scenario = await getScenario(slug);
  if (!scenario) notFound();

  const brokers = await getBrokers();
  const input: ScenarioInput = {
    slug: scenario.slug,
    scoring_weights: scenario.scoring_weights,
    required_attrs: scenario.required_attrs,
    category_filter: scenario.category_filter,
  };
  const ranked = rankBrokersForScenario(input, brokers);
  const top = ranked.slice(0, 5);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Best brokers", url: `${SITE_URL}/best` },
    { name: scenario.h1 },
  ]);

  // ItemList over the ranked top-5 so the ranking is machine-readable
  // for AI answer engines. itemListJsonLd absoluteUrl-wraps each url,
  // so pass site-relative paths.
  const listLd =
    top.length > 0
      ? itemListJsonLd(
          scenario.h1,
          top.map((item) => ({
            position: item.rank,
            name: item.broker.name,
            url: `/broker/${item.broker.slug}`,
            description:
              typeof item.broker.tagline === "string"
                ? item.broker.tagline
                : undefined,
          })),
        )
      : null;

  const weightSummary = Object.entries(scenario.scoring_weights)
    .map(([k, v]) => `${k} (${v > 0 ? "+" : ""}${v})`)
    .join(", ");

  const topBrokerName = top[0]?.broker.name ?? "the top-ranked platform";

  const scenarioFaqs = [
    {
      q: `What makes the best broker for ${scenario.target_user.toLowerCase()}?`,
      a: `${scenario.intro} The key factors are ${Object.keys(scenario.scoring_weights).join(", ")}. We score every active Australian broker on each dimension and rank them using a deterministic weighted model, updated hourly.`,
    },
    {
      q: `How is the ${scenario.h1} ranking calculated?`,
      a: `The ranking weights: ${weightSummary}. Positive weights boost a broker's score; negative weights penalise it. Brokers that fail mandatory criteria (such as CHESS sponsorship or SMSF licensing where required) are excluded entirely. The full methodology is published at invest.com.au/editorial-policy.`,
    },
    {
      q: `Is ${topBrokerName} right for me?`,
      a: `${topBrokerName} scored highest for this scenario, but the right broker depends on your personal circumstances — portfolio size, trading frequency, tax situation, and existing investments. This ranking is general information only and does not constitute financial advice. ${scenario.target_user} should consider getting personalised guidance from an ASIC-registered financial advisor.`,
    },
    {
      q: `How often is this list updated?`,
      a: `Rankings update every hour as broker data changes — fee changes, ASIC status updates, and platform changes are reflected the same day. All data is verified against broker websites and ASIC's public register. The page was last re-scored at build time, with ISR re-validation every hour.`,
    },
  ];
  const faqLd = faqJsonLd(scenarioFaqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {listLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }}
        />
      )}
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      <div>
        <section className="bg-white border-b border-slate-100 py-8 md:py-12">
          <div className="container-custom">
            <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-4">
              <Link href="/" className="hover:text-slate-900">Home</Link>
              <span className="mx-1.5">/</span>
              <Link href="/best" className="hover:text-slate-900">Best</Link>
              <span className="mx-1.5">/</span>
              <span className="text-slate-700">{scenario.h1}</span>
            </nav>

            <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-900 px-3 py-0.5 rounded-full mb-3">
              Updated {CURRENT_YEAR}
            </span>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 leading-tight mb-3">
              {scenario.h1}
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-3xl">
              {scenario.intro}
            </p>
          </div>
        </section>

        <section className="py-8 md:py-12 bg-slate-50">
          <div className="container-custom max-w-4xl">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
              Our top picks
            </h2>
            {top.length === 0 ? (
              <p className="text-sm text-slate-600">
                We don&rsquo;t currently have enough brokers that meet the
                criteria for this scenario. Try{" "}
                <Link href="/compare" className="text-primary hover:underline">
                  our broker comparison
                </Link>{" "}
                for the full list.
              </p>
            ) : (
              <ol className="space-y-4">
                {top.map((item) => (
                  <li
                    key={item.broker.slug}
                    className="rounded-xl border border-slate-200 bg-white p-5 md:p-6"
                  >
                    <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Rank #{item.rank}
                        </p>
                        <h3 className="text-lg md:text-xl font-extrabold text-slate-900">
                          <Link
                            href={`/broker/${item.broker.slug}`}
                            className="hover:text-primary"
                          >
                            {item.broker.name}
                          </Link>
                        </h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          className="inline-flex items-center justify-center w-14 h-14 rounded-full border-4 border-emerald-300 text-lg font-extrabold text-emerald-800 bg-emerald-50"
                          aria-label={`Score ${item.score} out of 100`}
                        >
                          {item.score}
                        </div>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                      {item.broker.asx_fee != null && (
                        <div>
                          <dt className="text-slate-500">ASX brokerage</dt>
                          <dd className="font-bold text-slate-900">
                            {String(item.broker.asx_fee) || "—"}
                          </dd>
                        </div>
                      )}
                      {item.broker.us_fee != null && (
                        <div>
                          <dt className="text-slate-500">US brokerage</dt>
                          <dd className="font-bold text-slate-900">
                            {String(item.broker.us_fee) || "—"}
                          </dd>
                        </div>
                      )}
                      {item.broker.chess_sponsored != null && (
                        <div>
                          <dt className="text-slate-500">CHESS-sponsored</dt>
                          <dd className="font-bold text-slate-900">
                            {item.broker.chess_sponsored ? "Yes" : "No"}
                          </dd>
                        </div>
                      )}
                      {item.broker.smsf_support != null && (
                        <div>
                          <dt className="text-slate-500">SMSF support</dt>
                          <dd className="font-bold text-slate-900">
                            {item.broker.smsf_support ? "Yes" : "No"}
                          </dd>
                        </div>
                      )}
                    </dl>
                    <div className="mt-3 flex items-center gap-3">
                      <Link
                        href={`/broker/${item.broker.slug}`}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm px-4 py-2 rounded-lg"
                      >
                        Read the full review
                      </Link>
                      <Link
                        href={`/compare?focus=${item.broker.slug}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        Compare vs others
                      </Link>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-8 text-xs text-slate-500">
              <p>
                Scoring method: we weighted{" "}
                {Object.entries(scenario.scoring_weights)
                  .map(([k, v]) => `${k} (${v > 0 ? "+" : ""}${v})`)
                  .join(", ")}
                . The scoring model is deterministic and documented at{" "}
                <Link
                  href="/editorial-policy"
                  className="underline hover:text-slate-800"
                >
                  /editorial-policy
                </Link>
                . This page is general advice only and does not take into
                account your personal circumstances.
              </p>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-12 bg-white border-t border-slate-100">
          <div className="container-custom max-w-4xl">
            <h2 className="text-xl font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
            <div className="space-y-3">
              {scenarioFaqs.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                    {faq.q}
                    <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-10 md:py-14 bg-white">
          <div className="container-custom max-w-3xl text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
              Want a specialist advisor for this scenario?
            </h2>
            <p className="text-sm md:text-base text-slate-600 mb-6">
              {scenario.target_user} — we hand-match readers with
              ASIC-registered advisors who specialise in exactly this use case.
            </p>
            <Link
              href={`/find-advisor?focus=${scenario.slug}`}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm md:text-base px-6 py-3 rounded-lg inline-block"
            >
              Find a specialist advisor →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
