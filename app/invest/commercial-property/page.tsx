import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import Link from "next/link";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Commercial Property Investment in Australia (${CURRENT_YEAR}) — A Plain-English Guide`,
  description: `What commercial property investment is, how it works, and the ways Australians gain exposure — direct ownership, A-REITs, unlisted trusts, syndicates, and property ETFs. Yields, leases, risks, and tax explained. ${UPDATED_LABEL}.`,
  alternates: { canonical: `${SITE_URL}/invest/commercial-property` },
  openGraph: {
    title: `Commercial Property Investment in Australia (${CURRENT_YEAR})`,
    description:
      "Office, retail, industrial, and specialised property as an asset class — yields, lease structures, A-REITs, ETFs, risks, and tax treatment, explained factually.",
    url: `${SITE_URL}/invest/commercial-property`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Commercial Property Investment Australia")}&sub=${encodeURIComponent("A-REITs · Office · Industrial · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

/* ─── Commercial vs residential property ──────────────────────────── */
const VS_RESIDENTIAL = [
  {
    factor: "Typical income yield",
    commercial: "Roughly 5–8% net of outgoings",
    residential: "Roughly 2–4% gross",
  },
  {
    factor: "Lease term",
    commercial: "3–10 years (sometimes longer)",
    residential: "6–12 months, then periodic",
  },
  {
    factor: "Who pays outgoings",
    commercial: "Often the tenant (net leases)",
    residential: "Usually the landlord",
  },
  {
    factor: "Capital growth",
    commercial: "Varies; residential has historically grown faster",
    residential: "Historically strong long-run growth",
  },
  {
    factor: "Liquidity",
    commercial: "Lower — fewer buyers, longer to sell",
    residential: "Higher — deeper buyer pool",
  },
  {
    factor: "Entry cost (direct)",
    commercial: "Higher — often $500K+ for a whole asset",
    residential: "Lower — broad price range",
  },
  {
    factor: "Management complexity",
    commercial: "Higher — leases, outgoings, fit-outs, re-letting",
    residential: "Lower — comparatively standardised",
  },
];

/* ─── Property types ──────────────────────────────────────────────── */
const PROPERTY_TYPES = [
  {
    name: "Office",
    body: "Buildings leased to businesses for workspace. CBD (city-centre, premium and A-grade towers) versus suburban or metropolitan office parks. Demand is sensitive to employment growth and working patterns.",
  },
  {
    name: "Retail",
    body: "Space leased to shops and services. Spans large shopping centres (regional and sub-regional malls), neighbourhood and strip retail, and large-format ('bulky goods') centres. Convenience-based retail tends to be more defensive than discretionary.",
  },
  {
    name: "Industrial & logistics",
    body: "Warehouses, distribution centres, and manufacturing space. Demand has been strong, driven by e-commerce and supply-chain needs. Generally simpler buildings with long leases to logistics and storage tenants.",
  },
  {
    name: "Specialised",
    body: "Purpose-built assets such as medical centres, childcare, service stations, self-storage, and data centres. Often leased to a single operator on long terms, with income tied to a specific industry.",
  },
  {
    name: "Mixed-use",
    body: "A single development combining uses — for example ground-floor retail with offices or apartments above. Blends the demand drivers and risks of each component.",
  },
];

/* ─── Ways to invest ──────────────────────────────────────────────── */
const WAYS_TO_INVEST = [
  {
    method: "Direct ownership",
    what: "Buying a commercial property outright (or through an entity you control).",
    access: "High capital required — often $500K+ for a whole asset.",
    liquidity: "Illiquid — selling can take months.",
    notes: "Full control over the asset; you also carry the management responsibility — leasing, outgoings, maintenance, and vacancy.",
  },
  {
    method: "A-REITs (listed)",
    what: "ASX-listed real estate investment trusts that own portfolios of commercial property. Examples include Goodman Group, GPT Group, Dexus, and Charter Hall.",
    access: "Low entry — buy units like shares through a broker.",
    liquidity: "Liquid — trade on the ASX during market hours.",
    notes: "Diversified across many properties and professionally managed. Unit prices move with the market, not just the underlying property values.",
  },
  {
    method: "Unlisted property trusts / funds",
    what: "Pooled funds that hold commercial assets but are not listed on an exchange. Run by property fund managers.",
    access: "Minimum investments apply; some are open only to wholesale investors.",
    liquidity: "Less liquid than A-REITs — limited redemption windows or fixed terms.",
    notes: "Valuations are based on periodic appraisals rather than daily market prices, so reported values move more smoothly.",
  },
  {
    method: "Property syndicates",
    what: "A group of investors pooling capital to buy a specific property, usually for a set period.",
    access: "Often wholesale-investor only, with a defined minimum.",
    liquidity: "Illiquid — capital is typically locked for a fixed term.",
    notes: "Concentrated in one asset and one set of tenants, so the outcome depends heavily on that single property.",
  },
  {
    method: "Property ETFs",
    what: "Exchange-traded funds holding a basket of A-REITs — for example VAP (Vanguard Australian Property) or MVA (VanEck A-REIT).",
    access: "Low entry — one trade buys diversified A-REIT exposure.",
    liquidity: "Liquid — trade on the ASX like shares.",
    notes: "A simple, diversified way to gain broad listed-property exposure without picking individual A-REITs.",
  },
];

/* ─── Risks ───────────────────────────────────────────────────────── */
const RISKS = [
  {
    title: "Vacancy risk",
    body: "Commercial space can take far longer to re-let than a home, and the impact of an empty building is larger because rents are higher and a single tenant may occupy the whole asset.",
  },
  {
    title: "Economic sensitivity",
    body: "Commercial property is closely tied to the business cycle. Recessions and slowdowns tend to hit demand for office, retail, and industrial space harder than they hit housing.",
  },
  {
    title: "Tenant concentration",
    body: "A property leased to one tenant has a single point of failure. If that tenant leaves or cannot pay, all of the income from the asset is at risk at once.",
  },
  {
    title: "Structural change",
    body: "Long-running shifts can re-rate whole sectors — working from home affecting office demand, and e-commerce reshaping retail while boosting logistics.",
  },
  {
    title: "Interest-rate sensitivity",
    body: "Property values are influenced by interest rates. When rates rise, the capitalisation rates used to value assets tend to rise too, which generally pushes valuations down.",
  },
  {
    title: "Illiquidity",
    body: "Direct property and unlisted funds cannot always be sold quickly. In a downturn, buyers may be scarce, and you may not be able to exit at the value you expect.",
  },
];

/* ─── FAQ ─────────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: "How can I invest in commercial property in Australia?",
    a: "There are several routes. You can buy a commercial property directly, which requires substantial capital and hands-on management. More accessible options include A-REITs (ASX-listed real estate investment trusts that trade like shares), property ETFs that hold a basket of A-REITs in a single trade, unlisted property trusts run by fund managers, and property syndicates that pool investors into a specific asset. For most retail investors, A-REITs and property ETFs are the simplest, most liquid ways to gain diversified exposure.",
  },
  {
    q: "What is the difference between A-REITs and direct commercial property?",
    a: "A-REITs are listed trusts that own portfolios of properties; you buy units on the ASX, they are liquid, diversified, and professionally managed, but their unit prices move with the share market. Direct commercial property means owning a specific building yourself — you get full control and the underlying rental income, but you also carry the capital cost, the management work, and the illiquidity of a single, hard-to-sell asset. A-REITs lower the entry cost and spread risk; direct ownership concentrates both control and risk in one property.",
  },
  {
    q: "What yields does commercial property offer?",
    a: "Income yields on commercial property are typically higher than residential — broadly in the range of 5–8% net of outgoings, versus roughly 2–4% gross for residential, though this varies widely by sector, location, asset quality, and the point in the cycle. The headline yield is only part of the picture: total return is income plus (or minus) any change in capital value, and commercial values can fall as well as rise. Yields are not guaranteed and past figures are not a reliable guide to the future.",
  },
  {
    q: "Is commercial property riskier than residential?",
    a: "It has a different risk profile rather than being simply riskier or safer. Commercial property offers higher income yields and longer leases, often with the tenant paying outgoings, which can make income more predictable while a lease runs. Against that, it is more sensitive to the economic cycle, vacancies take longer to fill and hurt more, income can be concentrated in a single tenant, and the asset is less liquid. Listed exposure through A-REITs or ETFs reduces the concentration and liquidity issues but adds share-market price volatility.",
  },
  {
    q: "Can my SMSF buy commercial property?",
    a: "A self-managed super fund can hold commercial property, and the rules allow an SMSF to lease that property to a related party — such as a business run by a member — provided the arrangement is on genuine commercial, arm's-length terms and meets the relevant superannuation requirements. Residential property held by an SMSF generally cannot be used by members or related parties. SMSF property is a complex area with strict compliance obligations, so it is something to work through with a licensed professional before acting.",
  },
];

export default function CommercialPropertyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Investing", url: `${SITE_URL}/invest` },
    { name: "Commercial Property" },
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

      {/* ── Hero ─────────────────────────────────────────────────────── */}
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
            <span className="text-slate-900 font-medium">Commercial Property</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              Asset-class guide · {UPDATED_LABEL}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              Commercial Property Investment in Australia{" "}
              <span className="text-amber-600">({CURRENT_YEAR})</span>
            </h1>
            <p className="text-base md:text-lg text-slate-600 leading-relaxed">
              Commercial property covers office, retail, industrial, and specialised
              assets leased to businesses rather than households. As an asset class it
              tends to offer higher income yields than residential property, but it
              carries a different risk profile — and there are several different ways to
              gain exposure, from owning a building outright to buying a listed trust on
              the ASX. This is a plain-English explainer of what commercial property
              investment is and how it works.
            </p>
          </div>
        </div>
      </section>

      {/* ── Quick framing ────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">
                Higher income yield
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Commercial property typically yields around 5–8% net of outgoings,
                compared with roughly 2–4% gross for residential — though figures vary by
                sector and cycle and are never guaranteed.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Longer leases
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Commercial leases commonly run 3–10 years, and tenants often pay the
                outgoings — so income can be more predictable while a lease is in place.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Multiple entry points
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                You don&apos;t need to buy a building to get exposure. A-REITs and
                property ETFs let you access diversified commercial property through a
                single trade on the ASX.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Commercial vs residential ────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            How it compares
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Commercial vs residential property
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            The two behave quite differently as investments. The table below sketches the
            broad contrasts — individual properties always vary.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden" aria-label="Commercial vs residential property comparison">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="text-left p-3 font-semibold text-slate-700">Factor</th>
                  <th scope="col" className="text-left p-3 font-semibold text-slate-700">
                    Commercial
                  </th>
                  <th scope="col" className="text-left p-3 font-semibold text-slate-700">
                    Residential
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {VS_RESIDENTIAL.map((row) => (
                  <tr key={row.factor} className="bg-white align-top">
                    <td className="p-3 font-medium text-slate-900">{row.factor}</td>
                    <td className="p-3 text-slate-600">{row.commercial}</td>
                    <td className="p-3 text-slate-600">{row.residential}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Types of commercial property ─────────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            The sectors
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Types of commercial property
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            &quot;Commercial property&quot; is an umbrella term for several sectors, each
            with its own tenants and demand drivers.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {PROPERTY_TYPES.map((t) => (
              <div
                key={t.name}
                className="bg-white border border-slate-200 rounded-xl p-5"
              >
                <h3 className="font-bold text-slate-900 mb-1.5">{t.name}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{t.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ways to invest ───────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            Routes to exposure
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Ways to gain exposure to commercial property
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            There is a spectrum from owning a whole building yourself to holding a
            diversified fund. The right point on that spectrum depends on your capital,
            your appetite for management work, and how much liquidity you need.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden" aria-label="Ways to gain exposure to commercial property">
              <thead className="bg-slate-50">
                <tr>
                  <th scope="col" className="text-left p-3 font-semibold text-slate-700">Method</th>
                  <th scope="col" className="text-left p-3 font-semibold text-slate-700">
                    What it is
                  </th>
                  <th scope="col" className="text-left p-3 font-semibold text-slate-700">Access</th>
                  <th scope="col" className="text-left p-3 font-semibold text-slate-700">
                    Liquidity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {WAYS_TO_INVEST.map((row) => (
                  <tr key={row.method} className="bg-white align-top">
                    <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">
                      {row.method}
                    </td>
                    <td className="p-3 text-slate-600">{row.what}</td>
                    <td className="p-3 text-slate-600">{row.access}</td>
                    <td className="p-3 text-slate-600">{row.liquidity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 space-y-4">
            {WAYS_TO_INVEST.map((row) => (
              <div
                key={row.method}
                className="bg-slate-50 border border-slate-200 rounded-xl p-5"
              >
                <h3 className="font-bold text-slate-900 mb-1">{row.method}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{row.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── A-REITs explained ────────────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            Listed property
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            How A-REITs work
          </h2>
          <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed space-y-3">
            <p>
              An Australian real estate investment trust (A-REIT) is a trust that owns a
              portfolio of property and is listed on the ASX. You buy and sell units the
              same way you trade shares — through a broker, during market hours, at the
              market price. This makes property exposure far more liquid and accessible
              than owning a building directly.
            </p>
            <p>
              A-REITs generally pay distributions to unitholders, often quarterly, funded
              mainly by the rent the underlying properties collect. Because they trade on
              an exchange, their unit price can sit at a discount or a premium to the net
              tangible assets (NTA) — broadly, the appraised value of the trust&apos;s
              properties less its debt, per unit. The unit price reflects what the market
              will pay today, which can differ from the most recent property valuations.
            </p>
            <p>
              A-REITs use gearing (borrowing) to help fund their portfolios, so the level
              of debt matters: higher gearing amplifies both gains and losses and
              increases sensitivity to interest rates. Many A-REITs are sector-specific —
              you can find trusts focused on industrial and logistics, retail, or office,
              alongside diversified trusts that hold a mix. That lets investors lean
              towards (or away from) particular parts of the market.
            </p>
          </div>
        </div>
      </section>

      {/* ── Yields and returns ───────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            The numbers
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            Yields, returns, and cap rates
          </h2>
          <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed space-y-3">
            <p>
              Commercial property is bought largely for income. The income yield — the
              net rent (after outgoings) divided by the property value — is typically
              higher than residential rental yields. But yield is only half of the story.
              The total return on a property is its income plus any change in its capital
              value, and that capital value can fall as well as rise.
            </p>
            <p>
              Valuations in commercial property are commonly expressed through the
              capitalisation rate, or &quot;cap rate&quot;: the net annual income divided
              by the property&apos;s value. Rearranged, value equals income divided by the
              cap rate. So for a given level of rent, a lower cap rate implies a higher
              value, and a higher cap rate implies a lower value.
            </p>
            <p>
              Cap rates tend to move inversely with the broad direction of interest rates.
              When interest rates rise, investors generally demand a higher return from
              property, cap rates drift up, and — all else equal — valuations come down.
              When rates fall, the reverse tends to happen. This is one reason commercial
              property values are described as interest-rate sensitive.
            </p>
          </div>
        </div>
      </section>

      {/* ── Net leases and outgoings ─────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            Lease structure
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            Net leases and outgoings
          </h2>
          <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed space-y-3">
            <p>
              A defining feature of commercial property is the &quot;net&quot; lease. Under
              a net lease, the tenant pays some or all of the property&apos;s outgoings —
              council rates, insurance, and maintenance — on top of the base rent. The
              more of these costs the tenant carries, the more &quot;net&quot; the lease
              is, with a triple-net lease shifting most operating costs onto the tenant.
            </p>
            <p>
              This structure tends to make the landlord&apos;s income more predictable,
              because variable running costs are largely passed through rather than eating
              into the rent received. It contrasts sharply with residential property,
              where the landlord usually pays most ongoing costs and the headline rent is
              a gross figure.
            </p>
            <p>
              When comparing a commercial yield with a residential one, it is important to
              compare like with like. A commercial yield quoted net of outgoings is not
              directly comparable to a residential yield quoted gross, before the
              landlord&apos;s costs are deducted.
            </p>
          </div>
        </div>
      </section>

      {/* ── Risks ────────────────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            What can go wrong
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
            Risks of commercial property
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Higher yields come with real risks. These are the main ones to understand
            before considering any commercial property exposure.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {RISKS.map((r) => (
              <div
                key={r.title}
                className="bg-white border border-slate-200 rounded-xl p-5"
              >
                <h3 className="font-bold text-slate-900 mb-1.5">{r.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tax treatment ────────────────────────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            Tax
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            How commercial property is taxed
          </h2>
          <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed space-y-3">
            <p>
              Rental income from commercial property is generally assessable income, and
              the costs of earning it — interest, rates, insurance, management, and
              repairs — are generally deductible. Commercial buildings can also carry
              significant depreciation deductions on the building structure and the plant
              and equipment within them, which can be a meaningful part of the after-tax
              return.
            </p>
            <p>
              A key difference from residential property is GST. The sale and lease of
              commercial property is generally subject to GST, whereas residential
              property is typically input-taxed or GST-free. That affects pricing,
              cashflow, and the paperwork involved, and registered investors may be able to
              claim GST credits on related costs.
            </p>
            <p>
              When a property is sold, any gain is generally subject to capital gains tax,
              with the 50% CGT discount potentially available to eligible investors who
              have held the asset for more than 12 months. Separately, a self-managed super
              fund can hold commercial property and, unlike residential property, lease it
              to a related business provided the arrangement is on genuine arm&apos;s-length
              commercial terms.
            </p>
            <p>
              Tax outcomes depend heavily on individual circumstances and the way an
              investment is structured. The points here are general and factual, not tax
              advice.
            </p>
          </div>
        </div>
      </section>

      {/* ── Industrial / logistics ───────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            A standout sector
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            The industrial and logistics story
          </h2>
          <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed space-y-3">
            <p>
              Industrial and logistics property — warehouses, distribution centres, and
              fulfilment facilities — has been one of the strongest-performing parts of
              the market in recent years. The structural driver is e-commerce: as more
              shopping moves online, retailers and logistics operators need more space to
              store, sort, and ship goods, particularly near major cities where deliveries
              are fastest.
            </p>
            <p>
              The combination of rising demand and limited well-located supply has
              supported rents and values in the sector, which is why industrial has often
              outperformed office and retail over the same period. The buildings
              themselves are relatively simple, and leases to logistics tenants can be
              long, which adds to the appeal for income-focused investors.
            </p>
            <p>
              Data centres are an emerging specialised sector with related dynamics.
              Growth in cloud computing and artificial intelligence is driving demand for
              the highly specialised facilities that house computing infrastructure,
              making data centres one of the faster-developing niches within commercial
              property — though they require significant capital and expertise to develop
              and operate.
            </p>
          </div>
        </div>
      </section>

      {/* ── How to start (educational) ───────────────────────────────── */}
      <section className="py-10 md:py-14 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            Getting oriented
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            How people typically get started
          </h2>
          <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed space-y-3">
            <p>
              For most retail investors, listed exposure is the natural starting point.
              A-REITs and property ETFs such as VAP or MVA offer accessible, liquid, and
              diversified exposure to commercial property without the large capital outlay,
              the concentration in a single asset, or the management burden that comes with
              owning a building directly. They can be bought and sold through an ordinary
              brokerage account.
            </p>
            <p>
              Direct commercial property, by contrast, generally suits investors with
              significant capital and relevant expertise — people who are comfortable
              evaluating leases, tenants, locations, and building condition, and who can
              tolerate illiquidity. Unlisted trusts and syndicates sit somewhere in
              between, but often come with minimums and limited liquidity, and some are
              open only to wholesale investors.
            </p>
            <p>
              Whichever route is being considered, due diligence matters. That means
              reading the relevant disclosure documents, understanding the fees, leases,
              gearing, and liquidity terms, and being clear about how a given exposure fits
              alongside the rest of a portfolio. Because everyone&apos;s situation differs,
              it is worth seeking independent advice from a licensed professional before
              acting.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────────── */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            FAQ
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">
            Frequently asked questions
          </h2>
          <div className="divide-y divide-slate-200">
            {FAQS.map((faq) => (
              <details key={faq.q} className="py-4 group">
                <summary className="text-sm font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between gap-2">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform shrink-0">
                    &#9662;
                  </span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related asset classes ────────────────────────────────────── */}
      <section className="py-10 md:py-12 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">
            Keep reading
          </p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
            Related asset-class guides
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/invest/reits"
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
            >
              REITs &rarr;
            </Link>
            <Link
              href="/etfs"
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
            >
              ETFs &rarr;
            </Link>
            <Link
              href="/invest/infrastructure"
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
            >
              Infrastructure &rarr;
            </Link>
            <Link
              href="/invest"
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors border border-slate-200"
            >
              All asset classes &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────────────────────────────── */}
      <section className="py-6 bg-slate-100 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <p className="text-xs text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
