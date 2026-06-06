import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Global LICs — Australian Guide to Listed Investment Companies (${CURRENT_YEAR}) | invest.com.au`,
  description: `Compare Australian-listed global LICs: MFF, WGB, PMC, FGG, PGF. NTA discount/premium, fees, mandate, and how LICs differ from ETFs for long-term global exposure. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Global LICs — Australian Guide (${CURRENT_YEAR})`,
    description: "MFF, WGB, PMC, FGG, PGF — compare NTA, fees, mandate, and premium/discount for ASX-listed global LICs.",
    url: `${SITE_URL}/global-investing/lics`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Global LICs Australia")}&sub=${encodeURIComponent("MFF · WGB · PMC · FGG · NTA Discount · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/lics` },
};

const LICS = [
  { name: "MFF Capital Investments", asx: "MFF", mandate: "Global equities — concentrated, high conviction; large US weighting (Visa, Mastercard, Meta)", mer: "~0.5%", structure: "LIC" },
  { name: "Magellan Global Fund (Closed Class)", asx: "MGF", mandate: "Global large-cap quality businesses, 20–40 stocks; active currency overlay", mer: "1.35%", structure: "LIC" },
  { name: "WCM Global Growth", asx: "WGB", mandate: "Global growth — quality moat + expanding culture; US/emerging tilt", mer: "1.25%", structure: "LIT (trust)" },
  { name: "Platinum Capital", asx: "PMC", mandate: "Global, value-oriented, can short; emerging markets + developed blend", mer: "1.10%", structure: "LIC" },
  { name: "Future Generation Global", asx: "FGG", mandate: "Fund-of-funds; backing emerging global managers; 1% donated to charity", mer: "~0% base (underlying fee ~1.5%)", structure: "LIC" },
  { name: "Pengana International Equities", asx: "PGF", mandate: "Global SMID-cap growth, concentrated 30–40 stocks, low turnover", mer: "1.23%", structure: "LIC" },
];

const FAQS = [
  {
    q: "What is a Listed Investment Company (LIC)?",
    a: "A LIC is a closed-end investment vehicle that trades on the ASX like a share. Unlike an ETF, which issues/redeems units to match demand, a LIC has a fixed share count — its price is set by supply and demand, not by the underlying net tangible asset (NTA) value. This means LICs can trade at a discount (price < NTA) or a premium (price > NTA) to their true portfolio value. Closed-end structure can be advantageous for patient investors (manager not forced to sell into outflows) but requires attention to the discount as part of total return.",
  },
  {
    q: "What is NTA and why does the discount/premium matter?",
    a: "NTA (Net Tangible Assets) is the per-share value of the LIC's underlying portfolio. If the LIC trades at $2.80 but its NTA is $3.00, it's at a 6.7% discount — you're buying $3 of assets for $2.80. If it trades above NTA, you're paying a premium. Historical discount/premium data is crucial: buying at a wide discount provides a margin of safety; buying at a premium means you're paying more than the portfolio is worth. Most LIC managers publish monthly NTA reports to the ASX.",
  },
  {
    q: "How do global LICs differ from ASX-listed ETFs like IVV or VGS?",
    a: "Key differences: (1) Cost: ETFs typically have MERs of 0.04%–0.22%; most global LICs charge 1%–1.5% — a structural drag of ~1% p.a. that compounds significantly over time. (2) Active management: LICs make active stock selection decisions; ETFs track an index passively. (3) Discount/premium: ETFs trade at or near NTA by arbitrage mechanism; LICs can deviate materially. (4) Tax: LICs are companies and pay corporate tax before distributing franked dividends — potentially better for investors in the 47% bracket but worse for low-income investors who can't fully utilise franking. (5) Liquidity: top ETFs (IVV, VGS) are far more liquid than most LICs.",
  },
  {
    q: "Are LIC distributions franked?",
    a: "Most Australian-domiciled LICs (MFF, PMC, PGF) pay franked dividends from their Australian-taxed profits. The franking credit percentage depends on how much Australian-source income (dividends from Australian companies, bank interest) the LIC holds — a predominantly foreign-equity LIC typically delivers low or zero franking because the underlying offshore dividends arrive unfranked. MFF and PMC have historically paid 25–100% franked dividends depending on portfolio composition and retained profits. Check each LIC's annual report for the specific franking level.",
  },
  {
    q: "When should I prefer a global LIC over a global ETF?",
    a: "Consider a global LIC when: (1) You want active stock selection and believe a specific manager (e.g. MFF's Chris Mackay, WGB's Paul Black) has a genuine edge — backed by long-term track record vs benchmark. (2) You are in a high tax bracket and can use franking credits from LIC dividends. (3) The LIC trades at a historically wide discount (>5–10% to NTA), providing a built-in margin of safety. (4) You prefer the concentrated, high-conviction style many LICs offer (20–40 stocks) vs index weight. Most long-term passive investors are better served by low-cost ETFs like VGS or IVV.",
  },
];

export default function GlobalLicsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Global LICs" },
  ]);
  const faqLd = faqJsonLd(FAQS.map(f => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link><span>/</span>
            <Link href="/global-investing" className="hover:text-slate-900">Global Investing</Link><span>/</span>
            <span className="text-slate-900 font-medium">Global LICs</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Global Listed Investment Companies (LICs)
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            ASX-listed LICs and LITs that invest in global equities — MFF, WGB, PMC, FGG, and more.
            How NTA discounts work, how LICs differ from ETFs, and when active global exposure makes sense
            for Australian investors.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only</p>
        </div>
      </section>

      {/* LIC table */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">ASX-listed global LICs at a glance</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900">
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Name</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">ASX</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Mandate</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">MER</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-white uppercase tracking-wide">Structure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {LICS.map((l, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{l.name}</td>
                    <td className="px-3 py-3 font-mono text-sm text-amber-700 font-bold">{l.asx}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{l.mandate}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{l.mer}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{l.structure}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-2">MER figures are approximate and may vary. Check the manager&apos;s current PDS/ASX announcement for exact fees.</p>
        </div>
      </section>

      {/* LIC vs ETF */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">LIC vs ETF — key differences</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Price vs NTA", body: "ETFs: price tracks NTA via arbitrage. LICs: price set by supply/demand — can be 5–20% above or below NTA. Buying at a deep discount is a structural advantage unique to LICs." },
              { label: "Management style", body: "ETFs are passive (index). LICs are active — a portfolio manager picks stocks. Whether you pay for active management depends on whether the manager consistently beats the index after fees." },
              { label: "Cost", body: "ETFs: 0.04%–0.22% MER. LICs: 0.5%–1.5% MER, some with performance fees. A 1% fee drag compounds to ~10% lower portfolio value over 10 years vs an index ETF." },
              { label: "Dividends + franking", body: "LICs pay dividends from company profits — often franked. ETFs distribute pass-through income — mostly unfranked for global ETFs. High-bracket investors value franking; low-bracket investors don&apos;t." },
            ].map(item => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <p className="text-sm font-extrabold text-slate-900 mb-1.5">{item.label}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
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
              { href: "/global-investing/etfs/us", label: "AU-listed US ETFs" },
              { href: "/global-investing/etfs/global", label: "Global ETFs (ASX-listed)" },
              { href: "/global-investing/tax/cgt-on-foreign-shares", label: "CGT on foreign shares" },
              { href: "/lic-screener", label: "LIC screener" },
              { href: "/global-investing", label: "Global investing hub" },
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} This page is general information about LICs. Fee figures may be outdated — verify with each manager&apos;s current PDS. Consult a financial adviser before investing.
          </p>
        </div>
      </section>
    </div>
  );
}
