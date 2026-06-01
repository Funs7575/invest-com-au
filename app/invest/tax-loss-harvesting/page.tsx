import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Tax-Loss Harvesting Australia (${CURRENT_YEAR}) — How to Offset Capital Gains Before 30 June`,
  description: `Reduce your CGT bill by crystallising capital losses before 30 June. How tax-loss harvesting works, the wash sale concern, worked examples, and the year-end checklist for Australian investors. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Tax-Loss Harvesting Australia (${CURRENT_YEAR}) — Offset Capital Gains Before 30 June`,
    description:
      "Sell losing investments before 30 June to offset capital gains. Complete guide for Australian investors: mechanics, wash sale rules, worked examples, and year-end checklist.",
    url: `${SITE_URL}/invest/tax-loss-harvesting`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Tax-Loss Harvesting Australia")}&sub=${encodeURIComponent("Offset Capital Gains · 30 June Guide · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/invest/tax-loss-harvesting` },
};

const FAQS = [
  {
    q: "Does Australia have a wash sale rule?",
    a: "Australia does not have a formal codified wash sale rule like the United States. However, the ATO has general anti-avoidance provisions under Part IVA of the Income Tax Assessment Act 1936. If the ATO determines that the dominant purpose of selling and immediately reacquiring the same asset was to obtain a tax benefit, it can deny the capital loss. In practice, the risk increases when you sell and repurchase the identical asset within a short window. Waiting 30 or more days before buying back the same asset substantially reduces the risk of a Part IVA challenge.",
  },
  {
    q: "Can I buy the same ETF back after tax-loss harvesting?",
    a: "You can buy the same ETF back, but doing so immediately creates risk under the ATO's Part IVA anti-avoidance provisions. The safest approaches are: (1) wait 30 or more days before repurchasing the same ETF, or (2) buy a different ETF that tracks a similar market — for example, selling VAS and replacing it with A200 (both track Australian equities but are issued by different fund managers on different indices). This maintains your market exposure while reducing the Part IVA risk.",
  },
  {
    q: "Do capital losses expire in Australia?",
    a: "No. Capital losses in Australia carry forward indefinitely and never expire. If you crystallise a $20,000 capital loss in a year where you have no gains to offset, that loss is preserved and can be applied against capital gains in any future year. There is no time limit. You must apply carried-forward losses before applying the 50% CGT discount to any current-year gains.",
  },
  {
    q: "When should I NOT tax-loss harvest?",
    a: "There are several situations where harvesting a loss may not be worthwhile: (1) You are in a low marginal tax bracket — the tax saving is small. (2) The investment has strong long-term prospects and you do not want to risk missing a recovery during the 30-day waiting period. (3) The loss is small relative to the brokerage cost of selling and rebuying. (4) You are inside superannuation in accumulation phase, where the CGT rate is already a flat 15% and the absolute saving from harvesting is minimal. (5) If selling the asset would trigger a CGT event that creates a gain elsewhere (e.g. in a rebalancing context).",
  },
  {
    q: "Can I use capital losses to offset ordinary income?",
    a: "No. Capital losses in Australia can only be used to offset capital gains — they cannot be applied against ordinary income such as salary, wages, interest, dividends, or rental income. This is a key distinction from business losses, which in some circumstances can be offset against ordinary income. If you have more capital losses than gains in a year, the excess is carried forward to future years and can only ever be applied against future capital gains.",
  },
  {
    q: "How do I report capital losses on my tax return?",
    a: "Capital losses are reported in the Capital gains section of your individual income tax return (myTax or paper return). If you have a net capital loss for the year (losses exceed gains), you report the carried-forward loss amount. Your broker's annual tax statement will list all disposals and any capital gains or losses. For complex portfolios — multiple brokers, crypto, or overseas assets — Sharesight can consolidate your CGT position and produce an ATO-compatible tax report. A registered tax agent can review your position before lodgement.",
  },
];

const STATS = [
  { label: "Maximum tax saved at 45% marginal rate per $10,000 loss", value: "$2,250" },
  { label: "Settlement cut-off: sell by this date for T+2 settlement before 30 June", value: "~25 June" },
  { label: "Minimum days before repurchasing same asset (best practice)", value: "30 days" },
  { label: "Capital losses carry forward", value: "Forever" },
];

export default function TaxLossHarvestingPage() {
  const faq = faqJsonLd(FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Tax-Loss Harvesting", url: absoluteUrl("/invest/tax-loss-harvesting") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}

      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-5xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Tax-Loss Harvesting</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-white/10 text-white px-3 py-1 rounded-full">CGT Strategy</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Tax-Loss Harvesting in Australia ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              Sell investments at a loss before 30 June to offset capital gains and reduce your CGT bill. Here&apos;s how it works, the wash sale concern, and the year-end checklist every Australian investor should follow.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STATS.map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What is tax-loss harvesting */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is tax-loss harvesting?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Tax-loss harvesting is the deliberate sale of investments that are currently worth less than you paid for them. By crystallising that capital loss before the end of the financial year (30 June), you can use it to offset capital gains you have already realised — reducing the amount of assessable income added to your tax return.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  If your total capital losses in a year exceed your total capital gains, you do not lose those losses. They carry forward to future financial years indefinitely — there is no expiry date. Carried-forward losses must be applied against future capital gains before the 50% CGT discount is applied.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  The strategy is most effective when you are in a high marginal tax bracket, have material realised gains in the current year, and hold positions that are sitting at an unrealised loss but are no longer core to your investment thesis.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-extrabold text-amber-900 mb-4">Key facts at a glance</h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-500 text-slate-900 text-xs flex items-center justify-center font-bold">1</span>
                    <span>Capital losses offset capital gains — reducing your assessable income dollar for dollar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-500 text-slate-900 text-xs flex items-center justify-center font-bold">2</span>
                    <span>Excess losses carry forward to future years — they never expire</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-500 text-slate-900 text-xs flex items-center justify-center font-bold">3</span>
                    <span>Capital losses cannot offset ordinary income (salary, dividends, rent) — only capital gains</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-500 text-slate-900 text-xs flex items-center justify-center font-bold">4</span>
                    <span>Timing: most effective before 30 June each financial year when you have gains to offset</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-500 text-slate-900 text-xs flex items-center justify-center font-bold">5</span>
                    <span>Australia has no formal wash sale rule, but the ATO&apos;s Part IVA anti-avoidance rules apply</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How it works — the mechanics */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">How it works — the mechanics</h2>
            <p className="text-sm text-slate-600 mb-8 max-w-2xl">
              Net capital gains in Australia are calculated across all assets. Gains and losses from every disposal in the year are pooled together — a loss in one position directly offsets a gain in another.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-4">Without tax-loss harvesting</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Realised gain (sold VGS)</span>
                    <span className="font-bold text-red-700">+$20,000</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Unrealised loss (gold ETF — NOT sold)</span>
                    <span className="text-slate-400">$0 offset</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Net capital gain</span>
                    <span className="font-bold text-slate-900">$20,000</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Tax at 32.5% marginal rate</span>
                    <span className="font-bold text-red-700">$6,500</span>
                  </div>
                  <div className="flex justify-between py-2 text-xs text-slate-400">
                    <span>(Assumes gain is fully assessable — no 50% discount in this example)</span>
                    <span></span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <h3 className="font-extrabold text-green-900 mb-4">With tax-loss harvesting</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-green-100">
                    <span className="text-slate-600">Realised gain (sold VGS)</span>
                    <span className="font-bold text-slate-700">+$20,000</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-green-100">
                    <span className="text-slate-600">Capital loss (sold gold ETF)</span>
                    <span className="font-bold text-green-700">−$8,000</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-green-100">
                    <span className="text-slate-600">Net capital gain</span>
                    <span className="font-bold text-slate-900">$12,000</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-green-100">
                    <span className="text-slate-600">Tax at 32.5% marginal rate</span>
                    <span className="font-bold text-slate-700">$3,900</span>
                  </div>
                  <div className="flex justify-between py-2 font-extrabold text-green-800">
                    <span>Tax saved</span>
                    <span>$2,600</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Important:</strong> Net capital gains are calculated across ALL assets you disposed of in the financial year — shares, ETFs, property, crypto, and other CGT assets. Gains and losses from every disposal pool together before the 50% discount is applied to any qualifying assets held 12 or more months.
              </p>
            </div>
          </div>
        </section>

        {/* Wash sale rules */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">The wash sale concern — what Australians need to know</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6 max-w-2xl">
              The United States has a formal 30-day wash sale rule that automatically disallows a capital loss if you buy the same security within 30 days. Australia has no equivalent legislated rule — but that does not mean the risk is zero.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <h3 className="font-extrabold text-red-900 mb-3">The Part IVA risk</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  Part IVA of the Income Tax Assessment Act 1936 gives the ATO power to disregard a scheme where the dominant purpose is to obtain a tax benefit. A wash sale — selling an asset at a loss and immediately repurchasing the same asset — can be targeted under Part IVA.
                </p>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>The ATO has explicitly warned about wash sales in annual pre-tax-time alerts</li>
                  <li>Risk is highest when: same asset, immediate repurchase, large loss crystallised</li>
                  <li>If Part IVA applies: the capital loss is denied and penalties may apply</li>
                </ul>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 p-5">
                <h3 className="font-extrabold text-green-900 mb-3">Best practice to manage risk</h3>
                <ul className="space-y-3 text-sm text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-green-600 font-bold">&#10003;</span>
                    <span><strong>Wait 30+ days</strong> before repurchasing the same asset — breaks the temporal nexus</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-green-600 font-bold">&#10003;</span>
                    <span><strong>Buy a similar but different asset</strong>: sell VAS (Vanguard Australian shares), buy A200 (BetaShares Australian shares) — same market, different ETF and issuer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-green-600 font-bold">&#10003;</span>
                    <span><strong>Document a commercial reason</strong> for the sale beyond the tax benefit (portfolio rebalancing, issuer diversification)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-green-600 font-bold">&#10003;</span>
                    <span><strong>Avoid same-day or next-day repurchases</strong> of the identical security</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-700">
                <strong>Practical note:</strong> Selling VAS and buying A200 — or selling a technology ETF and replacing it with a broad market ETF that includes technology — maintains your market exposure without buying back the identical fund. This is the most common institutional approach to avoiding wash sale risk in Australian portfolios.
              </p>
            </div>
          </div>
        </section>

        {/* Worked examples */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-8">Worked examples</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Example 1 */}
              <div className="rounded-xl border border-amber-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-amber-500 text-slate-900 text-xs font-extrabold flex items-center justify-center">1</span>
                  <h3 className="font-extrabold text-slate-900">Gain + loss offset (with CGT discount)</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Realised gain — VGS (held 18 months)</span>
                    <span className="font-bold text-slate-900">$15,000</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Unrealised loss — gold ETF (held 14 months)</span>
                    <span className="font-bold text-slate-900">$6,000</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Sell gold ETF — loss crystallised</span>
                    <span className="font-bold text-green-700">−$6,000 offset</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Net gain before discount</span>
                    <span className="font-bold text-slate-900">$9,000</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">50% CGT discount (VGS held 12+ months)</span>
                    <span className="font-bold text-slate-900">$4,500 assessable</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Without harvesting: assessable gain</span>
                    <span className="text-red-700 font-bold">$7,500</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-extrabold text-green-800">
                    <span>Tax saved at 32.5%</span>
                    <span>$975</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">($7,500 − $4,500) × 32.5% = $975 tax saved</p>
              </div>

              {/* Example 2 */}
              <div className="rounded-xl border border-blue-200 bg-white p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center">2</span>
                  <h3 className="font-extrabold text-slate-900">Loss carry-forward to offset a future gain</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Year 1 — no gains to offset</p>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Crystallised loss (crypto downturn)</span>
                    <span className="font-bold text-slate-900">$20,000</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Capital gains in Year 1</span>
                    <span className="text-slate-500">$0</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-600">Loss carried forward to Year 2</span>
                    <span className="font-bold text-blue-700">$20,000</span>
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-3 mb-2">Year 2 — property sale</p>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Property gain (12+ months)</span>
                    <span className="font-bold text-slate-900">$80,000</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Carried-forward loss applied</span>
                    <span className="font-bold text-blue-700">−$20,000</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600">Net gain before 50% discount</span>
                    <span className="font-bold text-slate-900">$60,000</span>
                  </div>
                  <div className="flex justify-between py-1.5 font-extrabold text-green-800">
                    <span>Tax saved at 37% (post-discount)</span>
                    <span>$3,700</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">$20,000 × 50% × 37% = $3,700 tax saved</p>
              </div>
            </div>
          </div>
        </section>

        {/* Identifying loss positions */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Identifying loss positions in your portfolio</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Before acting, you need a clear picture of every unrealised loss position and its size. Use Sharesight or your broker&apos;s unrealised P&amp;L view to generate a full list.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                {
                  title: "Market downturn after purchase",
                  desc: "An ETF purchased at $95 that now trades at $78 carries an unrealised loss of $17 per unit — worth crystallising if you have offsetting gains.",
                  color: "border-slate-200 bg-slate-50",
                },
                {
                  title: "Sector rotation losers",
                  desc: "Technology or growth ETFs can underperform in a rising-rate environment. A thematic position that has lagged the broad market is a candidate for harvesting.",
                  color: "border-slate-200 bg-slate-50",
                },
                {
                  title: "Single stocks with changed thesis",
                  desc: "If the original investment reason no longer holds, crystallising the loss at year-end serves both tax and portfolio hygiene purposes.",
                  color: "border-slate-200 bg-slate-50",
                },
                {
                  title: "Recent purchases in a correction",
                  desc: "Positions bought in the past 6 to 12 months that were caught in a sudden drawdown. These may not qualify for the 50% CGT discount on the loss side, but the offset is still valuable.",
                  color: "border-slate-200 bg-slate-50",
                },
                {
                  title: "Crypto holdings",
                  desc: "The ATO treats crypto as a CGT asset. Volatile crypto positions often carry unrealised losses that can offset gains elsewhere — including property or share gains.",
                  color: "border-slate-200 bg-slate-50",
                },
                {
                  title: "Using Sharesight or broker P&L",
                  desc: "Sharesight calculates realised and unrealised gains and losses across all positions. Most brokers also have an unrealised P&L screen. Run this report in May and June each year.",
                  color: "border-amber-100 bg-amber-50",
                },
              ].map((item) => (
                <div key={item.title} className={`rounded-xl border p-4 ${item.color}`}>
                  <h3 className="font-extrabold text-slate-900 text-sm mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-700 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Year-end checklist */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Year-end checklist — what to do before 30 June</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              ASX trades settle on a T+2 basis. To ensure settlement completes before 30 June, you must sell by approximately 25 June. Check your broker for the exact cut-off each year.
            </p>
            <div className="max-w-2xl space-y-3">
              {[
                { step: "1", text: "Pull your year-to-date capital gains summary from your broker or Sharesight — how much have you realised in gains so far this financial year?" },
                { step: "2", text: "Pull your unrealised P&L report — identify every position currently at a loss and note the loss amount." },
                { step: "3", text: "Calculate your net position: do you have a net gain that losses could offset? Is the tax saving material after brokerage?" },
                { step: "4", text: "Check the 50% CGT discount: were the gain positions held for more than 12 months? This affects how losses interact with the discounted gain." },
                { step: "5", text: "Identify the best loss candidates — positions where the investment case has weakened or where you can replace the exposure with a similar asset." },
                { step: "6", text: "Execute the sales before the settlement cut-off (typically around 25 June for T+2 to settle before 30 June)." },
                { step: "7", text: "Plan your repurchase strategy: either wait 30+ days and rebuy the same asset, or immediately buy a similar-but-different ETF to maintain market exposure." },
                { step: "8", text: "Record everything: keep trade confirmations, dates, and prices for your tax return. If using a tax agent, send them the updated CGT report from your broker or Sharesight." },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4 bg-white rounded-xl border border-slate-200 p-4">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-slate-800 text-white text-sm font-extrabold flex items-center justify-center">{item.step}</span>
                  <p className="text-sm text-slate-700 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Advanced: marginal rate threshold management */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Advanced: managing the marginal rate threshold</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6 max-w-2xl">
              Capital gains are added to your other income for the year. A large capital gain can push you across a marginal rate bracket, meaning the top slice of your gain is taxed at a higher rate. Tax-loss harvesting can pull the assessable gain back below the threshold.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Scenario: pushing over a bracket</h3>
                <div className="space-y-2 text-sm text-slate-700">
                  <p>Your base income is $130,000. You realise a $30,000 capital gain (post 50% discount: $15,000 assessable).</p>
                  <p className="mt-2">Total assessable income: $145,000 — you cross from the 32.5% into the 37% bracket at $135,000.</p>
                  <p className="mt-2">The $10,000 of gain above $135,000 is taxed at 37% rather than 32.5% — an extra $450 in tax compared to staying below the threshold.</p>
                  <p className="mt-2 font-bold text-slate-900">Harvesting $20,000 in losses reduces the assessable gain back below the bracket, removing the 37% exposure.</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">When this matters most</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>Year with an unusually large bonus or commission income</li>
                  <li>Year of a property sale that adds a large capital gain</li>
                  <li>Receiving an inheritance that triggers a CGT event</li>
                  <li>Business sale proceeds included in assessable income</li>
                  <li>Alternatively: defer the sale creating the gain to the next financial year if you have flexibility</li>
                </ul>
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Tax brackets (FY2025–26):</strong> 32.5% bracket ends at $135,000. 37% bracket: $135,001–$190,000. 45% bracket: $190,001+. These apply to your total assessable income including the assessable portion of capital gains. Verify current rates at ato.gov.au.
              </p>
            </div>
          </div>
        </section>

        {/* Tax-loss harvesting inside super */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Tax-loss harvesting inside superannuation</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-6 max-w-2xl">
              Tax-loss harvesting has limited value inside a superannuation fund compared to a personal taxable portfolio. Understanding why helps you prioritise where to focus the effort.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Accumulation phase</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  All capital gains inside a super fund in accumulation phase are taxed at a flat 15% (or 10% for assets held 12+ months). Capital losses offset those gains at the same 15% rate.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Harvesting a $10,000 loss saves at most $1,500 in tax — versus $3,700 or more at a 37% marginal rate outside super. The juice is barely worth the squeeze unless you are running a large SMSF.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Pension phase</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  Once your super fund is in pension phase, all earnings — including capital gains — are taxed at 0%. There are no capital gains to offset, so tax-loss harvesting is completely irrelevant.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Pension phase members should focus on asset allocation and drawdown strategy rather than CGT management.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-extrabold text-amber-900 mb-3">Where harvesting is most powerful</h3>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">
                  High-income individuals with personal taxable portfolios — particularly those in the 37% or 45% marginal bracket — benefit most.
                </p>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>Effective tax rate on gains at 45%: 22.5% (with 50% discount)</li>
                  <li>Every $10,000 loss harvested at 45%: saves $2,250</li>
                  <li>At 32.5%: saves $1,625 per $10,000 harvested</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-2">
              {FAQS.map((item) => (
                <details key={item.q} className="group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-bold text-slate-900 text-sm hover:bg-slate-100 transition-colors">
                    {item.q}
                    <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">&#9660;</span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="container-custom text-center max-w-xl">
            <h2 className="text-xl font-extrabold mb-3">Get specialist CGT advice before 30 June</h2>
            <p className="text-sm text-slate-300 mb-6">
              A tax agent or accountant can model your exact position, identify the best loss candidates, and ensure your harvesting strategy is documented correctly for the ATO.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/advisors/tax-agents" className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
                Find a Tax Agent &#8594;
              </Link>
              <Link href="/tax/capital-gains" className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors">
                CGT Complete Guide &#8594;
              </Link>
            </div>
          </div>
        </section>

        {/* Related links + compliance */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <p className="text-xs text-slate-500 leading-relaxed mb-6">{GENERAL_ADVICE_WARNING} Tax information is general in nature. Verify current rates and thresholds with the ATO (ato.gov.au) or a registered tax agent. Capital losses and gains depend on individual circumstances.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/tax/capital-gains" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Capital Gains Tax guide &#8594;
              </Link>
              <Link href="/brokers" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Compare brokers &#8594;
              </Link>
              <Link href="/invest/dividend-investing" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Dividend investing guide &#8594;
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
