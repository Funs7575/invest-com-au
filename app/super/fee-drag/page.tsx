import type { Metadata } from "next";
import Link from "next/link";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import {
  FEE_DRAG_SCENARIOS,
  feeDragOutcomes,
  formatMoney,
  DEFAULT_GROSS_RETURN_PCT,
} from "@/lib/fee-drag";
import FeeDragExplorer from "./FeeDragExplorer";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Super Fee Drag Calculator (${CURRENT_YEAR}) — What 1% Really Costs Over 30 Years`,
  description:
    "Fees compound just like returns. See exactly what a 0.5%, 1% or 1.5% fee difference costs on your super balance over 10, 20 and 30 years — interactive, with worked scenarios.",
  alternates: { canonical: absoluteUrl("/super/fee-drag") },
};

const FAQS = [
  {
    question: "Why do small fee differences matter so much?",
    answer:
      "Because fees are charged on your whole balance every year, the money they remove stops compounding for you permanently. A 1% difference doesn't cost 1% — over 30 years it typically consumes a quarter of your potential final balance.",
  },
  {
    question: "What's a typical super fee in Australia?",
    answer:
      "Operating expense ratios reported to APRA mostly fall between roughly 0.5% and 1.5% of assets. Anything near 2% deserves a hard look at what you're getting for it. Check any fund's reported ratio in our fund explorer.",
  },
  {
    question: "Are these projections of my actual super?",
    answer:
      "No — they're illustrations with fixed assumptions (single balance, no contributions, constant gross return, nominal dollars) designed to isolate the effect of fees. Your fund's actual returns and your contributions will change the dollar amounts, but the relative damage of higher fees persists.",
  },
];

export default function FeeDragHubPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Super", url: absoluteUrl("/super") },
          { name: "Fee drag", url: absoluteUrl("/super/fee-drag") },
        ])}
      />
      <JsonLd data={faqJsonLd(FAQS.map((f) => ({ q: f.question, a: f.answer })))} />

      <div className="max-w-3xl mx-auto px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/super" className="hover:text-slate-700 transition-colors">Super</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">Fee drag</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
          Fees compound too — against you
        </h1>
        <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-8 max-w-2xl">
          Returns get the attention; fees quietly take their cut of your whole balance every single
          year. Slide the numbers and watch what the difference really costs over a working life.
        </p>

        <FeeDragExplorer />

        {/* Scenario grid */}
        <section className="mt-12">
          <h2 className="text-lg font-bold text-slate-900 mb-1.5">Worked scenarios</h2>
          <p className="text-xs text-slate-500 mb-4">
            Pre-computed comparisons at a {DEFAULT_GROSS_RETURN_PCT}% gross return — each opens a
            full year-by-year table.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FEE_DRAG_SCENARIOS.map((s) => {
              const drag30 = feeDragOutcomes(s.balance, s.lowFeePct, s.highFeePct).find((o) => o.years === 30)!;
              return (
                <li key={s.slug}>
                  <Link
                    href={`/super/fee-drag/${s.slug}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-amber-300 hover:bg-amber-50/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-800">
                      ${s.balanceLabel} · {s.lowFeePct}% vs {s.highFeePct}%
                    </span>
                    <span className="shrink-0 text-xs font-bold text-amber-700 tabular-nums">
                      −{formatMoney(drag30.drag)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mt-12 space-y-5">
          <h2 className="text-lg font-bold text-slate-900">Common questions</h2>
          {FAQS.map((f) => (
            <div key={f.question}>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">{f.question}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.answer}</p>
            </div>
          ))}
        </section>

        {/* Methodology */}
        <section className="mt-10 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-700 mb-1">Assumptions &amp; limitations</p>
          <p>
            All figures: single starting balance, no further contributions,{" "}
            {DEFAULT_GROSS_RETURN_PCT}% p.a. gross return before fees, fees deducted annually,
            nominal dollars. Illustrative general information only — not financial advice, not a
            projection of any fund or of your account. Check any fund&apos;s actual reported
            expense ratio in the{" "}
            <Link href="/super/funds" className="text-amber-700 underline hover:text-amber-800">
              fund performance explorer
            </Link>{" "}
            and consider advice from a licensed adviser before acting.
          </p>
        </section>

        <div className="mt-10">
          <ComplianceFooter />
        </div>
      </div>
    </div>
  );
}
