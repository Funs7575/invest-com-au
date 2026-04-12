"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import FrankingCalculator from "@/app/calculators/_components/FrankingCalculator";

export default function FrankingClient() {
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
          <span className="text-slate-700">Franking Credits Calculator</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl p-5 md:p-8 text-white mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
              <Icon name="coins" size={14} className="text-white" />
              <span className="text-xs font-bold uppercase tracking-wide">Franking Credits Calculator</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-2 leading-tight">
              Calculate Your Franking Credit Refund
            </h1>
            <p className="text-sm md:text-base text-amber-100 max-w-2xl">
              Franking credits can turn a 4% ASX dividend into a 5.7% grossed-up yield. Work out your after-tax
              dividend income, franking credit refund, and how much you really earn from Australian dividend stocks.
            </p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute -right-24 -top-16 w-64 h-64 bg-white/5 rounded-full" />
        </div>

        <FrankingCalculator searchParams={searchParams} />

        <div className="mt-8 md:mt-12 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">How franking credits work for Australian investors</h2>
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                Franking credits (also called imputation credits) are a tax offset Australian companies attach to their dividends
                to compensate shareholders for tax the company has already paid on its profits. Because the corporate tax rate is
                30%, a fully franked dividend of $70 comes with a $30 franking credit, representing the tax the company paid on
                every $100 of pre-tax profit. This prevents the same income being taxed twice — once at the company level and
                again in the shareholder&apos;s hands.
              </p>
              <p>
                <strong className="text-slate-900">Grossing up explained:</strong> When you receive a fully franked $70 dividend,
                you must &quot;gross it up&quot; to $100 in your tax return. The $100 is added to your taxable income, and the
                $30 franking credit is claimed as a tax offset. If your marginal rate is lower than 30%, you get the difference
                refunded. If higher, you pay top-up tax on the difference. For someone on the 19% bracket, a $70 franked dividend
                effectively delivers $81 after tax — more than the cash payment itself.
              </p>
              <p>
                <strong className="text-slate-900">Refundable franking credits:</strong> Australia is one of very few countries
                that makes excess franking credits refundable as cash. If your franking credits exceed your total tax liability,
                the ATO writes you a refund cheque for the difference. This is why franking credits are so valuable to retirees,
                SMSFs in pension phase, and anyone on a low marginal rate — the credits can exceed their tax bill and turn into
                pure cash.
              </p>
              <p>
                <strong className="text-slate-900">Who benefits most:</strong> Retirees with a 0% tax rate inside super pension
                phase get the full franking credit as a cash refund. Low-income earners (below the 19% bracket) also get cash
                refunds. Investors on the 30% marginal bracket break even. Those on 37% or 45% still benefit but pay modest
                top-up tax. Foreign investors generally cannot use franking credits at all.
              </p>
              <p>
                <strong className="text-slate-900">ASX dividend stocks and franking:</strong> The big four banks, BHP, Rio Tinto,
                Woolworths, Wesfarmers, Telstra and most blue-chip ASX companies pay fully franked dividends. This makes the
                Australian share market unusually attractive for income investors compared to offshore markets. ETFs like VAS
                and A200 pass through franking credits from the underlying holdings.
              </p>
            </div>
            <p className="text-[0.65rem] text-slate-400 mt-4 leading-relaxed">
              This calculator is a simplified estimate and does not account for the 45-day holding rule, discount capital gains,
              or other complex tax situations. Consult a registered tax agent for advice specific to your situation.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Frequently Asked Questions</h2>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {[
                {
                  q: "What are franking credits?",
                  a: "Franking credits represent the corporate tax a company has already paid on its profits before distributing them as dividends. When you receive a franked dividend, you also receive a credit for that tax, which can offset your own tax liability or be refunded as cash if you don't have enough tax to pay.",
                },
                {
                  q: "How do franking credits actually work?",
                  a: "You gross up the franked dividend to its pre-tax equivalent and include that grossed-up amount in your taxable income. You then claim the franking credit as a tax offset. If your marginal rate is below the 30% company tax rate, the ATO refunds you the difference. If above, you pay top-up tax.",
                },
                {
                  q: "Are franking credits refundable?",
                  a: "Yes — Australia is one of the few countries where excess franking credits are refundable in cash. If your total franking credits exceed your tax liability for the year, the ATO issues a cash refund. This is particularly valuable for retirees and SMSFs in pension phase with a 0% tax rate.",
                },
                {
                  q: "Who gets franking credits?",
                  a: "Australian tax residents who hold ASX-listed shares paying franked dividends. You must also satisfy the 45-day holding rule — shares must be held at risk for at least 45 days to claim the franking credit (90 days for preference shares). Foreign investors generally cannot use franking credits.",
                },
                {
                  q: "How do I calculate a grossed-up dividend?",
                  a: "For a fully franked dividend, multiply the cash amount by 1/(1 - 0.30) = 1.4286. So a $70 fully franked dividend grosses up to $100. The $30 difference is the franking credit. For partially franked dividends, apply the franking percentage — a 50% franked $70 dividend has a $15 franking credit.",
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
              <Link href="/cgt-calculator" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                CGT Calculator →
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
