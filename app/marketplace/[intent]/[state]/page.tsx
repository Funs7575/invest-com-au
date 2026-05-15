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
import { createClient } from "@/lib/supabase/server";

export const revalidate = 86400;

export async function generateStaticParams() {
  const intents = await getEnabledIntents();
  return generateBestCombos(intents.map((i) => i.slug));
}

interface PageProps {
  params: Promise<{ intent: string; state: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { intent: intentSlug, state: stateSlug } = await params;
  const intent = await getIntent(intentSlug);
  const state = getStateBySlug(stateSlug);
  if (!intent || !state) return { title: "Not found" };
  const meta = bestPageMeta({ intentLabel: intent.label, state });
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
  };
}

export default async function FindIntentStatePage({ params }: PageProps) {
  const { intent: intentSlug, state: stateSlug } = await params;
  const intent = await getIntent(intentSlug);
  const state = getStateBySlug(stateSlug);
  if (!intent || !state) notFound();

  const meta = bestPageMeta({ intentLabel: intent.label, state });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Marketplace", url: absoluteUrl("/marketplace") },
    { name: intent.label, url: absoluteUrl(`/marketplace/${intent.slug}`) },
    { name: state.fullName, url: meta.canonical },
  ]);
  const faqs = defaultFaqs(intent.label, state.fullName);

  // Pull a small set of verified providers for this state. Anon-readable.
  const supabase = await createClient();
  const { data: pros } = await supabase
    .from("professionals")
    .select("id, slug, name, verified, rating, location_state, profile_quality_gate, status")
    .eq("status", "active")
    .eq("location_state", state.code)
    .in("profile_quality_gate", ["passed", "pending"])
    .order("verified", { ascending: false })
    .order("rating", { ascending: false })
    .limit(8);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <nav className="text-xs text-slate-500 mb-3">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/marketplace" className="hover:underline">Find</Link>
        <span className="mx-2">/</span>
        <Link href={`/marketplace/${intent.slug}`} className="hover:underline">{intent.label}</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{state.fullName}</span>
      </nav>

      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{meta.h1}</h1>
      {intent.description && (
        <p className="text-slate-600 mb-6 leading-relaxed">{intent.description}</p>
      )}

      <Link
        href={`/get-matched?intent=${intent.slug}&state=${state.code}`}
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl mb-8"
      >
        Get matched →
      </Link>

      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3">
          Verified providers in {state.fullName}
        </h2>
        {pros && pros.length > 0 ? (
          <ul className="space-y-2">
            {(pros as Array<{ id: number; slug: string | null; name: string; verified: boolean; rating: number | null }>).map((p) => (
              <li key={p.id}>
                <Link
                  href={p.slug ? `/advisors/${p.slug}` : `/advisors`}
                  className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-300"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{p.name}</p>
                    {p.verified && (
                      <span className="text-[10px] uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                        Verified
                      </span>
                    )}
                  </div>
                  {p.rating != null && (
                    <p className="text-xs text-slate-500 mt-1">
                      Rating {p.rating.toFixed(1)} / 5
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">
            No verified providers in {state.fullName} yet for this category.{" "}
            <Link href={`/marketplace/${intent.slug}`} className="text-amber-700 underline">
              Browse all of Australia →
            </Link>
          </p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-base font-bold text-slate-900 mb-3">
          Other states
        </h2>
        <ul className="flex flex-wrap gap-2">
          {AUSTRALIAN_STATES.filter((s) => s.slug !== state.slug).map((s) => (
            <li key={s.slug}>
              <Link
                href={`/marketplace/${intent.slug}/${s.slug}`}
                className="text-xs text-slate-700 bg-slate-100 hover:bg-amber-50 px-3 py-1.5 rounded-lg"
              >
                {s.code}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-base font-bold text-slate-900 mb-3">FAQs</h2>
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

      <p className="text-[11px] text-slate-400 mt-8">
        General information only. Verified providers deliver their services
        under their own AFSL or professional licence.
      </p>
    </main>
  );
}
