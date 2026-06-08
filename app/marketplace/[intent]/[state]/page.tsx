import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AUSTRALIAN_STATES,
  bestPageMeta,
  defaultFaqs,
  generateBestCombos,
  getStateBySlug,
} from "@/lib/seo/best-pages";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { getEnabledIntents, getIntent } from "@/lib/getmatched/intents";
import {
  complianceVariantForIntent,
  providerNounForIntent,
} from "@/lib/getmatched/intent-presentation";
import { faqJsonLd, itemListJsonLd } from "@/lib/schema-markup";
import { createClient } from "@/lib/supabase/server";
import ComplianceFooter from "@/components/ComplianceFooter";

export const revalidate = 86400;

export async function generateStaticParams() {
  const intents = await getEnabledIntents();
  return generateBestCombos(intents.map((i) => i.slug));
}

interface PageProps {
  params: Promise<{ intent: string; state: string }>;
}

interface ProCard {
  id: number;
  slug: string | null;
  name: string;
  verified: boolean | null;
  rating: number | null;
  firm_name: string | null;
  location_suburb: string | null;
  location_display: string | null;
  avg_response_minutes: number | null;
}

/** "~45 min" / "~3 hrs" / "within a day" — friendly response-time chip. */
function formatResponse(mins: number | null): string | null {
  if (!mins || mins <= 0) return null;
  if (mins < 90) return `Replies in ~${Math.round(mins)} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Replies in ~${hrs} hr${hrs === 1 ? "" : "s"}`;
  return "Usually replies within a day";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { intent: intentSlug, state: stateSlug } = await params;
  const intent = await getIntent(intentSlug);
  const state = getStateBySlug(stateSlug);
  if (!intent || !state) return { title: "Not found" };
  const meta = bestPageMeta({
    intentSlug: intent.slug,
    intentNoun: providerNounForIntent(intent),
    state,
  });
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: meta.canonical,
      type: "website",
    },
  };
}

export default async function FindIntentStatePage({ params }: PageProps) {
  const { intent: intentSlug, state: stateSlug } = await params;
  const intent = await getIntent(intentSlug);
  const state = getStateBySlug(stateSlug);
  if (!intent || !state) notFound();

  const noun = providerNounForIntent(intent);
  const meta = bestPageMeta({ intentSlug: intent.slug, intentNoun: noun, state });
  const faqs = defaultFaqs(noun, state.fullName);

  // Verified providers for this state. Public read (anon SELECT policy).
  const supabase = await createClient();
  const { data: prosRaw } = await supabase
    .from("professionals")
    .select(
      "id, slug, name, verified, rating, firm_name, location_suburb, location_display, avg_response_minutes, location_state, profile_quality_gate, status",
    )
    .eq("status", "active")
    .eq("location_state", state.code)
    .in("profile_quality_gate", ["passed", "pending"])
    .order("verified", { ascending: false })
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(8);
  const pros = (prosRaw ?? []) as ProCard[];

  // A few sibling categories for internal linking, same state.
  const allIntents = await getEnabledIntents();
  const related = allIntents.filter((i) => i.slug !== intent.slug).slice(0, 6);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Marketplace", url: absoluteUrl("/marketplace") },
    { name: intent.label, url: absoluteUrl(`/marketplace/${intent.slug}`) },
    { name: state.fullName, url: meta.canonical },
  ]);
  const faqLd = faqJsonLd(faqs);
  const listLd =
    pros.filter((p) => p.slug).length > 0
      ? itemListJsonLd(
          meta.h1,
          pros
            .filter((p) => p.slug)
            .map((p, i) => ({
              position: i + 1,
              name: p.name,
              url: `/advisor/${p.slug}`,
              description: p.firm_name ?? undefined,
            })),
        )
      : null;

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      {listLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }}
        />
      )}

      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-3">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href="/marketplace" className="hover:underline">Marketplace</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href={`/marketplace/${intent.slug}`} className="hover:underline">{intent.label}</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-slate-700">{state.fullName}</span>
      </nav>

      {/* Hero */}
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          {meta.h1}
        </h1>
        {intent.description && (
          <p className="text-slate-600 leading-relaxed">{intent.description}</p>
        )}
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          Browse verified {noun} in {state.fullName}, or tell us what you need
          and we&apos;ll match you with the right one — free, and you stay
          anonymous until you choose to share your details.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <Link
            href={`/get-matched?intent=${intent.slug}&state=${state.code}`}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            Get matched <span aria-hidden="true">→</span>
          </Link>
          <Link
            href="/advisors"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-amber-700 px-2 py-2.5"
          >
            Browse all verified providers
          </Link>
        </div>
      </header>

      {/* How it works */}
      <section aria-labelledby="how-it-works" className="mb-10">
        <h2 id="how-it-works" className="sr-only">How getting matched works</h2>
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { n: 1, t: "Tell us what you need", d: "A few quick questions — about 2 minutes. Free, no signup." },
            { n: 2, t: `We match you with verified ${noun}`, d: `Ranked by outcome score, response time, and tier — in ${state.fullName}.` },
            { n: 3, t: "They come to you", d: "Providers pay to respond. You stay anonymous until you choose to share details." },
          ].map((s) => (
            <li key={s.n} className="bg-white border border-slate-200 rounded-xl p-4">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 text-sm font-bold mb-2">
                {s.n}
              </span>
              <p className="font-semibold text-slate-900 text-sm">{s.t}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Providers */}
      <section aria-labelledby="providers-heading">
        <h2 id="providers-heading" className="text-base font-bold text-slate-900 mb-3">
          Verified {noun} in {state.fullName}
        </h2>
        {pros.length > 0 ? (
          <ul className="space-y-2">
            {pros.map((p) => {
              const reply = formatResponse(p.avg_response_minutes);
              const place = p.location_suburb || p.location_display;
              return (
                <li key={p.id}>
                  <Link
                    href={p.slug ? `/advisor/${p.slug}` : "/advisors"}
                    className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900 min-w-0 truncate">{p.name}</p>
                      {p.verified && (
                        <span className="text-[10px] uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded shrink-0">
                          Verified
                        </span>
                      )}
                    </div>
                    {(p.firm_name || place) && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {[p.firm_name, place].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                      {p.rating != null && (
                        <span className="text-xs text-slate-500">
                          <span aria-hidden="true">★</span> {p.rating.toFixed(1)} / 5
                        </span>
                      )}
                      {reply && (
                        <span className="text-xs text-emerald-700">{reply}</span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
            <p className="text-sm text-slate-600">
              No verified {noun} listed in {state.fullName} yet.
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Get matched and we&apos;ll route your request to the right
              provider, or browse the rest of Australia.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              <Link
                href={`/get-matched?intent=${intent.slug}&state=${state.code}`}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                Get matched <span aria-hidden="true">→</span>
              </Link>
              <Link
                href={`/marketplace/${intent.slug}`}
                className="inline-flex items-center text-sm font-semibold text-amber-700 hover:underline px-2 py-2.5"
              >
                Browse all of Australia →
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Related categories */}
      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-10">
          <h2 id="related-heading" className="text-base font-bold text-slate-900 mb-3">
            Other categories in {state.fullName}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/marketplace/${r.slug}/${state.slug}`}
                  className="block bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 hover:border-amber-300 hover:bg-amber-50 transition-colors capitalize"
                >
                  {providerNounForIntent(r)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Other states */}
      <section aria-labelledby="states-heading" className="mt-10">
        <h2 id="states-heading" className="text-base font-bold text-slate-900 mb-3">
          {noun} in other states
        </h2>
        <ul className="flex flex-wrap gap-2">
          {AUSTRALIAN_STATES.filter((s) => s.slug !== state.slug).map((s) => (
            <li key={s.slug}>
              <Link
                href={`/marketplace/${intent.slug}/${s.slug}`}
                className="text-xs text-slate-700 bg-slate-100 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                {s.fullName}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* FAQs */}
      <section aria-labelledby="faq-heading" className="mt-10">
        <h2 id="faq-heading" className="text-base font-bold text-slate-900 mb-3">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="bg-white border border-slate-200 rounded-xl p-4">
              <summary className="text-sm font-semibold text-slate-900 cursor-pointer">
                {f.q}
              </summary>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <ComplianceFooter variant={complianceVariantForIntent(intent)} />
    </main>
  );
}
