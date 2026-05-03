import Link from "next/link";
import type { Metadata } from "next";
import Icon from "@/components/Icon";
import {
  breadcrumbJsonLd,
  SITE_URL,
  SITE_NAME,
  CURRENT_YEAR,
} from "@/lib/seo";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 3600;
// Build-touch 2026-05-03 — force fresh prerender (cached version had stuck client-render).

export const metadata: Metadata = {
  title: `Invest in Royalty Streams in Australia (${CURRENT_YEAR}) — Mining, Music & IP Royalties`,
  description:
    "Independent guide to royalty investing in Australia. Mining royalties (Deterra DRR), music catalogue royalties, IP / patent royalties, oil & gas overriding royalties — structures, tax and access.",
  alternates: { canonical: `${SITE_URL}/invest/royalties` },
  openGraph: {
    title: `Invest in Royalty Streams in Australia (${CURRENT_YEAR})`,
    description:
      "Mining royalty streams, music catalogue royalties, IP royalties and oil & gas overriding royalties — Australian context.",
    url: `${SITE_URL}/invest/royalties`,
  },
};

const WAYS_TO_INVEST = [
  {
    id: "mining-royalties",
    label: "Mining royalty streams",
    body:
      "Mining royalty companies hold the right to a percentage of revenue (gross-revenue royalty) or net smelter return (NSR) from a producing mineral asset, without bearing operating cost or capex risk. Deterra Royalties (ASX: DRR) — spun out of Iluka in 2020 — is the dominant ASX-listed pure-play, holding a 1.232% NSR over BHP's Mining Area C iron ore tenements in WA. Elemental Altus Royalties (ASX: ELT) is a global gold-focused royalty player. Cash flow is operator-driven and royalty holders rank above equity but below senior debt in distress scenarios.",
    cta: { label: "Find a royalty broker", href: "/advisors/royalty-brokers" },
  },
  {
    id: "music-royalties",
    label: "Music catalogue royalties",
    body:
      "Music royalties — performance, mechanical and synchronisation income on a catalogue of songs — became an institutional asset class through funds like Hipgnosis Songs Fund (UK-listed), Round Hill Music and Concord. The US-listed Royalty Exchange platform offers fractional access to specific catalogues. In Australia, retail access is via wholesale-fund vehicles and listed UK / US wrappers; APRA AMCOS distributes performance royalties domestically. Returns are bond-like with optional growth from sync demand and inflation indexing.",
    cta: { label: "Compare wholesale fund managers", href: "/advisors/resources-fund-managers" },
  },
  {
    id: "ip-royalties",
    label: "IP & patent royalties",
    body:
      "Patent and IP royalties pay licence fees on protected technology — university tech-transfer offices (CSIRO, UniMelb, UNSW) license discoveries to industry; specialised IP funds (e.g. Fortress IP, IPwe) buy or finance patent portfolios. The asset class is opaque, valuation-heavy and concentrated in litigation outcomes. Best suited to wholesale investors with patent counsel in place. Australian capital gains rules treat patent licence fees as ordinary income, not capital gains.",
    cta: { label: "Find a wealth manager", href: "/advisors/wealth-managers" },
  },
  {
    id: "petroleum-royalties",
    label: "Oil & gas overriding royalties",
    body:
      "Overriding royalties (ORRIs) pay a percentage of petroleum production revenue — typically 1%–5% — independent of working-interest economics. Net-profits royalties pay a share of net cash flow. Sliding-scale royalties step up with Brent or Henry Hub price bands. Domestic transactions overlap with state petroleum royalty regimes (WA, QLD, NT) and the federal PRRT. This is the income side of the oil-gas thesis covered separately on /invest/oil-gas.",
    cta: { label: "Find a petroleum royalties advisor", href: "/advisors/petroleum-royalties-advisors" },
  },
  {
    id: "asx-royalty-plays",
    label: "ASX-listed royalty plays",
    body:
      "Direct equity exposure via ASX is the most liquid route for retail investors. Deterra Royalties (DRR) trades on a trailing dividend yield around 5%, paid out near-100% of free cash flow. Lynas Rare Earths (LYC) has a residual royalty over Mt Weld processed through its Malaysian plant. Sandfire Resources (SFR) and other named royalty residues exist on smaller mid-caps. Listed exposure carries equity volatility but eliminates direct-deal minimums.",
    cta: { label: "Compare ASX brokers", href: "/compare?category=shares" },
  },
];

const FAQS = [
  {
    question: "How is a royalty deal structured in Australia?",
    answer:
      "Most direct royalty deals are structured as a deed of grant of royalty over a defined revenue stream — gross revenue, net smelter return (NSR), net profits, or a sliding-scale royalty linked to commodity price bands. The deed registers against the underlying tenement or asset where state law allows. The royalty holder receives quarterly or monthly payments, audit rights and a step-in right on operator default. Wholesale-investor terms are standard for non-listed deals; minimum allocations typically start at $250,000.",
  },
  {
    question: "How are royalty payments taxed for Australian residents?",
    answer:
      "Royalties received by an Australian resident are assessable as ordinary income under section 6-5 of ITAA 1997 — they are not capital gains and the 50% CGT discount does not apply. Mining and petroleum royalties paid to non-residents are subject to royalty withholding tax under section 12-280 of the TAA, generally 30% but reduced by applicable double-tax agreements (often to 5% or 10%). Trust distributions of royalty income retain their character at the beneficiary level. Always engage a tax adviser before signing a royalty deed.",
  },
  {
    question: "Can retail investors access royalty deals directly?",
    answer:
      "Most direct royalty deals are wholesale-only because they rely on the section 708 carve-outs from the disclosure regime. Section 708(8) (sophisticated investor: $250,000 income or $2.5M net assets) and section 708(11) (wholesale via accountant's certificate) are the typical gates. Retail investors get exposure indirectly through ASX-listed royalty companies (DRR, ELT) or registered managed investment schemes that hold royalty assets.",
  },
  {
    question: "What's the difference between an NSR and a gross-revenue royalty?",
    answer:
      "A gross-revenue royalty pays a percentage of total revenue at the mine gate before any operator deductions — simpler to administer and harder to dispute. A net smelter return (NSR) pays a percentage of revenue after refining, smelting and transport costs are deducted by the operator. NSRs are more common for precious-metals royalties; gross-revenue royalties are common in iron ore (the Deterra-BHP MAC royalty is gross-revenue based). Net-profits royalties pay a share of net cash flow and carry materially more variability.",
  },
  {
    question: "What are the main risks of royalty investing?",
    answer:
      "Operator concentration (one operator failing materially impacts cash flow), commodity price exposure (royalty income is leveraged to producer revenue, not cost), policy risk (state royalty regimes change), audit and disclosure risk (operators dispute royalty calculations), and illiquidity for direct deals. Music royalties add streaming-platform concentration and copyright-term decay. IP royalties add litigation outcome and patent-validity risk.",
  },
  {
    question: "What minimum allocation is typical for direct royalty deals?",
    answer:
      "Direct mining or petroleum royalty acquisitions typically need $250,000–$5M to be commercially viable for both parties. Music catalogue secondary sales on Royalty Exchange start at $5,000 but most institutional catalogues clear at $500K+. Wholesale royalty funds offered via private placement memorandum run $50,000–$250,000 minimums. ASX-listed royalty equities have no minimum beyond standard brokerage settlement size.",
  },
];

export default function RoyaltiesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Royalties" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Invest in Royalty Streams in Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/royalties`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-500 mb-6"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">
              Invest
            </Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">Royalties</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800">
              Income asset
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Independent research
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Updated {CURRENT_YEAR}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Invest in Royalty Streams in Australia
          </h1>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mb-6">
            Royalty income — paid as a percentage of revenue or net profits from
            an underlying asset — sits between bonds and equity in the capital
            stack. Australian retail investors can access mining royalties via
            ASX names like Deterra (DRR), or direct music, IP and petroleum
            royalty deals via the wholesale market.
          </p>

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
            {[
              { label: "DRR trailing yield", value: "~5%" },
              { label: "Direct deal minimum", value: "$250K+" },
              { label: "Royalty WHT (non-resident)", value: "30% / DTA" },
              { label: "ASX royalty pure-plays", value: "DRR · ELT" },
            ].map((s) => (
              <div
                key={s.label}
                className="border border-slate-200 rounded-lg bg-slate-50 px-3 py-2"
              >
                <dt className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">
                  {s.label}
                </dt>
                <dd className="text-sm font-extrabold text-slate-900 mt-0.5">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Context banner */}
      <section className="py-6 md:py-8 bg-rose-50 border-y border-rose-200">
        <div className="container-custom">
          <div className="flex items-start gap-4 max-w-4xl">
            <div className="w-10 h-10 rounded-lg bg-rose-200 flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="info" size={20} className="text-rose-800" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-rose-800 mb-1">
                What a royalty actually pays
              </h2>
              <p className="text-sm md:text-base text-rose-900 leading-relaxed">
                A royalty is a contractual right to a slice of revenue or net
                profits, separate from the equity or debt of the operator. The
                economic position is closer to a preferred bond than common
                equity — payments are senior to dividends, capped at the
                contracted percentage, and not exposed to operator cost
                blow-outs. The trade-off is no upside beyond the contracted
                rate and exposure to underlying production decline. Royalty
                income is taxed as ordinary income, not capital gains.
              </p>
              <p className="text-xs text-rose-700 mt-2">
                <span className="italic">
                  General information only, not financial advice.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ways to invest */}
      <section className="py-10 md:py-12 bg-white" id="ways-to-invest">
        <div className="container-custom">
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
              Section 1 &middot; Five ways in
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Ways to invest in royalty streams
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              From ASX-listed pure-plays to direct mining royalties to music
              catalogue funds — each route carries a different liquidity,
              minimum and tax profile.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6" role="tablist">
            {WAYS_TO_INVEST.map((w, i) => (
              <a
                key={w.id}
                href={`#${w.id}`}
                className={`inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  i === 0
                    ? "bg-rose-600 text-white border-rose-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-rose-400 hover:text-rose-700"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 text-[11px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {w.label}
              </a>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WAYS_TO_INVEST.map((w, i) => (
              <div
                key={w.id}
                id={w.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-5 scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded-full bg-rose-600 text-white font-extrabold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{w.label}</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-4">
                  {w.body}
                </p>
                <Link
                  href={w.cta.href}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
                >
                  {w.cta.label}
                  <Icon name="bookmark" size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Market overview */}
      <section className="py-10 md:py-12 bg-slate-50 border-y border-slate-100">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
            Section 2 &middot; Market overview
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            Australian royalty market context
          </h2>

          <div className="prose prose-slate max-w-none">
            <p>
              The Australian royalty market is dominated by mining royalties —
              the legacy of state-government held royalties on iron ore, coal
              and gold, plus a small cohort of private royalty deeds carved out
              over decades of resource project development. Deterra Royalties
              (ASX: DRR) sits at the centre of the listed market, with its
              Mining Area C royalty over BHP delivering the bulk of distributable
              cash. Elemental Altus (ELT), Sandfire (SFR) and a long tail of
              smaller royalty residues round out the listed universe.
            </p>
            <p>
              Petroleum royalties are concentrated in WA, QLD and the NT. State
              royalty regimes differ — WA&apos;s North West Shelf royalty regime
              shares revenue between the Commonwealth and state, while QLD
              petroleum royalties run through the Petroleum and Gas (Production
              and Safety) Act. Federal PRRT applies to most offshore petroleum
              projects on top of state royalty obligations.
            </p>
            <p>
              Music catalogue and IP royalty exposure for Australian investors
              is mostly via offshore vehicles — UK-listed Hipgnosis (HSF),
              US-listed Round Hill Music, and the Royalty Exchange secondary
              marketplace. APRA AMCOS administers performance royalties for
              Australian songwriters; SoundExchange is the US equivalent for
              digital performance.
            </p>
            <p>
              Pricing typically references a discount rate of 7%–12% for
              producing mining royalties, 5%–8% for established music
              catalogues, and 12%–20% for development-stage or pre-production
              royalties carrying execution risk.
            </p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12 bg-white" id="faqs">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-600 mb-1">
            Section 3 &middot; FAQs
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
            Royalty investing — frequently asked
          </h2>

          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.question}
                className="group bg-slate-50 border border-slate-200 rounded-xl px-5 py-4"
              >
                <summary className="cursor-pointer font-bold text-slate-900 text-sm md:text-base flex items-start justify-between gap-3">
                  <span>{f.question}</span>
                  <Icon
                    name="plus"
                    size={18}
                    className="text-slate-400 group-open:rotate-45 transition-transform shrink-0 mt-0.5"
                  />
                </summary>
                <p className="text-sm text-slate-700 leading-relaxed mt-3">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Advisor CTA */}
      <section className="py-12 md:py-14 bg-slate-900 text-white" id="find-advisor">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">
            Section 4 &middot; Get specialist help
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Speak with a royalties-aware adviser
          </h2>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6 max-w-2xl">
            Royalty deals turn on the deed wording, the operator&apos;s audit
            rights, and the tax characterisation of the income stream. A
            specialist adviser saves more in deal terms than they cost in fees.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Link
              href="/advisors/royalty-brokers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="coins" size={20} className="text-rose-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-rose-300">
                  Royalty brokers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Specialists who source and structure mining and petroleum
                royalty acquisitions, secondary-market royalty sales and
                sliding-scale deal terms.
              </p>
            </Link>

            <Link
              href="/advisors/petroleum-royalties-advisors"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="flame" size={20} className="text-rose-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-rose-300">
                  Petroleum royalties advisors
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                State petroleum royalty regimes, PRRT interaction, ORRI deal
                structuring and secondary-market royalty valuation.
              </p>
            </Link>

            <Link
              href="/advisors/wealth-managers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="briefcase" size={20} className="text-rose-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-rose-300">
                  Wealth managers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Private wealth managers with access to wholesale royalty funds
                and offshore music / IP royalty wrappers.
              </p>
            </Link>

            <Link
              href="/advisors/mining-tax-advisors"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="calculator" size={20} className="text-rose-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-rose-300">
                  Mining tax advisors
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Section 6-5 ordinary income treatment, royalty withholding tax,
                DTA interaction and trust-distribution character flow-through.
              </p>
            </Link>
          </div>

          <Link
            href="/find-advisor?focus=royalties"
            className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
          >
            Match me with an adviser
            <Icon name="bookmark" size={16} />
          </Link>
        </div>
      </section>

      {/* Compliance footer */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong className="text-slate-600">General Advice Warning:</strong>{" "}
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
