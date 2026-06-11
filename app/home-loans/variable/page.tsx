/**
 * Variable Rate Home Loans Australia — comprehensive guide.
 *
 * Covers: what is a variable rate, RBA transmission, SVR vs basic vs packaged,
 * variable vs fixed comparison, offset accounts, redraw facility, extra
 * repayments, worked examples (Sarah owner-occupier, James investor), when
 * variable beats fixed, refinancing ease, and 6 FAQ accordions.
 *
 * Compliance: NCCP / AFSL — general information only, links to
 * /advisors/mortgage-brokers. No credit assistance.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  breadcrumbJsonLd,
  SITE_URL,
  CURRENT_YEAR,
  UPDATED_LABEL,
  absoluteUrl,
} from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

const PAGE_PATH = "/home-loans/variable";
const PAGE_TITLE = `Variable Rate Home Loans Australia (${CURRENT_YEAR}) — Complete Guide`;
const PAGE_DESC =
  "Everything Australian borrowers need to know about variable rate home loans: how the RBA cash rate affects your repayments, offset accounts, redraw, extra repayments, and when variable beats fixed. General information only.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: absoluteUrl(PAGE_PATH) },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: absoluteUrl(PAGE_PATH),
    type: "article",
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Variable Rate Home Loans")}&sub=${encodeURIComponent("RBA rates · Offset · Redraw · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image", title: PAGE_TITLE, description: PAGE_DESC },
};

// ─── FAQ data ────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "What is a variable rate home loan?",
    a: "A variable rate home loan has an interest rate that can move up or down over the life of the loan. The rate is set by the lender — typically benchmarked against the RBA cash rate — and can change at any time. When the RBA raises rates, most lenders pass on the increase within days; when it cuts, they usually (but not always) pass on some or all of the reduction. Variable loans are the most common home loan type in Australia and typically offer features like offset accounts, redraw facilities, and unlimited extra repayments.",
  },
  {
    q: "How does the RBA cash rate affect my variable rate?",
    a: "The Reserve Bank of Australia sets the cash rate — the overnight interest rate at which banks lend to each other. When the RBA changes the cash rate, lenders adjust their variable home loan rates, though the pass-through is not always 1-for-1. Lenders factor in their funding costs, competition, and margins. Over 2022–2023 the RBA raised the cash rate by 4.25% and most lenders passed on the full increases; subsequent cuts in 2024–2025 were passed on at varying levels. Your actual rate is the lender's standard variable rate (SVR) minus any discount negotiated at origination.",
  },
  {
    q: "What is the difference between a standard variable rate and a basic variable rate?",
    a: "A standard variable rate (SVR) loan — also called a full-featured variable — typically includes an offset account, unlimited extra repayments, a redraw facility, and portability. A basic variable rate loan strips back the features (often no offset account, sometimes limited extra repayments) in exchange for a lower interest rate, usually 0.10–0.40% p.a. lower than the SVR. If you plan to use an offset account or make frequent extra repayments, the interest savings often more than cover the rate premium on an SVR. If you just want a set-and-forget loan, a basic variable can save money.",
  },
  {
    q: "Can I make extra repayments on a variable rate home loan?",
    a: "Yes — unlike fixed rate loans, most variable rate loans allow unlimited extra repayments with no break costs or fees. Making extra repayments reduces your principal balance faster, which in turn reduces the interest charged each month (since interest is calculated on the outstanding balance). Over a 30-year loan at 6.5% p.a., paying an extra $1,000 per month on a $500,000 loan can reduce the loan term by approximately 7 years and save around $140,000 in interest. Redraw facilities let you access those extra repayments if you need the funds later.",
  },
  {
    q: "Is an offset account worth the higher rate?",
    a: "For most owner-occupiers with meaningful savings, yes. An offset account reduces the daily balance on which interest is charged — dollar for dollar. On a $500,000 loan at 6.50% p.a., keeping $50,000 in an offset account saves approximately $3,250 per year in interest (6.50% × $50,000). The typical rate premium for an SVR with offset over a basic variable is 0.10–0.30% p.a., which on a $500,000 loan is $500–$1,500 per year. If your offset balance consistently exceeds the break-even point, the offset is worthwhile. Investors should also note that offset accounts preserve loan deductibility in a way that redraw does not.",
  },
  {
    q: "Are there break costs on a variable rate home loan?",
    a: "Generally no. Variable rate home loans do not carry break costs when you refinance, sell your property, or pay off the loan early. This is one of the key advantages over fixed rate loans, which typically charge substantial break costs (sometimes tens of thousands of dollars) if you exit during the fixed term. Some lenders charge a small discharge fee ($150–$500) when closing a variable rate loan, but this is administrative, not a penalty for breaking a rate lock.",
  },
];

// ─── Comparison table data ────────────────────────────────────────────────────

const COMPARISON_ROWS = [
  {
    feature: "Rate flexibility",
    variable: "Rate moves with market — can fall when RBA cuts",
    fixed: "Locked for 1–5 years regardless of rate movements",
  },
  {
    feature: "Repayment certainty",
    variable: "Repayments change when rate changes",
    fixed: "Repayments stay the same for the fixed term",
  },
  {
    feature: "Break costs",
    variable: "None — exit any time",
    fixed: "Can be substantial (thousands to tens of thousands)",
  },
  {
    feature: "Offset account",
    variable: "Available on SVR and packaged variable loans",
    fixed: "Rarely available; some lenders offer 100% offset on fixed (check terms)",
  },
  {
    feature: "Extra repayments",
    variable: "Unlimited on most variable loans",
    fixed: "Usually capped at $10,000–$20,000/year; excess attracts fees",
  },
  {
    feature: "Redraw facility",
    variable: "Available on most variable loans",
    fixed: "Not typically available during fixed term",
  },
  {
    feature: "Refinancing ease",
    variable: "Simple — no rate lock to break",
    fixed: "Complex and expensive if rates have moved against you",
  },
];

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Home Loans", url: absoluteUrl("/home-loans") },
  { name: "Variable Rate", url: absoluteUrl(PAGE_PATH) },
]);

// ─── FAQ JSON-LD ──────────────────────────────────────────────────────────────

const faqLd = faqJsonLd(FAQ_ITEMS);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VariableRateHomeLoanPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <main className="bg-white text-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">

          {/* ── Breadcrumb ───────────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-800">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/home-loans" className="hover:text-slate-800">Home Loans</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Variable Rate</span>
          </nav>

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-3">
              Variable Rate Home Loans &middot; {UPDATED_LABEL}
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
              Variable rate home loans in Australia
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              The most flexible home loan type in Australia — rates that move with the market,
              unlimited extra repayments, offset accounts, and no break costs when you
              refinance. Here is everything you need to know before choosing variable.
            </p>

            {/* Quick stat strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {[
                { value: "~66%", label: "of AU home loans are variable" },
                { value: "No", label: "break costs to refinance" },
                { value: "100%", label: "offset available on SVR" },
                { value: "Unlimited", label: "extra repayments allowed" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center"
                >
                  <div className="text-lg font-extrabold text-blue-700">{s.value}</div>
                  <div className="text-[0.65rem] text-slate-600 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </header>

          {/* ── 1. What is a variable rate? ──────────────────────────────── */}
          <section className="mb-10" id="what-is-variable-rate">
            <h2 className="text-2xl font-bold mb-3">What is a variable interest rate?</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              A <strong>variable rate home loan</strong> carries an interest rate that is not
              locked in — it can increase or decrease over the life of the loan at the
              lender&apos;s discretion. In Australia, variable rates move primarily in
              response to changes in the <strong>RBA cash rate</strong>, though lenders
              also factor in their own funding costs, competitive pressure, and profit
              margins.
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              When the Reserve Bank of Australia (RBA) raises the cash rate, lenders
              typically pass the increase on to variable borrowers within 30 days
              (often much sooner). When the RBA cuts, lenders usually (but not always)
              reduce their variable rates — sometimes by less than the full cut. Your
              monthly repayment changes accordingly.
            </p>

            <h3 className="text-lg font-bold mb-2 mt-6">
              How the RBA cash rate transmits to your mortgage
            </h3>
            <p className="text-slate-700 leading-relaxed mb-3">
              The transmission mechanism works in three steps:
            </p>
            <ol className="list-decimal pl-6 space-y-2 text-slate-700 mb-4">
              <li>
                <strong>RBA sets the overnight cash rate</strong> — the rate at which
                banks borrow from each other overnight.
              </li>
              <li>
                <strong>Banks&apos; funding costs shift</strong> — both short-term wholesale
                funding and deposit rates adjust, raising or lowering the cost of capital
                for the lender.
              </li>
              <li>
                <strong>Lender adjusts its Standard Variable Rate (SVR)</strong> — the
                reference rate on which your discounted variable rate is based. Your actual
                rate is SVR minus your negotiated discount (often 1.5–2.5% below SVR for
                well-qualified borrowers).
              </li>
            </ol>
            <p className="text-slate-700 leading-relaxed">
              The gap between the RBA cash rate and the average mortgage rate has widened
              over time as lenders have increased margins. As of {CURRENT_YEAR}, the typical
              owner-occupier variable rate sits 2.5–3.5% above the RBA cash rate.
            </p>
          </section>

          {/* ── 2. Variable rate types ───────────────────────────────────── */}
          <section className="mb-10" id="variable-rate-types">
            <h2 className="text-2xl font-bold mb-3">Types of variable rate home loans</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Not all variable loans are the same. Australian lenders offer three main
              variable rate structures, each with a different feature-to-rate trade-off.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              {[
                {
                  type: "Standard Variable (SVR)",
                  rate: "Higher rate",
                  features: [
                    "100% offset account",
                    "Unlimited extra repayments",
                    "Redraw facility",
                    "Loan portability",
                    "Repayment holidays (on approval)",
                  ],
                  best: "Owner-occupiers with savings to park in offset; investors preserving deductibility.",
                },
                {
                  type: "Basic Variable",
                  rate: "Lowest rate (0.10–0.40% less)",
                  features: [
                    "No offset account",
                    "Extra repayments (sometimes capped)",
                    "Redraw (sometimes)",
                    "Minimal ongoing fees",
                  ],
                  best: "Borrowers who want a low-cost loan and won't use an offset account.",
                },
                {
                  type: "Packaged Variable",
                  rate: "Discounted SVR with annual fee ($395)",
                  features: [
                    "100% offset account",
                    "Unlimited extra repayments",
                    "Redraw facility",
                    "Discounted insurance or credit card",
                    "Rate discount for high LVR borrowers",
                  ],
                  best: "Borrowers who qualify for package discounts that outweigh the annual fee.",
                },
              ].map((t) => (
                <div
                  key={t.type}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50"
                >
                  <p className="font-bold text-slate-900 text-sm mb-1">{t.type}</p>
                  <p className="text-xs text-blue-700 font-semibold mb-3">{t.rate}</p>
                  <ul className="text-xs text-slate-600 space-y-1 mb-3">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5">
                        <span className="text-blue-500 mt-0.5">&#10003;</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[0.65rem] text-slate-500 italic">{t.best}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── 3. Variable vs fixed comparison table ───────────────────── */}
          <section className="mb-10" id="variable-vs-fixed">
            <h2 className="text-2xl font-bold mb-3">Variable vs fixed rate: head-to-head</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              The fundamental trade-off is flexibility (variable) versus certainty (fixed).
              Neither is universally better — the right choice depends on your outlook
              on interest rates, how long you plan to hold the loan, and whether you
              need features like offset accounts.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
              <table aria-label="Variable rate vs fixed rate home loan comparison" className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left p-3 font-bold text-slate-700 w-1/3">Feature</th>
                    <th scope="col" className="text-left p-3 font-bold text-blue-700">Variable rate</th>
                    <th scope="col" className="text-left p-3 font-bold text-slate-700">Fixed rate</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="p-3 font-semibold text-slate-700 text-xs">{row.feature}</td>
                      <td className="p-3 text-xs text-slate-600">{row.variable}</td>
                      <td className="p-3 text-xs text-slate-600">{row.fixed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 italic">
              General information only — individual loan terms vary by lender. Verify
              features with your lender before choosing.
            </p>
          </section>

          {/* ── 4. Offset accounts ──────────────────────────────────────── */}
          <section className="mb-10" id="offset-accounts">
            <h2 className="text-2xl font-bold mb-3">Offset accounts explained</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              An <strong>offset account</strong> is a transaction account linked directly
              to your home loan. The balance in the offset account is subtracted from your
              loan balance before interest is calculated each day — dollar for dollar.
              You still technically owe the full loan amount, but you only pay interest
              on the <em>net</em> balance.
            </p>

            {/* Worked example box */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-5">
              <p className="text-sm font-bold text-blue-900 mb-2">Worked example: $500K loan, $50K offset</p>
              <div className="grid sm:grid-cols-2 gap-4 text-sm text-slate-700">
                <div>
                  <p className="font-semibold mb-1 text-slate-800">Without offset:</p>
                  <ul className="text-xs space-y-1">
                    <li>Loan balance: $500,000</li>
                    <li>Rate: 6.50% p.a.</li>
                    <li>Daily interest: $500,000 &times; 6.50% &divide; 365 = <strong>$89.04</strong></li>
                    <li>Annual interest: ~$32,500</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-1 text-slate-800">With $50K in offset:</p>
                  <ul className="text-xs space-y-1">
                    <li>Effective balance: $500,000 &minus; $50,000 = $450,000</li>
                    <li>Rate: 6.50% p.a.</li>
                    <li>Daily interest: $450,000 &times; 6.50% &divide; 365 = <strong>$80.14</strong></li>
                    <li>Annual interest: ~$29,250 — saving $3,250/year</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 italic">
                Example uses round numbers for illustration. Your actual interest savings
                depend on your loan balance, rate, and average offset balance.
              </p>
            </div>

            <h3 className="text-lg font-bold mb-2">Key offset account rules</h3>
            <ul className="list-disc pl-6 space-y-2 text-slate-700 text-sm mb-4">
              <li>
                <strong>100% vs partial offset:</strong> Most modern variable loans offer
                a 100% offset — every dollar offsets your loan. Some older loans offer
                a 40% offset (less common today).
              </li>
              <li>
                <strong>Multiple offset accounts:</strong> Some lenders allow multiple
                offset accounts linked to the one loan — useful for separating savings
                goals while all balances offset the loan.
              </li>
              <li>
                <strong>Investment loans and deductibility:</strong> Keeping funds in an
                offset account (rather than redrawing) preserves the deductibility of the
                loan. See the redraw section below for why this matters to investors.
              </li>
              <li>
                <strong>No tax on offset savings:</strong> Unlike a high-interest savings
                account where earned interest is assessable income, the benefit from an
                offset account is a reduction in interest expense — not assessable income.
                This can be tax-efficient, particularly for high-income earners.
              </li>
            </ul>
          </section>

          {/* ── 5. Redraw facility ──────────────────────────────────────── */}
          <section className="mb-10" id="redraw-facility">
            <h2 className="text-2xl font-bold mb-3">Redraw facility: how it works</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              A <strong>redraw facility</strong> allows you to access the extra repayments
              you have made above your minimum scheduled repayment. If you have paid
              $30,000 ahead of schedule, your redraw balance is $30,000 — and you can
              withdraw those funds (subject to the lender&apos;s minimum redraw amount,
              typically $500–$1,000).
            </p>
            <p className="text-slate-700 leading-relaxed mb-4">
              Redraw is similar to an offset account in that both reduce interest in the
              short term, but they are <em>structurally different</em> — particularly for
              investors.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5">
              <p className="text-sm font-bold text-amber-900 mb-2">
                Tax implication: redraw on investment loans
              </p>
              <p className="text-sm text-slate-700 leading-relaxed mb-2">
                When you redraw funds from an investment loan and use them for a
                non-investment (private) purpose — such as a holiday or a car — the
                ATO may treat the redrawn amount as a new loan used for a private
                purpose. This can <strong>reduce or eliminate the deductibility</strong>
                of interest on that portion of the loan going forward.
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">
                By contrast, funds held in an <strong>offset account</strong> remain
                legally separate from the loan — they do not affect the loan&apos;s
                purpose and therefore do not affect deductibility when withdrawn.
                This is why most property investors are advised to use an offset
                account rather than relying on redraw.
              </p>
              <p className="text-xs text-slate-500 mt-3 italic">
                General information only — the tax treatment of loan deductibility
                depends on individual circumstances. See a qualified accountant or
                tax adviser.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-xl p-4">
                <p className="font-bold text-sm text-slate-900 mb-2">Redraw</p>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li>&#8226; Access extra repayments made to the loan</li>
                  <li>&#8226; Funds are inside the loan account</li>
                  <li>&#8226; Reduces loan balance (good for interest)</li>
                  <li>&#8226; Redraw for private use on investment loan can affect deductibility</li>
                  <li>&#8226; Usually free to redraw (some lenders charge $50–$100)</li>
                  <li>&#8226; Lender can restrict access in hardship situations</li>
                </ul>
              </div>
              <div className="border border-blue-200 bg-blue-50 rounded-xl p-4">
                <p className="font-bold text-sm text-blue-900 mb-2">Offset account</p>
                <ul className="text-xs text-slate-600 space-y-1.5">
                  <li>&#8226; Separate transaction account linked to loan</li>
                  <li>&#8226; Funds sit outside the loan account</li>
                  <li>&#8226; Reduces interest calculated (same effect)</li>
                  <li>&#8226; Withdrawals do not affect loan deductibility</li>
                  <li>&#8226; Instant ATM/card access — works like a bank account</li>
                  <li>&#8226; Government deposit guarantee applies ($250K per ADI)</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ── 6. Extra repayments ──────────────────────────────────────── */}
          <section className="mb-10" id="extra-repayments">
            <h2 className="text-2xl font-bold mb-3">Extra repayments: the long-term saving</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Variable rate home loans allow unlimited extra repayments with no fees or
              penalties. Every dollar above your minimum repayment reduces the principal
              on which interest is calculated — compounding the benefit over time.
            </p>

            {/* Worked example */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-5">
              <p className="text-sm font-bold text-emerald-900 mb-3">
                Worked example: $500K at 6.5% — $1,000/month extra repayment
              </p>
              <div className="grid sm:grid-cols-3 gap-3 text-center">
                {[
                  { label: "Standard loan term", value: "30 years", sub: "No extra repayments" },
                  { label: "Loan term with +$1K/mo", value: "~23 years", sub: "7 years early" },
                  { label: "Interest saved", value: "~$140,000", sub: "Total interest reduction" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-lg border border-emerald-100 p-3">
                    <div className="text-xl font-extrabold text-emerald-700">{s.value}</div>
                    <div className="text-xs font-semibold text-slate-700 mt-0.5">{s.label}</div>
                    <div className="text-[0.65rem] text-slate-500">{s.sub}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-3 italic">
                Illustrative only. Assumes constant 6.5% p.a., P&amp;I, 30-year term on
                $500,000. Actual results depend on rate changes over the loan life.
              </p>
            </div>

            <p className="text-slate-700 leading-relaxed mb-3">
              Even small additional payments make a meaningful difference over decades.
              An extra $200 per month on a $500,000 loan at 6.50% p.a. reduces the loan
              term by approximately 3 years and saves around $50,000 in interest. The
              benefit is amplified when rates are high, because more of each repayment
              is going to interest rather than principal under a standard schedule.
            </p>
            <p className="text-slate-700 leading-relaxed">
              Variable rate borrowers can also use a <strong>repayment buffer</strong>
              strategy: pay more than required during normal times, then access that
              buffer (via redraw) if cash flow tightens — for example, during a career
              break or home renovation period.
            </p>
          </section>

          {/* ── 7. When variable beats fixed ─────────────────────────────── */}
          <section className="mb-10" id="when-variable-wins">
            <h2 className="text-2xl font-bold mb-3">When variable beats fixed</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Variable rate loans tend to outperform fixed in specific circumstances.
              Consider variable if:
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {[
                {
                  heading: "Rates are falling or expected to fall",
                  body: "In a rate-cutting cycle (RBA reducing the cash rate), variable borrowers benefit immediately. Fixed borrowers are locked at the higher rate for the term — often missing 1–2% of cuts.",
                },
                {
                  heading: "You plan to sell or refinance soon",
                  body: "If you expect to sell the property within 1–2 years or refinance to a better deal, the absence of break costs on a variable loan is a major advantage. Fixed break costs can exceed $20,000–$30,000.",
                },
                {
                  heading: "You have substantial savings for offset",
                  body: "An offset account working at full capacity can make a variable rate competitive even against a lower fixed rate. A $100K offset on a $600K loan at 6.50% saves $6,500/year in interest.",
                },
                {
                  heading: "You want to make large extra repayments",
                  body: "Variable loans allow unlimited extra repayments. If you receive a bonus, inheritance, or plan to pay down debt aggressively, variable is the only loan type that lets you do this without penalty.",
                },
                {
                  heading: "You have an investment property",
                  body: "Most property investors prefer variable loans for the flexibility (extra repayments, offset, easier refinancing between fixed/IO periods). The deductibility of interest is the same for variable as fixed.",
                },
                {
                  heading: "You prioritise flexibility over certainty",
                  body: "Life events — job changes, relationship changes, upsizing, downsizing — are harder to accommodate with a fixed loan. Variable keeps your options open.",
                },
              ].map((s) => (
                <div
                  key={s.heading}
                  className="border border-slate-200 rounded-xl p-4"
                >
                  <p className="font-semibold text-sm text-slate-900 mb-1.5">{s.heading}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500 italic">
              General information only. The right loan type depends on your personal
              circumstances, risk tolerance, and interest rate outlook.
            </p>
          </section>

          {/* ── 8. Worked examples ───────────────────────────────────────── */}
          <section className="mb-10" id="worked-examples">
            <h2 className="text-2xl font-bold mb-3">Worked examples</h2>

            {/* Sarah */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Example 1 — Owner-occupier
              </p>
              <p className="text-lg font-bold text-slate-900 mb-3">
                Sarah: $650,000 loan, SVR with offset
              </p>
              <div className="grid sm:grid-cols-2 gap-5 text-sm text-slate-700">
                <div>
                  <p className="font-semibold text-slate-800 mb-2">Situation:</p>
                  <ul className="space-y-1 text-xs">
                    <li>&#8226; Loan: $650,000, 30-year P&amp;I</li>
                    <li>&#8226; Variable SVR: 6.40% p.a. (after discount)</li>
                    <li>&#8226; Offset account balance: $80,000 (average over loan life)</li>
                    <li>&#8226; Household income: $180,000 combined</li>
                    <li>&#8226; Plan: owner-occupier, expect to stay 10+ years</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-2">Outcome with offset:</p>
                  <ul className="space-y-1 text-xs">
                    <li>&#8226; Effective loan balance: $650,000 &minus; $80,000 = $570,000</li>
                    <li>&#8226; Interest saving vs no offset: 6.40% &times; $80,000 = <strong>$5,120/year</strong></li>
                    <li>&#8226; Over 30 years (with offset growing): approx. <strong>$85,000 total saving</strong></li>
                    <li>&#8226; Tax-free benefit (not assessable income)</li>
                    <li>&#8226; Access to funds via offset card for emergencies</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic mt-4">
                Illustrative only. Assumes average $80K offset balance throughout; actual
                savings depend on balance fluctuations, rate changes, and loan term.
              </p>
            </div>

            {/* James */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Example 2 — Investor
              </p>
              <p className="text-lg font-bold text-slate-900 mb-3">
                James: variable IO for investment property
              </p>
              <div className="grid sm:grid-cols-2 gap-5 text-sm text-slate-700">
                <div>
                  <p className="font-semibold text-slate-800 mb-2">Situation:</p>
                  <ul className="space-y-1 text-xs">
                    <li>&#8226; Investment property loan: $550,000</li>
                    <li>&#8226; Variable interest-only (IO) rate: 6.80% p.a.</li>
                    <li>&#8226; IO period: 5 years</li>
                    <li>&#8226; Offset account: $60,000 (salary credited, expenses debited)</li>
                    <li>&#8226; Personal income: $120,000/year; marginal tax rate 37%</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-slate-800 mb-2">Variable loan advantages:</p>
                  <ul className="space-y-1 text-xs">
                    <li>&#8226; Offset reduces interest but preserves full loan deductibility</li>
                    <li>&#8226; $60K offset saves: 6.80% &times; $60,000 = $4,080/year interest</li>
                    <li>&#8226; No break cost to refinance at IO period end</li>
                    <li>&#8226; Can switch to P&amp;I variable or fix part of loan when IO expires</li>
                    <li>&#8226; Flexibility to sell or refinance without penalty</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic mt-4">
                General information only. Tax deductibility depends on individual
                circumstances — see a qualified tax adviser. Rates are illustrative.
              </p>
            </div>
          </section>

          {/* ── 9. Refinancing ease ──────────────────────────────────────── */}
          <section className="mb-10" id="refinancing">
            <h2 className="text-2xl font-bold mb-3">Refinancing a variable rate loan</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              One of the most underappreciated advantages of variable rate loans is how
              easy — and inexpensive — they are to refinance. Because there is no
              rate lock in place, you can switch lenders (or renegotiate with your
              current lender) at virtually any time without paying a break cost.
            </p>

            <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
              <table aria-label="Refinancing costs: variable loan vs fixed loan mid-term" className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left p-3 font-bold text-slate-700">Cost item</th>
                    <th scope="col" className="text-left p-3 font-bold text-blue-700">Variable refinance</th>
                    <th scope="col" className="text-left p-3 font-bold text-slate-700">Fixed refinance (mid-term)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { item: "Break cost", variable: "$0", fixed: "$5,000 – $50,000+" },
                    { item: "Discharge fee", variable: "$150 – $500", fixed: "$150 – $500" },
                    { item: "New lender application fee", variable: "$0 – $600", fixed: "$0 – $600" },
                    { item: "Government fees (mortgage registration)", variable: "$100 – $350", fixed: "$100 – $350" },
                    { item: "Lender&apos;s mortgage insurance (if LVR > 80%)", variable: "May apply", fixed: "May apply" },
                    { item: "Timing restrictions", variable: "None", fixed: "Must wait until end of fixed term (or pay break cost)" },
                  ].map((row, i) => (
                    <tr
                      key={row.item}
                      className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="p-3 text-xs font-medium text-slate-700">{row.item}</td>
                      <td className="p-3 text-xs text-blue-700 font-semibold">{row.variable}</td>
                      <td className="p-3 text-xs text-slate-600">{row.fixed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-slate-700 leading-relaxed mb-3">
              The practical implication: if you took out a fixed loan at 5.50% in 2022
              and rates subsequently fell to 5.00%, your effective &quot;saving&quot; from
              switching needs to exceed the break cost — which is calculated based on
              the difference between your fixed rate and current wholesale rates, multiplied
              by the outstanding balance and remaining term. On a $600,000 loan with
              2 years remaining, a break cost of $20,000–$40,000 is not unusual.
            </p>
            <p className="text-slate-700 leading-relaxed">
              Variable borrowers face no such barrier. The ongoing incentive to shop
              around and refinance is one reason lenders offer their best rates as
              introductory discounts — they compete for the refinancing market constantly.
            </p>
          </section>

          {/* ── 10. Find a mortgage broker ───────────────────────────────── */}
          <section className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-10">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">
              NCCP — credit assistance
            </p>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Talk to a licensed mortgage broker
            </h2>
            <p className="text-slate-700 text-sm mb-4 leading-relaxed">
              Choosing between variable, fixed, or split; structuring an offset account;
              or comparing lenders requires credit assistance from a licensed professional
              under the National Consumer Credit Protection Act (NCCP). This guide
              provides general information only — it is not credit advice.
            </p>
            <p className="text-slate-700 text-sm mb-4 leading-relaxed">
              A licensed mortgage broker can compare dozens of lenders, negotiate your
              rate, and manage the application — at no cost to you (brokers are paid
              by the lender). Under the Best Interests Duty (since 2021), brokers are
              legally required to recommend the loan most suited to your circumstances.
            </p>
            <Link
              href="/advisors/mortgage-brokers"
              className="inline-block px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-lg text-sm"
            >
              Find a mortgage broker near you &rarr;
            </Link>
          </section>

          {/* ── 11. FAQ accordions ───────────────────────────────────────── */}
          <section className="mb-10" id="faq">
            <h2 className="text-2xl font-bold mb-5">Common questions about variable rate home loans</h2>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {FAQ_ITEMS.map((item) => (
                <details key={item.q} className="group bg-white">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-semibold text-sm text-slate-900 hover:bg-slate-50 transition-colors">
                    <span>{item.q}</span>
                    <span
                      className="text-slate-500 shrink-0 group-open:rotate-180 transition-transform"
                      aria-hidden="true"
                    >
                      &#9660;
                    </span>
                  </summary>
                  <div className="px-5 pb-4 pt-1 text-sm text-slate-600 leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* ── 12. Related guides ───────────────────────────────────────── */}
          <section className="mb-10">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Related guides
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { href: "/home-loans", label: "Home loans overview" },
                { href: "/home-loans/fixed", label: "Fixed rate home loans" },
                { href: "/mortgage-calculator", label: "Mortgage repayment calculator" },
                { href: "/advisor-guides/mortgage-broker-vs-bank", label: "Mortgage broker vs bank" },
                { href: "/advisors/mortgage-brokers", label: "Find a mortgage broker" },
                { href: "/tools/mortgage-stress-test", label: "Mortgage stress test" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs bg-white border border-slate-200 px-3 py-2 rounded-lg hover:border-blue-300 text-slate-700 transition-colors"
                >
                  {link.label} &rarr;
                </Link>
              ))}
            </div>
          </section>

          {/* ── Compliance footer ────────────────────────────────────────── */}
          <footer className="text-xs text-slate-500 leading-relaxed border-t border-slate-200 pt-6">
            <p className="mb-2">{GENERAL_ADVICE_WARNING}</p>
            <p>
              This page covers variable rate home loans in Australia and does not
              constitute credit assistance under the National Consumer Credit
              Protection Act 2009 (NCCP). For personalised mortgage advice, speak
              to a licensed mortgage broker or credit adviser.{" "}
              <Link
                href="/advisors/mortgage-brokers"
                className="underline hover:text-slate-700"
              >
                Find a licensed mortgage broker
              </Link>
              .
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
