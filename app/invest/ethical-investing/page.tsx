import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Ethical Investing Australia (${CURRENT_YEAR}) — ESG, Screening & Greenwashing Guide`,
  description: `ESG and ethical investing in Australia: top ETFs (ETHI, VESG, IESG), greenwashing red flags, RIAA certification, and the performance debate. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Ethical Investing Australia (${CURRENT_YEAR}) — ESG Guide`,
    description:
      "How ethical investing works in Australia — screening types, top ESG ETFs, greenwashing risks, RIAA certification, and how to check your super fund.",
    url: `${SITE_URL}/invest/ethical-investing`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Ethical Investing Australia")}&sub=${encodeURIComponent("ESG · Screening · Greenwashing · RIAA · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/invest/ethical-investing` },
};

// ─── Data ────────────────────────────────────────────────────────────────────

const SCREENING_TYPES = [
  {
    type: "Negative Screening",
    description:
      "Excludes companies or industries that conflict with ethical values. The most common approach — you choose what to avoid.",
    examples: "Tobacco, weapons manufacturers, thermal coal mining, gambling, adult entertainment, cluster munitions",
    colour: "red",
  },
  {
    type: "Positive Screening",
    description:
      "Actively seeks out companies that contribute positively to society or the environment. Only invest in industries that pass a minimum threshold.",
    examples: "Renewable energy, healthcare, education, water infrastructure, affordable housing",
    colour: "green",
  },
  {
    type: "ESG Integration",
    description:
      "All companies are scored on Environmental, Social, and Governance criteria alongside financial metrics. Lower-scoring companies are underweighted or excluded.",
    examples: "MSCI ESG ratings, Sustainalytics scores applied across all sectors — including oil & gas companies that score well on governance",
    colour: "blue",
  },
  {
    type: "Impact Investing",
    description:
      "Capital is directed specifically to projects or businesses designed to generate a measurable positive social or environmental outcome alongside financial return.",
    examples: "Green bonds, social impact bonds, community development finance, sustainability-linked loans",
    colour: "purple",
  },
];

const ESG_ETFS = [
  {
    ticker: "ETHI",
    name: "BetaShares Global Sustainability Leaders ETF",
    manager: "BetaShares",
    mer: "0.59% p.a.",
    index: "Nasdaq Future Global Sustainability Leaders Index",
    exclusions: "Fossil fuels, weapons, tobacco, gambling, alcohol, animal testing",
    note: "One of the most widely held ethical ETFs in Australia",
  },
  {
    ticker: "VESG",
    name: "Vanguard Ethically Conscious International Shares ETF",
    manager: "Vanguard",
    mer: "0.18% p.a.",
    index: "FTSE Developed ex Australia Choice Index",
    exclusions:
      "Fossil fuel companies, weapons, tobacco, gambling, adult entertainment, nuclear power",
    note: "Lowest MER among the major ethical ETFs",
  },
  {
    ticker: "IESG",
    name: "iShares Core MSCI World ex Australia ESG Leaders ETF",
    manager: "BlackRock (iShares)",
    mer: "0.09% p.a.",
    index: "MSCI World ex Australia ESG Leaders Index",
    exclusions:
      "Controversial weapons, tobacco, thermal coal, companies with MSCI ESG rating below BB",
    note: "Uses ESG integration rather than hard exclusion — some fossil fuel exposure possible",
  },
  {
    ticker: "RARI",
    name: "Russell Investments Australian Responsible Investment ETF",
    manager: "Russell Investments",
    mer: "0.45% p.a.",
    index: "Russell Australia ESG Responsible Investment Index",
    exclusions:
      "Controversial weapons, tobacco, gambling; screens ASX-listed companies using ESG scores",
    note: "Australian shares focus; useful for local equity exposure in an ethical portfolio",
  },
];

const GREENWASHING_FLAGS = [
  {
    flag: "Vague language, no exclusion list",
    detail:
      "A fund using terms like 'sustainable', 'responsible', or 'ESG-aware' without publishing a clear exclusion list may hold fossil fuel companies, weapons manufacturers, or tobacco stocks. Always check the Product Disclosure Statement (PDS) for specific exclusions.",
  },
  {
    flag: "High fossil fuel weighting despite 'sustainable' label",
    detail:
      "Some ESG integration funds still hold oil & gas companies if those companies score well on governance. If a fund labelled 'sustainable' has significant weighting in Santos, Woodside, or Shell, check how it defines sustainability.",
  },
  {
    flag: "No third-party certification",
    detail:
      "Funds without independent verification (e.g. RIAA certification or Morningstar ESG rating) are self-assessed. Self-reported ESG claims have no external accountability mechanism.",
  },
  {
    flag: "Carbon intensity close to benchmark",
    detail:
      "A well-constructed ethical fund should have materially lower carbon intensity than the standard market index. If a 'low carbon' fund's carbon footprint is similar to the ASX 200, it is likely making minimal real-world exclusions.",
  },
  {
    flag: "Holdings not publicly disclosed",
    detail:
      "Reputable ETFs and managed funds disclose their full holdings regularly. If a fund does not publish portfolio constituents, you cannot verify whether it practises what it preaches.",
  },
];

const MISCONCEPTIONS = [
  {
    myth: "Ethical investing always means lower returns",
    reality:
      "The historical evidence is mixed but leans against this myth. The MSCI ESG Leaders Index has tracked closely with the MSCI World over the past decade, and some ESG indices have outperformed conventional benchmarks. ESG-screened portfolios avoid certain industries (e.g. tobacco, coal) that have faced regulatory and market headwinds — a form of risk management. The performance gap, if any, varies by time period, screen type, and market environment.",
  },
  {
    myth: "All 'green' funds exclude fossil fuels",
    reality:
      "Not true. ESG integration funds score companies on environmental criteria but may still hold oil & gas companies that score well on governance or emissions management relative to peers. Only funds with explicit negative screening rules exclude fossil fuels outright. Read the exclusion policy in the PDS — 'ESG' and 'excludes fossil fuels' are not synonymous.",
  },
  {
    myth: "You can't build a diversified ethical portfolio",
    reality:
      "The range of ethical investment options has expanded dramatically. You can now build a fully diversified ethical portfolio using ESG ETFs covering Australian shares, global developed markets, emerging markets, property (via REITs that exclude certain sectors), and bonds (green bonds, sustainability-linked bonds). Diversification across asset classes is entirely achievable.",
  },
  {
    myth: "Ethical investing is only for wealthy investors",
    reality:
      "You can access ASX-listed ethical ETFs like ETHI or VESG with as little as one unit (typically $50–$120 depending on price). Superannuation members can switch to an ethical investment option within their existing fund at no direct cost. Ethical investing is accessible to anyone with a brokerage account or an employer super fund.",
  },
];

const HOW_TO_START_STEPS = [
  {
    step: 1,
    title: "Review your superannuation option",
    detail:
      "Your largest investment is often your super. Log in to your fund's member portal and check which investment option your money is currently in. Most major funds now offer at least one ethical or ESG option — switching is usually free and takes effect within a few business days.",
  },
  {
    step: 2,
    title: "Choose your screening approach",
    detail:
      "Decide what matters most to you: hard exclusions (tobacco, weapons, coal), positive selection (renewables, healthcare), ESG integration, or a blend. Your answer determines which ETFs and funds are appropriate. Negative screening gives you the clearest exclusions; ESG integration gives broader market exposure with ESG tilt.",
  },
  {
    step: 3,
    title: "Open a brokerage account",
    detail:
      "To buy ASX-listed ethical ETFs (ETHI, VESG, IESG, RARI), you need a brokerage account. Several Australian platforms charge under $10 per trade. Compare platforms that suit your planned trade frequency and portfolio size.",
  },
  {
    step: 4,
    title: "Select and purchase your ETF(s)",
    detail:
      "Start with one or two core ethical ETFs to build broad market exposure. Add sector-specific or thematic funds (e.g. clean energy, healthcare) over time. Ensure your combination covers different geographies — Australian ethical ETFs and global ethical ETFs serve different purposes.",
  },
  {
    step: 5,
    title: "Invest regularly and review annually",
    detail:
      "Regular contributions (dollar-cost averaging) reduce the impact of market timing. Review your portfolio annually — ETF holdings and exclusion policies can change when an index reconstitutes, so re-read the PDS of existing holdings each year.",
  },
];

const FAQS = [
  {
    q: "Do ethical investments perform worse than conventional ones?",
    a: "The short answer is: not significantly, and sometimes better. The MSCI ESG Leaders Index has historically tracked the broader MSCI World closely over multi-year periods. Some ESG indices have outperformed by avoiding industries — such as tobacco and thermal coal — that faced regulatory headwinds and declining valuations. Performance varies by fund, time period, and which exclusions apply. Choosing ethical funds does not mean accepting materially lower returns, but past performance does not guarantee future results.",
  },
  {
    q: "What does RIAA certification mean?",
    a: "RIAA (Responsible Investment Association Australasia) is an independent industry body that certifies investment products meeting defined responsible investment criteria. A RIAA-certified product has been independently assessed to ensure its responsible investment claims — exclusions, ESG integration approach, or impact objectives — are accurate and consistently applied. Certification must be renewed annually. You can search RIAA's product database at responsiblereturns.com.au to check whether a specific fund is certified and what criteria it meets.",
  },
  {
    q: "How do I know if my super is invested ethically?",
    a: "Log in to your super fund's member portal and locate the 'investment options' or 'how your money is invested' section. Check which option is currently selected — most default options hold broad market shares including fossil fuel companies. Look for options labelled 'ethical', 'sustainable', 'ESG', or 'responsible'. Then read the investment option's factsheet to confirm what is actually excluded. If your fund does not offer a suitable option, you can consolidate super into a fund that does, such as Australian Ethical Super or Future Super Fund.",
  },
  {
    q: "What's the difference between ESG and sustainable investing?",
    a: "ESG (Environmental, Social, Governance) is a framework for assessing companies — it describes a scoring methodology applied to investment analysis. Sustainable investing is a broader term describing investment strategies that incorporate ESG factors, ethical screens, or impact goals. All sustainable investment funds use ESG data in some form, but not all ESG-integrated funds would be described as 'sustainable' by most investors. The most common confusion: ESG integration (where ESG scores inform weighting but don't exclude entire industries) is very different from a fund with hard exclusion lists for fossil fuels, weapons, or gambling.",
  },
  {
    q: "Can I build a diversified ethical portfolio?",
    a: "Yes. A simple two-ETF ethical portfolio could combine VESG (global developed markets, ethical screen) with RARI or a domestic ESG option for Australian shares. From there, you can add global emerging market ethical exposure, green bonds, or thematic ETFs (clean energy, healthcare). Super members can often find multi-asset ethical options within their existing fund. Ethical investing no longer requires sacrificing diversification — the product range has expanded significantly over the past decade.",
  },
];

// ─── Page Component ───────────────────────────────────────────────────────────

export default function EthicalInvestingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Investing", url: `${SITE_URL}/invest` },
    { name: "Ethical Investing" },
  ]);

  const faqSchema = faqJsonLd(FAQS);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-6 flex-wrap"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <span className="text-slate-300">/</span>
            <Link href="/invest" className="hover:text-slate-900 transition-colors">
              Investing
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Ethical Investing</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              {UPDATED_LABEL}
            </span>
            <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
              ESG &amp; Responsible Investing
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900 max-w-3xl">
            Ethical Investing in Australia{" "}
            <span className="text-emerald-600">({CURRENT_YEAR})</span>
          </h1>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mb-6">
            Ethical investing — also called responsible investing or ESG investing — means putting your
            money to work in a way that reflects your values. It covers everything from excluding harmful
            industries (tobacco, weapons, fossil fuels) to actively selecting companies driving positive
            environmental or social outcomes, to engaging as a shareholder to push companies to improve.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mb-6">
            This guide explains how the different screening approaches work, which ASG-listed ethical
            ETFs are available, how to spot greenwashing, what RIAA certification means, and how to
            check whether your superannuation is invested ethically.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="#screening-types"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
            >
              Screening Types →
            </Link>
            <Link
              href="#esg-etfs"
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
            >
              ESG ETFs →
            </Link>
            <Link
              href="#superannuation"
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
            >
              Super Options →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Key Stats ───────────────────────────────────────────────────── */}
      <section className="py-8 bg-emerald-50 border-b border-emerald-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "$33B+", label: "In RIAA-certified responsible investments in Australia" },
              { value: "40%+", label: "Of Australians prefer ethical investment options in their super" },
              { value: "0.09%", label: "Lowest MER on an ASX-listed ethical ETF (IESG)" },
              { value: "1,000+", label: "Products certified by RIAA globally" },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white border border-emerald-200 rounded-xl p-4 text-center"
              >
                <p className="text-2xl font-extrabold text-emerald-700">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1 leading-snug">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What Is Ethical Investing ───────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Section 1
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
            What Is Ethical Investing?
          </h2>
          <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-4">
            <p>
              Ethical investing is an umbrella term for investment strategies that incorporate
              non-financial considerations — your values, social concerns, or environmental
              priorities — alongside traditional financial analysis. It is not a single approach
              but a family of related strategies that differ in what they exclude, what they seek
              out, and how deeply ESG factors are embedded in the investment process.
            </p>
            <p>
              There are three broad mechanisms through which ethical investors try to influence
              outcomes:
            </p>
          </div>
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            {[
              {
                icon: "✕",
                title: "Exclusion",
                desc: "Refusing to hold shares in companies or industries that conflict with your values — tobacco, weapons, fossil fuels, gambling. The most direct and transparent approach.",
                bg: "bg-red-50 border-red-200",
                iconBg: "bg-red-100 text-red-700",
              },
              {
                icon: "+",
                title: "Positive Selection",
                desc: "Actively seeking companies that demonstrate best-in-class ESG practices, or that operate in industries with positive social or environmental purpose.",
                bg: "bg-emerald-50 border-emerald-200",
                iconBg: "bg-emerald-100 text-emerald-700",
              },
              {
                icon: "↗",
                title: "Shareholder Engagement",
                desc: "Using the rights of share ownership to vote on resolutions and engage company boards on climate, governance, human rights, and executive pay practices.",
                bg: "bg-blue-50 border-blue-200",
                iconBg: "bg-blue-100 text-blue-700",
              },
            ].map((m) => (
              <div key={m.title} className={`rounded-xl border p-5 ${m.bg}`}>
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-3 ${m.iconBg}`}
                >
                  {m.icon}
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{m.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Important distinction:</strong> ethical investing is
              about the criteria used to select investments — it does not mean the financial
              objectives are secondary. Most ethical funds aim to deliver market-rate or
              better-than-market returns; the screens simply restrict the investment universe.
            </p>
          </div>
        </div>
      </section>

      {/* ── Screening Types ─────────────────────────────────────────────── */}
      <section id="screening-types" className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Section 2
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Types of Ethical Screening
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-8">
            Not all ethical funds use the same approach. Understanding which screening method a fund
            uses is critical — the method determines which companies end up in the portfolio.
          </p>

          <div className="space-y-4">
            {SCREENING_TYPES.map((s) => (
              <div
                key={s.type}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="flex items-start gap-4 p-5">
                  <div
                    className={`shrink-0 mt-0.5 w-2.5 h-2.5 rounded-full ${
                      s.colour === "red"
                        ? "bg-red-500"
                        : s.colour === "green"
                          ? "bg-emerald-500"
                          : s.colour === "blue"
                            ? "bg-blue-500"
                            : "bg-purple-500"
                    }`}
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 mb-1">{s.type}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-3">{s.description}</p>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">Examples: </span>
                        {s.examples}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-bold text-amber-900 mb-2 text-sm">Practical note</h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              Many funds combine multiple approaches — for example, applying negative screens to
              exclude tobacco and weapons, then using ESG integration to rank the remaining
              companies. Always read the Product Disclosure Statement (PDS) to understand exactly
              which approach(es) a specific fund uses.
            </p>
          </div>
        </div>
      </section>

      {/* ── Australian ESG ETFs ─────────────────────────────────────────── */}
      <section id="esg-etfs" className="py-12 md:py-16 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Section 3
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Australian ESG ETFs Compared
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            The following ASX-listed ETFs are the most widely held ethical investment vehicles
            available to Australian investors. MERs and exclusion policies are sourced from each
            manager&apos;s current PDS and may change — verify before investing.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse" aria-label="Australian ESG ETFs compared">
              <thead>
                <tr className="bg-slate-50">
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200 whitespace-nowrap">
                    Ticker
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Fund
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200 whitespace-nowrap">
                    MER
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200 hidden md:table-cell">
                    Index Tracked
                  </th>
                  <th scope="col" className="text-left py-3 px-4 font-semibold text-slate-700 border-b border-slate-200">
                    Key Exclusions
                  </th>
                </tr>
              </thead>
              <tbody>
                {ESG_ETFS.map((etf, i) => (
                  <tr key={etf.ticker} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                    <td className="py-3 px-4 font-bold text-emerald-700 border-b border-slate-100 whitespace-nowrap align-top">
                      {etf.ticker}
                    </td>
                    <td className="py-3 px-4 border-b border-slate-100 align-top">
                      <p className="font-semibold text-slate-800 leading-snug">{etf.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{etf.manager}</p>
                      <p className="text-xs text-emerald-700 mt-1 italic">{etf.note}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-800 border-b border-slate-100 whitespace-nowrap align-top">
                      {etf.mer}
                    </td>
                    <td className="py-3 px-4 text-slate-500 border-b border-slate-100 hidden md:table-cell align-top text-xs leading-relaxed">
                      {etf.index}
                    </td>
                    <td className="py-3 px-4 text-slate-500 border-b border-slate-100 text-xs leading-relaxed align-top">
                      {etf.exclusions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            MERs are indicative as at {CURRENT_YEAR}. Always verify in the current PDS. Past
            performance is not a reliable indicator of future performance.
          </p>

          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <h3 className="font-bold text-slate-900 text-sm mb-2">
                Lowest cost: IESG (0.09% p.a.)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                iShares IESG uses ESG Leaders integration — it tracks companies with high ESG
                scores relative to peers. It may still hold some fossil fuel companies if those
                companies score well on governance. Lowest MER in the category.
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h3 className="font-bold text-emerald-900 text-sm mb-2">
                Strictest exclusions: ETHI
              </h3>
              <p className="text-xs text-emerald-800 leading-relaxed">
                BetaShares ETHI applies hard exclusions across fossil fuels, weapons, tobacco,
                gambling, alcohol and animal testing. Higher MER (0.59%) reflects the stricter
                screening and sustainability leadership methodology.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Greenwashing ────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Section 4
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Greenwashing: How to Spot It
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Greenwashing occurs when a fund markets itself as ethical or sustainable without
            meaningfully restricting its investment universe. The Australian Securities and
            Investments Commission (ASIC) has taken enforcement action against greenwashing in
            financial products. Here are the key red flags.
          </p>

          <div className="space-y-3">
            {GREENWASHING_FLAGS.map((item, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold mt-0.5">
                    !
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1">{item.flag}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <h3 className="font-bold text-emerald-900 mb-2">Look for RIAA certification</h3>
            <p className="text-sm text-emerald-800 leading-relaxed">
              The Responsible Investment Association Australasia (RIAA) independently certifies
              investment products that meet its responsible investment criteria. A RIAA-certified
              fund has had its ESG claims assessed by an independent third party and must renew
              certification annually. You can search certified products at{" "}
              <span className="font-semibold">responsiblereturns.com.au</span>.
            </p>
          </div>
        </div>
      </section>

      {/* ── Performance Debate ──────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Section 5
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            The Performance Debate: Does Ethical = Lower Returns?
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            The persistent myth that ethical investing requires a financial sacrifice is not
            well-supported by the evidence, though the picture is nuanced.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3 text-sm">
                MSCI ESG Leaders vs MSCI World
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "10-year annualised (to 2024)",
                    esg: "Similar to benchmark",
                    world: "—",
                  },
                  { label: "2020 COVID crash recovery", esg: "Outperformed", world: "Underperformed" },
                  {
                    label: "2022 (energy price spike)",
                    esg: "Underperformed",
                    world: "Outperformed",
                  },
                  {
                    label: "Carbon intensity",
                    esg: "~40% lower than benchmark",
                    world: "Market average",
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0 gap-3"
                  >
                    <span className="text-xs text-slate-500 shrink-0 w-40 leading-snug">
                      {row.label}
                    </span>
                    <span className="text-xs font-semibold text-emerald-700 text-right">
                      {row.esg}
                    </span>
                    {row.world !== "—" && (
                      <span className="text-xs text-slate-400 text-right">{row.world}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3 text-sm">The ESG risk argument</h3>
              <div className="space-y-3">
                {[
                  {
                    point: "Stranded asset risk",
                    detail:
                      "Fossil fuel companies face regulatory transition risk. ESG funds that exclude coal and oil avoid the financial risk of assets that may become uneconomic.",
                  },
                  {
                    point: "Governance quality",
                    detail:
                      "Companies with strong governance tend to avoid scandals, regulatory penalties, and management failures that destroy shareholder value.",
                  },
                  {
                    point: "Social licence",
                    detail:
                      "Businesses with poor labour practices or community relationships face operational disruption. ESG screens can filter out operationally fragile companies.",
                  },
                ].map((item) => (
                  <div key={item.point} className="flex gap-2 items-start">
                    <span className="text-emerald-500 text-xs font-bold mt-0.5 shrink-0">✓</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{item.point}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong className="text-amber-900">Key caveat:</strong> 2022 demonstrated that ESG
              funds can underperform in environments where excluded sectors (energy, defence)
              surge in value — as they did following Russia&apos;s invasion of Ukraine. Short-term
              relative performance will fluctuate based on which industries are excluded and
              prevailing market conditions. Evaluate performance over full market cycles, not single
              years.
            </p>
          </div>
        </div>
      </section>

      {/* ── RIAA Certification ──────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Section 6
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">RIAA Certification Explained</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            The Responsible Investment Association Australasia (RIAA) is the peak body for
            responsible investing in Australia and New Zealand. Its certification programme provides
            independent verification that a financial product&apos;s responsible investment claims
            are accurate.
          </p>

          <div className="grid sm:grid-cols-2 gap-5 mb-6">
            {[
              {
                title: "What RIAA assesses",
                points: [
                  "Whether the fund's stated ESG criteria are actually implemented",
                  "That exclusions listed in marketing match the actual portfolio",
                  "Annual renewal — certification must be re-earned each year",
                  "The robustness and consistency of the ESG integration process",
                ],
              },
              {
                title: "What RIAA does not guarantee",
                points: [
                  "That the fund will outperform conventional benchmarks",
                  "That all ESG risks are absent from the portfolio",
                  "That the fund aligns with every investor's personal values",
                  "That impact claims (where made) will achieve stated outcomes",
                ],
              },
            ].map((col) => (
              <div key={col.title} className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-900 text-sm mb-3">{col.title}</h3>
                <ul className="space-y-2">
                  {col.points.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <span className="text-emerald-500 text-xs font-bold mt-0.5 shrink-0">›</span>
                      <span className="text-xs text-slate-600 leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-5">
            <h3 className="font-bold text-emerald-900 mb-2 text-sm">How to check a fund</h3>
            <ol className="space-y-2">
              {[
                "Go to responsiblereturns.com.au (RIAA's consumer-facing product database)",
                "Search by fund name, manager, or product type",
                "Check the certification badge and last renewal date",
                "Read the fund summary to understand which criteria were assessed",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Superannuation ──────────────────────────────────────────────── */}
      <section id="superannuation" className="py-12 md:py-16 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Section 7
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
            Ethical Superannuation Options
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            For most Australians, superannuation is their largest investment — often larger than
            their home equity. Switching your super&apos;s investment option to an ethical or ESG
            choice can be one of the most impactful financial decisions you make, and it typically
            costs nothing to do.
          </p>

          <div className="grid sm:grid-cols-2 gap-5 mb-8">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3 text-sm">
                How to check your super option
              </h3>
              <ol className="space-y-2.5">
                {[
                  "Log in to your super fund's member portal",
                  "Find 'Investment options' or 'How your money is invested'",
                  "Note your current option (often 'Balanced' or 'MySuper' by default)",
                  "Look for options labelled 'Ethical', 'Sustainable', 'ESG', or 'Responsible'",
                  "Read the investment option factsheet to see what is actually excluded",
                  "Switch online — most funds process within 2–5 business days",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-slate-600">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[0.6rem] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-900 mb-3 text-sm">
                Funds with dedicated ethical options
              </h3>
              <div className="space-y-3">
                {[
                  {
                    name: "Australian Ethical Super",
                    detail:
                      "Specialist ethical super fund — all investment options apply ethical screens. No mainstream default option available.",
                  },
                  {
                    name: "Future Super Fund",
                    detail:
                      "Fossil-fuel-free by design. Hard exclusions applied across all options, including property and alternatives.",
                  },
                  {
                    name: "Major industry funds",
                    detail:
                      "AustralianSuper, Aware Super, Hostplus and most large industry funds now offer at least one ethical or 'Sustainable' investment option alongside mainstream options.",
                  },
                ].map((fund) => (
                  <div key={fund.name} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-semibold text-slate-800">{fund.name}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{fund.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h3 className="font-bold text-amber-900 text-sm mb-2">What to watch for in super</h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              Super fund ethical options vary significantly in strictness. Some &apos;ethical&apos;
              options within mainstream funds apply only light ESG integration (similar to IESG) while
              purpose-built ethical funds apply hard exclusions. Before switching, check the
              investment option&apos;s PDS for specific exclusions — not just the marketing label.
              Also consider fees: some ethical options within mainstream funds charge higher investment
              management fees than the default balanced option.
            </p>
          </div>
        </div>
      </section>

      {/* ── Common Misconceptions ───────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Section 8
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Common Misconceptions</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Ethical investing is surrounded by persistent myths. Here is what the evidence actually
            shows.
          </p>

          <div className="space-y-4">
            {MISCONCEPTIONS.map((item) => (
              <div key={item.myth} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                  <span className="text-red-600 text-xs font-bold">MYTH</span>
                  <p className="text-sm font-semibold text-red-800">{item.myth}</p>
                </div>
                <div className="px-5 py-4 flex items-start gap-2">
                  <span className="text-emerald-600 text-xs font-bold mt-0.5 shrink-0">REALITY</span>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.reality}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How to Start ────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Section 9
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">How to Start Ethical Investing</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-8">
            A practical five-step process for Australian investors building an ethical portfolio.
          </p>

          <div className="space-y-4">
            {HOW_TO_START_STEPS.map((s) => (
              <div key={s.step} className="flex items-start gap-4 bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/compare"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg transition-colors"
            >
              Compare Share Brokers →
            </Link>
            <Link
              href="/advisors"
              className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors border border-slate-200"
            >
              Find a Financial Adviser →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Related Guides ──────────────────────────────────────────────── */}
      <section className="py-12 md:py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Related Guides
          </p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Explore Related Investment Topics
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "ETF Hub — All ETF Categories",
                href: "/etfs",
                desc: "Compare every ASX-listed ETF by category, MER, performance, and distribution yield.",
              },
              {
                title: "Renewable Energy Investing",
                href: "/invest/renewable-energy",
                desc: "How to invest directly in Australian renewable energy projects and listed clean energy funds.",
              },
              {
                title: "Managed Funds Guide",
                href: "/invest/managed-funds",
                desc: "Compare passive and active managed funds — including ethical and impact-focused options.",
              },
              {
                title: "Halal Investing in Australia",
                href: "/halal-investing",
                desc: "Shariah-compliant investment options available to Australian investors.",
              },
            ].map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-emerald-200 hover:shadow-md transition-all"
              >
                <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mb-1">
                  {guide.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">{guide.desc}</p>
                <span className="inline-flex items-center text-emerald-600 text-xs font-semibold mt-3">
                  Read guide →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">FAQ</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group bg-white border border-slate-200 rounded-xl">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors list-none">
                  {faq.q}
                  <svg
                    className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-180 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────── */}
      <section className="py-12 bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white">
        <div className="container-custom text-center max-w-xl">
          <h2 className="text-xl font-extrabold mb-3">Build an ethical portfolio</h2>
          <p className="text-sm text-emerald-100 mb-6">
            Compare platforms that offer ASX-listed ethical ETFs — or find a financial adviser who
            specialises in responsible investing.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/compare"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm rounded-xl transition-colors"
            >
              Compare Brokers →
            </Link>
            <Link
              href="/advisors"
              className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold text-sm rounded-xl transition-colors"
            >
              Find an Adviser →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ──────────────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
