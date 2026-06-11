import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import {
  CGT_SCENARIOS,
  cgtScenario,
  cgtScenarioOutcomes,
  relatedCgtScenarios,
  formatMoney,
  type CgtScenario,
} from "@/lib/cgt-scenarios";

export const revalidate = 86400;
// Small, fully known grid — prerender everything.
export function generateStaticParams() {
  return CGT_SCENARIOS.map((s) => ({ scenario: s.slug }));
}
export const dynamicParams = false;

function headline(s: CgtScenario): string {
  return `CGT on a $${s.gainLabel} gain at ${s.rateLabel}%`;
}

export async function generateMetadata({ params }: { params: Promise<{ scenario: string }> }): Promise<Metadata> {
  const { scenario: slug } = await params;
  const s = cgtScenario(slug);
  if (!s) notFound();
  const { shortHold, longHold } = cgtScenarioOutcomes(s);
  return {
    title: `CGT on a $${s.gainLabel} Capital Gain at ${s.rateLabel}% — Held Under vs Over 12 Months (${CURRENT_YEAR})`,
    description: `A $${s.gainLabel} capital gain at a ${s.rateLabel}% marginal rate: ${formatMoney(shortHold.taxWithDiscount)} tax if sold within 12 months, ${formatMoney(longHold.taxWithDiscount)} after — the 50% discount saves ${formatMoney(longHold.taxSaved)}.`,
    alternates: { canonical: absoluteUrl(`/cgt-calculator/${s.slug}`) },
  };
}

export default async function CgtScenarioPage({ params }: { params: Promise<{ scenario: string }> }) {
  const { scenario: slug } = await params;
  const s = cgtScenario(slug);
  if (!s) notFound();

  const { shortHold, longHold, superHold } = cgtScenarioOutcomes(s);
  const related = relatedCgtScenarios(s);

  const faqs = [
    {
      q: `How much CGT do I pay on a $${s.gainLabel} gain at the ${s.rateLabel}% marginal rate?`,
      a: `Sold within 12 months of buying, the whole gain is assessable: about ${formatMoney(shortHold.taxWithDiscount)} at a flat ${s.rateLabel}% marginal rate. Held longer than 12 months, the 50% CGT discount halves the assessable gain and the tax falls to about ${formatMoney(longHold.taxWithDiscount)} — a saving of ${formatMoney(longHold.taxSaved)}.`,
    },
    {
      q: "Does the 12-month clock matter that much?",
      a: `In this scenario it's worth ${formatMoney(longHold.taxSaved)}. Selling even a day before the 12-month mark forfeits the entire discount — if you're close to the anniversary, the date you sign the contract (not settlement) is what counts.`,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "CGT calculator", url: absoluteUrl("/cgt-calculator") },
          { name: headline(s), url: absoluteUrl(`/cgt-calculator/${s.slug}`) },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />

      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/cgt-calculator" className="hover:text-slate-700 transition-colors">CGT calculator</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">${s.gainLabel} at {s.rateLabel}%</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
          CGT on a ${s.gainLabel} gain at a {s.rateLabel}% marginal rate
        </h1>
        <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6">
          The single biggest lever is the calendar: hold past 12 months and half the gain
          disappears from your assessable income. Here is exactly what that does to the bill.
        </p>

        {/* Headline saving */}
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 mb-6 text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            The 12-month discount is worth
          </p>
          <p className="text-4xl font-extrabold text-slate-900 tabular-nums">{formatMoney(longHold.taxSaved)}</p>
          <p className="text-xs text-slate-500 mt-1.5">
            on this gain at this rate — {formatMoney(shortHold.taxWithDiscount)} vs {formatMoney(longHold.taxWithDiscount)}
          </p>
        </div>

        {/* Comparison table */}
        <section aria-labelledby="cgt-outcomes" className="mb-6">
          <h2 id="cgt-outcomes" className="text-sm font-bold text-slate-900 mb-2.5">
            ${s.gainLabel} gross gain, three ways
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
                  <th scope="col" className="px-3 py-2.5 text-left">Situation</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Assessable gain</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Tax</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Effective rate</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2.5 font-semibold text-slate-800">Sold within 12 months</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{formatMoney(shortHold.discountedGain)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-red-600">{formatMoney(shortHold.taxWithDiscount)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{shortHold.effectiveRateWithDiscount.toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="px-3 py-2.5 font-semibold text-slate-800">Held &gt; 12 months (individual)</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{formatMoney(longHold.discountedGain)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-emerald-700">{formatMoney(longHold.taxWithDiscount)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{longHold.effectiveRateWithDiscount.toFixed(1)}%</td>
                </tr>
                <tr>
                  <td className="px-3 py-2.5 font-semibold text-slate-800">Held &gt; 12 months in super (15%)</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{formatMoney(superHold.discountedGain)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-bold text-emerald-700">{formatMoney(superHold.taxWithDiscount)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{superHold.effectiveRateWithDiscount.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 text-[0.7rem] leading-relaxed text-slate-500">
            Assumptions: a single asset, flat marginal rate of {s.rateLabel}% (excludes the
            Medicare levy), no capital losses or other offsets, individual 50% discount and super
            one-third discount as legislated. Illustrative general information — not tax advice;
            your return depends on your full circumstances.
          </p>
        </section>

        {/* Interactive cross-link */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 mb-6">
          <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Icon name="trending-up" size={16} className="text-emerald-600" />
            Your numbers won&apos;t be this round
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed mb-3">
            Put your actual cost base, sale price and bracket into the interactive calculator —
            or talk timing with a professional before you sign anything.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/cgt-calculator"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Open the CGT calculator
            </Link>
            <Link
              href="/advisors/accountants"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              Find a tax professional
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-8 space-y-5">
          <h2 className="text-lg font-bold text-slate-900">Common questions</h2>
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">{f.q}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </section>

        {/* Related scenarios */}
        {related.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-slate-900 mb-2.5">Other scenarios</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/cgt-calculator/${r.slug}`}
                    className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-amber-300 hover:bg-amber-50/50 transition-colors"
                  >
                    ${r.gainLabel} gain at {r.rateLabel}%
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ComplianceFooter variant="calculator" />
      </div>
    </div>
  );
}
