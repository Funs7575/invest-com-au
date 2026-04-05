import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Alternative Investments Australia — Wine, Art, Cars, Watches & Collectibles (${CURRENT_YEAR})`,
  description:
    "Explore alternative investments in Australia — fine wine, art, classic cars, luxury watches, rare coins, and collectibles. Platforms, returns, risks and tax treatment.",
  alternates: { canonical: `${SITE_URL}/invest/alternatives` },
  openGraph: {
    title: `Alternative Investments Australia — Wine, Art, Cars, Watches & Collectibles (${CURRENT_YEAR})`,
    description:
      "Explore alternative investments in Australia — fine wine, art, classic cars, luxury watches, rare coins, and collectibles. Platforms, returns, risks and tax treatment.",
    url: `${SITE_URL}/invest/alternatives`,
  },
};

export default function AlternativesPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Alternative Investments" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Alternative Investments Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/alternatives`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
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

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14 md:py-20">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span className="text-slate-600">/</span>
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <span className="text-slate-600">/</span>
            <span className="text-slate-300">Alternative Investments</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-700 text-slate-200 px-3 py-1 rounded-full">
              Wine &middot; Art &middot; Cars &middot; Watches &middot; Collectibles
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Alternative Investments in Australia
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl">
            Beyond shares, property, and super — alternative investments like fine wine, art, classic cars, and luxury watches are growing rapidly as an asset class. Here is how Australians are accessing them.
          </p>
        </div>
      </section>

      {/* Key stats */}
      <section className="py-10 bg-white border-b border-slate-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "$2.4T", label: "Global alternative investments AUM" },
              { value: "10–15%", label: "Fine wine annual returns (Liv-ex 1000)" },
              { value: "8–12%", label: "Classic car index returns (long-term)" },
              { value: "Low", label: "Correlation to equities" },
            ].map((s) => (
              <div key={s.label} className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 1: Wine */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Fine Wine Investment</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Fine wine has delivered competitive returns over the past two decades, with the Liv-ex Fine Wine 1000 index averaging 8–12% p.a. Australian wines (Penfolds Grange, Henschke Hill of Grace) are increasingly collectible alongside Burgundy, Bordeaux, and Champagne.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { platform: "Vinovest", desc: "AI-driven wine investment platform. Buy, store, and sell fine wine. Storage in bonded warehouses. Minimum US$1,000.", returns: "Target 10–15% p.a." },
              { platform: "Cult Wines", desc: "London-based wine investment management. Curated portfolios of investment-grade wine. Minimum £10,000.", returns: "Historical 10.8% p.a." },
              { platform: "Wine Owners", desc: "Australian wine investment platform. Marketplace for buying and selling fine wine. Portfolio management tools.", returns: "Market-dependent" },
              { platform: "Self-managed", desc: "Buy directly from wineries or auction houses (Langton's, Sotheby's). Requires storage facility and insurance. Most control but most effort.", returns: "Varies widely" },
            ].map((p) => (
              <div key={p.platform} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="font-bold text-slate-900">{p.platform}</p>
                <p className="text-sm text-slate-500 mt-1">{p.desc}</p>
                <span className="inline-block text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded mt-2">{p.returns}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Art */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Art Investment</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              The global art market exceeds US$65 billion annually. Fractional art investing platforms now let retail investors buy shares in blue-chip artworks by artists like Banksy, Basquiat, and Picasso — without needing millions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { platform: "Masterworks", desc: "US-based fractional art platform. Buy shares in blue-chip paintings. SEC-regulated offerings. Minimum ~US$500.", type: "Fractional ownership" },
              { platform: "Maverix (AU)", desc: "Australian fractional alternative investment platform covering art, wine, and collectibles. Lower minimums for Australian investors.", type: "Fractional ownership" },
              { platform: "Auction Houses", desc: "Sotheby's, Christie's, Bonhams (all with Australian offices), and local houses like Deutscher and Hackett. Direct purchase for serious collectors.", type: "Direct purchase" },
              { platform: "Commercial Galleries", desc: "Buy directly from established galleries. Focus on Australian artists (Sidney Nolan, Brett Whiteley, Emily Kame Kngwarreye) for local market appreciation.", type: "Direct purchase" },
            ].map((p) => (
              <div key={p.platform} className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-slate-900">{p.platform}</p>
                  <span className="text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded shrink-0">{p.type}</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Classic Cars */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 3</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Classic Cars &amp; Australian Muscle</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Classic cars have been one of the strongest-performing collectible asset classes. The Knight Frank Luxury Investment Index shows classic cars returning 8–12% p.a. long-term. Australian muscle cars — Ford Falcon GT-HO Phase III, Holden Torana A9X — are among the most valuable classic cars in the world.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { car: "Ford Falcon GT-HO Phase III", era: "1971", value: "$1.5M+", note: "Most valuable Australian car" },
              { car: "Holden Torana A9X", era: "1977", value: "$500K–$1M", note: "Bathurst legend" },
              { car: "Ford GT40 (AU delivered)", era: "1960s", value: "$5M+", note: "Le Mans heritage" },
              { car: "Porsche 911 (air-cooled)", era: "1964–1998", value: "$200K–$1M+", note: "Global collector favourite" },
              { car: "Ferrari Dino / 308 / 355", era: "1970s–90s", value: "$200K–$800K", note: "Appreciating rapidly" },
              { car: "Toyota Land Cruiser 40-series", era: "1960–84", value: "$80K–$300K", note: "Booming in recent years" },
            ].map((c) => (
              <div key={c.car} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="font-bold text-slate-900 text-sm">{c.car}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.era}</p>
                <p className="text-lg font-extrabold text-amber-600 mt-2">{c.value}</p>
                <p className="text-xs text-slate-500">{c.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Watches */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 4</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Luxury Watches as Assets</h2>

          <div className="prose prose-slate max-w-none mb-6">
            <p>
              Luxury watches — particularly Rolex, Patek Philippe, and Audemars Piguet — have emerged as a legitimate alternative asset class. The secondary watch market is estimated at US$20B+ annually. Key investment-grade watches include Rolex Daytona, Submariner (vintage), Patek Philippe Nautilus, and AP Royal Oak.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-bold text-slate-900 mb-3">Key Considerations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { point: "Authentication", desc: "Buy from authorised dealers or trusted second-hand platforms (Chrono24, Watchfinder). Fakes are prevalent." },
                { point: "Condition & papers", desc: "Box, papers, and service history significantly affect value. Unpolished original condition commands premiums." },
                { point: "Insurance", desc: "Specialist watch insurance is essential. Home contents policies often have jewellery/watch sub-limits." },
                { point: "Liquidity", desc: "Selling can take time unless using an established dealer/platform. Expect 10–15% spread on buy/sell." },
              ].map((p) => (
                <div key={p.point} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-sm font-bold text-slate-900">{p.point}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Other Collectibles */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 5</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Other Collectibles</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: "Rare Coins", desc: "Pre-decimal Australian coins, gold sovereigns, and error coins. Sold through dealers and auctions (Downies, Noble Numismatics). Market is well-established with strong provenance standards.", returns: "5–10% long-term" },
              { type: "Sports Memorabilia", desc: "Cricket bats signed by Bradman, AFL guernseys, Olympic medals. Growing market in Australia, particularly for cricket and AFL heritage items.", returns: "Varies widely" },
              { type: "Rare Whisky", desc: "Australian single malt whisky (Sullivans Cove, Starward) is gaining international recognition. Rare Scotch (Macallan, Yamazaki) has returned 20%+ p.a. over the past decade.", returns: "10–20% (rare bottles)" },
            ].map((c) => (
              <div key={c.type} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-900">{c.type}</h3>
                <p className="text-sm text-slate-500 mt-1">{c.desc}</p>
                <span className="inline-block text-xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded mt-2">{c.returns}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Tax */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Section 6</p>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Tax Treatment of Collectibles</h2>

          <div className="prose prose-slate max-w-none">
            <ul>
              <li><strong>CGT applies</strong> — collectibles acquired for more than $500 are subject to capital gains tax on disposal</li>
              <li><strong>50% CGT discount</strong> — applies if held for 12+ months (individuals and trusts)</li>
              <li><strong>Personal use exemption</strong> — collectibles acquired for $500 or less are exempt from CGT (but losses cannot be claimed)</li>
              <li><strong>SMSF restrictions</strong> — collectibles (art, wine, cars, jewellery, coins) can be held in an SMSF but must be stored independently, insured, and cannot be used by members or related parties. Strict ATO rules apply.</li>
              <li><strong>GST</strong> — GST applies to the sale of collectibles (unless sold as a private sale below the GST registration threshold)</li>
              <li><strong>Wine equalisation tax (WET)</strong> — applies to wine sales; may affect wine investment returns</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Risk */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <div className="bg-red-50 border border-red-200 rounded-xl p-5">
            <h3 className="font-bold text-red-800 mb-2">Key Risks</h3>
            <ul className="text-sm text-red-700 space-y-1.5">
              <li><strong>Illiquidity</strong> — alternative assets can take weeks to months to sell; no centralised exchange</li>
              <li><strong>Valuation subjectivity</strong> — prices depend on taste, trends, and market sentiment, not fundamentals</li>
              <li><strong>Authentication &amp; fraud</strong> — counterfeiting is a significant risk across all collectible categories</li>
              <li><strong>Storage &amp; insurance</strong> — ongoing costs for physical storage, climate control, and insurance</li>
              <li><strong>No income</strong> — alternative assets produce no dividends or interest; returns come solely from price appreciation</li>
              <li><strong>Concentration risk</strong> — a single painting, car, or watch is undiversified; total loss is possible (damage, theft)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Speak to a Wealth Manager</h2>
              <p className="text-sm text-slate-500">
                Alternative investments should complement — not replace — a diversified portfolio. A wealth manager can help you determine the right allocation.
              </p>
            </div>
            <Link
              href="/advisors/wealth-managers"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Find a Wealth Manager &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
