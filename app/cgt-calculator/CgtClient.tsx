"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import CgtCalculator from "@/app/calculators/_components/CgtCalculator";

export default function CgtClient() {
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
          <span className="text-slate-700">CGT Calculator</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 md:p-8 text-white mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
              <Icon name="calendar" size={14} className="text-white" />
              <span className="text-xs font-bold uppercase tracking-wide">CGT Calculator</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-2 leading-tight">
              Estimate Your Capital Gains Tax
            </h1>
            <p className="text-sm md:text-base text-emerald-100 max-w-2xl">
              Work out how much capital gains tax you&apos;ll owe on your share sales. Includes the 50% CGT discount
              for assets held more than 12 months and applies your marginal tax rate to give a quick take-home estimate.
            </p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute -right-24 -top-16 w-64 h-64 bg-white/5 rounded-full" />
        </div>

        <CgtCalculator searchParams={searchParams} />

        <div className="mt-8 md:mt-12 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">How capital gains tax works in Australia</h2>
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                In Australia, any profit you make from selling an investment — shares, ETFs, managed funds, crypto or property —
                is treated as a capital gain and is assessable income in the year you sell. There is no separate CGT rate;
                instead, your net capital gain is added to your taxable income and taxed at your marginal tax rate. Unlike some
                countries, Australia does not have a flat capital gains tax — a high earner can pay up to 47% on short-term
                gains, while a low earner might pay nothing at all.
              </p>
              <p>
                <strong className="text-slate-900">The 12-month discount rule:</strong> If you hold an investment for more than
                12 months before selling, you receive a 50% CGT discount — meaning only half your gain is added to your taxable
                income. This is one of the most powerful tax incentives available to Australian investors. Selling even one day
                short of 12 months can double your tax bill on that parcel. For SMSFs, the discount is 33.3% instead of 50%.
              </p>
              <p>
                <strong className="text-slate-900">Marginal tax rates and CGT:</strong> Because gains are taxed at your marginal
                rate, the effective CGT rate depends on your income. A $10,000 gain held over 12 months for someone on the 37%
                bracket creates $5,000 of taxable income and roughly $1,850 in tax. The same gain held under 12 months would
                attract $3,700 — more than double.
              </p>
              <p>
                <strong className="text-slate-900">When is CGT triggered:</strong> CGT is triggered on a CGT event — typically
                when you sell, gift, or transfer an asset, or when a company is delisted or wound up. It&apos;s not triggered
                when shares move between accounts in your own name, when you receive shares via a dividend reinvestment plan
                (though the DRP purchase establishes a new cost base), or when you inherit shares (though you inherit the
                original cost base in most cases).
              </p>
              <p>
                <strong className="text-slate-900">Common exemptions:</strong> Your main residence is generally CGT-exempt.
                Personal use assets under $10,000 are exempt. Collectibles under $500 are exempt. Pre-CGT assets (acquired
                before 20 September 1985) are exempt. Superannuation is taxed separately under its own rules. And losses can
                be carried forward indefinitely to offset future gains.
              </p>
            </div>
            <p className="text-[0.65rem] text-slate-400 mt-4 leading-relaxed">
              This calculator is a simplified estimate for general information only and is not tax advice. Always consult a
              registered tax agent for your specific situation.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Frequently Asked Questions</h2>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {[
                {
                  q: "What is capital gains tax in Australia?",
                  a: "CGT is the tax you pay on profits from selling investment assets like shares, ETFs, property or crypto. It's not a separate tax — your net capital gain is added to your assessable income and taxed at your marginal rate. Losses can offset gains in the same year or be carried forward.",
                },
                {
                  q: "When do I pay CGT?",
                  a: "CGT is triggered by a CGT event — usually when you sell, gift, or transfer an asset. You report the gain in your tax return for the financial year the sale occurred in, and pay the tax as part of your normal annual tax assessment. The ATO doesn't withhold CGT at the point of sale.",
                },
                {
                  q: "How is the 50% CGT discount calculated?",
                  a: "If you hold an asset for more than 12 months (and you're an individual or trust), you can discount the gross capital gain by 50%. So a $10,000 gain becomes $5,000 of taxable income. SMSFs receive a 33.3% discount instead, and companies receive no CGT discount at all.",
                },
                {
                  q: "Can I offset losses against capital gains?",
                  a: "Yes. Capital losses can offset capital gains in the same financial year. If losses exceed gains, the unused loss carries forward indefinitely to offset future capital gains — but not regular income. Losses must be applied against gross gains before the 50% discount is applied.",
                },
                {
                  q: "Is my main residence CGT-exempt?",
                  a: "Yes, generally. Your main residence is exempt from CGT provided it has been your principal place of residence, sits on land under 2 hectares, and hasn't been used to generate income. Partial exemptions apply if you've rented it out or used it for business.",
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
            <p className="text-[0.69rem] md:text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Related Calculators</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/franking-credits-calculator" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Franking Credits →
              </Link>
              <Link href="/compound-interest-calculator" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Compound Interest →
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
