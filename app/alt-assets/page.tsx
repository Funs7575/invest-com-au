import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Alternative Assets Australia — Whisky, Wine, Art, Watches, Farmland (${CURRENT_YEAR}) | invest.com.au`,
  description: `Australian guide to investing in alternative assets: whisky, wine, watches, art, farmland, carbon credits, and collectibles. Returns, risks, liquidity, tax treatment, and where to buy. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Alternative Assets Australia (${CURRENT_YEAR})`,
    description: "Whisky, wine, watches, art, farmland, carbon credits — how Australian investors access alternative asset classes beyond shares and property.",
    url: `${SITE_URL}/alt-assets`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Alternative Assets Australia")}&sub=${encodeURIComponent("Whisky · Wine · Art · Watches · Farmland · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/alt-assets` },
};

const FAQS = [
  {
    q: "What are alternative assets?",
    a: "Alternative assets are investments outside the traditional categories of listed shares, bonds, and cash. In an Australian portfolio context they include: physical collectibles (whisky, wine, art, watches, coins, handbags), real assets (farmland, timberland, infrastructure, carbon credits), and private markets (private equity, venture capital, private credit, hedge funds). Listed REITs and listed infrastructure are usually classified as traditional (liquid, exchange-traded) rather than 'alts'. The defining features of true alternative assets are lower liquidity, specialist valuation, and returns less correlated with share market indices.",
  },
  {
    q: "Are alternative assets regulated by ASIC in Australia?",
    a: "It depends on the structure. Physical collectibles (a bottle of whisky, a painting) are not financial products — buying them does not require AFSL licensing on either side. Managed investment schemes that pool investor funds to invest in collectibles ARE financial products requiring ASIC registration or a wholesale exemption. Farmland as direct property is not a financial product; a farmland fund is. Carbon credits (ACCUs, VCUs) exist in a separate regulatory framework. Before investing in any pooled alternative asset scheme, verify the operator holds an AFSL or is relying on a legitimate exemption.",
  },
  {
    q: "How are gains on collectibles taxed in Australia?",
    a: "The ATO treats collectibles (artwork, jewellery, rare coins, antiques, wine, musical instruments) differently from ordinary CGT assets. Key rules: (1) A personal use asset bought for $10,000 or less is exempt from CGT. (2) For collectibles above $10,000, CGT applies — but losses on collectibles can only be offset against gains on other collectibles, not against share gains. (3) If you hold collectibles as a business (trading), the gains are ordinary income, not capital gains, and the 50% CGT discount doesn't apply. The 50% CGT discount applies to collectibles held >12 months as an investor (not trader).",
  },
  {
    q: "What are the main risks of investing in alternative assets?",
    a: "Liquidity risk: most alts have no liquid secondary market — you may wait months or years to find a buyer. Valuation risk: pricing is opaque and often subjective, making it easy to overpay. Storage and insurance: physical assets (whisky casks, wine, art) require specialist storage and insurance that erodes net returns. Authentication and provenance: fakes are common in high-end collectibles; verification is costly. Concentration: alts are best as a small portion (5–20%) of a diversified portfolio, not a core holding. Management fees: most pooled alt vehicles charge 1.5%–2%+ p.a. plus carried interest.",
  },
  {
    q: "What returns have Australian whisky and wine investments historically delivered?",
    a: "Whisky casks (primarily Scotch single malts) have returned 10%–15% p.a. (gross) over 10-year holding periods, driven by rising global demand and finite cask supply. Returns vary dramatically by distillery reputation, age statement, and provenance. Wine (fine Bordeaux, Burgundy) has returned 6%–10% p.a. historically via auction markets (Langton's in Australia; Sotheby's, Christie's internationally). Both figures are gross and pre-fee; net returns after storage, insurance, and platform fees are materially lower. Neither asset class has a regulated benchmark or audited track record requirement in Australia, so published figures should be treated with caution.",
  },
];

const ASSET_CLASSES = [
  {
    name: "Whisky casks",
    minEntry: "~$5k–$25k per cask",
    liquidity: "Low (3–10 yr hold)",
    taxTreatment: "CGT (collectible rules if >$10k)",
    platforms: "Whisky Hammer, Mark Littler, The Whisky Barrel, Cask88",
    note: "Primarily Scotch whisky; Irish, Japanese, and Australian distilleries growing in secondary market",
  },
  {
    name: "Fine wine",
    minEntry: "$500–$5k per case",
    liquidity: "Low–medium (auction-dependent)",
    taxTreatment: "CGT (collectible rules)",
    platforms: "Langton's, Vinous, Cult Wines, VinoVest",
    note: "Bordeaux and Burgundy dominate secondary market; storage conditions critical to value",
  },
  {
    name: "Art",
    minEntry: "$1k (fractional) or $10k+ direct",
    liquidity: "Low (auction cycle)",
    taxTreatment: "CGT (collectible rules); DGR gift to gallery may trigger CGT event",
    platforms: "Artsy, Sotheby's Online, Masterworks (US-based, fractional)",
    note: "Highly heterogeneous; provenance and condition drive value; authentication costly",
  },
  {
    name: "Luxury watches",
    minEntry: "$5k–$50k+",
    liquidity: "Medium (active secondary market)",
    taxTreatment: "CGT (collectible rules if held as investment; income if trading)",
    platforms: "Chrono24, WatchBox, Watchfinder",
    note: "Rolex, Patek Philippe, AP have historically held value; newer brands more volatile",
  },
  {
    name: "Farmland",
    minEntry: "$50k (fractional) or $500k+ direct",
    liquidity: "Low (direct); medium (fractional)",
    taxTreatment: "Standard property CGT; primary production concessions may apply",
    platforms: "AgriProve, Farmright, US-based: AcreTrader, FarmTogether",
    note: "Dual return: land appreciation + lease/crop income; inflation hedge; ESG credentials growing",
  },
  {
    name: "Carbon credits (ACCUs)",
    minEntry: "Variable (~$20–$70/ACCU currently)",
    liquidity: "Medium (Clean Energy Regulator market)",
    taxTreatment: "Revenue (if sold); CGT may apply in specific structures",
    platforms: "CER Direct, CBL Markets, Xpansiv",
    note: "Australian Carbon Credit Units — government-issued; price subject to policy risk",
  },
];

export default function AltAssetsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Alternative Assets" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Alternative Assets</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
            Alternative assets for Australian investors
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            Whisky casks, fine wine, art, luxury watches, farmland, and carbon credits —
            how they work, what they&apos;ve historically returned, how gains are taxed in Australia,
            and the platforms that give retail investors access.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not advice</p>
        </div>
      </section>

      {/* Asset class table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Asset classes at a glance</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Asset</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Min. entry</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Liquidity</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">AU tax treatment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {ASSET_CLASSES.map((a, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{a.name}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{a.minEntry}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{a.liquidity}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{a.taxTreatment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">Platform names are illustrative, not endorsements. Verify ASIC registration before investing in pooled schemes.</p>
        </div>
      </section>

      {/* Asset notes */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Key notes by asset class</h2>
          <div className="space-y-3">
            {ASSET_CLASSES.map((a, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-extrabold text-slate-900 mb-1">{a.name}</p>
                <p className="text-xs text-slate-500 mb-1.5">Platforms: {a.platforms}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{a.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risk callout */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Core risks</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Liquidity risk", body: "No liquid exchange exists for most physical alts. You may wait months or years to find a buyer at a fair price. Forced sales at auction typically realise 15–30% below private market value." },
              { label: "Authentication & provenance", body: "Fakes are common in whisky, wine, watches, and art. Without credentialed authentication, resale value may be zero. Verification services add 2–5% to transaction costs." },
              { label: "Storage & insurance", body: "Physical assets require specialist storage (bonded warehouses for whisky/wine; climate-controlled facilities for art). Storage + insurance typically runs 1–2% p.a. of asset value, eroding net returns." },
              { label: "Regulatory & platform risk", body: "Pooled alt investment platforms (fractional ownership schemes) may be MIS products requiring ASIC registration. Unregistered wholesale schemes carry significant investor-protection gaps if the operator fails." },
            ].map(risk => (
              <div key={risk.label} className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-extrabold text-red-900 mb-1.5">{risk.label}</p>
                <p className="text-sm text-red-800 leading-relaxed">{risk.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <details key={i} className="group border border-slate-200 rounded-xl p-4">
                <summary className="cursor-pointer list-none font-bold text-slate-900 flex items-start justify-between gap-3">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform text-lg leading-none">▾</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/global-investing/tax/cgt-on-foreign-shares", label: "CGT on investments" },
              { href: "/family-office", label: "Family office structures" },
              { href: "/wealth-stack", label: "Wealth stack overview" },
              { href: "/find-advisor", label: "Find an investment adviser" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Platform names mentioned are for illustrative purposes only and are not endorsements. Verify ASIC registration and AFSL status before investing in any managed investment scheme. Alternative assets carry significant liquidity and valuation risk. Consult a registered tax agent and financial adviser before investing.
          </p>
        </div>
      </section>
    </div>
  );
}
