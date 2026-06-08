import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import Link from "next/link";

export const revalidate = 86400;

const PAGE_PATH = "/global-investing/guides/ibkr-australia-setup";

export const metadata: Metadata = {
  title: `Interactive Brokers (IBKR) Australia Setup Guide (${CURRENT_YEAR})`,
  description: `Setting up Interactive Brokers from Australia: account types, W-8BEN, AUD funding, FX conversion, costs, and tax reporting. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Interactive Brokers (IBKR) Australia Setup Guide (${CURRENT_YEAR})`,
    description:
      "How Australians open and configure an IBKR account: account opening steps, W-8BEN, AUD funding, the FX conversion tool, costs, custody, and tax reporting.",
    url: `${SITE_URL}${PAGE_PATH}`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Interactive Brokers: Australia Setup Guide")}&sub=${encodeURIComponent("Account · Funding · FX · Settings · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}${PAGE_PATH}` },
};

// ── Data ──────────────────────────────────────────────────────────────────────

const HERO_STATS = [
  { value: "150+", label: "Global markets accessible", sub: "Across ~30 countries" },
  { value: "~0.002%", label: "FX conversion spread", sub: "+ small per-conversion fee" },
  { value: "US$0.005", label: "Per-share US brokerage", sub: "Min US$1 per order (tiered)" },
  { value: "$0", label: "Cash-account minimum", sub: "No minimum deposit" },
];

const WHY_IBKR = [
  { title: "Access to 150+ markets", body: "One account reaches shares, ETFs, options, futures, bonds and FX across roughly 30 countries — the US (NYSE, NASDAQ), the UK (LSE), Europe, Hong Kong, Japan, Canada and more. Most retail apps cover only the US, or the US plus a handful of others." },
  { title: "Very low brokerage", body: "On the tiered US pricing, brokerage is around US$0.005 per share with a US$1 minimum per order, capped as a percentage of trade value. For larger parcels this is among the lowest available to Australians." },
  { title: "Low FX conversion cost", body: "Converting AUD to USD inside IBKR costs roughly a 0.002% spread plus a small minimum fee (about US$2) — versus the 0.5%–0.7% baked into the rate at most retail brokers. On large balances this difference dwarfs brokerage." },
  { title: "Direct ownership model", body: "International shares are held in your own name through the broker's custody and registration arrangements rather than pooled anonymously, and US holdings can be transferred out via DRS. Your account is in your name, not a shared omnibus." },
  { title: "Professional-grade platform", body: "Trader Workstation (TWS), the web Client Portal and IBKR Mobile expose deep order types, real-time data and analytics. That depth is the main trade-off below." },
  { title: "The trade-off: a steeper learning curve", body: "IBKR is more complex than Stake or Pearler. The interface assumes some familiarity with order types, market-data subscriptions and FX. Beginners who only want simple AU/US share buying may prefer a simpler app and accept higher FX costs for ease of use." },
];

const ACCOUNT_TYPES = [
  { type: "Individual — cash", forWhom: "Most retail investors", notes: "Buy with settled funds only; no borrowing and no margin-call risk. The default recommendation for most people.", suited: true },
  { type: "Individual — margin", forWhom: "Experienced investors", notes: "Allows borrowing against holdings. Adds leverage risk and the possibility of forced liquidation. Avoid unless you fully understand margin.", suited: false },
  { type: "Joint account", forWhom: "Couples / two holders", notes: "Two individuals on one account. Both parties complete identity verification and tax declarations.", suited: false },
  { type: "Trust account", forWhom: "Family or other trusts", notes: "Held by the trustee for the trust. Requires the trust deed and trustee identification at onboarding.", suited: false },
  { type: "SMSF account", forWhom: "Self-managed super funds", notes: "An entity account for the fund. Requires the trust deed, trustee details and the fund's ABN/TFN; uses the entity W-8BEN-E rather than the individual W-8BEN.", suited: false },
  { type: "Company account", forWhom: "Companies / other entities", notes: "Held by a company. Requires incorporation details, director identification and the ownership structure.", suited: false },
];

const STEPS = [
  { step: 1, title: "Start the application", detail: "Begin the application with Interactive Brokers, provide an email address and create a username and password. You choose the account holder type (individual, joint, trust, SMSF or company) at the start." },
  { step: 2, title: "Verify your identity", detail: "Provide a primary photo ID — an Australian passport or driver licence — plus proof of address such as a recent utility bill or bank statement showing your name and residential address. Documents are usually uploaded as a PDF or clear photo." },
  { step: 3, title: "Declare tax residency and provide your TFN", detail: "Declare your Australian tax residency and provide your Tax File Number (TFN). Supplying the TFN is recommended so investment income is reported correctly and is not subject to no-TFN withholding inside Australia." },
  { step: 4, title: "Complete the W-8BEN", detail: "For US shares, the W-8BEN certifies you are a non-US person and claims the Australia–US tax treaty. This reduces US dividend withholding from 30% to 15%. IBKR collects the W-8BEN during onboarding; individuals use the W-8BEN and entities (such as an SMSF) use the W-8BEN-E." },
  { step: 5, title: "Request trading permissions", detail: "Select the markets and products you want to trade — for example ASX (Australian shares) and US shares. You can request additional markets or products later; some permissions trigger extra agreements or knowledge questions." },
  { step: 6, title: "Fund the account", detail: "Once approved, fund the account by AUD bank transfer using the deposit details shown in the portal. There is no minimum for a cash account. Funds typically clear within 1–2 business days, after which you can convert currency and trade." },
];

const COSTS = [
  { item: "US share brokerage", cost: "~US$0.005 / share, min US$1 per order", note: "Tiered pricing; capped as a share of trade value. Fixed pricing is an alternative plan." },
  { item: "ASX share brokerage", cost: "From ~AU$3 (or a small % of trade value)", note: "Charged in AUD; subject to a per-order minimum." },
  { item: "Other markets (LSE, HK, JP, etc.)", cost: "Varies by exchange", note: "Each market has its own schedule and local currency minimum." },
  { item: "FX conversion (e.g. AUD→USD)", cost: "~0.002% spread + ~US$2 minimum fee", note: "Far cheaper than the 0.5%–0.7% baked into most retail-broker rates." },
  { item: "Market-data subscriptions", cost: "From US$0 to ~US$10–US$15+ / month per bundle", note: "Real-time ASX and US data are paid; delayed data is free. Subscribe only to what you need." },
  { item: "Inactivity fee", cost: "Generally none", note: "The legacy minimum-activity fee was removed in recent years." },
  { item: "Withdrawals", cost: "First withdrawal each month free", note: "Additional withdrawals in the same month attract a fee." },
];

const BEGINNER_TIPS = [
  { title: "Keep order types simple at first", body: "Start with market and limit orders. A limit order lets you set the maximum price you pay (or minimum you accept), which protects you from sudden price moves — useful on thinly traded or after-hours markets." },
  { title: "Avoid margin", body: "Open a cash account. Margin adds leverage and the risk of forced liquidation in a downturn. There is no need for borrowing to build a long-term global portfolio." },
  { title: "Use the paper-trading account", body: "IBKR provides a simulated paper-trading account. Practise placing orders and converting currency there before committing real money, so the interface is familiar." },
  { title: "Set up alerts, not constant checking", body: "Price and event alerts let you step back from the screen. Frequent trading tends to erode returns; a buy-and-hold approach suits most investors." },
  { title: "Convert currency deliberately", body: "Do the AUD→USD conversion yourself using the FX tool rather than letting an order auto-convert at a worse rate. See the currency section below." },
];

const FAQS = [
  {
    q: "Is Interactive Brokers safe for Australian investors?",
    a: "Interactive Brokers is a long-established global broker, and Australian residents typically onboard through its Australian entity, which holds an Australian Financial Services Licence (AFSL), or through IBKR LLC, depending on the structure. The AFSL-regulated entity is subject to Australian client-money rules, and client assets are held in your name rather than pooled anonymously. As with any broker, protections are not the same as a government guarantee, and you still bear ordinary market risk on your investments. Read the relevant disclosure documents and confirm which entity your account is opened with.",
  },
  {
    q: "How much does it cost to convert AUD to USD on IBKR?",
    a: "IBKR's currency conversion is among the cheapest available to Australians — roughly a 0.002% spread plus a small minimum fee of about US$2 per conversion, executed close to the interbank (IDEALPRO) rate. By comparison, many retail brokers bake a 0.5%–0.7% margin into the exchange rate. The practical catch is that you should convert deliberately using the FX conversion tool; if you simply buy a US security without converting first, the platform can auto-convert at a less favourable rate. On larger balances the FX saving can outweigh brokerage entirely.",
  },
  {
    q: "Do I need to complete a W-8BEN on IBKR?",
    a: "Yes, if you intend to hold US-listed shares. The W-8BEN certifies that you are a non-US person and claims the Australia–US tax treaty, which reduces US dividend withholding from the default 30% to 15%. IBKR collects the form during onboarding, and it generally needs to be re-certified periodically. Individuals complete the W-8BEN; entities such as an SMSF or company complete the W-8BEN-E instead. Without a valid form, US dividends are withheld at 30%.",
  },
  {
    q: "Are my ASX shares CHESS-sponsored on IBKR?",
    a: "No. ASX shares bought through IBKR are held under IBKR's custody model rather than being CHESS-sponsored, so you do not receive a Holder Identification Number (HIN) and your name does not appear on the issuer-sponsored CHESS subregister. Some Australians prefer a CHESS-sponsored broker specifically for ASX holdings for that direct registration. For international shares, IBKR's model still provides direct ownership in your name, and US holdings can be transferred out via DRS. If CHESS sponsorship matters to you for ASX shares, weigh that against IBKR's lower international costs.",
  },
  {
    q: "How do I do my tax return with an IBKR account?",
    a: "IBKR provides an Activity Statement and annual reports you can download from the portal, and where available an Australian tax report that summarises the figures in a more local format. For your Australian return you generally reconcile dividends (and any foreign withholding tax, which may support a Foreign Income Tax Offset), capital gains converted to AUD using the exchange rate on each transaction date, and any interest. Because cost base and proceeds must be expressed in AUD, keep the transaction-date exchange rates. Many investors use the statements with tax software or a tax agent. See our tax guide for the detail, and remember foreign dividends carry no franking credits.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function IbkrAustraliaSetupPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Global Investing", item: `${SITE_URL}/global-investing` },
      { "@type": "ListItem", position: 3, name: "Guides", item: `${SITE_URL}/global-investing/guides` },
      { "@type": "ListItem", position: 4, name: "IBKR Australia Setup", item: `${SITE_URL}${PAGE_PATH}` },
    ],
  };
  const faqLd = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link>
            <span className="text-slate-300">/</span>
            <Link href="/global-investing/guides" className="hover:text-slate-900">Guides</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">IBKR Australia Setup</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                {UPDATED_LABEL}
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
                Setting up{" "}
                <span className="text-amber-500">Interactive Brokers</span> from Australia
              </h1>
              <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-3">
                Interactive Brokers (IBKR) is popular with Australian investors for{" "}
                <strong className="text-slate-900">low-cost access to international shares</strong>.
                This how-to guide walks through opening an account, funding it in AUD,
                and the key settings to get right along the way.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                It is written as a practical walkthrough — the account types, the document
                and W-8BEN steps, the cheap currency conversion, costs, the custody model,
                and how the statements feed your tax return. It is information only, not a
                recommendation to use any particular broker.
              </p>

              {/* Quick jump links */}
              <div className="grid grid-cols-2 gap-2 mb-1">
                <a
                  href="#opening"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Account opening steps &darr;
                </a>
                <a
                  href="#funding"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Funding &amp; currency &darr;
                </a>
                <a
                  href="#costs"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Costs &darr;
                </a>
                <a
                  href="#tax"
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 hover:border-amber-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
                >
                  Tax &amp; custody &darr;
                </a>
              </div>
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-3">
              {HERO_STATS.map((s) => (
                <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="text-xl md:text-2xl font-extrabold text-amber-600">{s.value}</div>
                  <div className="text-[0.65rem] font-bold text-slate-900 mt-0.5 leading-tight">{s.label}</div>
                  <div className="text-[0.6rem] text-slate-500 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Why Australians use IBKR ───────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Why IBKR</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">Why Australians use Interactive Brokers</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            The appeal is breadth and cost. IBKR reaches far more markets than the typical
            retail app, and its brokerage and currency-conversion pricing are among the
            lowest available to Australian investors. The trade-off is complexity.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {WHY_IBKR.map((item) => (
              <div
                key={item.title}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all"
              >
                <p className="text-sm font-bold text-slate-900 mb-2">{item.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4 max-w-3xl">
            <p className="text-[0.7rem] text-slate-700 leading-relaxed">
              <strong>In short:</strong> IBKR tends to win on cost and market access, while
              simpler apps such as Stake or Pearler win on ease of use. If you only want to
              buy a few ASX or US shares occasionally and value simplicity, a lighter app may
              suit you better despite higher FX costs.
            </p>
          </div>
        </div>
      </section>

      {/* ── IBKR entity for Australians ────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="max-w-4xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Which entity</p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">Which IBKR entity opens your account?</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              IBKR operates through several regional entities. Australian residents typically
              onboard through{" "}
              <strong className="text-slate-900">IBKR Australia</strong>, which holds an
              Australian Financial Services Licence (AFSL), or in some cases through{" "}
              <strong className="text-slate-900">IBKR LLC</strong>. The exact entity you are
              contracted with is shown in your client agreement during onboarding — read it,
              because it determines which rules and protections apply.
            </p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">AFSL-regulated entity</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The Australian entity holds an AFSL and is subject to Australian regulation.
                  That brings the conduct, disclosure and licensing obligations that apply to
                  financial-services providers operating here.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">Client-money protections</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Money and assets handled under Australian law are subject to client-money
                  rules, which require client funds to be handled separately from the firm&apos;s
                  own money. Protections are not a government guarantee against market loss.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">The account is in your name</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The account is opened in your own name (or your entity&apos;s name), and
                  holdings are recorded against you rather than pooled anonymously with other
                  clients in a way that obscures who owns what.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Account types ──────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Account types</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">Which account type suits you?</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            IBKR offers several holder types. For most retail investors the answer is the
            individual cash account — it avoids borrowing and margin-call risk and is the
            simplest to operate.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-xs md:text-sm" aria-label="IBKR account types — who each is for">
              <thead>
                <tr className="bg-white border-b border-slate-200">
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600">Account type</th>
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600">Who it&apos;s for</th>
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600 hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {ACCOUNT_TYPES.map((row, i) => (
                  <tr key={row.type} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <span className="flex items-center gap-2">
                        {row.type}
                        {row.suited && (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[0.55rem] font-bold rounded uppercase tracking-wide">
                            Most retail
                          </span>
                        )}
                      </span>
                      <div className="text-[0.6rem] text-slate-500 font-normal mt-1 md:hidden">{row.notes}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.forWhom}</td>
                    <td className="px-4 py-3 text-slate-600 leading-relaxed hidden md:table-cell">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[0.65rem] text-slate-500 mt-3 max-w-3xl">
            Margin accounts add leverage and the risk of forced liquidation — most people
            should choose a cash account. SMSF, trust and company accounts are entity accounts
            with extra documentation requirements and use the entity W-8BEN-E for US shares.
          </p>
        </div>
      </section>

      {/* ── Step-by-step opening ───────────────────────────────────────── */}
      <section id="opening" className="bg-white border-b border-slate-100 py-10 scroll-mt-4">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Account opening</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">Opening the account: step by step</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            The application is fully online. Have your photo ID, a proof-of-address document
            and your TFN ready before you start, and the process is straightforward.
          </p>

          <div className="space-y-4 max-w-4xl">
            {STEPS.map((s) => (
              <div key={s.step} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-amber-300 transition-colors">
                <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-slate-900 text-white text-sm font-extrabold mt-0.5">
                  {s.step}
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 mb-1">{s.title}</div>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-4 max-w-4xl">
            <p className="text-[0.7rem] text-slate-700 leading-relaxed">
              <strong>On the W-8BEN:</strong> the form is what unlocks the 15% US dividend
              withholding rate under the Australia–US treaty instead of the default 30%. IBKR
              collects it during onboarding, so you usually do not have to chase it down
              separately. See our{" "}
              <Link href="/global-investing/tax/w-8ben" className="text-amber-700 hover:underline font-semibold">
                W-8BEN guide
              </Link>{" "}
              for the line-by-line detail.
            </p>
          </div>
        </div>
      </section>

      {/* ── Funding ────────────────────────────────────────────────────── */}
      <section id="funding" className="bg-slate-50 border-b border-slate-100 py-10 scroll-mt-4">
        <div className="container-custom">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Funding</p>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">Funding your account in AUD</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                The standard method is an{" "}
                <strong className="text-slate-900">AUD bank transfer</strong> from your
                Australian bank account. The portal shows the deposit details to use as the
                destination. Transfers are typically free from IBKR&apos;s side and clear
                within <strong className="text-slate-900">1–2 business days</strong>.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                There is generally <strong className="text-slate-900">no minimum deposit</strong>{" "}
                for a cash account, following changes in recent years. You can deposit AUD and
                hold it as cash; IBKR can hold multiple currencies at once, so you are not
                forced to convert immediately.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                The important habit is to{" "}
                <strong className="text-slate-900">convert currency yourself</strong> rather
                than let an order auto-convert. IBKR&apos;s conversion runs through the
                IDEALPRO FX market at close to interbank rates — much cheaper than the spread
                most banks and retail brokers apply. The next section covers exactly how.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-xs font-bold text-slate-900 mb-2">AUD bank transfer at a glance</p>
                <ul className="text-xs text-slate-600 space-y-1.5 leading-relaxed list-disc list-inside">
                  <li>Free from IBKR&apos;s side; your bank may apply its own fee</li>
                  <li>Clears in about 1–2 business days</li>
                  <li>No minimum for a cash account</li>
                  <li>Deposit AUD and convert when you choose</li>
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                <p className="text-xs font-bold text-slate-900 mb-2">Avoid the costly default FX</p>
                <p className="text-[0.7rem] text-slate-700 leading-relaxed">
                  If you buy a US security with only AUD in the account, the platform can
                  auto-convert as part of settling the trade — often at a worse rate than a
                  deliberate FX conversion. Convert AUD to USD first using the FX conversion
                  tool, then place the trade.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Currency conversion deep-dive ──────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <div className="max-w-4xl">
            <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Currency conversion</p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">Currency conversion: where IBKR really saves you money</h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              For Australians buying US shares, currency conversion is often the largest cost —
              and it is where IBKR stands apart. Converting AUD to USD inside IBKR typically
              costs about a <strong className="text-slate-900">0.002% spread plus a small
              minimum fee</strong> (around US$2 per conversion). Many retail brokers instead
              bake a <strong className="text-slate-900">0.5%–0.7%</strong> margin into the
              exchange rate, which on a A$10,000 conversion is roughly A$50–A$70 versus a
              couple of dollars at IBKR.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">How to convert manually</p>
                <ul className="text-xs text-slate-600 space-y-2 leading-relaxed list-decimal list-inside">
                  <li>Make sure your AUD deposit has cleared.</li>
                  <li>Open the currency-conversion or FX tool in the platform (in TWS this is the FX trader; the Client Portal has a convert-currency function).</li>
                  <li>Select the pair AUD&rarr;USD and enter the amount to convert.</li>
                  <li>Place the conversion as an FX order at or near the market rate, then confirm. The USD becomes available to buy US securities.</li>
                </ul>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">The common mistake</p>
                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                  The most frequent error is letting the system auto-convert when you place a
                  US trade without first holding USD. That convenience often comes at a worse
                  rate than a deliberate FX conversion, quietly eroding the cost advantage that
                  made IBKR attractive in the first place.
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Converting deliberately also lets you choose the timing and the amount, and
                  keeps a clean FX record for your tax return.
                </p>
              </div>
            </div>

            <p className="text-[0.65rem] text-slate-500 max-w-3xl">
              FX pricing and minimum fees can change; check IBKR&apos;s current schedule. For a
              broader comparison of conversion options, see our{" "}
              <Link href="/global-investing/currency/best-fx-providers" className="text-amber-700 hover:underline font-semibold">
                best FX providers guide
              </Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key settings ───────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Configuration</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">Key settings to configure</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            Once the account is live, a few settings are worth getting right early so the
            platform behaves the way you expect and your reporting stays clean.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Market-data subscriptions", body: "Real-time ASX and US data are paid subscriptions; delayed data is free. Subscribe only to the bundles you actually need to keep costs down." },
              { title: "W-8BEN (and re-certification)", body: "Confirm your W-8BEN is lodged and valid so US dividends are withheld at 15% rather than 30%. Note when it needs re-certifying." },
              { title: "Dividend handling", body: "Set your preference for how dividends are handled — for example a dividend-reinvestment election where offered, versus taking dividends as cash." },
              { title: "Statement delivery", body: "Choose how and how often you receive Activity Statements and reports. Electronic delivery keeps the records you will need at tax time." },
              { title: "Two-factor authentication", body: "Enable two-factor authentication via IBKR Mobile or a security device. This materially protects an account that can move money and hold securities." },
              { title: "Trading permissions", body: "Review which markets and products you are enabled for, and request additional permissions only as you need them — some require extra agreements." },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">{item.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Costs ──────────────────────────────────────────────────────── */}
      <section id="costs" className="bg-white border-b border-slate-100 py-10 scroll-mt-4">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Costs</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">What an IBKR account costs</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            Costs fall into a few buckets: brokerage per trade, currency conversion,
            optional market data, and occasional account fees. The figures below are
            indicative — always check IBKR&apos;s current schedule before relying on them.
          </p>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-xs md:text-sm" aria-label="IBKR account costs — brokerage, FX conversion and data fees">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600">Cost item</th>
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600">Indicative amount</th>
                  <th scope="col" className="text-left px-4 py-3 font-bold text-slate-600 hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody>
                {COSTS.map((row, i) => (
                  <tr key={row.item} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {row.item}
                      <div className="text-[0.6rem] text-slate-500 font-normal mt-1 md:hidden">{row.note}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-mono text-[0.65rem]">{row.cost}</td>
                    <td className="px-4 py-3 text-slate-600 leading-relaxed hidden md:table-cell">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[0.65rem] text-slate-500 mt-3 max-w-3xl">
            Pricing varies by plan (tiered vs fixed), market and currency, and changes over
            time. Treat these as a guide to the shape of the fees, not exact quotes.
          </p>
        </div>
      </section>

      {/* ── Tax + custody ──────────────────────────────────────────────── */}
      <section id="tax" className="bg-slate-50 border-b border-slate-100 py-10 scroll-mt-4">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Tax &amp; ownership</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">Tax reporting and how your shares are held</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            Two things trip people up at year-end: getting the right statements out of IBKR,
            and understanding that ASX shares bought here are not CHESS-sponsored.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Tax reporting */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">Tax reporting</p>
              <p className="text-sm font-bold text-slate-900 mb-2">Getting your figures for the ATO</p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                IBKR provides an <strong>Activity Statement</strong> and annual reports from
                the portal, and where available an <strong>Australian tax report</strong> that
                presents the numbers in a more local format. Download whichever is offered for
                your account.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                For your return you reconcile <strong>dividends</strong> (including any foreign
                withholding tax, which may support a Foreign Income Tax Offset),{" "}
                <strong>capital gains in AUD</strong> using the exchange rate on each
                transaction date, and any <strong>interest</strong>. Keep the transaction-date
                rates because cost base and proceeds must be expressed in AUD. Remember foreign
                dividends carry no franking credits.
              </p>
              <Link href="/global-investing/tax" className="text-[0.65rem] font-bold text-amber-700 hover:underline">
                Global investing tax guide &rarr;
              </Link>
            </div>

            {/* CHESS vs custody */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2">Ownership model</p>
              <p className="text-sm font-bold text-slate-900 mb-2">CHESS vs IBKR custody</p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                ASX shares bought through IBKR are held under{" "}
                <strong>IBKR&apos;s custody model</strong> — they are not CHESS-sponsored, so
                there is no Holder Identification Number (HIN) and your name does not sit on the
                issuer-sponsored CHESS subregister. Some Australians prefer a CHESS-sponsored
                broker specifically for their ASX holdings.
              </p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                For <strong>international shares</strong>, IBKR&apos;s arrangement still gives
                you direct ownership in your name, and US holdings can be transferred out via
                DRS (direct registration). Weigh CHESS sponsorship for ASX shares against
                IBKR&apos;s lower international costs.
              </p>
              <Link href="/global-investing/guides/chess-vs-custodial-international" className="text-[0.65rem] font-bold text-amber-700 hover:underline">
                CHESS vs custodial: full guide &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Beginner tips ──────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">For beginners</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">Tips if you are new to IBKR</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6 max-w-3xl">
            The platform is powerful, which can be intimidating at first. A few habits keep
            things simple while you find your feet.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {BEGINNER_TIPS.map((tip) => (
              <div key={tip.title} className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                <p className="text-sm font-bold text-slate-900 mb-2">{tip.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{tip.body}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-4 max-w-3xl">
            <p className="text-[0.7rem] text-slate-700 leading-relaxed">
              <strong>Order types in one line:</strong> a <em>market order</em> fills
              immediately at the best available price; a <em>limit order</em> fills only at
              your specified price or better. New investors generally favour limit orders to
              avoid surprises, especially outside main trading hours.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-b border-slate-100 py-10">
        <div className="container-custom max-w-3xl">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">FAQ</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none font-semibold text-sm text-slate-900 hover:bg-slate-50 transition-colors">
                  <span>{faq.q}</span>
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">
                    &#8964;
                  </span>
                </summary>
                <div className="px-5 pb-5 pt-1">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related ────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-slate-100 py-10">
        <div className="container-custom">
          <p className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 mb-1">Keep reading</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-5">Related guides</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { href: "/global-investing/shares/us", label: "US share brokers compared", desc: "How IBKR stacks up against Stake, CMC and others for US shares." },
              { href: "/global-investing/tax/w-8ben", label: "W-8BEN guide", desc: "Claim the 15% US dividend withholding rate instead of 30%." },
              { href: "/global-investing/currency/best-fx-providers", label: "Best FX providers", desc: "Compare currency-conversion options for moving AUD abroad." },
              { href: "/global-investing/guides/chess-vs-custodial-international", label: "CHESS vs custodial", desc: "What direct registration versus a nominee model means in practice." },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group block bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-amber-300 hover:shadow-md transition-all"
              >
                <p className="font-bold text-slate-900 text-sm mb-2 group-hover:text-amber-700">{card.label}</p>
                <p className="text-xs text-slate-600 leading-relaxed">{card.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance footer ──────────────────────────────────────────── */}
      <section className="bg-slate-50 border-t border-slate-100 py-6">
        <div className="container-custom">
          <p className="text-[0.65rem] text-slate-500 leading-relaxed max-w-4xl">
            This guide is general information about setting up and using a brokerage account
            and is not a recommendation to use any particular broker or product. {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
