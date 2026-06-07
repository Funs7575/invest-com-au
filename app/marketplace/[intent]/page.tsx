import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AUSTRALIAN_STATES, bestPageMeta, defaultFaqs } from "@/lib/seo/best-pages";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { getEnabledIntents, getIntent } from "@/lib/getmatched/intents";
import {
  complianceVariantForIntent,
  providerNounForIntent,
} from "@/lib/getmatched/intent-presentation";
import { faqJsonLd } from "@/lib/schema-markup";
import ComplianceFooter from "@/components/ComplianceFooter";

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
  const meta = bestPageMeta({
    intentSlug: intent.slug,
    intentNoun: providerNounForIntent(intent),
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

export default async function FindIntentPage({ params }: PageProps) {
  const { intent: intentSlug } = await params;
  const intent = await getIntent(intentSlug);
  if (!intent) notFound();

  const noun = providerNounForIntent(intent);
  const meta = bestPageMeta({ intentSlug: intent.slug, intentNoun: noun });
  const faqs = defaultFaqs(noun);

  const allIntents = await getEnabledIntents();
  const related = allIntents.filter((i) => i.slug !== intent.slug).slice(0, 6);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Marketplace", url: absoluteUrl("/marketplace") },
    { name: intent.label, url: meta.canonical },
  ]);
  const faqLd = faqJsonLd(faqs);

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

      <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-3">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href="/marketplace" className="hover:underline">Marketplace</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-slate-700">{intent.label}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          {meta.h1}
        </h1>
        {intent.description && (
          <p className="text-slate-600 leading-relaxed">{intent.description}</p>
        )}
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          Pick your state to see verified {noun} near you, or get matched and
          we&apos;ll route your request to the right provider — free, and you
          stay anonymous until you choose to share your details.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <Link
            href={`/get-matched?intent=${intent.slug}`}
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

      <section aria-labelledby="states-heading">
        <h2 id="states-heading" className="text-base font-bold text-slate-900 mb-3">
          Browse {noun} by state
        </h2>
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {AUSTRALIAN_STATES.map((s) => (
            <li key={s.slug}>
              <Link
                href={`/marketplace/${intent.slug}/${s.slug}`}
                className="block bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 hover:border-amber-300 hover:bg-amber-50 transition-colors"
              >
                {s.fullName}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-10">
          <h2 id="related-heading" className="text-base font-bold text-slate-900 mb-3">
            Other categories
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/marketplace/${r.slug}`}
                  className="block bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 hover:border-amber-300 hover:bg-amber-50 transition-colors capitalize"
                >
                  {providerNounForIntent(r)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

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
