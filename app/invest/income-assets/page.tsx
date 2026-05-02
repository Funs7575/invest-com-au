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

export const metadata: Metadata = {
  title: `Income-Generating Asset Businesses in Australia (${CURRENT_YEAR}) — Vending, ATMs, Self-Storage & More`,
  description:
    "Independent guide to income-asset businesses for sale in Australia — vending routes, ATM networks, car washes, laundromats, self-storage, billboards. Yields, capex profile, finance options.",
  alternates: { canonical: `${SITE_URL}/invest/income-assets` },
  openGraph: {
    title: `Income-Generating Asset Businesses in Australia (${CURRENT_YEAR})`,
    description:
      "Cash-flow asset businesses — vending, ATM networks, car washes, laundromats, self-storage and billboards.",
    url: `${SITE_URL}/invest/income-assets`,
  },
};

const WAYS_TO_INVEST = [
  {
    id: "vending-routes",
    label: "Vending machine routes",
    body:
      "A vending route is a portfolio of placed machines on contracted host sites — offices, gyms, transit hubs, manufacturing plants. Australian operators typically run 20–200 machines per route. Entry tickets run $80,000–$500,000 depending on machine count, brand contracts (Pepsi / Coca-Cola Amatil exclusivity), and location quality. Net yields of 12%–25% before financing are common where route management is in-sourced; passive operator-managed structures clear 8%–12%. The lever is location quality — premium sites with employee-counts above 200 service multiple machines profitably.",
    cta: { label: "Find a business broker", href: "/advisors/business-brokers" },
  },
  {
    id: "atm-networks",
    label: "ATM networks",
    body:
      "ATM ownership in Australia is a mature, declining-volume business — interchange fees were abolished in 2017, so revenue today is operator-set surcharges plus advertising on the screen. Banktech and DC Payments are the dominant aggregators; private route operators sit alongside. Tickets run $30,000–$300,000 for a 5–30 machine route. Net yields 15%–25% on premium sites (pubs, clubs, late-night venues), 5%–10% on tail sites. The decline curve is real — cash transactions fall ~5–8% p.a. — and is the principal investment risk.",
    cta: { label: "Find a business broker", href: "/advisors/business-brokers" },
  },
  {
    id: "car-washes",
    label: "Car washes",
    body:
      "Drive-through automated car washes — usually tunnel-style with brushless soft-touch or touchless laser-guided wash bays — are the dominant new format in Australia. Single-site freehold buy-ins run $400,000–$2M for a leased site, $1.5M–$5M+ for freehold. Yields net of staff and chemical cost run 12%–20% on a leased site, lower on freehold but with property capital growth. Hand-wash hybrid models (semi-automated) carry meaningfully higher labour cost but command premium pricing on detailing services.",
    cta: { label: "Browse commercial property listings", href: "/advisors/commercial-property-agents" },
  },
  {
    id: "laundromats",
    label: "Laundromats",
    body:
      "Coin and card-operated laundromats remain a low-touch cash-flow business in inner-city, university-suburb and high-density rental locations. A single-site Australian laundromat typically costs $200,000–$600,000 to acquire, with $50,000–$150,000 of that being commercial-grade Speed Queen / Maytag washers and dryers. Net yields after rent, utilities and maintenance run 10%–18%. The trade-off is high utility costs (water, gas, electricity) and theft / vandalism exposure.",
    cta: { label: "Find a business broker", href: "/advisors/business-brokers" },
  },
  {
    id: "self-storage",
    label: "Self-storage facilities",
    body:
      "Self-storage is the institutional end of the income-asset spectrum. National Storage REIT (ASX: NSR) is the listed pure-play; Storage King and Kennards are the major private operators. Single-site freehold acquisitions run $1M–$10M depending on storage area and metro vs regional location. Direct-buy yields are 6%–9% on a stabilised facility; greenfield development can target mid-teens IRR. Easy financing through commercial real estate lenders and well-understood demand drivers (downsizing, e-commerce inventory, urban density) make this the most institutionally-investable income-asset class.",
    cta: { label: "Find a commercial property agent", href: "/advisors/commercial-property-agents" },
  },
  {
    id: "billboards",
    label: "Billboard & outdoor rights",
    body:
      "Outdoor advertising rights on private land — billboards, building wraps, digital screens — pay landowners 30%–60% of net advertising revenue under operator agreements with oOh!media (ASX: OML), JCDecaux, or QMS. Direct ownership of an unencumbered billboard with planning approval generates $30,000–$300,000 p.a. depending on traffic count and digital vs static format. Council planning consent is the binding constraint — most metro councils now restrict new digital billboards.",
    cta: { label: "Find a commercial property agent", href: "/advisors/commercial-property-agents" },
  },
];

const FAQS = [
  {
    question: "Which income-asset businesses are franchise vs independent?",
    answer:
      "Vending and ATM operations are mostly independent — the franchise overlay is rare in Australia beyond brand-exclusive supply contracts (e.g. Coca-Cola Amatil vending agreements). Car washes split between independent operators and franchise networks like Magic Hand Carwash. Laundromats are almost entirely independent. Self-storage is dominated by branded networks (Storage King franchises, Kennards corporate) but unbranded independents exist. Billboard rights are independent, with operator partnerships rather than franchises.",
  },
  {
    question: "How is GST treated on these business acquisitions?",
    answer:
      "Going-concern transfers — where the seller transfers all assets necessary to continue operating the business and both parties agree in writing — are GST-free under section 38-325 of the GST Act. Asset-only sales that do not meet the going-concern requirements attract 10% GST on the sale price. Commercial freehold component (e.g. self-storage land, car wash freehold) may be taxed under the margin scheme if eligible. ATO scrutiny on going-concern transfers is heavy — get the contract drafted by a specialist business-sale lawyer.",
  },
  {
    question: "What finance options exist for buying income-asset businesses?",
    answer:
      "Asset finance through a commercial broker (chattel mortgage on the equipment), commercial real estate finance for the freehold component (self-storage, car wash freehold), unsecured business loans up to ~$500,000 from non-bank lenders, and SBA-equivalent vendor finance from the seller (typically 20%–40% of price over 3–5 years). Major banks lend conservatively against vending, ATM and laundromat businesses; non-bank specialists (Prospa, GetCapital, Banjo) are more flexible at higher rates.",
  },
  {
    question: "How passive are these businesses really?",
    answer:
      "Passive on a spectrum. Self-storage with an outsourced manager is genuinely passive — 4–8 hours per month of owner involvement. Vending and ATM routes need 10–30 hours per week if owner-managed, near-zero if route-management is contracted out at 15%–25% of gross revenue. Car washes and laundromats are part-time-active — typically a $15K–$40K p.a. on-site supervisor or owner-time commitment. Billboards are fully passive once installed. Match the business to your time availability — undisclosed time commitment is the main reason buyers regret these acquisitions.",
  },
  {
    question: "What yields should I realistically expect?",
    answer:
      "Net yield (cash to owner after all operating costs but before financing and tax) ranges meaningfully by asset class and quality. Vending: 8%–25%. ATMs: 5%–25%. Car washes: 8%–20%. Laundromats: 10%–18%. Self-storage: 6%–9% (lower because the asset class is institutional and bid up). Billboards: 15%–40% on owner-cleared land. Higher headline yields almost always reflect lower asset quality — a 25% vending yield often means tail sites with high churn, not premium captive routes.",
  },
  {
    question: "Are these businesses recession-resistant?",
    answer:
      "Mixed. Vending in offices is exposed to white-collar employment; vending in factories and transit hubs is more resilient. ATM volumes are in structural decline regardless of recession. Self-storage is counter-cyclical — recession drives downsizing demand. Car washes are mid-cyclical — premium services drop in recessions, basic washes hold. Laundromats are weakly counter-cyclical — renters tend to laundromat when household appliances break and replacement is deferred.",
  },
];

export default function IncomeAssetsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Income-Asset Businesses" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Income-Asset Businesses in Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/income-assets`,
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
            <span className="text-slate-900 font-medium">Income-Asset Businesses</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              Cash-flow business
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Independent research
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Updated {CURRENT_YEAR}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Income-Generating Asset Businesses in Australia
          </h1>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mb-6">
            Vending routes, ATM networks, car washes, laundromats, self-storage
            and billboard rights — physical-asset businesses bought for the
            cash flow they throw off rather than capital growth. Entry tickets
            from $30,000 to $10M, net yields from 6% to 25%, and a wide
            spectrum of owner-time commitment.
          </p>

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
            {[
              { label: "Typical net yield range", value: "6–25%" },
              { label: "Entry ticket (vending)", value: "$80K+" },
              { label: "Entry ticket (self-storage)", value: "$1M+" },
              { label: "Self-storage ASX", value: "NSR" },
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
      <section className="py-6 md:py-8 bg-emerald-50 border-y border-emerald-200">
        <div className="container-custom">
          <div className="flex items-start gap-4 max-w-4xl">
            <div className="w-10 h-10 rounded-lg bg-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="info" size={20} className="text-emerald-800" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-emerald-800 mb-1">
                Yield is not return
              </h2>
              <p className="text-sm md:text-base text-emerald-900 leading-relaxed">
                Headline net yield on an income-asset business is the cash
                return after operating costs but before financing, tax,
                replacement capex and the seller&apos;s exit value. Sustainable
                long-term return on capital is typically 30%–60% of the
                headline yield once equipment depreciation, lease renewal
                contingency and your owner-time are properly costed. Always
                model a 7–10 year horizon, not a one-year yield.
              </p>
              <p className="text-xs text-emerald-700 mt-2">
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
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              Section 1 &middot; Six asset categories
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Income-asset business categories
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Each category has a distinct entry ticket, yield range and
              owner-time commitment. Match the asset to your capital and time
              availability before you start shortlisting deals.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6" role="tablist">
            {WAYS_TO_INVEST.map((w, i) => (
              <a
                key={w.id}
                href={`#${w.id}`}
                className={`inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  i === 0
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:text-emerald-700"
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
                  <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center">
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
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Section 2 &middot; Market overview
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
            Australian income-asset market context
          </h2>

          <div className="prose prose-slate max-w-none">
            <p>
              The Australian income-asset market is fragmented and almost
              entirely unbranded at the small-business end. Most deals clear
              through general business brokers (Linkbusiness, Bsale,
              BusinessForSale.com.au) or via direct-to-buyer listings.
              Self-storage and billboard rights have institutional buyers (NSR,
              Storage King, oOh!media, JCDecaux); the rest is dominated by
              owner-operators acquiring and rolling up portfolios.
            </p>
            <p>
              Pricing is typically quoted as a multiple of seller&apos;s
              discretionary earnings (SDE) — gross profit minus operating
              expenses but before owner&apos;s salary. Multiples range from 1.5×–3×
              SDE for vending and ATM routes, 2×–4× SDE for car washes and
              laundromats (with freehold component priced separately on a cap
              rate basis), and 6–10× SDE for self-storage facilities (priced
              materially closer to commercial real estate cap rates).
            </p>
            <p>
              Due diligence priorities differ from operating-business
              acquisitions. Equipment age and replacement schedule, host-site
              contract terms (vending), interchange-fee arrangements (ATMs),
              council planning approval (billboards) and lease tenure (every
              category) are the key items to verify. ATO compliance, BAS
              history and bank-statement reconciliation against cash takings
              are essential — under-banked cash businesses are a long-standing
              ATO focus.
            </p>
            <p>
              Long-term holders typically buy a single asset, learn the
              operations, then roll up — adding a second, third and fifth
              location while leveraging the first asset&apos;s cash flow as
              acquisition equity.
            </p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12 bg-white" id="faqs">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
            Section 3 &middot; FAQs
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
            Income-asset investing — frequently asked
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
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
            Section 4 &middot; Get specialist help
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Speak with a business-acquisition specialist
          </h2>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6 max-w-2xl">
            Income-asset businesses are deal-volume businesses for brokers —
            you&apos;ll see better off-market deals through a relationship-led
            broker than via portal listings alone. A specialist also knows the
            quirks of each asset category — host-contract assignments, lease
            novation, council planning, ATO going-concern positioning.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Link
              href="/advisors/business-brokers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="briefcase" size={20} className="text-emerald-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300">
                  Business brokers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Brokers experienced in vending, ATM, laundromat and car-wash
                acquisitions, with off-market deal flow and host-contract
                novation experience.
              </p>
            </Link>

            <Link
              href="/advisors/commercial-property-agents"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="building" size={20} className="text-emerald-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300">
                  Commercial property agents
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Commercial agents specialising in self-storage, car-wash
                freehold and billboard easement transactions across metro and
                regional Australia.
              </p>
            </Link>

            <Link
              href="/advisors/tax-agents"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="calculator" size={20} className="text-emerald-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300">
                  Tax agents
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Going-concern GST positioning, asset depreciation schedules
                and small-business CGT concessions for income-asset
                acquisitions.
              </p>
            </Link>

            <Link
              href="/advisors/mortgage-brokers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="wallet" size={20} className="text-emerald-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300">
                  Commercial finance brokers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Asset finance, commercial real estate finance and unsecured
                business loans across bank and non-bank lenders.
              </p>
            </Link>
          </div>

          <Link
            href="/find-advisor?focus=income-assets"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
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
