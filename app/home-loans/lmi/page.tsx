import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Lenders Mortgage Insurance (LMI) Explained Australia (${CURRENT_YEAR}) | invest.com.au`,
  description: `What LMI is, how much it costs by LVR, and how to avoid it: 20% deposit, guarantor loans, the First Home Guarantee, and professional waivers. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Lenders Mortgage Insurance (LMI) Explained Australia (${CURRENT_YEAR})`,
    description:
      "LMI protects the lender, not you. Cost tables by LVR and loan size, ways to avoid LMI, the capitalisation trap, and why LMI is not portable when you refinance.",
    url: `${SITE_URL}/home-loans/lmi`,
    images: [{ url: `/api/og?title=Lenders+Mortgage+Insurance+LMI+Explained`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/home-loans/lmi` },
};

/* ─── Hero key facts ─────────────────────────────────────────── */
const HERO_STATS = [
  { label: "Triggered when", value: "LVR above 80%", sub: "Deposit below 20%" },
  { label: "Typical cost", value: "1–4% of the loan", sub: "Rises steeply with LVR" },
  { label: "Protects", value: "The lender", sub: "NOT the borrower" },
  { label: "Frequency", value: "One-off", sub: "Paid at settlement or capitalised" },
];

/* ─── Cost grid: approximate premiums by loan amount and LVR ──── */
const COST_COLUMNS = ["$500,000 loan", "$700,000 loan", "$900,000 loan"];
const COST_ROWS = [
  { lvr: "80% LVR", note: "At the threshold — no LMI", cells: ["$0", "$0", "$0"], free: true },
  { lvr: "85% LVR", note: "Lower premium tier", cells: ["~$5,000–$8,000", "~$8,000–$12,000", "~$11,000–$16,000"], free: false },
  { lvr: "90% LVR", note: "Common first-home-buyer entry point", cells: ["~$11,000–$16,000", "~$17,000–$24,000", "~$23,000–$32,000"], free: false },
  { lvr: "95% LVR", note: "Highest premium, fewer lenders", cells: ["~$16,000–$22,000", "~$24,000–$33,000", "~$33,000–$45,000"], free: false },
];

/* ─── LVR tiers showing the non-linear jump ──────────────────── */
const LVR_TIERS = [
  { range: "Up to 80%", premium: "No LMI payable", emphasis: "good" },
  { range: "80.01% – 85%", premium: "Lowest LMI tier", emphasis: "warn" },
  { range: "85.01% – 88%", premium: "Moderate jump", emphasis: "warn" },
  { range: "88.01% – 90%", premium: "Noticeable step up from the 88% tier", emphasis: "warn" },
  { range: "90.01% – 95%", premium: "Highest tier — premium can double versus 90%", emphasis: "bad" },
];

/* ─── Ways to avoid or remove LMI ────────────────────────────── */
const AVOID_STRATEGIES = [
  {
    title: "Save a 20% deposit",
    tag: "The standard route",
    desc: "Borrowing at 80% LVR or below removes LMI entirely. On a $600,000 property a 20% deposit is $120,000. It takes longer to save, but it eliminates the premium and widens the range of lenders willing to deal with you.",
  },
  {
    title: "Family guarantor loan",
    tag: "Uses a relative's equity",
    desc: "A parent or close relative offers equity in their own property as additional security. This lifts your effective security above the 80% line so LMI can be avoided, sometimes with a very small deposit. The guarantor takes on real financial risk and should obtain independent legal advice before agreeing.",
  },
  {
    title: "First Home Guarantee",
    tag: "Government-backed, 5% deposit",
    desc: "Under the First Home Guarantee the government guarantees the portion of the loan above 80%, so eligible first home buyers can purchase with as little as a 5% deposit and pay no LMI. Places are limited each year and income and property-price caps apply by location.",
    href: "/first-home-buyer/first-home-guarantee",
    hrefLabel: "Read the First Home Guarantee guide",
  },
  {
    title: "Professional LMI waiver",
    tag: "For some high-income professions",
    desc: "Some lenders waive LMI at up to 85–90% LVR for certain professions — commonly doctors, dentists, lawyers, and accountants — where the borrower is actively earning income in that field. Criteria differ markedly between lenders, and not every applicant in these professions qualifies.",
  },
  {
    title: "LMI-free or reduced products",
    tag: "Lender-specific offers",
    desc: "A handful of lenders periodically offer LMI-free or reduced-LMI products for specific borrower segments — for example, certain first-home-buyer promotions or low-deposit products with the cost built into the rate instead. These come and go and the trade-offs vary, so the fine print matters.",
  },
];

/* ─── LMI providers ──────────────────────────────────────────── */
const PROVIDERS = [
  {
    name: "Helia",
    detail: "Formerly Genworth, and one of the two dominant LMI insurers in Australia. Many major banks place at least some of their high-LVR lending with Helia.",
  },
  {
    name: "QBE LMI",
    detail: "The other major LMI insurer in the Australian market. Some lenders use QBE exclusively, others use both insurers and place each loan with whichever returns the better premium.",
  },
];

/* ─── Worked example: buy now vs wait ────────────────────────── */
const WORKED_EXAMPLE = [
  {
    label: "Buyer A — waits for a 20% deposit",
    points: [
      "Saves an extra two years to reach a 20% deposit ($160,000 on an $800,000 property).",
      "Pays $0 in LMI because the loan settles at 80% LVR.",
      "Pays roughly two more years of rent while saving — a real, ongoing cost.",
      "Risk: if property prices rise over those two years, the same home costs more and the 20% target moves with it.",
    ],
  },
  {
    label: "Buyer B — buys now at 90% LVR",
    points: [
      "Buys today with a 10% deposit ($80,000) on the same $800,000 property — a $720,000 loan.",
      "Pays approximately $20,000–$30,000 in LMI (often capitalised into the loan).",
      "Stops paying rent and starts building equity immediately.",
      "Risk: a higher LVR can come with a higher interest rate, and a price fall would leave less equity buffer.",
    ],
  },
];

/* ─── FAQ ────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: "What is Lenders Mortgage Insurance?",
    a: "Lenders Mortgage Insurance (LMI) is an insurance policy that protects the lender — not you — if you default on your home loan and the lender sells the property for less than the outstanding balance. It is generally required when you borrow more than 80% of the property value. You pay the premium, but the cover protects the lender. If the insurer pays out a shortfall to the lender, it can then pursue you for that amount.",
  },
  {
    q: "How much does LMI cost?",
    a: "LMI is a one-off premium calculated by the insurer as a percentage of the loan, and it rises steeply as your Loan-to-Value Ratio (LVR) increases. As a rough guide, a $500,000 loan at 90% LVR might cost around $11,000–$16,000, while the same loan at 95% LVR can be $16,000–$22,000. On an $800,000 property at 90% LVR (a $720,000 loan), LMI commonly lands in the $20,000–$30,000 range. These are estimates only — the exact figure depends on the lender, the LMI provider, your LVR, and the loan size.",
  },
  {
    q: "How can I avoid paying LMI?",
    a: "The most direct way is to save a 20% deposit so you borrow at or below 80% LVR. Other options include a family guarantor loan (a relative uses equity in their property as additional security), the First Home Guarantee (the government guarantees the portion above 80% so eligible first home buyers can buy with a 5% deposit and no LMI), and professional LMI waivers offered by some lenders to certain high-income professions such as doctors, lawyers, and accountants. Eligibility for each route varies, so it is worth confirming the detail before relying on any of them.",
  },
  {
    q: "Is it better to pay LMI or wait for a bigger deposit?",
    a: "It depends on your circumstances and is rarely clear-cut. Paying LMI lets you buy sooner, stop paying rent, and start building equity, but it is a real cost — often tens of thousands of dollars — and a higher LVR can come with a higher interest rate. Waiting for a 20% deposit avoids LMI entirely, but you pay more rent in the meantime and risk property prices rising while you save. Weighing the LMI cost against likely price growth and rent paid is the core of the decision, and a licensed mortgage broker can model the numbers for your situation.",
  },
  {
    q: "Can I get my LMI refunded if I sell or refinance?",
    a: "Generally no. LMI is usually not portable — if you refinance to a new lender, you typically pay LMI again on the new loan because the old policy does not transfer. Some policies offer a partial refund if the loan is repaid or cancelled within the first year or two, but this is the exception rather than the rule and the refundable portion shrinks quickly. Because refinancing can re-trigger LMI, it can be a reason to stay with your current lender if a switch would mean paying the premium twice.",
  },
];

/* ─── Related guides ─────────────────────────────────────────── */
const RELATED_LINKS = [
  { label: "Refinancing Guide", href: "/home-loans/refinancing" },
  { label: "Variable vs Fixed Rate", href: "/home-loans/variable" },
  { label: "Fixed Rate Guide", href: "/home-loans/fixed" },
  { label: "Offset & Redraw", href: "/home-loans/offset-redraw" },
  { label: "First Home Guarantee", href: "/first-home-buyer/first-home-guarantee" },
  { label: "Find a Mortgage Broker", href: "/advisors/mortgage-brokers" },
];

export default function LMIPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Home Loans", url: absoluteUrl("/home-loans") },
    { name: "Lenders Mortgage Insurance", url: absoluteUrl("/home-loans/lmi") },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 text-white py-14">
        <div className="container-custom">
          <nav aria-label="Breadcrumb" className="text-sm text-slate-400 mb-4 flex items-center gap-1.5">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link href="/home-loans" className="hover:text-white transition-colors">Home Loans</Link>
            <span>/</span>
            <span className="text-white">Lenders Mortgage Insurance</span>
          </nav>
          <div className="inline-block bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1 rounded-full mb-4">
            General information only — not credit assistance
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Lenders Mortgage Insurance (LMI) Explained
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mb-3">
            LMI protects the <strong>lender</strong>, not you, if you default. It is generally required when you borrow more than 80% of a property&apos;s value — and as a one-off cost it can run into tens of thousands of dollars. Here&apos;s what it is, what it costs, and how to avoid it.
          </p>
          <p className="text-xs text-slate-400 mb-8">{UPDATED_LABEL}</p>
          {/* Key facts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {HERO_STATS.map((stat) => (
              <div key={stat.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What LMI is */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">What Is Lenders Mortgage Insurance?</h2>
          <p className="text-slate-600 mb-4">
            Lenders Mortgage Insurance is a policy that protects the <strong>lender</strong> — not you — if you default on your home loan and the lender sells the property for less than the outstanding loan balance. It is generally required whenever your loan is more than 80% of the property&apos;s value. The premium is a one-off cost, though it can be added to the loan, and it is set by the insurer based on your loan size and how far your borrowing sits above the 80% line.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
            <h3 className="font-bold text-amber-900 mb-2">The point people miss</h3>
            <p className="text-amber-800 text-sm leading-relaxed">
              You pay the LMI premium, but you receive <strong>no protection</strong> from it. If you default and the lender sells the property at a shortfall, the insurer pays the lender — and the insurer can then pursue <strong>you</strong> for the amount it paid out. LMI is not the same as a product that protects your repayments; it covers the lender&apos;s risk, not yours.
            </p>
          </div>
          <p className="text-slate-600 text-sm">
            Because the premium is a percentage of the loan and climbs sharply as your Loan-to-Value Ratio rises, borrowing just a little more above 80% can mean a much larger LMI bill. The sections below set out how LMI is calculated, what it costs at different LVRs, and the practical ways to reduce or avoid it.
          </p>
        </div>
      </section>

      {/* How LMI works */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">How LMI Works</h2>
          <p className="text-slate-600 mb-5">
            When your loan exceeds 80% of the property value, the lender is taking on more risk: if you stop paying and the property sells for less than you owe, the lender is left with a shortfall. To cover that risk, the lender requires LMI. The mechanics are straightforward but often misunderstood:
          </p>
          <ol className="space-y-3 text-sm text-slate-700 mb-6">
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <span>Your LVR is above 80%, so the lender requires LMI before settling the loan.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <span>You pay the premium — directly at settlement or by adding it to the loan — even though the cover protects the lender.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <span>If you later default and the sale does not cover the loan, the insurer pays the lender the shortfall.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 bg-slate-800 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              <span>The insurer can then pursue <strong>you</strong> to recover what it paid the lender — so LMI does not write off your debt.</span>
            </li>
          </ol>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-slate-600">
              In short: LMI lets you borrow with a smaller deposit, but it is a cost you carry for the lender&apos;s benefit. It does not reduce your repayments, protect your job, or cover you if you fall behind.
            </p>
          </div>
        </div>
      </section>

      {/* LMI cost grid */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Approximate LMI Cost by LVR and Loan Size</h2>
          <p className="text-sm text-slate-500 mb-6">
            Estimates only — actual premiums vary by lender and LMI provider. Notice how the cost rises steeply as LVR increases and as the loan grows.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="Approximate LMI cost by LVR and loan size" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">LVR</th>
                  {COST_COLUMNS.map((col) => (
                    <th scope="col" key={col} className="text-left px-5 py-3">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COST_ROWS.map((row, i) => (
                  <tr key={row.lvr} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">
                      {row.lvr}
                      <span className="block text-xs font-normal text-slate-400 mt-0.5">{row.note}</span>
                    </td>
                    {row.cells.map((cell, j) => (
                      <td
                        key={j}
                        className={`px-5 py-3 font-semibold ${row.free ? "text-green-700" : "text-red-700"}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-5">
            <p className="text-sm text-amber-800">
              <strong>Worked figure:</strong> on an $800,000 property at 90% LVR — a $720,000 loan with an $80,000 deposit — LMI typically falls in the <strong>$20,000–$30,000</strong> range. Pushing from 90% to 95% LVR on the same purchase can lift the premium substantially, because the highest tier carries the steepest rate.
            </p>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            For an exact premium based on your purchase, a licensed mortgage broker can obtain a quote from the relevant LMI provider before you commit.
          </p>
        </div>
      </section>

      {/* LVR explained */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Loan-to-Value Ratio (LVR), Explained</h2>
          <p className="text-slate-600 mb-5">
            Your LVR is the size of your loan compared with the value of the property. It is the single number that decides whether LMI applies — and how much it costs.
          </p>
          <div className="bg-slate-900 text-green-400 font-mono text-sm rounded-xl p-4 mb-6">
            LVR = (Loan amount ÷ Property value) × 100
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-green-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">No LMI — 80% LVR</p>
              <p className="text-sm text-slate-700">$720,000 loan on a $900,000 property</p>
              <p className="text-xs text-slate-500 mt-1">$720k ÷ $900k × 100 = 80.0% — at the threshold, no LMI</p>
            </div>
            <div className="bg-white border border-red-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">LMI applies — above 80%</p>
              <p className="text-sm text-slate-700">$730,000 loan on a $900,000 property</p>
              <p className="text-xs text-slate-500 mt-1">$730k ÷ $900k × 100 = 81.1% — LMI required</p>
            </div>
          </div>
          <p className="text-slate-600 mb-5">
            A larger deposit lowers your LVR, which can reduce the premium — or remove it entirely once you reach 80%. The premium is also <strong>tiered</strong>, so small differences in LVR can produce large differences in cost. Moving from 88% to 90% LVR, for example, can push you into a higher tier and a noticeably bigger premium, even though the deposit difference is modest.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table aria-label="LMI premium by LVR tier" className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th scope="col" className="text-left px-5 py-3">LVR band</th>
                  <th scope="col" className="text-left px-5 py-3">What it means for LMI</th>
                </tr>
              </thead>
              <tbody>
                {LVR_TIERS.map((tier, i) => (
                  <tr key={tier.range} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-5 py-3 font-medium text-slate-800">{tier.range}</td>
                    <td
                      className={`px-5 py-3 ${
                        tier.emphasis === "good"
                          ? "text-green-700 font-semibold"
                          : tier.emphasis === "bad"
                            ? "text-red-700"
                            : "text-slate-600"
                      }`}
                    >
                      {tier.premium}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Tier boundaries and rates are set by the LMI provider and differ between Helia and QBE. The bands above illustrate the pattern, not exact pricing.
          </p>
        </div>
      </section>

      {/* Ways to avoid LMI */}
      <section className="py-12 bg-white">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ways to Avoid or Reduce LMI</h2>
          <p className="text-sm text-slate-500 mb-6">
            Several routes can remove LMI or cut it down. Each has eligibility rules and trade-offs — confirm the detail before relying on any one of them.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {AVOID_STRATEGIES.map((s) => (
              <div key={s.title} className="bg-slate-50 rounded-xl border border-slate-200 p-6">
                <span className="inline-block bg-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-full mb-3">
                  {s.tag}
                </span>
                <h3 className="font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                {s.href && (
                  <Link href={s.href} className="inline-block text-sm font-medium text-slate-800 underline mt-3 hover:text-slate-900">
                    {s.hrefLabel}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Capitalising LMI */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Capitalising LMI Into the Loan</h2>
          <p className="text-slate-600 mb-5">
            Most lenders let you <strong>capitalise</strong> the LMI premium — adding it to the loan balance rather than paying it upfront. That avoids a large cash outlay at settlement, but you then pay interest on the premium for the life of the loan, and the compounding adds up.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-5">
            <h3 className="font-semibold text-amber-900 mb-2">The compounding cost</h3>
            <p className="text-sm text-amber-800">
              A <strong>$25,000</strong> LMI premium capitalised into a 30-year loan at <strong>6%</strong> interest costs roughly <strong>$54,000</strong> in total once interest is included — more than double the original premium. If you have the cash, paying LMI upfront avoids that extra interest entirely.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>Capitalising raises your loan balance, which raises your ongoing repayments.</li>
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>It also nudges your LVR slightly higher, which can affect the rate tier you qualify for.</li>
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>Paying upfront is cheaper over the full term — capitalising is mainly a cash-flow convenience.</li>
          </ul>
        </div>
      </section>

      {/* LMI is not portable */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">LMI Is Not Portable</h2>
          <p className="text-slate-600 mb-5">
            An LMI policy is tied to a specific loan and lender. If you refinance to a new lender, the old policy does not come with you — so if your new loan is still above 80% LVR, you generally pay LMI <strong>again</strong> on the new loan. That is an important catch when comparing a switch: a lower interest rate elsewhere can be outweighed by a fresh LMI bill.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-slate-800 mb-1">A reason to stay put</p>
              <p className="text-sm text-slate-600">
                If refinancing would re-trigger LMI because your LVR is still above 80%, staying with your current lender can be the cheaper option until your LVR drops below 80%.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <p className="text-sm font-semibold text-slate-800 mb-1">Partial refunds are limited</p>
              <p className="text-sm text-slate-600">
                Some insurers offer a partial refund if the loan is cancelled within the first year or two, but the refundable share is small and shrinks quickly. Do not count on recovering much of the premium.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LMI vs LVR vs rate trade-off */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">LMI, LVR, and Interest Rate — the Trade-off</h2>
          <p className="text-slate-600 mb-5">
            LMI is rarely the only cost of a low deposit. Higher-LVR loans sometimes carry a <strong>higher interest rate</strong> as well, so the true cost of buying with a small deposit is the LMI premium <em>plus</em> any rate premium over the years you hold the loan. Set against that is the cost of waiting:
          </p>
          <ul className="space-y-2 text-sm text-slate-600 mb-5">
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span><strong>Cost of buying now:</strong> the LMI premium, plus any higher interest rate on a higher-LVR loan.</li>
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span><strong>Cost of waiting:</strong> more rent paid while you save, and the risk that property prices rise so the deposit target keeps moving.</li>
          </ul>
          <p className="text-slate-600">
            There is no universal right answer. If prices are rising faster than you can save, paying LMI to buy sooner can work out cheaper overall. If prices are flat or falling, waiting for a 20% deposit avoids both LMI and any rate premium. The comparison below makes the moving parts concrete.
          </p>
        </div>
      </section>

      {/* Who pays and when */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Who Pays LMI, and When</h2>
          <p className="text-slate-600 mb-5">
            The borrower pays LMI. It falls due at <strong>settlement</strong>, paid either as an upfront amount or capitalised into the loan. It is a <strong>one-off</strong> charge, not an ongoing premium — once it is paid (or added to the loan), there is nothing further to pay for that loan.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <p className="text-sm font-semibold text-blue-900 mb-1">Don&apos;t confuse LMI with mortgage protection insurance</p>
            <p className="text-sm text-blue-800">
              LMI protects the lender. <strong>Mortgage protection insurance</strong> — sometimes called home-loan protection or income protection — is a separate, optional product that protects <strong>you</strong>, helping cover repayments if you cannot work due to illness, injury, or redundancy. They are entirely different products: LMI is usually mandatory above 80% LVR, while mortgage protection insurance is voluntary.
            </p>
          </div>
        </div>
      </section>

      {/* LMI providers */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Who Provides LMI in Australia?</h2>
          <p className="text-slate-600 mb-6">
            Two insurers dominate the Australian LMI market. Lenders use one or both, and the premium is set by the insurer based on your LVR and loan size — not by the lender itself.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {PROVIDERS.map((p) => (
              <div key={p.name} className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-2">{p.name}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{p.detail}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Because each insurer prices differently, the same borrower can be quoted different premiums by different lenders — one reason it pays to compare before committing.
          </p>
        </div>
      </section>

      {/* First Home Guarantee alternative */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">The First Home Guarantee Alternative</h2>
          <p className="text-slate-600 mb-5">
            For eligible first home buyers, the <strong>First Home Guarantee</strong> can remove LMI altogether. Under the scheme the government guarantees the portion of the loan above 80%, so you can buy with as little as a <strong>5% deposit</strong> and pay <strong>no LMI</strong> — the government effectively stands in for the insurer on the gap.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-5">
            <p className="text-sm text-green-900">
              On an $800,000 purchase, avoiding a $20,000–$30,000 LMI premium is a major saving. For buyers who qualify, the Guarantee is usually a far better outcome than paying LMI.
            </p>
          </div>
          <ul className="space-y-2 text-sm text-slate-600 mb-6">
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>Places are limited each year and can be taken up before year-end.</li>
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>Income caps and property-price caps apply, and the price caps vary by location.</li>
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">•</span>You still need to qualify for the loan itself and meet the lender&apos;s normal requirements.</li>
          </ul>
          <Link href="/first-home-buyer/first-home-guarantee" className="inline-block bg-slate-800 text-white font-semibold px-6 py-3 rounded-xl hover:bg-slate-900 transition-colors">
            Read the First Home Guarantee Guide
          </Link>
        </div>
      </section>

      {/* Worked example: buy now vs wait */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Worked Example: Buy Now vs Wait for 20%</h2>
          <p className="text-sm text-slate-500 mb-6">
            Same $800,000 property, two buyers, two strategies. It is not always clear-cut once rent and price growth are factored in.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            {WORKED_EXAMPLE.map((col) => (
              <div key={col.label} className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="font-bold text-slate-900 mb-3">{col.label}</h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  {col.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-slate-400 mt-0.5">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 mt-5 max-w-3xl">
            <p className="text-sm text-slate-600">
              <strong>The takeaway:</strong> Buyer A avoids LMI but pays two more years of rent and risks prices rising. Buyer B pays $20,000–$30,000 in LMI but stops renting and starts building equity now. Whether the LMI is &quot;worth it&quot; depends on how fast prices move, how much rent costs in the meantime, and your own circumstances — which is exactly the kind of comparison a licensed mortgage broker can model for you.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-slate-800 hover:bg-slate-50">
                  {faq.q}
                  <span className="ml-3 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▼</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — referral only, no credit assistance */}
      <section className="py-12 bg-slate-50">
        <div className="container-custom text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Understand Your LMI Position Before You Borrow</h2>
          <p className="text-slate-600 mb-6 max-w-xl mx-auto text-sm">
            A licensed mortgage broker can estimate your LMI based on your deposit and purchase price, explain whether a professional waiver or the First Home Guarantee might apply, and compare lender options. invest.com.au does not provide credit assistance — this page is for general information only.
          </p>
          <Link
            href="/advisors/mortgage-brokers"
            className="inline-block bg-slate-800 text-white font-semibold px-8 py-3 rounded-xl hover:bg-slate-900 transition-colors"
          >
            Find a Licensed Mortgage Broker
          </Link>
        </div>
      </section>

      {/* Related links */}
      <section className="py-10 bg-white">
        <div className="container-custom">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Explore More Home Loan Guides</h2>
          <div className="flex flex-wrap gap-3">
            {RELATED_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="bg-white border border-slate-200 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg hover:border-slate-400 hover:text-slate-900 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* NCCP + general advice compliance footer */}
      <footer className="py-8 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl text-xs text-slate-500 space-y-2">
          <p>
            <strong>Credit disclaimer:</strong> This guide is general information only and does not constitute credit assistance under the NCCP Act. Speak to a licensed mortgage broker before making any borrowing decisions. invest.com.au is not licensed to provide credit assistance under the National Consumer Credit Protection Act 2009 (Cth) and the information here is not a credit recommendation for your circumstances.
          </p>
          <p>{GENERAL_ADVICE_WARNING}</p>
        </div>
      </footer>
    </div>
  );
}
