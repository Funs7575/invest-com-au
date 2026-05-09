import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSwitchScript, listSwitchScripts } from "@/lib/switch-scripts";
import { absoluteUrl, SITE_NAME, breadcrumbJsonLd } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import DatedStatBadge from "@/components/DatedStatBadge";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ "broker-slug": string }>;
}

export async function generateStaticParams() {
  return listSwitchScripts().map((s) => ({ "broker-slug": s.brokerSlug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { "broker-slug": slug } = await params;
  const script = getSwitchScript(slug);
  if (!script) return {};
  const title = `Switch from ${script.brokerName} — negotiation script + transfer steps | ${SITE_NAME}`;
  const description = `How to ask ${script.brokerName} to match a competitor's pricing, and step-by-step what to do if you decide to leave. CHESS / custodian transfer process, AU tax notes (CGT, in-specie, DRP).`;
  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/switch-scripts/${slug}`),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/switch-scripts/${slug}`),
      type: "article",
    },
  };
}

export default async function SwitchScriptPage({ params }: PageProps) {
  const { "broker-slug": slug } = await params;
  const script = getSwitchScript(slug);
  if (!script) notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Switch scripts", url: absoluteUrl("/switch-scripts") },
    { name: script.brokerName },
  ]);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/switch-scripts" className="hover:text-slate-900">
          ← All switch scripts
        </Link>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
          Switch from {script.brokerName}
        </h1>
        <p className="mt-3 text-lg text-slate-700">{script.whySwitch}</p>
        <p className="mt-3 text-sm text-slate-500">
          <DatedStatBadge
            value=""
            sourcedAt={script.verifiedAt}
            stalesAt={script.stalesAt}
            source={`${script.brokerName} pricing`}
            sourceUrl={script.sourceUrl}
            label="Editorial verification"
          />
        </p>
      </header>

      {/* Negotiation script — try this BEFORE leaving */}
      <section
        aria-labelledby="negotiation-heading"
        className="mb-12 rounded-2xl border border-amber-200 bg-amber-50/50 p-6"
      >
        <h2
          id="negotiation-heading"
          className="text-xl font-semibold text-amber-900"
        >
          1 · Try this first — ask {script.brokerName} to match
        </h2>
        <p className="mt-2 text-sm text-amber-800">
          Switching brokers takes 5–10 business days and may trigger a CGT event
          if you're forced to sell instead of transfer. Often the cheapest path
          is to ask your existing broker for a discount before leaving.
        </p>
        <ol className="mt-6 space-y-5">
          {script.negotiationScript.map((step, i) => (
            <li key={i} className="rounded-lg bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">
                {i + 1}. {step.label}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Transfer process — if negotiation fails */}
      <section aria-labelledby="transfer-heading" className="mb-12">
        <h2
          id="transfer-heading"
          className="text-xl font-semibold text-slate-900"
        >
          2 · If you decide to leave — transfer process
        </h2>
        <ol className="mt-6 space-y-5">
          {script.transferProcess.map((step, i) => (
            <li
              key={i}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Step {i + 1}: {step.label}
                </h3>
                {step.eta && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {step.eta}
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* AU tax notes */}
      <section aria-labelledby="tax-heading" className="mb-12">
        <h2 id="tax-heading" className="text-xl font-semibold text-slate-900">
          3 · Australian tax notes
        </h2>
        <ul className="mt-6 space-y-3">
          {script.taxNotes.map((note, i) => (
            <li
              key={i}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700"
            >
              {note}
            </li>
          ))}
        </ul>
      </section>

      {/* Recommended alternatives — cross-link */}
      <section
        aria-labelledby="alternatives-heading"
        className="mb-12 rounded-2xl border border-slate-200 bg-white p-6"
      >
        <h2
          id="alternatives-heading"
          className="text-xl font-semibold text-slate-900"
        >
          4 · If switching, the closest alternatives
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Editorially-curated based on the gap between {script.brokerName} and
          the next-best on price/feature mix. We earn a referral fee when some
          users sign up via these links — promoted placements appear elsewhere
          on the site and are clearly labelled. Switching scripts are not
          influenced by referral relationships.
        </p>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {script.recommendedAlternatives.map((altSlug) => (
            <li key={altSlug}>
              <Link
                href={`/broker/${altSlug}`}
                className="block rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 hover:border-slate-300 hover:bg-white"
              >
                Compare {altSlug.replace(/-/g, " ")} →
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Compliance footer */}
      <footer className="mt-12 border-t border-slate-200 pt-6 text-xs leading-relaxed text-slate-500">
        <p>{GENERAL_ADVICE_WARNING}</p>
      </footer>
    </article>
  );
}
