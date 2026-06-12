import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `How to Compare Super Funds in Australia (${CURRENT_YEAR} Guide) | invest.com.au`,
  description: `Comparing super funds: long-term net returns, total fees, insurance, the APRA performance test, and the ATO YourSuper tool. ${UPDATED_LABEL}.`,
  alternates: { canonical: `${SITE_URL}/super/compare-guide` },
  openGraph: {
    title: `How to Compare Super Funds (${CURRENT_YEAR} Guide)`,
    description:
      "Comparing Australian super funds the right way: long-term net returns, total fees, insurance, investment options, the APRA performance test, and comparison tools.",
    url: `${SITE_URL}/super/compare-guide`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("How to Compare Super Funds")}&sub=${encodeURIComponent("Returns · Fees · Insurance · Performance Test · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

// ── Data ──────────────────────────────────────────────────────────

const FACTORS = [
  {
    factor: "Investment returns",
    detail: "Long-term net returns (7–10 years), not the headline 1-year number.",
    why: "One strong year is mostly luck and market timing. The funds at the top of the 1-year table are rarely the same ones at the top of the 10-year table. Persistent long-term performance is the signal that matters.",
  },
  {
    factor: "Fees",
    detail: "Total fee: administration + investment + transaction costs.",
    why: "Fees are the one variable you can predict with certainty. A fund cannot guarantee returns, but it can guarantee what it charges. On a long horizon, a fraction of a percent compounds into a very large number.",
  },
  {
    factor: "Investment options",
    detail: "The range and quality of options, not just the count.",
    why: "A fund with a single low-cost balanced index option can serve most members better than one with 200 expensive niche options. What matters is whether the options that fit your risk profile are well-built and competitively priced.",
  },
  {
    factor: "Insurance",
    detail: "Default cover levels and the premiums deducted from your balance.",
    why: "Default life, TPD and income protection cover varies enormously between funds. Premiums erode your balance quietly. The right amount of cover at a fair price is part of the value — and a reason to be careful before switching.",
  },
  {
    factor: "Performance test results",
    detail: "Whether the fund passed APRA's annual performance test.",
    why: "APRA assesses MySuper and Trustee-Directed products against a benchmark every year. A fail is a clear red flag; repeated fails force a fund to stop accepting new members. Passing is a floor, not proof of excellence.",
  },
  {
    factor: "Member services",
    detail: "Advice, app/online access, response times, and reporting.",
    why: "Once two funds are close on returns and fees, the day-to-day experience matters: easy online access, clear statements, accessible general advice, and responsiveness when you need to make a change.",
  },
];

const FUND_TYPES = [
  {
    type: "Industry funds",
    model: "Profit-to-member",
    examples: "AustralianSuper, ART, Hostplus",
    notes: "Run for members rather than shareholders, so profits are returned to members. Historically low fees and strong long-term net returns. Originally tied to specific industries, but almost all are now open to anyone.",
  },
  {
    type: "Retail funds",
    model: "For-profit",
    examples: "Some bank- and insurer-owned funds",
    notes: "Operated by a company that aims to make a profit for shareholders. Quality varies — some are competitive, but legacy retail products have historically carried higher fees. Often the fund you land in through an adviser or older employer arrangement.",
  },
  {
    type: "Corporate funds",
    model: "Employer-sponsored",
    examples: "Funds run by a large employer for staff",
    notes: "Set up by an employer for its workforce, sometimes with negotiated fees or extra benefits. Fewer of these exist today as many have merged into larger funds.",
  },
  {
    type: "Public sector funds",
    model: "Government employees",
    examples: "Funds for state and federal public servants",
    notes: "For current and former government employees. Some include defined-benefit components with rules quite different from standard account-based super — check carefully before rolling anything out.",
  },
  {
    type: "SMSF",
    model: "Self-managed",
    examples: "Self-managed super fund (you are the trustee)",
    notes: "You run the fund yourself, with full control over the investment strategy (including direct property). Comes with fixed annual running costs, an audit requirement, and significant trustee responsibilities. Generally only cost-effective at larger balances.",
  },
];

const INVESTMENT_OPTIONS = [
  {
    name: "MySuper (the default)",
    body: "Where your money goes if you never make a choice. It is either a single diversified balanced option or a lifecycle (age-based) strategy that automatically reduces risk as you approach retirement. Designed to be a sensible, low-cost default for the majority of members.",
  },
  {
    name: "Pre-mixed options",
    body: "Diversified portfolios built to a target risk level — typically labelled growth, balanced, and conservative. The fund decides the asset mix; you just pick the risk level that suits your timeframe. A growth option holds more shares; a conservative option holds more cash and bonds.",
  },
  {
    name: "Single-asset-class options",
    body: "Options that invest in just one asset class — Australian shares, international shares, property, or cash. These let you build your own mix across several options, or tilt toward an asset class you want more (or less) exposure to.",
  },
  {
    name: "Member-direct / direct investment",
    body: "Offered by some larger funds, this lets you pick individual shares, ETFs, and term deposits inside your super — SMSF-style control without the cost and admin of running your own fund. Usually carries extra fees and brokerage, and a portion of your balance must stay in a pooled option.",
  },
];

const COMPARISON_TOOLS = [
  {
    tool: "ATO YourSuper comparison tool",
    where: "ato.gov.au — via myGov",
    shows: "Compares MySuper products side by side on fees and net returns, and flags whether each product passed the APRA performance test. Government-run, with standardised data straight from APRA.",
    limits: "Only covers MySuper (default) products — not the full investment menu of choice options, and not retirement-phase products.",
  },
  {
    tool: "SuperRatings",
    where: "superratings.com.au",
    shows: "Independent research house that rates funds and options (e.g. its 'Platinum' rating) and publishes balanced-option return surveys widely quoted in the media.",
    limits: "Some detailed data sits behind fund subscriptions; ratings are an opinion, not a guarantee of future results.",
  },
  {
    tool: "Chant West",
    where: "chantwest.com.au",
    shows: "Another major independent research house with fund ratings and performance surveys, including its multi-manager and AppleCheck assessments.",
    limits: "As with any rating, it is backward-looking and reflects the rater's methodology and assumptions.",
  },
  {
    tool: "Canstar",
    where: "canstar.com.au",
    shows: "Consumer comparison site with star ratings and award categories across super and many other financial products.",
    limits: "Coverage depends on which funds participate, and commercial arrangements can apply — read the methodology and any disclosure.",
  },
];

const MISTAKES = [
  {
    mistake: "Chasing last year's top performer",
    fix: "The 1-year leaderboard reshuffles constantly. Compare 7–10 year net returns for the same risk profile instead.",
  },
  {
    mistake: "Ignoring fees",
    fix: "Fees are guaranteed where returns are not. Compare the total fee as a percentage of your balance, including insurance premiums.",
  },
  {
    mistake: "Holding multiple accounts",
    fix: "Each extra account means duplicate admin fees and often duplicate insurance premiums. Consolidate — after checking insurance.",
  },
  {
    mistake: "Staying in a high-fee legacy fund",
    fix: "Older retail products can quietly charge well above modern alternatives. Read the fee section of your statement and benchmark it.",
  },
  {
    mistake: "Losing insurance when switching",
    fix: "Rolling out of a fund cancels its insurance. If you have a health condition, equivalent cover elsewhere may be impossible. Confirm new cover first.",
  },
  {
    mistake: "Not checking the performance test",
    fix: "A failed APRA performance test is public and material. Check your fund's result before assuming the default is fine.",
  },
];

const FAQS = [
  {
    q: "How do I compare super funds?",
    a: "Compare on the things that actually drive your retirement balance, not the headline return alone. Look at long-term net returns (7–10 years, after fees and tax) for the same risk profile — a balanced option against another balanced option. Compare the total fee as a percentage of your balance (administration plus investment plus transaction costs). Check whether the fund passed APRA's annual performance test. Then weigh the insurance (default cover and premiums) and member services such as online access and advice. The ATO YourSuper comparison tool on myGov is a reliable, standardised starting point for MySuper products; independent research houses such as SuperRatings and Chant West can help compare choice options.",
  },
  {
    q: "What is a good fee for a super fund?",
    a: "There is no single number, but as a rough guide many large, low-cost diversified options sit somewhere around 0.5%–1.0% per year of your balance once administration and investment fees are combined, and index-based options can sit well below that. The key is to compare the total fee as a percentage of your balance against similar options at other funds, because a difference that looks tiny compounds dramatically. For example, paying 1.0% instead of 0.5% on a $200,000 balance over 30 years at a 7% return can leave you with roughly $200,000 less at retirement. Lowest fee is not automatically best — but a high fee needs to be justified by something, and consistently it usually is not.",
  },
  {
    q: "Are industry super funds better than retail funds?",
    a: "Not automatically, but the structure helps explain the historical pattern. Industry funds are profit-to-member, meaning profits flow back to members rather than to external shareholders, which has tended to support lower fees and strong long-term net returns. Retail funds are run to make a profit for their owners; some are genuinely competitive, while many legacy retail products have historically charged more. The honest answer is to ignore the label and compare the specific products: long-term net returns for the same risk profile, total fees, and the APRA performance test result. A good retail option can beat a mediocre industry option, and vice versa.",
  },
  {
    q: "What is the APRA performance test?",
    a: "It is an annual test run by the Australian Prudential Regulation Authority (APRA) that assesses MySuper and Trustee-Directed (choice) products against a benchmark built from their investment strategy. Products that fail must write to their members telling them they underperformed. A product that fails in two consecutive years is closed to new members until it passes again. You can check whether a product passed using the ATO YourSuper comparison tool. A pass is best understood as a minimum standard rather than a stamp of excellence — and because it is backward-looking, a recent pass does not guarantee strong future returns.",
  },
  {
    q: "Should I switch super funds?",
    a: "Switching can be worthwhile if your current fund charges high fees, has weak long-term net returns for its risk profile, or has failed the APRA performance test — but it is not a decision to make on the 1-year leaderboard alone. The single biggest trap is insurance: rolling money out of a fund cancels its insurance cover, and if you have a health condition you may not be able to get equivalent cover in the new fund. Before you switch, confirm the new fund's insurance is in place and check for any exit costs or defined-benefit components in the old fund. If you have several accounts, consolidating into one good, low-fee fund is often the bigger win. This is general information only — consider personal advice if the decision is significant.",
  },
];

// ── Page ──────────────────────────────────────────────────────────

export default function SuperCompareGuidePage() {
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Super", item: `${SITE_URL}/super` },
      { "@type": "ListItem", position: 3, name: "How to Compare Super Funds", item: `${SITE_URL}/super/compare-guide` },
    ],
  };
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <div className="bg-white min-h-screen">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/super" className="hover:text-white">Super</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">How to Compare Super Funds</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
              <span className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1 rounded-full">Net returns &amp; fees</span>
              <span className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">APRA performance test</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              How to compare super funds in Australia
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Choosing the right super fund can mean hundreds of thousands of dollars&apos; difference by the
              time you retire. The trick is to look past the headline return and compare the things that
              actually compound &mdash; long-term net returns, total fees, insurance, and the APRA
              performance test. Here&apos;s how to do it properly.
            </p>
          </div>
        </section>

        {/* ── Key stats ────────────────────────────────────────────────── */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "7–10 yr", l: "Returns to compare", sub: "Not the 1-year headline" },
                { v: "~$200k", l: "Cost of an extra 0.5% fee", sub: "On $200k over 30 years at 7%" },
                { v: "Annual", l: "APRA performance test", sub: "Repeated fails close a fund" },
                { v: "YourSuper", l: "ATO comparison tool", sub: "Standardised MySuper data" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-2xl font-extrabold text-slate-900">{s.v}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{s.l}</div>
                  <div className="text-xs text-slate-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Factors that matter ──────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">The factors that actually matter</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              A glossy 1-year return number tells you almost nothing. These are the six factors that
              genuinely separate a good super fund from a mediocre one. Weigh them together &mdash; no
              single one decides it.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm" aria-label="Super fund comparison factors">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Factor</th>
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide text-amber-300">What to look at</th>
                    <th scope="col" className="px-5 py-4 text-left font-bold text-xs uppercase tracking-wide">Why it matters</th>
                  </tr>
                </thead>
                <tbody>
                  {FACTORS.map((row, i) => (
                    <tr key={row.factor} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-5 py-3.5 text-slate-900 text-xs font-bold whitespace-nowrap">{row.factor}</td>
                      <td className="px-5 py-3.5 text-xs text-amber-800 font-semibold border-l border-amber-100">{row.detail}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 leading-relaxed border-l border-slate-100">{row.why}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Fees deep dive ───────────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Fees: the one cost you can predict</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              A fund cannot promise a return, but it can promise what it will charge. That makes fees the
              most reliable lever you control. What matters is the <strong className="text-slate-900">total
              fee as a percentage of your balance</strong> &mdash; add up every charge, then compare it
              against similar options at other funds.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {[
                { name: "Administration fee", body: "Often a flat dollar amount (e.g. a fixed weekly or annual fee) plus a small percentage of your balance. Flat fees hurt smaller balances proportionally more." },
                { name: "Investment fee", body: "A percentage of your balance charged for managing the option you choose. Actively managed and niche options usually cost more than index-based ones." },
                { name: "Buy/sell spread", body: "A small transaction cost applied when money moves in or out of an option, reflecting the cost of trading underlying assets. It bites most if you switch options often." },
                { name: "Switching / other fees", body: "Some funds charge a fee to switch investment options or for activities like family-law splits. Member-direct options add brokerage on top." },
              ].map((f) => (
                <div key={f.name} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-extrabold text-slate-900 mb-1.5">{f.name}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
              <p className="text-sm font-bold text-amber-900 mb-1">The compounding effect: why 0.5% is not small</p>
              <p className="text-sm text-amber-800 leading-relaxed">
                Take a $200,000 balance growing at 7% a year for 30 years. A fund charging 1.0% a year
                versus one charging 0.5% a year leaves you with roughly <strong>$200,000 less</strong> at
                retirement &mdash; not because of the half-percent itself, but because every dollar paid in
                fees is a dollar that never compounds for you again. Over decades, a small annual leak drains
                a large pool. This is why the fee comparison is worth more than the few minutes it takes.
              </p>
            </div>
          </div>
        </section>

        {/* ── Types of super fund ──────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Types of super fund</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              The ownership model behind a fund shapes its incentives, and historically its fees. Here are
              the main categories you will come across.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm" aria-label="Types of super fund">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th scope="col" className="px-4 py-4 text-left font-bold text-xs uppercase tracking-wide">Type</th>
                    <th scope="col" className="px-3 py-4 text-left font-bold text-xs uppercase tracking-wide text-amber-300">Model</th>
                    <th scope="col" className="px-3 py-4 text-left font-bold text-xs uppercase tracking-wide">Examples</th>
                    <th scope="col" className="px-4 py-4 text-left font-bold text-xs uppercase tracking-wide">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {FUND_TYPES.map((row, i) => (
                    <tr key={row.type} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-4 py-3.5 font-bold text-slate-900 text-xs whitespace-nowrap">{row.type}</td>
                      <td className="px-3 py-3.5 text-xs text-amber-800 font-semibold border-l border-amber-100">{row.model}</td>
                      <td className="px-3 py-3.5 text-xs text-slate-600 border-l border-slate-100">{row.examples}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 leading-relaxed border-l border-slate-100">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Fund names are listed as examples to illustrate each category and are not recommendations.
              Considering running your own fund? See the{" "}
              <Link href="/smsf" className="underline text-blue-700 hover:text-blue-800 font-semibold">SMSF hub</Link>.
            </p>
          </div>
        </section>

        {/* ── Investment options explained ─────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Investment options explained</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Within a single fund you usually choose how your money is invested. Understanding the levels
              of choice helps you compare like with like &mdash; and avoid paying for complexity you do not
              need.
            </p>
            <div className="space-y-4">
              {INVESTMENT_OPTIONS.map((o) => (
                <div key={o.name} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-extrabold text-slate-900 mb-1.5">{o.name}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{o.body}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 mt-6">
              <p className="text-sm text-blue-800 leading-relaxed">
                <strong>Compare like for like.</strong> A &quot;high growth&quot; option at one fund against a
                &quot;balanced&quot; option at another is a meaningless comparison &mdash; they carry different
                risk. Match balanced to balanced, growth to growth, before you read anything into the
                numbers.
              </p>
            </div>
          </div>
        </section>

        {/* ── APRA performance test ────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">The APRA performance test</h2>
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 mb-6">
              <p className="text-sm font-bold text-emerald-900 mb-1">An annual pass/fail benchmark</p>
              <p className="text-sm text-emerald-800 leading-relaxed">
                Each year the Australian Prudential Regulation Authority (APRA) tests MySuper and
                Trustee-Directed (choice) products against a benchmark built from their own investment
                strategy. The point is to catch products that charge too much or invest poorly relative to
                what they claim to do.
              </p>
            </div>
            <div className="space-y-3">
              {[
                {
                  title: "Funds that fail must tell their members",
                  body: "If a product fails the test, the trustee is legally required to write to affected members to tell them their fund underperformed. That letter is a clear, official red flag worth acting on.",
                },
                {
                  title: "Repeated failures close a fund to new members",
                  body: "A product that fails in two consecutive years is barred from accepting new members until it passes again. This is the regulator's mechanism for steering people away from persistently poor products.",
                },
                {
                  title: "How to check if your fund passed",
                  body: "The simplest way is the ATO YourSuper comparison tool (via myGov), which flags each MySuper product's most recent result alongside its fees and returns. APRA also publishes the full results. If you cannot find your specific option, the fund's own disclosures will state it.",
                },
                {
                  title: "A pass is a floor, not a ceiling",
                  body: "Passing means a product cleared a minimum standard — it does not mean it is the best available, and the test is backward-looking. Use it to rule out failures, then compare the passing funds on long-term net returns and fees.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-extrabold text-slate-900 mb-1.5">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Returns: how to compare properly ─────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Investment returns: how to compare properly</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Returns matter enormously &mdash; but only when you compare them correctly. Most return
              mistakes come from comparing the wrong things.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: "Compare like-for-like risk profiles", body: "A balanced option should only be compared with another balanced option. Comparing a growth option's return with a conservative one tells you about market conditions, not about the fund." },
                { title: "Use long-term returns", body: "Look at 7–10 year net returns, not 1 year. A single year is dominated by what markets did, not by how good the fund is. Long horizons reveal persistent skill and cost discipline." },
                { title: "Use net returns — after fees and tax", body: "The number that ends up in your account is the return after fees and after tax. Gross or pre-fee figures flatter expensive funds. Always compare net." },
                { title: "Lean on independent ratings", body: "Research houses such as SuperRatings and Chant West publish standardised return surveys and ratings for balanced and other options, which help you benchmark beyond a single fund's own marketing." },
              ].map((c) => (
                <div key={c.title} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="font-extrabold text-slate-900 mb-1.5">{c.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 mt-6">
              <p className="text-sm text-amber-800 leading-relaxed">
                <strong>Past performance is not a guarantee of future returns.</strong> A long, consistent
                track record is informative, but no fund can promise tomorrow&apos;s results. Treat returns as
                one input alongside fees and the performance test &mdash; not the whole decision.
              </p>
            </div>
          </div>
        </section>

        {/* ── Insurance comparison ─────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Comparing insurance inside super</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Most super funds include default insurance &mdash; life cover, total and permanent disability
              (TPD), and sometimes income protection. The premiums are deducted from your balance, so this
              is both a cost to compare and a benefit not to lose carelessly.
            </p>
            <div className="space-y-3">
              {[
                { title: "Default cover varies hugely", body: "The amount of default life and TPD cover, and how it changes with your age, differs enormously between funds. Two funds with similar fees can offer very different protection — read the insurance guide in each fund's documents." },
                { title: "Premiums are deducted from your balance", body: "Insurance premiums come out of your super, quietly reducing what compounds for retirement. Factor premiums into the total cost when you compare funds — cheap fees with expensive cover may not be the saving it looks like." },
                { title: "Opt-out and cancellation rules", body: "Cover can be cancelled if your account becomes inactive (no contributions for a period) or your balance is low, under government rules designed to stop super being eroded by unwanted insurance. You can also usually opt out, increase, or tailor cover." },
                { title: "Right cover, right price", body: "Check you are not paying for cover you do not need (e.g. duplicate cover across multiple funds) — and equally that you are not missing cover you do need. The cheapest insurance is worthless if it leaves a gap your family relies on." },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-extrabold text-slate-900 mb-1.5">{item.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mt-6">
              For a deeper look at cover types and how to right-size them, see the{" "}
              <Link href="/super/insurance" className="underline text-blue-700 hover:text-blue-800 font-semibold">insurance in super guide</Link>.
            </p>
          </div>
        </section>

        {/* ── Comparison tools ─────────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Using comparison tools</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              You do not have to compare funds from scratch. Several tools do the heavy lifting &mdash; each
              with its own strengths and blind spots. Start with the free, government-run option, then
              cross-check with independent research.
            </p>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm" aria-label="Super fund research tools">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th scope="col" className="px-4 py-4 text-left font-bold text-xs uppercase tracking-wide">Tool</th>
                    <th scope="col" className="px-3 py-4 text-left font-bold text-xs uppercase tracking-wide">Where</th>
                    <th scope="col" className="px-4 py-4 text-left font-bold text-xs uppercase tracking-wide text-emerald-300">What it shows</th>
                    <th scope="col" className="px-4 py-4 text-left font-bold text-xs uppercase tracking-wide text-amber-300">Limitations</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_TOOLS.map((row, i) => (
                    <tr key={row.tool} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-4 py-3.5 font-bold text-slate-900 text-xs whitespace-nowrap">{row.tool}</td>
                      <td className="px-3 py-3.5 text-xs text-slate-600 border-l border-slate-100">{row.where}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 leading-relaxed border-l border-emerald-100">{row.shows}</td>
                      <td className="px-4 py-3.5 text-xs text-amber-800 leading-relaxed border-l border-amber-100">{row.limits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 mt-6">
              <p className="text-sm font-bold text-blue-900 mb-1">Start with the ATO YourSuper tool</p>
              <p className="text-sm text-blue-800 leading-relaxed">
                Because it uses standardised APRA data and is free of commercial bias, the ATO YourSuper
                comparison tool is the natural first stop for comparing MySuper products on fees, net
                returns, and performance-test results. Use independent research houses afterwards to compare
                non-default options that YourSuper does not cover.
              </p>
            </div>
          </div>
        </section>

        {/* ── How to switch ────────────────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">How to switch funds</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Once you have decided on a better fund, switching is straightforward &mdash; with one critical
              check on insurance before you move any money.
            </p>
            <div className="space-y-3">
              {[
                { step: "1", title: "Choose your new fund", body: "Confirm your chosen fund and investment option using the comparison above — long-term net returns for your risk profile, total fees, and a passing performance test." },
                { step: "2", title: "Check insurance before you roll over", body: "This step comes before the rollover for a reason. Rolling money out cancels the old fund's insurance, and you may not be able to replace it — especially with a pre-existing condition. Confirm the new fund's cover is in place (and accepted) first." },
                { step: "3", title: "Complete the rollover", body: "You can usually request the rollover directly through your new fund (it will pull the balance across for you) or via myGov, which lets you transfer between funds online. The ATO and funds handle the transfer behind the scenes." },
                { step: "4", title: "Notify your employer (or rely on stapling)", body: "Give your employer the new fund's details so future contributions go to the right place. Under super 'stapling', your existing fund follows you to a new job automatically unless you choose otherwise — but it does not redirect an existing employer's contributions, so tell them when you switch." },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 bg-slate-50 rounded-xl border border-slate-200 p-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 text-white font-extrabold text-sm flex items-center justify-center">{s.step}</div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed mt-6">
              Got more than one fund? Combining them usually saves duplicate fees &mdash; see the{" "}
              <Link href="/super/consolidation" className="underline text-blue-700 hover:text-blue-800 font-semibold">consolidating super guide</Link>{" "}
              for the step-by-step, including the same insurance warning.
            </p>
          </div>
        </section>

        {/* ── Common mistakes ──────────────────────────────────────────── */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Common mistakes to avoid</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {MISTAKES.map((m) => (
                <div key={m.mistake} className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-0.5 text-rose-500 font-extrabold" aria-hidden>&times;</span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 mb-1">{m.mistake}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{m.fix}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Special considerations ───────────────────────────────────── */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Special considerations</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">
              Beyond the core comparison, a few options matter to particular members. If any of these apply
              to you, weight them in your decision.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: "Ethical / ESG options", body: "Most large funds now offer sustainable or socially responsible options that screen out (or tilt away from) industries such as fossil fuels, tobacco, or weapons. Returns and fees vary — and so do the screens, so read what 'ethical' actually means at that fund." },
                { title: "Low-fee index options", body: "Index-based options (for example, an indexed balanced option such as the one offered by Hostplus) keep costs very low by tracking markets rather than trying to beat them. For long-horizon members, the fee saving can outweigh the lack of active management." },
                { title: "Member-direct control", body: "Member-direct options let you pick individual shares and ETFs inside super — much of the control of an SMSF without the running costs, audit, and trustee duties. A practical middle ground if you want a hands-on slice of your balance." },
              ].map((c) => (
                <div key={c.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-extrabold text-slate-900 mb-1.5">{c.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQs ─────────────────────────────────────────────────────── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="group rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-bold text-slate-900 hover:bg-slate-50">
                    {item.q}
                    <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform text-lg leading-none" aria-hidden>&#9662;</span>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────────────────────────────── */}
        <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-white mb-1">Compare super funds side by side</h2>
              <p className="text-slate-500 text-sm">
                Put the factors from this guide to work &mdash; compare net returns, fees, and features
                across funds, then read the contributions and consolidation guides to make the most of the
                fund you choose.
              </p>
            </div>
            <div className="flex gap-3 shrink-0 flex-wrap">
              <Link
                href="/compare/super"
                className="px-5 py-3 bg-green-500 hover:bg-green-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
              >
                Compare Super Funds
              </Link>
              <Link
                href="/advisors/financial-planners"
                className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
              >
                Find a Financial Planner
              </Link>
            </div>
          </div>
        </section>

        {/* ── Related pages ────────────────────────────────────────────── */}
        <section className="py-8 bg-white border-t border-slate-100">
          <div className="container-custom max-w-4xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Related guides</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              {[
                { href: "/super", label: "Super hub" },
                { href: "/compare/super", label: "Compare super funds" },
                { href: "/super/consolidation", label: "Consolidate super" },
                { href: "/super/contributions", label: "Super contributions guide" },
                { href: "/super/insurance", label: "Insurance in super" },
                { href: "/smsf", label: "SMSF hub" },
              ].map((link) => (
                <Link key={link.href} href={link.href} className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                  {link.label} &rarr;
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Compliance disclaimer ─────────────────────────────────────── */}
        <section className="py-6 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">General advice warning</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                {GENERAL_ADVICE_WARNING} Super fund fees, returns, and APRA performance-test results change
                over time, and fund names are mentioned only as examples, not recommendations. This page is
                general information only; it is not financial advice. Choosing or switching a super fund is a
                personal decision &mdash; consider seeking advice from a licensed financial adviser, and
                always check insurance implications before rolling money between funds.
              </p>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
