import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Do I pay tax on DRP shares if I don't receive cash?",
    a: "Yes. The ATO treats DRP participation as if you received the cash dividend and then immediately used it to buy shares. The full dividend amount is assessable income in the year it was declared — regardless of whether cash arrived in your account. Franking credits still attach and can be claimed on your tax return. There is no way to defer this tax liability by electing into a DRP.",
  },
  {
    q: "Does DRP work for ETFs like VAS and VGS?",
    a: "Yes, most major ASX ETF issuers offer a Distribution Reinvestment Plan (DRIP). Vanguard, iShares, and BetaShares each run their own investor portals where you can elect DRP for holdings like VAS, VGS, IVV, or NDQ. Unlike shares, some ETF issuers can issue fractional units, meaning the full distribution amount is reinvested without a cash residual. Enrolment is managed through the issuer's portal, not your broker.",
  },
  {
    q: "Can I cancel my DRP enrolment at any time?",
    a: "Yes. You can elect into or out of a DRP at any time by updating your preference through the share registry (Computershare or Link Market Services for ASX shares) or the ETF issuer's portal. Changes typically need to be made before the record date for the upcoming dividend to take effect for that payment. If you miss the cut-off, the DRP will apply to that dividend and your cancellation takes effect from the next one.",
  },
  {
    q: "How is the DRP share price determined?",
    a: "For most ASX companies, the DRP price is calculated as a volume-weighted average price (VWAP) of the company's shares over a set period following the ex-dividend date — often 5 to 15 trading days. A discount of 0 to 3% is then applied to that VWAP. The exact methodology is set out in the company's DRP plan rules, which you can find in the investor centre section of the company's website. For ETFs, the price is typically the net asset value (NAV) on the payment date.",
  },
  {
    q: "Do I need to do anything at tax time if I have a DRP?",
    a: "Yes. At tax time you must: (1) declare the full dividend value as income (it appears on your dividend statement or tax summary from the registry), (2) claim any attached franking credits, and (3) record the new shares acquired as a separate CGT parcel — with the acquisition date being the date the shares were issued and the cost base being the price you paid (the DRP price). Many investors pre-fill their tax return from ATO data but should cross-check that every DRP parcel is captured correctly. A spreadsheet or tax software that tracks CGT parcels is strongly recommended.",
  },
  {
    q: "Is DRP better inside super?",
    a: "Generally yes, particularly in SMSF accumulation phase (15% tax rate). Because the franking credit rate is 30% and the SMSF tax rate is 15%, the excess franking credits generate a net refund — effectively making fully franked dividends tax-free. Reinvesting via DRP compounds this benefit without brokerage. In pension phase (0% tax), all income is exempt and the full 30% franking credit is refunded as cash, so DRP is highly efficient. The caveat: in pension phase you may prefer cash distributions if the fund needs liquidity to meet minimum pension payments.",
  },
];

const DRP_VS_CASH = [
  { situation: "Long investment horizon (10+ years)", drp: true, cash: false },
  { situation: "Need income for living expenses", drp: false, cash: true },
  { situation: "High income tax rate — control timing", drp: false, cash: true },
  { situation: "Building position without brokerage", drp: true, cash: false },
  { situation: "Want to diversify into other assets", drp: false, cash: true },
  { situation: "SMSF accumulation phase", drp: true, cash: false },
  { situation: "SMSF pension phase (0% tax)", drp: true, cash: false },
];

const ETF_VS_SHARES = [
  { feature: "Method", shares: "DRP via share registry (Link, Computershare)", etfs: "Distribution Reinvestment Plan (DRIP) via Vanguard / iShares portal" },
  { feature: "Brokerage", shares: "$0", etfs: "$0" },
  { feature: "Enrolment", shares: "Through share registry website", etfs: "Through ETF issuer online portal" },
  { feature: "Fractional units", shares: "Rounds down to nearest whole share", etfs: "Some issuers allow fractional units" },
  { feature: "Discount", shares: "0–3% typical", etfs: "Usually nil (NAV-based)" },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Dividend Reinvestment Plans (DRP) Australia (${CURRENT_YEAR}) — How DRP Works`,
  description: `Complete guide to Dividend Reinvestment Plans in Australia — DRP mechanics, tax, CGT cost base, ETF vs share DRP, and how to enrol. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Dividend Reinvestment Plans (DRP) Australia (${CURRENT_YEAR})`,
    description: "How DRP works step by step, tax treatment of reinvested dividends, compounding worked examples, and how to enrol for ASX shares and ETFs.",
    url: `${SITE_URL}/invest/dividend-reinvestment`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Dividend Reinvestment Plans Australia")}&sub=${encodeURIComponent("DRP Tax · Compounding · ETFs · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/invest/dividend-reinvestment` },
};

export default function DividendReinvestmentPage() {
  const faq = faqJsonLd(FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Dividend Reinvestment Plans", url: absoluteUrl("/invest/dividend-reinvestment") },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}

      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-5xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/invest" className="hover:text-white">Invest</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Dividend Reinvestment Plans</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">ASX Shares &amp; ETFs</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Dividend Reinvestment Plans (DRP) Australia ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              Instead of receiving cash dividends, elect to receive new shares automatically — at no brokerage, often at a small discount. DRPs compound your shareholding over time without any new cash outlay.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Brokerage cost for DRP shares", value: "$0" },
                { label: "Typical DRP discount to market price", value: "0–3%" },
                { label: "Units after 20 years reinvesting 4% yield", value: "2.2x" },
                { label: "Tax on DRP dividends vs cash dividends", value: "Same" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 1: What is a DRP */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is a Dividend Reinvestment Plan?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  A Dividend Reinvestment Plan (DRP) lets you elect to receive additional shares instead of a cash dividend. When a company pays a dividend, your registry automatically issues new shares to your account — calculated at a small discount to the prevailing market price.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  No brokerage is charged. No decision is needed each time a dividend is declared. Once enrolled, the process is fully automatic and systematic — your shareholding grows with every dividend cycle.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  DRPs are offered directly by most large ASX companies and many ETF managers. For ETFs, the equivalent scheme is often called a Distribution Reinvestment Plan (DRIP) and is managed through the issuer&apos;s investor portal.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-3">
                <h3 className="font-extrabold text-slate-900 mb-2">Key features at a glance</h3>
                {[
                  { label: "Brokerage", value: "$0 — shares issued directly by the company" },
                  { label: "Discount", value: "0–3% below the prevailing market price" },
                  { label: "Effort", value: "None — automatic after enrolment" },
                  { label: "Cash received", value: "Nil (full dividend reinvested)" },
                  { label: "Tax", value: "Dividend still taxable in year received" },
                  { label: "Availability", value: "Most ASX 200 companies and major ETFs" },
                ].map((r) => (
                  <div key={r.label} className="flex justify-between gap-3 py-2 border-b border-slate-200 last:border-0 text-sm">
                    <span className="text-slate-500 shrink-0">{r.label}</span>
                    <span className="font-semibold text-slate-800 text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: How DRP works step by step */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How DRP works — step by step</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Here is a concrete example. You own 1,000 shares in a company that declares a 50 cent per share dividend.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8">
              {[
                { step: "1", title: "Dividend declared", desc: "Company declares 50c per share. Your entitlement: 1,000 shares × $0.50 = $500." },
                { step: "2", title: "DRP price set", desc: "Registry calculates VWAP over 5–15 trading days post-ex date, then applies 0–3% discount. Example: $10.20 × 98% = $10.00." },
                { step: "3", title: "Shares issued", desc: "$500 ÷ $10.00 = 50 new shares. Issued directly to your holding. No brokerage charged." },
                { step: "4", title: "Residual handled", desc: "Any fractional shortfall (e.g. 0.4 shares) is paid as small cash residual or rounded down, depending on the plan rules." },
                { step: "5", title: "CGT parcel created", desc: "Registry records 50 new shares acquired on this date at $10.00 cost base. Keep this for CGT purposes." },
              ].map((s) => (
                <div key={s.step} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-900 text-xs font-extrabold flex items-center justify-center mb-3">{s.step}</div>
                  <h3 className="font-extrabold text-slate-900 text-sm mb-2">{s.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Worked numbers callout */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="font-extrabold text-amber-900 mb-3 text-sm">Worked example summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-sm">
                {[
                  { label: "Shares held", value: "1,000" },
                  { label: "Dividend per share", value: "$0.50" },
                  { label: "Cash entitlement", value: "$500" },
                  { label: "DRP price", value: "$10.00 (2% disc.)" },
                ].map((c) => (
                  <div key={c.label} className="bg-white rounded-lg p-3 border border-amber-100">
                    <p className="text-lg font-extrabold text-amber-700">{c.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{c.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-amber-900 mt-4 font-semibold">
                Result: 50 new shares issued. New total: 1,050 shares. Brokerage paid: $0.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: DRP on ETFs vs shares */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">DRP on ASX shares vs ETFs</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              The mechanics differ slightly depending on whether you hold individual ASX shares or an ETF. The key distinction is where you enrol.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm border-collapse" aria-label="DRP on ASX shares vs ETFs">
                <thead>
                  <tr className="bg-slate-100">
                    <th scope="col" className="text-left py-3 px-4 font-extrabold text-slate-700 border-b border-slate-200">Feature</th>
                    <th scope="col" className="text-left py-3 px-4 font-extrabold text-slate-700 border-b border-slate-200">ASX Shares (e.g. CBA, BHP)</th>
                    <th scope="col" className="text-left py-3 px-4 font-extrabold text-amber-700 border-b border-slate-200">ASX ETFs (e.g. VAS, VGS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ETF_VS_SHARES.map((r) => (
                    <tr key={r.feature}>
                      <td className="py-3 px-4 font-bold text-slate-900">{r.feature}</td>
                      <td className="py-3 px-4 text-slate-700">{r.shares}</td>
                      <td className="py-3 px-4 text-slate-700">{r.etfs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Note: some newer online brokers do not support DRP. Your broker&apos;s platform may not automatically reflect DRP elections — enrolment must be done directly with the registry or ETF issuer.
            </p>
          </div>
        </section>

        {/* Section 4: Tax treatment */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Tax treatment of DRP shares</h2>

            <div className="rounded-xl border border-red-200 bg-red-50 p-5 mb-6">
              <h3 className="font-extrabold text-red-800 mb-2 text-sm">Critical: DRP dividends are still taxable</h3>
              <p className="text-sm text-red-700 leading-relaxed">
                Electing into a DRP does <strong>not</strong> defer or avoid tax on the dividend. The ATO treats DRP participation as receiving the cash dividend and immediately reinvesting it. You must declare the full dividend value as income in the year it was paid — even though no cash arrived in your bank account.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-4 text-sm">Income tax treatment</h3>
                <div className="space-y-3">
                  {[
                    { item: "Dividend income", detail: "Full cash-equivalent value is assessable income" },
                    { item: "Franking credits", detail: "Still attach to DRP dividends — claim on tax return" },
                    { item: "Grossed-up income", detail: "Dividend + franking credit = grossed-up amount" },
                    { item: "Tax offset", detail: "Franking credit offsets tax liability; excess refunded" },
                  ].map((r) => (
                    <div key={r.item} className="flex gap-3 py-2 border-b border-slate-100 last:border-0 text-sm">
                      <span className="text-slate-500 shrink-0 w-36">{r.item}</span>
                      <span className="text-slate-800">{r.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-4 text-sm">CGT treatment</h3>
                <div className="space-y-3">
                  {[
                    { item: "Cost base", detail: "DRP price paid (the discounted share price)" },
                    { item: "Acquisition date", detail: "Date new shares were issued" },
                    { item: "CGT event", detail: "Triggered only when you sell the shares" },
                    { item: "50% CGT discount", detail: "Applies if shares held 12+ months before sale" },
                  ].map((r) => (
                    <div key={r.item} className="flex gap-3 py-2 border-b border-slate-100 last:border-0 text-sm">
                      <span className="text-slate-500 shrink-0 w-36">{r.item}</span>
                      <span className="text-slate-800">{r.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Record keeping is essential.</strong> Each DRP parcel is a separate CGT lot with its own acquisition date and cost base. Over 10–20 years of DRP participation, you may accumulate dozens of separate parcels. Keep annual DRP statements from your registry and enter each parcel into your tax records or CGT tracking software.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Compounding worked example */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">The compounding effect — worked example</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Starting with 1,000 units of VAS at $95 per unit, with a ~4% p.a. distribution yield, reinvesting every distribution via DRP (no new cash added).
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
              <table className="w-full text-sm border-collapse" aria-label="DRP compounding effect worked example">
                <thead>
                  <tr className="bg-slate-100">
                    <th scope="col" className="text-left py-3 px-4 font-extrabold text-slate-700 border-b border-slate-200">Year</th>
                    <th scope="col" className="text-right py-3 px-4 font-extrabold text-slate-700 border-b border-slate-200">Units held</th>
                    <th scope="col" className="text-right py-3 px-4 font-extrabold text-slate-700 border-b border-slate-200">Annual distribution</th>
                    <th scope="col" className="text-right py-3 px-4 font-extrabold text-slate-700 border-b border-slate-200">New units added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { year: "Start", units: "1,000", dist: "—", added: "—" },
                    { year: "Year 1", units: "1,040", dist: "$3,800", added: "40" },
                    { year: "Year 2", units: "1,082", dist: "$3,952", added: "42" },
                    { year: "Year 3", units: "1,125", dist: "$4,112", added: "43" },
                    { year: "Year 5", units: "1,217", dist: "$4,275", added: "45" },
                    { year: "Year 10", units: "1,480", dist: "$4,617", added: "49" },
                    { year: "Year 20", units: "2,191", dist: "$5,624", added: "59" },
                  ].map((r, i) => (
                    <tr key={r.year} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-3 px-4 font-bold text-slate-900">{r.year}</td>
                      <td className="py-3 px-4 text-right font-semibold text-amber-700">{r.units}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{r.dist}</td>
                      <td className="py-3 px-4 text-right text-slate-700">{r.added}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-3xl font-extrabold text-amber-700 mb-1">2.2x</p>
                <p className="text-sm text-slate-700">Shareholding after 20 years — more than doubling without investing a single additional dollar.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-3xl font-extrabold text-slate-900 mb-1">$0</p>
                <p className="text-sm text-slate-700">Additional cash invested. All growth comes from reinvested distributions compounding on themselves.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-3xl font-extrabold text-slate-900 mb-1">$0</p>
                <p className="text-sm text-slate-700">Total brokerage paid across all reinvestments over the 20-year period.</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Assumes constant $95 unit price and constant 4% yield for illustrative purposes only. Actual returns will vary. Past performance is not indicative of future performance.
            </p>
          </div>
        </section>

        {/* Section 6: DRP vs taking cash */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 6</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">DRP vs taking cash — when each makes sense</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              DRP is not always the right choice. The best option depends on your income needs, tax position, and investment goals.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm border-collapse" aria-label="DRP vs taking cash comparison">
                <thead>
                  <tr className="bg-slate-100">
                    <th scope="col" className="text-left py-3 px-4 font-extrabold text-slate-700 border-b border-slate-200">Situation</th>
                    <th scope="col" className="text-center py-3 px-4 font-extrabold text-amber-700 border-b border-slate-200">DRP better</th>
                    <th scope="col" className="text-center py-3 px-4 font-extrabold text-slate-700 border-b border-slate-200">Cash better</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {DRP_VS_CASH.map((r) => (
                    <tr key={r.situation}>
                      <td className="py-3 px-4 text-slate-800">{r.situation}</td>
                      <td className="py-3 px-4 text-center text-lg">{r.drp ? <span className="text-green-600 font-bold">&#10003;</span> : <span className="text-slate-200">&#8212;</span>}</td>
                      <td className="py-3 px-4 text-center text-lg">{r.cash ? <span className="text-green-600 font-bold">&#10003;</span> : <span className="text-slate-200">&#8212;</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 7: How to enrol */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 7</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How to enrol in a DRP</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">For ASX shares</h3>
                <ol className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-2"><span className="font-bold text-amber-600 shrink-0">1.</span>Identify your share registry — most ASX companies use Computershare or Link Market Services. Check the investor section of the company&apos;s website.</li>
                  <li className="flex gap-2"><span className="font-bold text-amber-600 shrink-0">2.</span>Create or log in to your registry account using your Securityholder Reference Number (SRN) or HIN.</li>
                  <li className="flex gap-2"><span className="font-bold text-amber-600 shrink-0">3.</span>Navigate to &ldquo;Dividend Instructions&rdquo; or &ldquo;Reinvestment Plan&rdquo; and elect to participate.</li>
                  <li className="flex gap-2"><span className="font-bold text-amber-600 shrink-0">4.</span>Confirm before the record date to ensure the next dividend is reinvested.</li>
                </ol>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">For ASX ETFs</h3>
                <ol className="space-y-3 text-sm text-slate-700">
                  <li className="flex gap-2"><span className="font-bold text-amber-600 shrink-0">1.</span>Log in to the ETF issuer&apos;s investor portal: Vanguard Personal Investor, iShares Investor Centre, or BetaShares Investor Hub.</li>
                  <li className="flex gap-2"><span className="font-bold text-amber-600 shrink-0">2.</span>Locate your holding and find the Distribution Reinvestment Plan (DRIP) election.</li>
                  <li className="flex gap-2"><span className="font-bold text-amber-600 shrink-0">3.</span>Select reinvestment and confirm.</li>
                  <li className="flex gap-2"><span className="font-bold text-amber-600 shrink-0">4.</span>Note: if you hold ETFs through a broker (rather than directly), some platforms do not support DRP — check with your broker.</li>
                </ol>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <h4 className="font-extrabold text-blue-900 mb-2 text-sm">Partial DRP</h4>
                <p className="text-sm text-blue-800">Some companies allow partial DRP elections — for example, reinvest 50% and receive the remaining 50% as cash. This can suit investors who want some income but also want compounding growth.</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h4 className="font-extrabold text-amber-900 mb-2 text-sm">Broker support varies</h4>
                <p className="text-sm text-amber-800">Newer low-cost online platforms (e.g. Stake, Superhero) may not support DRP elections. Always verify with your broker. If unsupported, you can sometimes enrol directly with the registry if you hold via HIN rather than custodian.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 8: Record keeping */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 8</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Record keeping for tax</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Long-term DRP participation creates many separate CGT parcels. Good records are essential — and the ATO expects you to have them.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-extrabold text-slate-900 mb-4 text-sm">What to record for each DRP parcel</h3>
                <div className="space-y-2">
                  {[
                    "Acquisition date (date shares were issued)",
                    "Number of shares received",
                    "DRP price per share (your cost base per share)",
                    "Total cost base (shares x price)",
                    "Dividend amount that was reinvested",
                    "Franking credits attached to that dividend",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-amber-500 font-bold shrink-0 mt-0.5">&#10003;</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 mb-4 text-sm">CGT parcel strategies when selling</h3>
                <div className="space-y-3 text-sm text-slate-700">
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <p className="font-semibold text-slate-900 mb-1">FIFO (first in, first out)</p>
                    <p className="text-slate-600">Sells oldest parcels first. Usually results in more parcels qualifying for the 50% CGT discount but may have lower cost bases (earlier purchases at lower prices).</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <p className="font-semibold text-slate-900 mb-1">Highest cost first</p>
                    <p className="text-slate-600">Minimises the taxable gain by selling parcels with the highest cost base first. Useful when you need to sell a small number of units and want to minimise tax.</p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200 rounded-lg">
                    <p className="font-semibold text-slate-900 mb-1">Minimisation method</p>
                    <p className="text-slate-600">Identify which specific parcel to sell to minimise your CGT liability given your current tax position. Requires good records. Consult a tax adviser for complex situations.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">FAQ</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-2">
              {FAQS.map((item) => (
                <details key={item.q} className="group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-bold text-slate-900 text-sm hover:bg-slate-100 transition-colors">
                    {item.q}
                    <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">&#9660;</span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Related guides */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Related Guides</p>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Explore related investment guides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { title: "Dividend Investing in Australia", href: "/invest/dividend-investing", desc: "Franking credits, high-yield ASX stocks, dividend ETFs, and SMSF dividend strategies." },
                { title: "Dollar-Cost Averaging", href: "/invest/dollar-cost-averaging", desc: "Invest a fixed amount at regular intervals to build wealth systematically." },
                { title: "Index Funds & ETFs", href: "/invest/index-funds", desc: "Low-cost passive investing via ASX-listed ETFs and unlisted index funds." },
                { title: "SMSF Investment Guide", href: "/invest/smsf", desc: "What SMSFs actually invest in — shares, property, ETFs, and more." },
              ].map((guide) => (
                <Link key={guide.href} href={guide.href} className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-200 hover:shadow-md transition-all">
                  <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{guide.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{guide.desc}</p>
                  <span className="inline-flex items-center text-amber-600 text-sm font-semibold mt-2">Read guide &#8594;</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance footer */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <div className="rounded-xl border border-slate-300 bg-white p-5 mb-6">
              <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/invest/dividend-investing" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Dividend investing &#8594;
              </Link>
              <Link href="/brokers" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Compare brokers &#8594;
              </Link>
              <Link href="/invest/dollar-cost-averaging" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Dollar-cost averaging &#8594;
              </Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
