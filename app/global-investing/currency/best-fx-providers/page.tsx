import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import Link from "next/link";

export const revalidate = 86400;

const PAGE_PATH = "/global-investing/currency/best-fx-providers";

export const metadata: Metadata = {
  title: `Best FX & Money Transfer Providers for Australians (${CURRENT_YEAR}) — Wise vs OFX vs WorldFirst`,
  description: `How to send money overseas from Australia for the lowest cost. Compare Wise, OFX, WorldFirst, Revolut and CurrencyFair against the banks — exchange-rate margins, transfer fees, the mid-market rate, IBKR FX, large transfers and multi-currency accounts. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Best FX & Money Transfer Providers for Australians (${CURRENT_YEAR})`,
    description:
      "Banks charge 3–5% on the exchange rate; specialists charge 0.3–1%. On a $50,000 transfer that is $1,500–2,500. Here is how to compare the true cost and pick the right provider.",
    url: `${SITE_URL}${PAGE_PATH}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Best FX Providers for Australians")}&sub=${encodeURIComponent("Wise · OFX · WorldFirst · Revolut · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
};

/* ─── Data ──────────────────────────────────────────────────────── */

const HERO_STATS = [
  { value: "3–5%", label: "Bank FX margin", sub: "Typical markup over mid-market" },
  { value: "0.3–1%", label: "Specialist margin", sub: "Wise, OFX, WorldFirst, Revolut" },
  { value: "$1.5–2.5k", label: "On a $50k transfer", sub: "Difference between bank and specialist" },
  { value: "Mid-market", label: "The rate to beat", sub: "What you see on Google / XE" },
];

interface ProviderRow {
  name: string;
  margin: string;
  fee: string;
  bestFor: string;
  regulated: string;
}

const PROVIDERS: ProviderRow[] = [
  {
    name: "Wise (formerly TransferWise)",
    margin: "~0.4–0.6%",
    fee: "Low fixed fee",
    bestFor: "Transparent pricing, small to medium transfers",
    regulated: "AFSL-licensed in Australia",
  },
  {
    name: "OFX",
    margin: "~0.5–1%",
    fee: "$0 for transfers over ~$10k",
    bestFor: "Larger transfers, phone-based dealing desk",
    regulated: "AFSL-licensed in Australia",
  },
  {
    name: "WorldFirst",
    margin: "~0.5%",
    fee: "$0 over threshold",
    bestFor: "Business and large transfers",
    regulated: "AFSL-licensed in Australia",
  },
  {
    name: "Revolut",
    margin: "~0.3% (free-tier limits apply)",
    fee: "Varies by plan / weekend",
    bestFor: "Small frequent transfers, multi-currency card",
    regulated: "AFSL-licensed in Australia",
  },
  {
    name: "CurrencyFair",
    margin: "~0.45%",
    fee: "Low",
    bestFor: "Peer-to-peer rate matching",
    regulated: "AFSL-licensed in Australia",
  },
  {
    name: "Banks (CBA, NAB, Westpac, ANZ)",
    margin: "3–5%",
    fee: "$20–30",
    bestFor: "Convenience only — the worst value",
    regulated: "ADI (deposit guarantee on accounts, not FX)",
  },
];

interface UseCase {
  title: string;
  body: string;
  note?: string;
}

const USE_CASES: UseCase[] = [
  {
    title: "Funding an international brokerage account",
    body: "Moving AUD into a US or global broker so you can buy shares. The headline question is whether to convert AUD to USD before sending, or send AUD and let the broker convert.",
    note: "IBKR converts at close to interbank for roughly 0.002% (a few dollars minimum). That is usually far cheaper than converting with any transfer provider first — see the IBKR section below.",
  },
  {
    title: "Receiving foreign dividends or income",
    body: "Foreign dividends, rent, salary or freelance income arriving in USD, GBP or EUR. A multi-currency account lets you hold the foreign currency and convert when the rate suits, rather than being force-converted on arrival at the bank's margin.",
  },
  {
    title: "Buying overseas property",
    body: "Deposits and settlement for property in New Zealand, the US, the UK, Portugal or Bali. These are large, time-sensitive transfers where a 1% difference is real money and a locked-in rate can matter.",
    note: "On a $400,000 settlement, the gap between a 0.5% specialist and a 4% bank margin is roughly $14,000.",
  },
  {
    title: "Sending money to family overseas",
    body: "Regular remittances to family abroad. Recurring transfers reward low per-transfer fees and a tight margin; some providers let you automate a fixed amount on a schedule.",
  },
  {
    title: "Paying for overseas education",
    body: "Tuition, accommodation and living costs for study abroad. Universities often quote in the local currency, so compare the final received amount against the invoice — not the advertised fee.",
  },
];

interface LargeTransferTool {
  name: string;
  body: string;
}

const LARGE_TRANSFER_TOOLS: LargeTransferTool[] = [
  {
    name: "Better rates by size",
    body: "OFX, WorldFirst and bank FX desks improve their margin as the amount rises. Above roughly $100,000 it is worth asking for a tailored quote rather than accepting the on-screen retail rate.",
  },
  {
    name: "Forward contracts",
    body: "Lock today's exchange rate for a transfer that settles later (for example, a property settlement in three months). This removes the risk that the AUD moves against you before the money is due — at the cost of not benefiting if it moves in your favour.",
  },
  {
    name: "Limit orders",
    body: "Set a target rate and have the transfer execute automatically only if the market reaches it. Useful for non-urgent transfers where you have a rate in mind and can wait.",
  },
  {
    name: "Phone-based dealing desks",
    body: "For very large sums, a named dealer can quote a sharper rate than the website and walk you through forwards and limit orders. The value of a human desk rises with the transfer size.",
  },
];

interface SafetyPoint {
  heading: string;
  body: string;
}

const SAFETY_POINTS: SafetyPoint[] = [
  {
    heading: "Choose an ASIC-licensed provider",
    body: "Reputable FX providers hold an Australian Financial Services Licence (AFSL) and are regulated by ASIC. Wise, OFX and WorldFirst are all licensed in Australia. Avoid providers that cannot point to an AFSL or an Australian regulatory footprint.",
  },
  {
    heading: "Client money should be segregated",
    body: "A well-run provider holds customer funds in segregated accounts, separate from its own operating money. Segregation is about how your in-transit money is held — it is not a government guarantee.",
  },
  {
    heading: "An FX provider is not a bank",
    body: "Authorised deposit-taking institutions (banks, building societies, credit unions) carry the Australian Government's Financial Claims Scheme guarantee on deposits up to $250,000 per account holder per institution. FX providers and multi-currency accounts are not ADIs, so balances held with them are not covered by that guarantee. Treat a multi-currency account as a transfer and spending tool, not a place to park long-term savings.",
  },
];

interface CostTip {
  tip: string;
  detail: string;
}

const COST_TIPS: CostTip[] = [
  {
    tip: "Avoid airport and hotel exchange counters",
    detail: "These carry the widest margins of all — often well into double digits — plus their own fees.",
  },
  {
    tip: "Avoid bank international transfers",
    detail: "Bank-to-bank international transfers typically combine a 3–5% margin with a $20–30 fixed fee. They are the convenient option and the most expensive one.",
  },
  {
    tip: "Compare the received amount, not the fee",
    detail: "The number that matters is how much foreign currency lands at the other end. A $0 fee can hide a fat margin.",
  },
  {
    tip: "Use limit orders for non-urgent transfers",
    detail: "If you have a target rate and no deadline, a limit order can execute at a better level than transferring today.",
  },
  {
    tip: "Batch transfers to reduce per-transfer fees",
    detail: "Where there is a fixed fee, one larger transfer usually beats several small ones.",
  },
  {
    tip: "Watch the AUD trend for timing — but do not speculate",
    detail: "Being roughly aware of where the AUD sits can help you time a flexible transfer. Trying to pick the top is speculation, not planning.",
  },
];

const RELATED = [
  {
    href: "/global-investing/shares/us",
    label: "Buy US shares from Australia",
    body: "Where FX margins meet brokerage. Compare Stake, IBKR, Tiger and more on total cost.",
    color: "from-blue-50 to-white",
  },
  {
    href: "/global-investing/currency",
    label: "FX & currency accounts",
    body: "The currency hub — spreads, multi-currency accounts and timing, all in one place.",
    color: "from-blue-50 to-white",
  },
  {
    href: "/global-investing",
    label: "Global investing hub",
    body: "Both tracks for putting AUD into global markets, plus the tax rules that decide which is cheaper.",
    color: "from-amber-50 to-white",
  },
];

const FAQS = [
  {
    q: "What is the cheapest way to send money overseas from Australia?",
    a: "For most people a specialist provider such as Wise, OFX, WorldFirst, Revolut or CurrencyFair is far cheaper than a bank, because their exchange-rate margin is typically 0.3–1% versus 3–5% at the banks. The cheapest option for a given transfer depends on the amount and currency: compare the final received amount (margin cost plus any transfer fee) across two or three providers before sending. For very large transfers, the phone-based dealing desks at OFX and WorldFirst can sharpen the rate further.",
  },
  {
    q: "How much do banks charge for international transfers?",
    a: "Australian banks typically build a 3–5% margin into the exchange rate and add a fixed fee of around $20–30 per transfer. The margin is the larger and less visible cost. On a $50,000 transfer, a 4% margin is roughly $2,000 — money you would keep almost entirely if you used a specialist provider charging around 0.5%.",
  },
  {
    q: "Is Wise safe and regulated in Australia?",
    a: "Wise holds an Australian Financial Services Licence and is regulated by ASIC, and it is well known for showing its margin transparently against the mid-market rate. That said, Wise and its multi-currency account are not an authorised deposit-taking institution, so balances are not covered by the Government's Financial Claims Scheme deposit guarantee the way a bank account is. It is a transfer and spending tool, not a place to hold long-term savings.",
  },
  {
    q: "Should I convert currency before funding my IBKR account?",
    a: "Usually no. Interactive Brokers converts currency at close to the interbank rate for roughly 0.002% (with a small minimum), which is cheaper than converting with a money-transfer provider first. The common approach is to transfer AUD to IBKR and convert inside the platform. The exception is when you need the foreign currency somewhere other than IBKR — then converting with a specialist provider can make sense.",
  },
  {
    q: "What is the mid-market exchange rate?",
    a: "The mid-market rate is the midpoint between the buy and sell prices for a currency pair in the wholesale market — the 'real' rate you see on Google or XE. No retail provider gives you exactly this rate; they add a margin to it. Comparing every quote against the mid-market rate is the single best way to see the true cost of a transfer, because it exposes the margin that fee-free marketing can hide.",
  },
];

export default function BestFxProvidersPage() {
  const faqSchema = faqJsonLd(FAQS);
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Global Investing", item: `${SITE_URL}/global-investing` },
      { "@type": "ListItem", position: 3, name: "Currency", item: `${SITE_URL}/global-investing/currency` },
      { "@type": "ListItem", position: 4, name: "Best FX Providers", item: `${SITE_URL}${PAGE_PATH}` },
    ],
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-600 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span className="text-slate-300">/</span>
            <Link href="/global-investing/currency" className="hover:text-slate-900">Currency</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Best FX Providers</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                {UPDATED_LABEL} — Currency &amp; transfers
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
                Best FX &amp; money-transfer providers{" "}
                <span className="text-amber-500">for Australians</span>
              </h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-5">
                When you invest overseas, send money abroad, or receive foreign income, the FX
                provider you choose can cost or save you thousands &mdash; and the banks charge the
                worst rates of anyone, with most of the cost hidden in the exchange rate rather than
                the fee. This is an educational comparison of how FX pricing works, how to read the
                true cost of a transfer, and which providers suit which job.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="#comparison"
                  className="inline-block px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-xs text-center transition-colors shadow-lg shadow-amber-500/20"
                >
                  Compare providers &rarr;
                </Link>
                <Link
                  href="#hidden-cost"
                  className="inline-block px-5 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 hover:text-slate-900 font-semibold rounded-xl text-xs text-center transition-colors"
                >
                  Why banks are the worst value &rarr;
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {HERO_STATS.map((s) => (
                <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-xl md:text-2xl font-extrabold text-amber-600">{s.value}</div>
                  <div className="text-[0.65rem] font-bold text-slate-900 mt-0.5">{s.label}</div>
                  <div className="text-[0.6rem] text-slate-500 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── The hidden cost of FX ────────────────────────────────────── */}
      <section id="hidden-cost" className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
            The hidden cost
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            Where FX providers actually make their money
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Most people compare transfers on the visible fee. That is the wrong number. The bulk of
            the cost is the <strong>exchange-rate margin</strong> &mdash; the markup a provider adds
            over the mid-market (interbank) rate. It is baked into the rate you are quoted, so it
            never shows up as a line item.
          </p>
          <ul className="space-y-2 text-sm text-slate-600 leading-relaxed mb-5 list-disc pl-5">
            <li>Banks typically charge a <strong>3&ndash;5% margin</strong> on the exchange rate.</li>
            <li>Specialist providers typically charge a <strong>0.3&ndash;1% margin</strong>.</li>
            <li>
              On a <strong>$50,000</strong> transfer, that gap is roughly{" "}
              <strong>$1,500&ndash;2,500</strong> &mdash; for the same transfer, on the same day.
            </li>
          </ul>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-xs text-slate-600 leading-relaxed">
              A provider can advertise <span className="font-semibold">&quot;$0 fees&quot;</span> and
              still be expensive, because the margin does the earning. Conversely, a small fixed fee
              with a tight margin is usually the cheaper deal. The only honest way to compare is the
              final amount received in the foreign currency.
            </p>
          </div>
        </div>
      </section>

      {/* ── Mid-market rate explained ────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
            The benchmark
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            The mid-market rate &mdash; the rate to measure everything against
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The mid-market rate is the &quot;real&quot; exchange rate &mdash; the midpoint between
            the buy and sell prices in the wholesale market. It is the rate you see on Google, XE or
            Reuters. No retail provider gives you exactly this rate; every one of them adds a margin
            on top.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Because the margin is the hidden cost, the mid-market rate is your benchmark. Always
            compare a quote against it to see the true cost of the transfer &mdash; the gap between
            the quote and the mid-market rate <em>is</em> the margin. Transparent providers show you
            that gap up front; the banks generally do not.
          </p>
        </div>
      </section>

      {/* ── Provider comparison table ────────────────────────────────── */}
      <section id="comparison" className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Comparison
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            FX provider comparison
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5 max-w-3xl">
            Indicative margins and fees for AUD transfers. Exact pricing varies with the currency
            pair, the amount and the day &mdash; always confirm with a live quote. The pattern,
            though, is consistent: specialists beat banks by a wide margin.
          </p>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full border-collapse text-left min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-300">
                  <th className="py-3 pr-4 text-[0.7rem] font-bold uppercase tracking-wider text-slate-500">Provider</th>
                  <th className="py-3 px-4 text-[0.7rem] font-bold uppercase tracking-wider text-slate-500">Typical margin</th>
                  <th className="py-3 px-4 text-[0.7rem] font-bold uppercase tracking-wider text-slate-500">Transfer fee</th>
                  <th className="py-3 px-4 text-[0.7rem] font-bold uppercase tracking-wider text-slate-500">Best for</th>
                  <th className="py-3 pl-4 text-[0.7rem] font-bold uppercase tracking-wider text-slate-500">Regulation</th>
                </tr>
              </thead>
              <tbody>
                {PROVIDERS.map((p) => (
                  <tr key={p.name} className="border-b border-slate-200 align-top">
                    <td className="py-3 pr-4 text-sm font-semibold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{p.margin}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{p.fee}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{p.bestFor}</td>
                    <td className="py-3 pl-4 text-xs text-slate-500">{p.regulated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[0.7rem] text-slate-500 mt-4 max-w-3xl">
            Margins shown are indicative and change frequently. This table is for education and
            comparison only &mdash; it is not a recommendation to use any particular provider.
          </p>
        </div>
      </section>

      {/* ── How to compare ───────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Method
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            How to compare providers properly
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            The total cost of a transfer is the <strong>margin cost plus the transfer fee</strong>.
            Looking at either one alone is misleading. Here is the comparison that gives you the
            truth:
          </p>
          <ol className="space-y-3 text-sm text-slate-600 leading-relaxed mb-5 list-decimal pl-5">
            <li>
              <strong>Add up the total cost</strong> &mdash; the margin (gap from the mid-market
              rate) plus any fixed transfer fee. Neither number alone tells the story.
            </li>
            <li>
              <strong>Get a quote that shows the exact AUD&rarr;foreign amount</strong> for your
              transfer size, on the day you intend to send.
            </li>
            <li>
              <strong>Compare the final amount received</strong>, not the advertised fee. Whichever
              provider lands the most foreign currency at the other end wins.
            </li>
            <li>
              <strong>Be suspicious of &quot;$0 fee&quot; marketing.</strong> A zero fee can sit on
              top of a large margin and still be the more expensive option overall.
            </li>
          </ol>
        </div>
      </section>

      {/* ── Use cases ────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Use cases
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            When Australian investors need FX
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5 max-w-3xl">
            The right provider depends on the job &mdash; a one-off broker funding, a property
            settlement and a monthly remittance each reward different things.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {USE_CASES.map((u) => (
              <div key={u.title} className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="font-bold text-slate-900 text-sm mb-2">{u.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{u.body}</p>
                {u.note && (
                  <p className="text-xs text-amber-700 leading-relaxed mt-3 pt-3 border-t border-slate-100">
                    {u.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── IBKR FX vs transfer providers ────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
            The brokerage shortcut
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            IBKR&apos;s own FX vs a money-transfer provider
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            For funding a US brokerage account, the cheapest route is often the one most people
            overlook: <strong>transfer AUD into Interactive Brokers and convert inside IBKR</strong>,
            rather than converting to USD first with a transfer provider. IBKR converts at close to
            the interbank rate for roughly <strong>0.002%</strong> (with a small minimum per
            conversion) &mdash; dramatically cheaper than even the best money-transfer margin of
            around 0.3&ndash;0.6%, and the difference grows with the amount.
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-700 mb-1">
                Usually cheapest
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                Send AUD to IBKR &rarr; convert to USD inside IBKR at ~0.002%. Best when the money is
                going straight into the broker anyway.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                The exception
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                If you need the foreign currency somewhere other than IBKR &mdash; paying a bill,
                another broker, a person &mdash; a specialist transfer provider is the right tool.
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            The point is not that one tool is always best, but that converting currency at a broker
            and moving money between countries are two different problems. Match the tool to the job.
          </p>
        </div>
      </section>

      {/* ── Large transfers ──────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Big sums
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Large transfers &mdash; property and $100k+
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5 max-w-3xl">
            For property settlements and other large transfers, OFX, WorldFirst and bank FX desks
            tend to offer better rates as the amount climbs, and they give you tools to manage the
            timing and the exchange-rate risk.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {LARGE_TRANSFER_TOOLS.map((t) => (
              <div key={t.name} className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="font-bold text-slate-900 text-sm mb-2">{t.name}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Regulation & safety ──────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Safety
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            Regulation and safety
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            A tight rate is no use if the provider is not trustworthy. Cheapness and safety are
            separate checks &mdash; do both.
          </p>
          <div className="space-y-4">
            {SAFETY_POINTS.map((s) => (
              <div key={s.heading} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="font-bold text-slate-900 text-sm mb-2">{s.heading}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Multi-currency accounts ──────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Hold many currencies
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            Multi-currency accounts and cards
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Wise and Revolut both offer multi-currency accounts and cards that let you hold AUD, USD,
            EUR, GBP and others in one place. You can convert between them when the rate suits and
            spend in the local currency on a linked card without a per-transaction conversion fee at
            the till.
          </p>
          <ul className="space-y-2 text-sm text-slate-600 leading-relaxed mb-5 list-disc pl-5">
            <li>Useful for frequent travellers and investors who deal in several currencies.</li>
            <li>Spend in the local currency rather than being converted at a card issuer&apos;s margin.</li>
            <li>Hold foreign income (dividends, rent, salary) and convert on your own timing.</li>
          </ul>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <p className="text-xs text-slate-700 leading-relaxed">
              <span className="font-semibold">Important:</span> these are not bank accounts. They are
              not authorised deposit-taking institutions, so balances do not carry the Government
              deposit guarantee. Use them to move and spend money &mdash; not as a vault for
              long-term savings.
            </p>
          </div>
        </div>
      </section>

      {/* ── Tips to minimise FX costs ────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Checklist
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5">
            Tips to minimise FX costs
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {COST_TIPS.map((t) => (
              <div key={t.tip} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-3">
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[0.7rem] font-bold flex items-center justify-center">
                  &#10003;
                </span>
                <div>
                  <p className="font-semibold text-slate-900 text-sm mb-1">{t.tip}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-4xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
            FAQ
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5">
            Common questions about FX and money transfers
          </h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group bg-white border border-slate-200 rounded-2xl px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-slate-900 text-sm">
                  {f.q}
                  <span className="ml-4 shrink-0 text-amber-500 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="text-xs text-slate-600 leading-relaxed mt-3">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related ──────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Keep reading
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5">
            Related guides
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
            {RELATED.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className={`group block bg-gradient-to-br ${r.color} border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all`}
              >
                <p className="font-bold text-slate-900 text-sm mb-2 group-hover:text-amber-700">{r.label}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{r.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <section className="bg-slate-50 border-t border-slate-100 py-6">
        <div className="container-custom">
          <p className="text-[0.65rem] text-slate-500 leading-relaxed max-w-4xl">
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
