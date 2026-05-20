"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import DaspCalculator from "@/app/calculators/_components/DaspCalculator";
import CalculatorLeadCapture from "@/components/CalculatorLeadCapture";
import { DASP_WARNING } from "@/lib/compliance";

export default function DaspClient() {
  const searchParams = useSearchParams();

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-3xl">
        {/* Breadcrumb */}
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/calculators" className="hover:text-slate-900">Calculators</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">DASP Calculator</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-sky-600 to-sky-800 rounded-2xl p-5 md:p-8 text-white mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
              <Icon name="log-out" size={14} className="text-white" />
              <span className="text-xs font-bold uppercase tracking-wide">DASP Calculator</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-2 leading-tight">
              What you&apos;ll receive from your Australian super
            </h1>
            <p className="text-sm md:text-base text-sky-100 max-w-2xl">
              Leaving Australia on a temporary visa? Estimate the Departing Australia Superannuation Payment (DASP)
              tax withheld on your super and the net cash you&apos;ll actually receive — at the Government&apos;s
              fixed rates, which can&apos;t be reduced.
            </p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute -right-24 -top-16 w-64 h-64 bg-white/5 rounded-full" />
        </div>

        <DaspCalculator searchParams={searchParams} />

        {/* DASP-specific compliance warning (single source of truth) */}
        <div className="mt-6 border border-red-200 bg-red-50 rounded-xl p-4 md:p-5">
          <p className="text-sm text-red-900 leading-relaxed">{DASP_WARNING}</p>
        </div>

        <CalculatorLeadCapture
          calcSlug="dasp-calculator"
          calcTitle="DASP"
          need="tax"
          contextKeys={["dasp", "departing-australia-super"]}
        />

        <div className="mt-8 md:mt-12 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">How DASP tax works when you leave Australia</h2>
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                If you worked in Australia on a temporary visa, your employer paid super into a fund on your behalf.
                Once you leave permanently and your visa has ceased, you can claim that super as a{" "}
                <strong className="text-slate-900">Departing Australia Superannuation Payment (DASP)</strong>. The fund
                withholds DASP tax before paying you, so the amount you receive is less than your account balance.
              </p>
              <p>
                <strong className="text-slate-900">The rates (DASP paid on/after 1 July 2017):</strong> the tax-free
                component is taxed at 0%, the taxed element of the taxable component at 35%, and the untaxed element
                (mostly some public-sector funds) at 45%. For most temporary residents with ordinary accumulation super,
                the headline rate is effectively 35%.
              </p>
              <p>
                <strong className="text-slate-900">Working Holiday Makers pay more:</strong> if you held a subclass 417
                or 462 visa at any time, your DASP is a &quot;DASP WHM payment&quot; taxed at a flat{" "}
                <strong className="text-slate-900">65%</strong> on the entire taxable component — even if you later moved
                to a different visa. There is no way to reduce this rate.
              </p>
              <p>
                <strong className="text-slate-900">Claiming it:</strong> apply through the ATO&apos;s DASP online system
                after you&apos;ve left and your visa has ceased. A registered tax or migration agent who does DASP
                processing can lodge and chase the claim for you, and confirm your exact component split.
              </p>
            </div>
            <p className="text-[0.65rem] text-slate-400 mt-4 leading-relaxed">
              This calculator is a simplified estimate using the headline DASP rates. It does not model your exact
              taxable/tax-free component split, fund fees, or insurance deductions. Confirm your component split with
              your fund and a registered tax agent before relying on these figures.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Frequently Asked Questions</h2>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {[
                {
                  q: "What is a DASP?",
                  a: "A Departing Australia Superannuation Payment lets a temporary resident claim their Australian super after they permanently leave Australia and their visa has ceased. It's not available to Australian or New Zealand citizens or permanent residents.",
                },
                {
                  q: "How much tax is withheld on a DASP?",
                  a: "For a DASP paid on or after 1 July 2017: the tax-free component is 0%, the taxed element of the taxable component is 35%, and the untaxed element is 45%. Working Holiday Makers (subclass 417/462) are taxed at 65% on the whole taxable component.",
                },
                {
                  q: "Can the DASP tax rate be reduced?",
                  a: "No. DASP withholding rates are set by the Australian Government and cannot be reduced. The fund withholds the tax before paying you, so you receive the net amount.",
                },
                {
                  q: "Why am I taxed 65% as a Working Holiday Maker?",
                  a: "If you held a Working Holiday Maker visa (417 or 462) at any time, your DASP is taxed at a flat 65% on the entire taxable component — even if you later held a different visa class.",
                },
                {
                  q: "How do I claim my DASP?",
                  a: "Apply through the ATO's DASP online application after you leave Australia and your temporary visa has ceased or been cancelled. A registered tax or migration agent who handles DASP processing can lodge and follow up the claim for you.",
                },
              ].map(({ q, a }) => (
                <div key={q} className="p-4 md:p-5">
                  <p className="text-sm font-semibold text-slate-900 mb-1">{q}</p>
                  <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-[0.69rem] md:text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Related</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/foreign-investment" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Cross-border investing →
              </Link>
              <Link href="/find-advisor" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Find a tax agent →
              </Link>
              <Link href="/calculators" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                All Calculators →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
