/**
 * /for-advisors/demand — the public Demand Board (supply-acquisition
 * engine, idea #23 of docs/strategy/RETENTION_MARKETPLACE_MEGA_SESSIONS).
 *
 * Shows not-yet-registered advisers the live, anonymised consumer demand
 * they can't access yet: open briefs by service type × state with budget
 * bands and recency, an earnings estimator anchored on the median
 * accepted budget band, and an email alert capture that feeds the
 * prospects pipeline. All aggregation + redaction lives in
 * lib/demand-board.ts — this page never sees a brief's title, text, or
 * contact details.
 */

import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { formatCurrency } from "@/lib/utils";
import {
  getDemandBoardData,
  bandMidpointAud,
  budgetBandLabel,
} from "@/lib/demand-board";
import { QUOTE_ADVISOR_TYPES, QUOTE_AU_STATES } from "@/lib/api-schemas";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import DemandBoardClient from "./DemandBoardClient";

export const revalidate = 300; // live-ish numbers — 5 min ISR

export const metadata: Metadata = {
  title: `Live Demand Board — Open Advice Briefs by State (${CURRENT_YEAR})`,
  description: `See live, anonymised demand for financial advice on Invest.com.au: open consumer briefs by specialty and state, budget bands, and an adviser earnings estimator (${CURRENT_YEAR}).`,
  alternates: { canonical: `${SITE_URL}/for-advisors/demand` },
  openGraph: {
    title: "Live Demand Board — open advice briefs by state",
    description:
      "Anonymised, live view of consumer demand for advice on Invest.com.au — open briefs by specialty × state with budget bands.",
    images: [
      {
        url: "/api/og?title=Live+Demand+Board&subtitle=Open+advice+briefs+by+state&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
};

const DEMAND_FAQS = [
  {
    q: "What is the Invest.com.au demand board?",
    a: "The demand board is a live, anonymised view of open consumer requests (briefs) on the Invest.com.au marketplace. Australians post briefs describing the advice or service they need — SMSF accounting, financial planning, mortgage broking, buyers agency and more — and verified advisers respond. This page aggregates those open briefs by specialty and state so advisers considering the platform can see real demand before they join. It refreshes every five minutes.",
  },
  {
    q: "Is any consumer information visible on this page?",
    a: "No. The board shows aggregate counts, budget bands, advisor categories, states, and posting recency only. Consumer names, contact details, job titles, descriptions, and exact budgets are never shown — the underlying queries don't even fetch those fields. Budget information is additionally suppressed for very small samples so a single brief's budget can never be inferred. Full brief details are only released to verified advisers through the marketplace's normal accept/quote flow.",
  },
  {
    q: "How do I respond to these briefs?",
    a: "Join the adviser network. Apply at invest.com.au/advisor-signup — we verify your AFSL, TPB, or industry registration before your profile goes live (usually within 24 hours). Once verified you can browse open briefs in your categories, submit quotes or accept briefs, and message clients through the platform. Your first 3 leads are free; after that leads are pay-per-lead with no monthly fees or lock-in contracts.",
  },
  {
    q: "How is the earnings estimate calculated?",
    a: "The estimator multiplies the median accepted budget band on the marketplace (using a conservative midpoint of that band) by the number of briefs you select as your monthly capacity. It is a general illustration only — actual results depend on your categories, state, response time, pricing, win rate, and the volume of briefs posted. It is not a guarantee, forecast, or promise of income, and it is not financial advice.",
  },
];

const demandFaqLd = faqJsonLd(DEMAND_FAQS);

export default async function DemandBoardPage() {
  const data = await getDemandBoardData();
  const { snapshot, accepted } = data;

  // Earnings-estimator anchor: median ACCEPTED band over the last 90
  // days, falling back to the median open band when the accepted sample
  // is too small (both already suppression-checked in lib/demand-board).
  const estimatorBand = accepted.medianBand ?? snapshot.medianOpenBand;
  const estimator = {
    bandLabel: estimatorBand ? budgetBandLabel(estimatorBand) : null,
    bandMidpointAud: bandMidpointAud(estimatorBand),
    basis: accepted.medianBand ? ("accepted" as const) : snapshot.medianOpenBand ? ("open" as const) : null,
    acceptedCount: accepted.count,
  };

  const alertTypeOptions = QUOTE_ADVISOR_TYPES.map((value) => ({
    value,
    label: PROFESSIONAL_TYPE_LABELS[value],
  }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "For advisors", url: `${SITE_URL}/for-advisors` },
    { name: "Demand board" },
  ]);

  const feePool = snapshot.estFeePoolAud > 0 ? formatCurrency(snapshot.estFeePoolAud) : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {demandFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(demandFaqLd) }} />
      )}

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" aria-hidden="true" />
            Live demand · {UPDATED_LABEL}
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold mb-3">
            {snapshot.totalOpen > 0
              ? `${snapshot.totalOpen} open advice brief${snapshot.totalOpen === 1 ? "" : "s"} right now`
              : "The live advice demand board"}
          </h1>
          <p className="text-slate-300 max-w-2xl text-sm sm:text-base leading-relaxed">
            Anonymised, real-time view of what Australians are asking for on the Invest.com.au marketplace —
            open briefs by specialty and state, with budget bands and recency. No names, no contact details,
            no brief text: that&apos;s reserved for verified advisers.
          </p>

          {/* Stat band */}
          <dl className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wider text-slate-300">Open briefs</dt>
              <dd className="text-2xl font-extrabold text-white">{snapshot.totalOpen}</dd>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wider text-slate-300">Posted this week</dt>
              <dd className="text-2xl font-extrabold text-white">{snapshot.postedThisWeek}</dd>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wider text-slate-300">Est. advice fees on the board</dt>
              <dd className="text-2xl font-extrabold text-white">{feePool ?? "—"}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-slate-400 max-w-2xl">
            Fee figure is an estimate from stated budget bands (conservative midpoints; briefs without a budget
            excluded). General information only — not a guarantee of work or earnings.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/advisor-signup"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl"
            >
              Join the adviser network
              <Icon name="arrow-right" size={14} />
            </Link>
            <a
              href="#demand-alerts"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/30 hover:bg-white/10 text-white font-bold px-6 py-3 rounded-xl"
            >
              <Icon name="bell" size={14} />
              Get demand alerts
            </a>
          </div>
        </div>
      </section>

      {/* Board + estimator + alert capture (client: filters, interactivity) */}
      <DemandBoardClient
        snapshot={snapshot}
        estimator={estimator}
        alertStateOptions={[...QUOTE_AU_STATES]}
        alertTypeOptions={alertTypeOptions}
      />

      {/* How it works strip */}
      <section className="bg-white border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">From this board to your client list</h2>
          <ol className="grid md:grid-cols-3 gap-6 list-none">
            {[
              {
                step: "1",
                icon: "user",
                title: "Get verified",
                desc: "Apply in ~2 minutes. We check your AFSL / TPB / industry registration before your profile goes live.",
              },
              {
                step: "2",
                icon: "mail",
                title: "See full briefs",
                desc: "Verified advisers see the detail behind these numbers and respond with a quote or accept.",
              },
              {
                step: "3",
                icon: "trending-up",
                title: "Win the work",
                desc: "Message clients, book calls, and build reviews that lift your ranking — 3 free leads to start.",
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-3">
                <div className="w-10 h-10 shrink-0 bg-violet-100 text-violet-700 rounded-xl flex items-center justify-center">
                  <Icon name={item.icon} size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-4 items-center">
            <Link
              href="/advisor-signup"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
            >
              Apply to join
              <Icon name="arrow-right" size={13} />
            </Link>
            <Link href="/for-advisors" className="text-sm font-semibold text-violet-700 hover:text-violet-900 underline underline-offset-2">
              How pricing works for advisers
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {DEMAND_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-6 text-xs text-slate-500 leading-relaxed">
            All figures on this page are anonymised aggregates of live marketplace activity and refresh every
            5 minutes. Estimates are illustrations from stated budget bands, provided as general information
            only — they are not a forecast, guarantee, or promise of income, and nothing on this page is
            financial advice.
          </p>
        </div>
      </section>
    </>
  );
}
