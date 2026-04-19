"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface VisaPathway {
  code: string;
  name: string;
  fullName: string;
  /** Minimum investment in AUD */
  minInvestmentAud: number;
  /** Typical processing time in months — midpoint of published ranges */
  processingMonths: string;
  /** Required stay per 4-year provisional term */
  residency: string;
  /** Key features */
  features: string[];
  /** Who it suits best */
  suitability: string;
  /** Complying-investment / eligibility note */
  complyingNotes: string;
  /** Current availability (some paused / closed) */
  status: "Open" | "Paused" | "By invitation";
  accent: string;
}

const VISA_PATHWAYS: VisaPathway[] = [
  {
    code: "188A",
    name: "Business Innovation",
    fullName: "Business Innovation stream (188A)",
    minInvestmentAud: 800_000,
    processingMonths: "12–24",
    residency: "1 year over 4",
    features: [
      "Business net assets of at least A$1.25M",
      "Annual business turnover A$750k+",
      "Age limit: 55 (waived on State / Territory nomination)",
      "Leads to 888A permanent residency",
    ],
    suitability:
      "Established SME operators who want to acquire or start a qualifying Australian business.",
    complyingNotes:
      "Not a passive-investment pathway — requires majority interest and direct management of an Australian business.",
    status: "Open",
    accent: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    code: "188B",
    name: "Investor",
    fullName: "Investor stream (188B)",
    minInvestmentAud: 1_500_000,
    processingMonths: "12–24",
    residency: "2 of 4 years",
    features: [
      "A$1.5M designated investment (state-nominated)",
      "3+ years of qualifying investment / business experience",
      "Total net assets A$2.25M+",
      "Leads to 888B permanent residency",
    ],
    suitability:
      "Investors wanting a passive pathway with moderate threshold; strong English may reduce the points test burden.",
    complyingNotes:
      "Investment must be made in designated state/territory government bonds for 4 years.",
    status: "Paused",
    accent: "bg-indigo-50 border-indigo-200 text-indigo-700",
  },
  {
    code: "188C",
    name: "SIV",
    fullName: "Significant Investor Visa (188C)",
    minInvestmentAud: 5_000_000,
    processingMonths: "9–18",
    residency: "40 days per year",
    features: [
      "A$5M complying investment portfolio",
      "At least 40% in managed funds, 10% in VC / emerging co",
      "No age or English requirement",
      "Leads to 888C permanent residency",
    ],
    suitability:
      "High-net-worth investors with significant liquid capital prioritising flexibility and minimal Australian residency days.",
    complyingNotes:
      "Categories are set by Home Affairs and change periodically. A signed complying-investment opinion from a specialist lawyer is essential.",
    status: "Paused",
    accent: "bg-amber-50 border-amber-200 text-amber-700",
  },
  {
    code: "188D",
    name: "Premium Investor",
    fullName: "Premium Investor Visa (188D)",
    minInvestmentAud: 15_000_000,
    processingMonths: "6–12",
    residency: "No minimum",
    features: [
      "A$15M complying investment",
      "Nomination-based — by Austrade invitation only",
      "12-month pathway to 888D permanent residency",
      "Priority processing",
    ],
    suitability:
      "Ultra-high-net-worth investors with strategic capital who want the fastest pathway to PR.",
    complyingNotes:
      "Wider range of complying investments than 188C including direct philanthropy. Engagement starts with an Austrade nomination conversation.",
    status: "By invitation",
    accent: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  {
    code: "858",
    name: "Global Talent",
    fullName: "Global Talent Visa (858)",
    minInvestmentAud: 0,
    processingMonths: "6–12",
    residency: "No minimum",
    features: [
      "No investment requirement — talent / salary based",
      "Target sectors: fintech, cyber, AgTech, medtech, quantum, energy",
      "Nominator required (Australian citizen or eligible organisation)",
      "Direct pathway to permanent residency — no provisional stage",
    ],
    suitability:
      "Highly-credentialled professionals, founders and investors with a track record of technical or commercial achievement.",
    complyingNotes:
      "Evidence-heavy application. Typical requirement: salary of A$175k+ in the target sector OR exceptional-achievement portfolio.",
    status: "Open",
    accent: "bg-sky-50 border-sky-200 text-sky-700",
  },
];

function formatAud(value: number): string {
  if (value === 0) return "Nil";
  if (value >= 1_000_000) return `A$${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  return `A$${(value / 1_000).toFixed(0)}k`;
}

export default function VisaCalculatorClient() {
  const [selectedCodes, setSelectedCodes] = useState<string[]>([
    "188A",
    "188C",
    "858",
  ]);
  const [budget, setBudget] = useState<string>("5000000");

  const budgetNum = Math.max(0, parseFloat(budget) || 0);

  const affordable = useMemo(
    () => VISA_PATHWAYS.filter((v) => v.minInvestmentAud <= budgetNum),
    [budgetNum],
  );

  const selected = useMemo(
    () => VISA_PATHWAYS.filter((v) => selectedCodes.includes(v.code)),
    [selectedCodes],
  );

  function toggle(code: string): void {
    setSelectedCodes((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : prev.length >= 3
          ? [prev[1]!, prev[2]!, code]
          : [...prev, code],
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-5xl">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/tools" className="hover:text-slate-900">Tools</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">
              Visa Investment Calculator
            </span>
          </nav>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-tight mb-3 tracking-tight text-slate-900">
            Australian Investor Visa Calculator
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-3xl">
            Compare the five main Australian investor / business visa
            pathways side by side — investment thresholds, residency
            requirements, and pathway to permanent residency. Updated for
            {" "}{new Date().getFullYear()}.
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-5 max-w-3xl">
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Important:</strong> Invest.com.au is not a migration
              agent. Only MARA-registered agents can provide personal
              immigration advice in Australia. This tool is general
              information only — consult a licensed migration agent before
              applying.
            </p>
          </div>
        </div>
      </section>

      {/* Budget slider */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom max-w-3xl">
          <label
            htmlFor="visa-budget"
            className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1"
          >
            Available investment budget (AUD)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">$</span>
            <input
              id="visa-budget"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              min={0}
              step={100_000}
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
            />
          </div>
          <p className="text-xs text-slate-600 mt-3">
            With <strong>{formatAud(budgetNum)}</strong>, you may qualify for:
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {affordable.length === 0 ? (
              <span className="text-sm text-slate-500">
                Only Global Talent (non-investment pathway) at this budget.
              </span>
            ) : (
              affordable.map((v) => (
                <span
                  key={v.code}
                  className={`text-xs font-bold px-3 py-1 rounded-full border ${v.accent}`}
                >
                  {v.code} · {v.name}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Pathway picker */}
      <section className="py-10 bg-white">
        <div className="container-custom max-w-5xl">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            Compare pathways
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Pick up to three to compare side by side.
          </p>
          <div className="flex flex-wrap gap-2 mb-6">
            {VISA_PATHWAYS.map((v) => {
              const active = selectedCodes.includes(v.code);
              return (
                <button
                  key={v.code}
                  type="button"
                  onClick={() => toggle(v.code)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? v.accent + " ring-2 ring-offset-1 ring-slate-300"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {v.code} · {v.name}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {selected.map((v) => (
              <article
                key={v.code}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${v.accent}`}
                  >
                    {v.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      v.status === "Open"
                        ? "bg-emerald-100 text-emerald-800"
                        : v.status === "Paused"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {v.status}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1">
                  {v.name}
                </h3>
                <p className="text-xs text-slate-500 mb-3">{v.fullName}</p>

                <dl className="grid grid-cols-2 gap-2 mb-4 text-xs">
                  <div className="bg-slate-50 rounded-lg px-2.5 py-1.5">
                    <dt className="text-[10px] font-bold uppercase text-slate-500">
                      Min investment
                    </dt>
                    <dd className="font-extrabold text-slate-900">
                      {formatAud(v.minInvestmentAud)}
                    </dd>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-2.5 py-1.5">
                    <dt className="text-[10px] font-bold uppercase text-slate-500">
                      Processing
                    </dt>
                    <dd className="font-extrabold text-slate-900">
                      {v.processingMonths} mo
                    </dd>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-2.5 py-1.5 col-span-2">
                    <dt className="text-[10px] font-bold uppercase text-slate-500">
                      Residency required
                    </dt>
                    <dd className="font-extrabold text-slate-900">
                      {v.residency}
                    </dd>
                  </div>
                </dl>

                <ul className="text-xs text-slate-600 space-y-1.5 mb-4">
                  {v.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5">
                      <Icon
                        name="check"
                        size={12}
                        className="text-emerald-600 shrink-0 mt-0.5"
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                  <strong>Best for:</strong> {v.suitability}
                </p>
                <p className="text-[10px] text-slate-500 leading-relaxed mb-4">
                  {v.complyingNotes}
                </p>

                <Link
                  href="/advisors/immigration-investment-lawyers"
                  className="mt-auto inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-4 py-2.5 rounded-lg"
                >
                  Find a migration agent
                  <Icon name="arrow-right" size={12} />
                </Link>
              </article>
            ))}
          </div>

          {selected.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-500">
              Select one or more pathways above to compare.
            </div>
          )}
        </div>
      </section>

      {/* CTA section */}
      <section className="py-10 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl text-center">
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Ready to start an application?
          </h2>
          <p className="text-sm text-slate-600 mb-5">
            Connect with MARA-registered migration agents and
            immigration-investment lawyers who specialise in visa-investor
            structuring.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/advisors/migration-agents"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg"
            >
              Browse migration agents
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/advisors/immigration-investment-lawyers"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg"
            >
              Immigration-investment lawyers
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/foreign-investment/siv"
              className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg"
            >
              SIV hub
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mt-5">
            <strong>Disclaimer.</strong> Information shown reflects
            Department of Home Affairs published pathways. Thresholds,
            complying-investment categories, and processing times change
            periodically. Always verify the current position with a
            MARA-registered agent before relying on this information.
          </p>
        </div>
      </section>
    </div>
  );
}
