import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "Does dollar-cost averaging reduce risk?",
    a: "DCA reduces the risk of investing a large sum at the worst possible time (just before a major downturn). By spreading purchases, you avoid the regret of buying the peak. However, research consistently shows that lump sum investing outperforms DCA about two-thirds of the time, because markets go up more often than they go down. DCA is therefore a risk-reduction strategy (specifically regret risk and timing risk), not necessarily a return-maximization strategy.",
  },
  {
    q: "Is dollar-cost averaging better than lump sum investing?",
    a: "Mathematically, lump sum investing outperforms DCA in roughly 66-67% of scenarios (Vanguard research across multiple markets). The reason: markets trend upward over time, so the sooner you invest, the more time your money compounds. However, DCA has real psychological benefits — it removes the anxiety of timing decisions and makes it easier to stay invested during volatility. For regular salary earners investing their paycheck each month, DCA is the natural (and often optimal) approach.",
  },
  {
    q: "How do I set up automatic DCA in Australia?",
    a: "Most major Australian brokers support recurring investment orders. Pearler is purpose-built for DCA with automated regular investments in ETFs (including brokerage-free options on selected ETFs). CommSec, Selfwealth, Superhero, and Interactive Brokers also support recurring orders or allow you to set up BPAY/direct debit to fund regular purchases. For super, your employer SG contributions are already DCA by default.",
  },
  {
    q: "What is a good DCA interval?",
    a: "Monthly investing is the most common and practical interval — it aligns with payroll cycles and minimizes brokerage costs relative to investment amount. Fortnightly is also popular with fortnightly-pay employees. Daily or weekly DCA has diminishing marginal benefit over monthly and significantly higher brokerage costs unless using a zero-brokerage platform. The interval matters much less than consistency — picking a frequency you can maintain is more important than optimizing the exact interval.",
  },
  {
    q: "Does DCA work in a bear market?",
    a: "DCA works particularly well during extended downturns — you acquire more units at lower prices as the market falls, lowering your average cost basis. This 'buying more when it's cheap' effect is a genuine advantage over lump sum investing during periods of decline. The emotional challenge is that DCA requires you to keep investing when markets are falling and headlines are alarming. This is exactly the time most investors stop — undermining the strategy's benefit.",
  },
  {
    q: "What is the brokerage impact on dollar-cost averaging?",
    a: "Brokerage costs eat into DCA returns for small investment amounts. A $10 brokerage fee on a $200 monthly purchase represents 5% of the investment — destroying value. At $500/month, $10 brokerage is 2%. At $1,000/month, it is 1%. Platforms like Pearler offer $0 brokerage on selected ETFs; Superhero charges $2 per trade for ETFs. For small regular investors, low brokerage matters significantly. A useful rule: brokerage should not exceed 0.5% of each purchase.",
  },
];

const COMPARISON = [
  { aspect: "When it works best", dca: "Regular income investing (payroll)", lump: "Large windfall (inheritance, redundancy)" },
  { aspect: "Market timing risk", dca: "Reduced — spreads entry points", lump: "Higher — single entry point" },
  { aspect: "Expected return (long run)", dca: "Slightly lower (opportunity cost)", lump: "Slightly higher (more time in market)" },
  { aspect: "Psychological ease", dca: "Easier — no single scary decision", lump: "Harder — requires conviction" },
  { aspect: "Transaction costs", dca: "Higher (many trades)", lump: "Lower (one trade)" },
  { aspect: "Brokerage optimization", dca: "Need low/zero brokerage platform", lump: "Less critical" },
  { aspect: "Flexibility", dca: "Adjust amount monthly", lump: "Done in one go" },
];

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Dollar-Cost Averaging Australia (${CURRENT_YEAR}) — DCA vs Lump Sum Guide`,
  description: `Complete guide to dollar-cost averaging in Australia. DCA vs lump sum investing, brokerage costs, how to automate regular ETF purchases, and when each strategy makes sense. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Dollar-Cost Averaging Australia (${CURRENT_YEAR}) — DCA vs Lump Sum`,
    description: "How DCA works, when it beats lump sum investing, best Australian platforms for automated DCA, and the brokerage cost trap.",
    url: `${SITE_URL}/invest/dollar-cost-averaging`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Dollar-Cost Averaging Australia")}&sub=${encodeURIComponent("DCA vs Lump Sum · Automated ETF Investing · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/invest/dollar-cost-averaging` },
};

export default function DollarCostAveragingPage() {
  const faq = faqJsonLd(FAQS);
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Invest", url: absoluteUrl("/invest") },
    { name: "Dollar-Cost Averaging", url: absoluteUrl("/invest/dollar-cost-averaging") },
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
              <span className="text-white font-medium">Dollar-Cost Averaging</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">{UPDATED_LABEL}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
              Dollar-Cost Averaging in Australia ({CURRENT_YEAR})
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-2xl mb-8">
              Invest a fixed amount at regular intervals — regardless of price. DCA eliminates timing anxiety and builds long-term wealth systematically. Here&apos;s how it works and when to use it.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "How often markets rise (1-year periods)", value: "~75%" },
                { label: "DCA outperforms lump sum", value: "~33%" },
                { label: "Minimum recommended per purchase", value: "$200+" },
                { label: "Brokerage target (max per trade)", value: "0.5%" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 rounded-xl p-4 text-center">
                  <p className="text-2xl font-extrabold text-amber-400">{s.value}</p>
                  <p className="text-xs text-slate-300 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What is DCA */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">What is dollar-cost averaging?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Dollar-cost averaging (DCA) means investing a fixed dollar amount at regular intervals — weekly, fortnightly, or monthly — regardless of the current market price. When prices are high, your fixed amount buys fewer units. When prices are low, it buys more.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  Over time, this results in a <strong>lower average cost per unit</strong> than if you had tried to time the market. It also removes the psychological burden of deciding when to invest.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Most Australian salary earners are already DCA investing without knowing it — every employer super guarantee (SG) contribution is a DCA purchase into your super fund.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-extrabold text-slate-900 mb-4">Example: $500/month into VAS ETF</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { month: "Jan", price: "$98.50", units: "5.08", total: "$500" },
                    { month: "Feb", price: "$94.20", units: "5.31", total: "$500" },
                    { month: "Mar", price: "$101.80", units: "4.91", total: "$500" },
                    { month: "Apr", price: "$96.30", units: "5.19", total: "$500" },
                  ].map((r) => (
                    <div key={r.month} className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-600">{r.month}</span>
                      <span className="text-slate-700">@ {r.price}</span>
                      <span className="font-bold text-slate-900">{r.units} units</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 font-bold">
                    <span className="text-slate-900">Average cost</span>
                    <span className="text-amber-700">$97.54/unit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DCA vs Lump Sum */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">DCA vs lump sum — the evidence</h2>
            <p className="text-sm text-slate-600 mb-6 max-w-2xl">
              Vanguard research across US, UK, and Australian markets found lump sum investing outperforms DCA over a 10-year horizon in roughly two-thirds of scenarios. The reason: markets trend upward, so time in the market beats timing the market.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <h3 className="font-extrabold text-amber-900 mb-3">When DCA makes sense</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>You receive regular income (salary, freelance fees) — natural fit</li>
                  <li>You have a lump sum but are anxious about investing at the peak</li>
                  <li>You are new to investing and want to build habit and confidence</li>
                  <li>Volatile asset class where timing uncertainty is higher</li>
                  <li>You want to stay invested through downturns without willpower battles</li>
                </ul>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">When lump sum makes sense</h3>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>You have a windfall (inheritance, redundancy, property sale proceeds)</li>
                  <li>Your investment horizon is long (10+ years)</li>
                  <li>You are disciplined and not prone to panic-selling</li>
                  <li>Low-volatility assets where timing matters less</li>
                  <li>You have conviction that the current entry point is reasonable</li>
                </ul>
              </div>
            </div>

            {/* Comparison table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Aspect</th>
                    <th className="px-4 py-3 text-left font-extrabold text-amber-700">Dollar-Cost Averaging</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Lump Sum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {COMPARISON.map((r) => (
                    <tr key={r.aspect}>
                      <td className="px-4 py-3 font-bold text-slate-900">{r.aspect}</td>
                      <td className="px-4 py-3 text-slate-700">{r.dca}</td>
                      <td className="px-4 py-3 text-slate-700">{r.lump}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* How to automate DCA in Australia */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How to automate DCA in Australia</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[
                {
                  title: "Pearler",
                  desc: "Purpose-built for DCA. Automated recurring investments in ETFs. $0 brokerage on selected ETFs with AutoInvest. Popular with passive index investors.",
                  badge: "DCA-native",
                  color: "border-amber-200 bg-amber-50",
                },
                {
                  title: "Superhero",
                  desc: "$2 per ETF trade — low enough for $400+ monthly purchases. No built-in auto-invest, but you can fund via BPAY and place orders manually each month.",
                  badge: "Low brokerage",
                  color: "border-slate-200 bg-slate-50",
                },
                {
                  title: "CommSec Pocket",
                  desc: "$2 for trades up to $1,000. Simple interface, 7 ETF options. Ideal for beginners wanting a bank-backed platform. Manual investment, no automation.",
                  badge: "Beginner-friendly",
                  color: "border-slate-200 bg-slate-50",
                },
              ].map((p) => (
                <div key={p.title} className={`rounded-xl border p-5 ${p.color}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-extrabold text-slate-900">{p.title}</h3>
                    <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">{p.badge}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                <strong>Brokerage rule of thumb:</strong> Keep brokerage below 0.5% of each purchase. At $10 brokerage, you need to invest at least $2,000 per trade to meet this threshold. At $2 brokerage, a $400 monthly purchase is at the 0.5% limit. For smaller amounts, use a zero-brokerage option.
              </p>
            </div>
          </div>
        </section>

        {/* DCA in super context */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">DCA in super and SMSFs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">Retail/industry super — automatic DCA</h3>
                <p className="text-sm text-slate-700 leading-relaxed">Every employer SG contribution is a DCA transaction — occurring fortnightly or monthly regardless of market conditions. This is one of the structural advantages of compulsory super: it enforces DCA behavior that many investors would abandon during downturns. Additional voluntary contributions extend this benefit.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-extrabold text-slate-900 mb-3">SMSF — you control the DCA cadence</h3>
                <p className="text-sm text-slate-700 leading-relaxed">SMSF trustees set their own investment schedule. Automated regular orders in ASX ETFs (via a broker with recurring order capability) implement DCA efficiently. Most SMSF trustees combine monthly contributions with quarterly rebalancing. The key: don&apos;t accumulate large cash positions waiting for the &ldquo;right time&rdquo; — this defeats the purpose.</p>
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

        {/* Compliance footer */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <p className="text-xs text-slate-500 leading-relaxed mb-6">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/invest/index-funds" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Index funds guide &#8594;
              </Link>
              <Link href="/brokers" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Compare brokers &#8594;
              </Link>
              <Link href="/lump-sum-investing" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Lump sum investing &#8594;
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
