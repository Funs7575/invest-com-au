import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Franking Credits Australia (${CURRENT_YEAR}) — How They Work & How to Maximise Them`,
  description: `Complete guide to franking credits for Australian investors: how imputation works, how to calculate your benefit by tax bracket, cash refunds, and maximising franking in super. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Franking Credits Australia (${CURRENT_YEAR}) — Complete Guide`,
    description: "How franking credits work, who benefits most, and how to maximise them through shares, ETFs, and super.",
    url: `${SITE_URL}/tax/franking-credits`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/tax/franking-credits` },
};

const FRANKING_EXAMPLES = [
  {
    bracket: "0% (below threshold)",
    marginalRate: 0,
    grossedUpDividend: 1428,
    taxOnGrossed: 0,
    frankingCreditOffset: 428,
    netTax: 0,
    cashRefund: 428,
    netReceived: 1428,
  },
  {
    bracket: "19%",
    marginalRate: 19,
    grossedUpDividend: 1428,
    taxOnGrossed: 271,
    frankingCreditOffset: 428,
    netTax: 0,
    cashRefund: 157,
    netReceived: 1157,
  },
  {
    bracket: "32.5%",
    marginalRate: 32.5,
    grossedUpDividend: 1428,
    taxOnGrossed: 464,
    frankingCreditOffset: 428,
    netTax: 36,
    cashRefund: 0,
    netReceived: 964,
  },
  {
    bracket: "45%",
    marginalRate: 45,
    grossedUpDividend: 1428,
    taxOnGrossed: 643,
    frankingCreditOffset: 428,
    netTax: 215,
    cashRefund: 0,
    netReceived: 785,
  },
];

const SECTIONS = [
  {
    heading: "What are franking credits and how does imputation work?",
    body: `Australia operates a dividend imputation system — one of the few countries in the world to do so. The concept is simple: to avoid double taxation on corporate profits, the tax paid by a company at the corporate level is passed through to shareholders as a credit against their personal tax liability.

**How it works step by step:**
1. A company earns $1,000 in profit
2. It pays corporate tax at 30% ($300 in tax), leaving $700 in after-tax profit
3. It distributes $700 as a dividend, and attaches $300 in "franking credits" (representing the tax already paid)
4. You receive: $700 dividend + $300 in franking credits
5. Your assessable income includes $1,000 (the "grossed-up" dividend)
6. You pay tax at your marginal rate on $1,000
7. You subtract the $300 franking credit from your tax bill
8. Net result: you pay tax only once (at your personal rate) on the full $1,000 profit

The key insight: the company has already paid 30% tax. If your marginal rate is 32.5%, you top up by 2.5%. If your rate is 0%, you get the 30% credit back as a cash refund.

**Partially franked dividends:**
Not all dividends are fully franked. A company might pay a 50% franked dividend if only half its income was subject to Australian corporate tax. The ASX 200 typically carries about 70–80% average franking across all dividends.`,
  },
  {
    heading: "Calculating your franking benefit — by tax bracket",
    body: `The tax benefit of franking credits varies significantly by your marginal rate. Here's a worked example based on $1,000 cash dividend with 100% franking (corporate rate 30%):

**The grossing-up formula:**
Grossed-up dividend = Cash dividend ÷ (1 − Corporate tax rate)
= $1,000 ÷ 0.70 = $1,428.57

Franking credit = $1,428.57 × 30% = $428.57

So your $1,000 cash dividend comes with $428.57 in franking credits.

**Tax outcome by bracket:**
- 0% rate: Tax = $0 on $1,428. Franking credit = $428.57 refund → Net income = $1,428.57
- 19% rate: Tax = $271. Offset $428 franking → Get $157 refund → Net income = $1,157
- 32.5% rate: Tax = $464. Offset $428 franking → Pay $36 top-up → Net income = $964
- 45% rate: Tax = $643. Offset $428 franking → Pay $215 top-up → Net income = $785

**Key takeaway:** Low income earners (including retirees below the tax-free threshold) receive the full franking credit amount as a cash refund — making fully franked dividends one of the most tax-efficient income sources available to them.

For investors in the 32.5% and 45% brackets, franking credits reduce the effective tax rate on dividends to approximately 2.5% and 22.5% respectively.`,
  },
  {
    heading: "Cash refunds for low-income investors",
    body: `If your franking credits exceed your total tax payable (from all sources), the excess is refunded as cash by the ATO. This is one of the most valuable but least understood features of the Australian tax system.

**Who benefits most from cash refunds:**
1. Retirees below the tax-free threshold ($18,200): Total income includes dividends + super pension + other income. If total income is below $18,200, all franking credits are refunded.

2. SMSFs in pension phase: Super funds in pension phase pay 0% tax on income and capital gains. All franking credits attached to dividends are fully refunded. A SMSF holding $500,000 in ASX dividend shares yielding 4% with 75% franking could receive approximately $6,400/year in franking credit refunds.

3. Part-pensioners and low-income investors: Anyone with a modest income who receives fully franked dividends may receive partial or full refunds.

**Claiming your refund:**
Franking credit refunds are automatically calculated when you lodge your tax return. You don't need to do anything special — include all dividend income and franking credits, and the ATO calculates the refund or additional tax owed.

**The 45-day rule:**
To claim franking credits, you must hold the shares "at risk" for at least 45 days around the ex-dividend date (90 days for preference shares). Day-traders who flip shares for quick dividends cannot claim the franking credits.`,
  },
  {
    heading: "Franking credits through ETFs and managed funds",
    body: `Franking credits pass through to investors via ETFs and managed funds that hold Australian shares. The ETF or fund collects dividends (with attached franking credits) from its portfolio companies and distributes them proportionally to unitholders.

**Popular ETFs and their approximate franking rates:**
- VAS (Vanguard Australian Shares ETF): ~70% franked
- A200 (Betashares Australia 200): ~70% franked
- VHY (Vanguard Australian High Yield ETF): ~85% franked
- STW (SPDR S&P/ASX 200): ~75% franked

The higher franking of VHY reflects its focus on banks and other high-franking dividend payers. Banks pay very high franking because virtually all their income is Australian-sourced corporate profit.

**How ETF tax statements work:**
At year end, your ETF manager sends a tax statement that breaks down each distribution into ordinary income, capital gains, franking credits, and other components. This statement is used for your tax return. Some platforms pre-fill this via the ATO's data matching system.

**International ETFs don't carry franking:**
IVV (S&P 500), VGS (MSCI World), NDQ (NASDAQ 100), and other international ETFs do not carry franking credits — the underlying companies are foreign and pay foreign taxes, not Australian corporate tax. This is one reason why Australian equity ETFs can be more tax-efficient for Australian residents than international counterparts.`,
  },
];

const FAQS = [
  {
    question: "Can I get a cash refund from franking credits if I don't pay tax?",
    answer: "Yes. If your total franking credits exceed your tax payable (including Medicare Levy), the excess is refunded as cash when you lodge your tax return. This benefits retirees with income below the tax-free threshold, SMSFs in pension phase, and other low-income investors. The refund is treated as ordinary income — it's included in the tax reconciliation but doesn't create a further tax liability.",
  },
  {
    question: "What is a fully franked dividend vs a partially franked dividend?",
    answer: "A fully franked dividend means the company paid Australian corporate tax (30%) on all of the profits before distributing them. You receive the maximum possible franking credits. A partially franked dividend means only part of the profit was subject to Australian tax — for example, a company with some offshore income might pay a 70% franked dividend. Unfranked dividends have no franking credits attached.",
  },
  {
    question: "How do franking credits work for non-residents?",
    answer: "Non-residents generally cannot use Australian franking credits. Fully franked dividends paid to non-residents are not subject to Australian withholding tax (the franking credit offsets the withholding), but non-residents cannot receive a cash refund of excess franking credits. Partially franked or unfranked dividends paid to non-residents are subject to withholding tax (typically 30%, or lower under a double tax agreement).",
  },
  {
    question: "What is the 45-day rule for franking credits?",
    answer: "You must hold the shares 'at risk' for at least 45 consecutive days (not counting the acquisition and disposal days) in the period beginning 45 days before the ex-dividend date. If you don't satisfy this holding period, you cannot claim the franking credits. Exceptions exist for individuals with total franking credits of $5,000 or less in the year — they don't need to satisfy the 45-day rule.",
  },
  {
    question: "Are franking credits valuable for high-income earners?",
    answer: "Yes, but less so than for low-income investors. At a 45% marginal rate, you pay 45% tax on the grossed-up dividend and get the 30% franking credit offset — so you're paying an effective 15% top-up tax (or 22.5% after the CGT discount equivalent for capital gains). For comparison, unfranked dividends at 45% have a full 45% tax rate. Franking credits save high-income earners 15% on dividend income versus unfranked alternatives.",
  },
];

export default function FrankingCreditsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Tax Strategy", url: `${SITE_URL}/tax` },
    { name: "Franking Credits" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/tax" className="hover:text-slate-200">Tax Strategy</Link>
            <span>/</span>
            <span className="text-slate-300">Franking Credits</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Franking Credits Guide · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              Franking Credits Australia{" "}
              <span className="text-amber-400">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              How dividend imputation works, how to calculate your franking benefit at every tax bracket,
              who gets cash refunds, and how to maximise franking credits through shares, ETFs, and super.
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Corporate Tax Rate</p>
              <p className="text-xl font-black text-amber-700">30%</p>
              <p className="text-xs text-slate-600 mt-1">Companies pay 30% tax before distributing dividends — this passes through as franking credits</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Cash Refund Available</p>
              <p className="text-xl font-black text-slate-900">Yes</p>
              <p className="text-xs text-slate-600 mt-1">Excess franking credits are refunded in cash to low-income investors and SMSFs in pension phase</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">45-Day Holding Rule</p>
              <p className="text-xl font-black text-slate-900">45 days</p>
              <p className="text-xs text-slate-600 mt-1">Must hold shares for 45 days around ex-dividend date to claim credits (exceptions for small amounts)</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="container-custom">
          <SectionHeading eyebrow="Tax Calculator" title="Franking Credit Benefit by Tax Bracket" sub="Based on $1,000 cash dividend, fully franked (corporate rate 30%). Figures approximate." />
          <div className="mt-6 overflow-x-auto max-w-3xl">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left py-3 px-3 text-xs font-bold">Tax Bracket</th>
                  <th className="text-center py-3 px-3 text-xs font-bold">Grossed-up</th>
                  <th className="text-center py-3 px-3 text-xs font-bold">Tax Payable</th>
                  <th className="text-center py-3 px-3 text-xs font-bold">Franking Offset</th>
                  <th className="text-center py-3 px-3 text-xs font-bold">Net Tax / Refund</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {FRANKING_EXAMPLES.map((row) => (
                  <tr key={row.bracket} className="bg-white hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-xs font-semibold text-slate-800">{row.bracket}</td>
                    <td className="py-3 px-3 text-center text-xs text-slate-700">${row.grossedUpDividend.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center text-xs text-slate-700">${row.taxOnGrossed.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center text-xs text-slate-700">${row.frankingCreditOffset.toLocaleString()}</td>
                    <td className="py-3 px-3 text-center text-xs font-bold">
                      {row.cashRefund > 0 ? (
                        <span className="text-green-700">+${row.cashRefund.toLocaleString()} refund</span>
                      ) : (
                        <span className="text-slate-700">${row.netTax.toLocaleString()} top-up</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-400 mt-2">Approximate figures. Actual amounts depend on other income, deductions, and credits. $1,000 cash dividend used for illustration.</p>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Complete Guide" title="Franking Credits — Deep Dive" />
          <div className="mt-8 space-y-10">
            {SECTIONS.map((sec) => (
              <div key={sec.heading}>
                <h2 className="text-lg font-extrabold text-slate-900 mb-3">{sec.heading}</h2>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {sec.body.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line">{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 md:py-12">
        <div className="container-custom max-w-2xl">
          <SectionHeading eyebrow="FAQ" title="Franking Credit Questions" />
          <div className="mt-6 divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.question} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <div className="flex flex-wrap gap-3">
            <Link href="/tax/capital-gains" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Capital Gains Tax →</Link>
            <Link href="/etfs/dividends" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">Dividend ETFs →</Link>
            <Link href="/etfs/asx-200" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">ASX 200 ETFs →</Link>
            <Link href="/super/smsf" className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-amber-300 text-slate-700 transition-colors">SMSF Tax Guide →</Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING} Tax information is general. Verify franking rules and refund eligibility with a registered tax agent or the ATO.</p>
        </div>
      </section>
    </div>
  );
}
