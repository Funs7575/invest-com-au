"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import type { Broker } from "@/lib/types";
import FxFeeCalculator from "@/app/calculators/_components/FxFeeCalculator";

export default function UsShareCostsClient({ brokers }: { brokers: Broker[] }) {
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
          <span className="text-slate-700">US Share Costs Calculator</span>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-800 rounded-2xl p-5 md:p-8 text-white mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full mb-3">
              <Icon name="globe" size={14} className="text-white" />
              <span className="text-xs font-bold uppercase tracking-wide">US Share Costs</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold mb-2 leading-tight">
              What do US trades really cost?
            </h1>
            <p className="text-sm md:text-base text-indigo-100 max-w-2xl">
              For most Australians buying US shares, the FX conversion fee is bigger than the brokerage itself.
              Compare the true landed cost of a US trade — brokerage plus FX margin combined — across every major
              Australian platform.
            </p>
          </div>
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute -right-24 -top-16 w-64 h-64 bg-white/5 rounded-full" />
        </div>

        <FxFeeCalculator brokers={brokers} searchParams={searchParams} />

        <div className="mt-8 md:mt-12 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6">
            <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">The hidden cost of buying US shares from Australia</h2>
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <p>
                When you buy US shares through an Australian broker, two separate fees apply: the brokerage commission and the FX
                conversion margin. Most investors focus on the brokerage (often advertised as $0 or a few dollars) and completely
                ignore the FX cost — even though the FX margin is usually 10× to 100× larger than the brokerage on a typical trade.
                On a $5,000 US trade at a 0.6% FX margin, you pay $30 in FX fees alone. At 0.3%, it&apos;s $15. At 0.002%
                (Interactive Brokers&apos; rate), it&apos;s 10 cents.
              </p>
              <p>
                <strong className="text-slate-900">Conversion vs commission tradeoffs:</strong> Some brokers charge $0 brokerage
                and make their money on wider FX spreads. Others charge a small commission but offer near-interbank FX.
                If you trade US shares frequently, the FX rate dominates — even if each trade looks free. If you trade rarely and
                in large sizes, a low commission with tight FX is almost always the best combination.
              </p>
              <p>
                <strong className="text-slate-900">When to use a multi-currency account:</strong> Multi-currency wallets (like those
                offered by Interactive Brokers, moomoo, and Stake Black) let you convert AUD to USD once and reuse the balance across
                many trades. This avoids paying FX twice when you sell — a huge saving for active traders. If you trade US shares
                more than a few times a year, a multi-currency account typically pays for itself within months.
              </p>
              <p>
                <strong className="text-slate-900">How to minimise FX cost:</strong> Use a broker with interbank or near-interbank
                FX (IBKR, Stake Black, Webull), batch conversions into larger chunks, and hold USD where possible instead of
                converting back to AUD after every sale. If you&apos;re investing for the long term, you can often sidestep FX
                entirely by buying ASX-listed US ETFs (IVV, NDQ, VTS) that handle conversion internally at wholesale rates.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-base md:text-lg font-bold text-slate-900">Frequently Asked Questions</h2>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {[
                {
                  q: "Why is FX the biggest fee on a US trade?",
                  a: "Because FX is charged as a percentage of the full trade value, while brokerage is usually a small fixed amount. A 0.6% FX margin on a $10,000 trade is $60. A $0 or $3 brokerage pales in comparison. Even 'free' US brokers often have the highest total cost because their FX margin is so wide.",
                },
                {
                  q: "How do I get cheaper US shares from Australia?",
                  a: "Use a broker with near-interbank FX (Interactive Brokers at 0.002%, Stake Black, or Webull). Convert in larger batches to avoid repeat conversions. Hold USD in a multi-currency wallet if you trade often. Or buy ASX-listed global ETFs to sidestep FX entirely for passive investing.",
                },
                {
                  q: "Do I need a US brokerage account to buy US shares?",
                  a: "No — most Australian brokers now offer US share trading directly. CommSec, Stake, Superhero, moomoo, Webull and Interactive Brokers all give Australians access to NYSE and NASDAQ stocks. You don't need to open a separate US account, and your tax reporting stays in Australia.",
                },
                {
                  q: "Should I use a multi-currency wallet or convert each trade?",
                  a: "If you trade US shares more than 3–4 times a year, a multi-currency wallet almost always wins. You pay FX once on conversion, then reuse the USD balance across many trades without double-converting. For infrequent traders, converting per trade is simpler and the savings are smaller.",
                },
                {
                  q: "ASX-listed ETFs vs direct US stocks — what's cheaper?",
                  a: "For passive, long-term investors, ASX-listed US ETFs (IVV, NDQ, VTS) are often cheaper because FX is handled at wholesale rates inside the fund and you never pay retail conversion. For stock pickers or tactical investors who want specific companies, direct US trading through a low-FX broker is the better route.",
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
              <Link href="/trade-cost-calculator" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Trade Cost Calculator →
              </Link>
              <Link href="/tco-calculator" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Yearly TCO Calculator →
              </Link>
              <Link href="/us-shares" className="text-xs px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-white transition-colors">
                Best US Share Brokers →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
