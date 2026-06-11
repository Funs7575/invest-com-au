import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import {
  FEE_DRAG_SCENARIOS,
  feeDragScenario,
  feeDragOutcomes,
  relatedScenarios,
  formatMoney,
  DEFAULT_GROSS_RETURN_PCT,
  type FeeDragScenario,
} from "@/lib/fee-drag";

export const revalidate = 86400;
// The grid is small and fully known — prerender every scenario.
export function generateStaticParams() {
  return FEE_DRAG_SCENARIOS.map((s) => ({ scenario: s.slug }));
}
export const dynamicParams = false;

function headline(s: FeeDragScenario): string {
  return `$${s.balanceLabel} at ${s.lowFeePct}% vs ${s.highFeePct}% fees`;
}

export async function generateMetadata({ params }: { params: Promise<{ scenario: string }> }): Promise<Metadata> {
  const { scenario: slug } = await params;
  const s = feeDragScenario(slug);
  if (!s) notFound();
  const drag30 = feeDragOutcomes(s.balance, s.lowFeePct, s.highFeePct).find((o) => o.years === 30)!;
  return {
    title: `What a ${s.highFeePct}% Fee Costs on $${s.balanceLabel} vs ${s.lowFeePct}% (${CURRENT_YEAR})`,
    description: `Paying ${s.highFeePct}% instead of ${s.lowFeePct}% on a $${s.balanceLabel} super balance costs ${formatMoney(drag30.drag)} over 30 years at a ${DEFAULT_GROSS_RETURN_PCT}% gross return. Year-by-year comparison table.`,
    alternates: { canonical: absoluteUrl(`/super/fee-drag/${s.slug}`) },
  };
}

export default async function FeeDragScenarioPage({ params }: { params: Promise<{ scenario: string }> }) {
  const { scenario: slug } = await params;
  const s = feeDragScenario(slug);
  if (!s) notFound();

  const outcomes = feeDragOutcomes(s.balance, s.lowFeePct, s.highFeePct);
  const drag30 = outcomes.find((o) => o.years === 30)!;
  const related = relatedScenarios(s);

  const faqs = [
    {
      q: `Is a ${s.highFeePct - s.lowFeePct}% fee difference really that big?`,
      a: `On its own it looks small, but it compounds against you every year. On $${s.balanceLabel}, the difference between ${s.lowFeePct}% and ${s.highFeePct}% grows to ${formatMoney(drag30.drag)} after 30 years under these assumptions — about ${drag30.dragPct.toFixed(0)}% of the final balance.`,
    },
    {
      q: "What fees count toward this?",
      a: "Everything that comes out of your return: administration fees, investment fees and costs, and transaction costs. Your fund's PDS lists them; APRA's fund-level statistics report each fund's operating expense ratio.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Super", url: absoluteUrl("/super") },
          { name: "Fee drag", url: absoluteUrl("/super/fee-drag") },
          { name: headline(s), url: absoluteUrl(`/super/fee-drag/${s.slug}`) },
        ])}
      />
      <JsonLd data={faqJsonLd(faqs)} />

      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/super" className="hover:text-slate-700 transition-colors">Super</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/super/fee-drag" className="hover:text-slate-700 transition-colors">Fee drag</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">${s.balanceLabel} · {s.lowFeePct}% vs {s.highFeePct}%</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
          What paying {s.highFeePct}% instead of {s.lowFeePct}% costs on ${s.balanceLabel}
        </h1>
        <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6">
          Same starting balance, same {DEFAULT_GROSS_RETURN_PCT}% gross return — the only
          difference is the annual fee. The gap is money that compounds for the fund, not for you.
        </p>

        {/* Headline stat */}
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 mb-6 text-center">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
            Cost of the higher fee over 30 years
          </p>
          <p className="text-4xl font-extrabold text-slate-900 tabular-nums">{formatMoney(drag30.drag)}</p>
          <p className="text-xs text-slate-500 mt-1.5">
            {drag30.dragPct.toFixed(0)}% of what the lower-fee balance would reach
          </p>
        </div>

        {/* Outcome table */}
        <section aria-labelledby="outcomes" className="mb-6">
          <h2 id="outcomes" className="text-sm font-bold text-slate-900 mb-2.5">
            ${s.balanceLabel} starting balance, year by year
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
                  <th scope="col" className="px-3 py-2.5 text-left">Horizon</th>
                  <th scope="col" className="px-3 py-2.5 text-right">At {s.lowFeePct}% fees</th>
                  <th scope="col" className="px-3 py-2.5 text-right">At {s.highFeePct}% fees</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Fee drag</th>
                </tr>
              </thead>
              <tbody>
                {outcomes.map((o) => (
                  <tr key={o.years} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2.5 font-semibold text-slate-800">{o.years} years</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{formatMoney(o.endAtLowFee)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{formatMoney(o.endAtHighFee)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-bold text-amber-700">{formatMoney(o.drag)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 text-[0.7rem] leading-relaxed text-slate-500">
            Assumptions: single starting balance, no further contributions, {DEFAULT_GROSS_RETURN_PCT}%
            p.a. gross return before fees, fees deducted annually, nominal dollars (no inflation
            adjustment). Illustrative only — actual returns vary and are not guaranteed. This is
            general information, not financial advice.
          </p>
        </section>

        {/* What to do with this */}
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 mb-6">
          <h2 className="text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
            <Icon name="trending-up" size={16} className="text-emerald-600" />
            Check what you&apos;re actually paying
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed mb-3">
            Your fund&apos;s expense ratio is public — APRA reports it for every fund, and it&apos;s
            one of the columns in our explorer.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
            <Link
              href="/super/funds"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Compare fund expenses
            </Link>
            <Link
              href="/super/compare-guide"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              How to compare funds
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
                    href={`/super/fee-drag/${r.slug}`}
                    className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-amber-300 hover:bg-amber-50/50 transition-colors"
                  >
                    ${r.balanceLabel} at {r.lowFeePct}% vs {r.highFeePct}%
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ComplianceFooter />
      </div>
    </div>
  );
}
