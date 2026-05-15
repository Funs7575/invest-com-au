import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AUSTRALIAN_STATES, bestPageMeta, defaultFaqs } from "@/lib/seo/best-pages";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { getEnabledIntents, getIntent } from "@/lib/getmatched/intents";

export const revalidate = 86400;

export async function generateStaticParams() {
  const intents = await getEnabledIntents();
  return intents.map((i) => ({ intent: i.slug }));
}

interface PageProps {
  params: Promise<{ intent: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { intent: intentSlug } = await params;
  const intent = await getIntent(intentSlug);
  if (!intent) return { title: "Not found" };
  const meta = bestPageMeta({ intentLabel: intent.label });
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: meta.canonical },
  };
}

export default async function FindIntentPage({ params }: PageProps) {
  const { intent: intentSlug } = await params;
  const intent = await getIntent(intentSlug);
  if (!intent) notFound();

  const meta = bestPageMeta({ intentLabel: intent.label });
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Marketplace", url: absoluteUrl("/marketplace") },
    { name: intent.label, url: meta.canonical },
  ]);
  const faqs = defaultFaqs(intent.label);

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
        <span className="text-slate-700">{intent.label}</span>
      </nav>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">{meta.h1}</h1>
      {intent.description && (
        <p className="text-slate-600 mb-6 leading-relaxed">{intent.description}</p>
      )}

      <Link
        href={`/get-matched?intent=${intent.slug}`}
        className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl mb-8"
      >
        Get matched →
      </Link>

      <section>
        <h2 className="text-base font-bold text-slate-900 mb-3">
          Browse by state
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AUSTRALIAN_STATES.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/marketplace/${intent.slug}/${s.slug}`}
                className="block bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 hover:border-amber-300 hover:bg-amber-50"
              >
                {s.fullName}
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
