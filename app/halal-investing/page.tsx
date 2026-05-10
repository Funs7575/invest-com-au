/**
 * Halal investing hub (W5.27).
 *
 * Foundation page — hero + AAOIFI screen explainer + provider list +
 * cross-links to broker / advisor comparison. Compliance posture per
 * CLAUDE.md: factual, comparison-driven, "general information only —
 * see a qualified Islamic finance scholar / accountant" disclaimers.
 *
 * Specific tickers / ETF names are deliberately avoided in favour of
 * referring readers to:
 *   - Crescent Wealth (Sharia-compliant super)
 *   - MCCA + Hejaz (Sharia-compliant home finance via Ijarah / Murabaha)
 *   - International-broker access to Sharia-screened ETFs (US/UK markets)
 *   - AAOIFI screening ratios for self-directed equity selection
 *
 * Future phases (NOT in this PR):
 *   - Sharia-specific broker filter (data needs auditing per-broker first)
 *   - Halal advisor specialty filter (subset of /find-advisor by language=ar OR specialty=islamic_finance)
 *   - Editorial reviews of each provider
 *   - Per-fund quarterly screening updates
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  SITE_URL,
  SITE_NAME,
  CURRENT_YEAR,
  absoluteUrl,
  breadcrumbJsonLd,
  ORGANIZATION_JSONLD,
} from "@/lib/seo";

export const revalidate = 86400;

const PAGE_TITLE = `Halal Investing in Australia (${CURRENT_YEAR}) — Sharia-Compliant Brokers, Super, ETFs & Home Finance`;
const PAGE_DESC = "Australian Muslim investors: Sharia-compliant super (Crescent Wealth), Islamic home finance (MCCA, Hejaz), AAOIFI-screened ETFs via international brokers, and the screening ratios for self-directed ASX selection. Independent comparison — general information only.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESC,
  alternates: { canonical: `${SITE_URL}/halal-investing` },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: `${SITE_URL}/halal-investing`,
    type: "article",
  },
  twitter: { card: "summary_large_image", title: PAGE_TITLE, description: PAGE_DESC },
};

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Halal Investing", url: absoluteUrl("/halal-investing") },
]);

export default function HalalInvestingHub() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSONLD) }}
      />
      <main className="bg-white text-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-800">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Halal Investing</span>
          </nav>

          {/* Hero */}
          <header className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-3">
              <span aria-hidden className="mr-1.5">🕌</span>
              Sharia-compliant investing · Updated {CURRENT_YEAR}
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-3">
              Halal investing in Australia
            </h1>
            <p className="text-lg text-slate-600">
              A practical guide for Australian Muslim investors: Sharia-compliant super, Islamic home finance, AAOIFI-screened ETFs, and the screening ratios for picking individual ASX names. {SITE_NAME} compares across providers — we don't recommend specific products.
            </p>
          </header>

          {/* What "halal investing" rules out */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-3">What Sharia compliance actually rules out</h2>
            <p className="text-slate-700 leading-relaxed mb-4">
              Sharia-compliant investing prohibits earning income from <em>riba</em> (interest), <em>gharar</em> (excessive uncertainty), and ownership of businesses whose primary activities are non-permissible (alcohol, gambling, conventional banking, pork, adult entertainment, tobacco, weapons). The screening framework most AU providers reference is the AAOIFI standard.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li><strong>Sector screen:</strong> exclude businesses whose primary revenue comes from prohibited industries.</li>
              <li><strong>Debt ratio:</strong> total interest-bearing debt &lt; 33% of trailing 24-month average market cap.</li>
              <li><strong>Interest-income ratio:</strong> non-operating interest income &lt; 5% of total revenue.</li>
              <li><strong>Non-permissible-income ratio:</strong> incidental non-compliant income &lt; 5% of total revenue (purified by donating that proportion of dividends).</li>
            </ul>
            <p className="text-xs text-slate-500 italic mt-3">
              General information only — different scholars and Sharia supervisory boards apply slightly different thresholds. See a qualified Islamic finance scholar for personal rulings.
            </p>
          </section>

          {/* Sharia-compliant super */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-3">Sharia-compliant super</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              <strong>Crescent Wealth</strong> is the longest-established Sharia-compliant super fund in Australia. Its investment options are screened by an independent Sharia supervisory board and exclude prohibited sectors. Performance and fees should be compared against your existing super before switching — the comparison rules are the same as any super-fund switch (lost insurance, capital-gains-on-rollover, exit fees).
            </p>
            <Link
              href="/best/super"
              className="inline-block text-emerald-700 hover:text-emerald-900 font-semibold underline underline-offset-2"
            >
              Compare super funds →
            </Link>
          </section>

          {/* Islamic home finance */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-3">Islamic home finance</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              Two AU providers offer Sharia-compliant home finance:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>
                <strong>MCCA (Muslim Community Co-operative Australia):</strong> Ijarah (lease-to-own) and Murabaha (cost-plus) home finance since 1989 — Australia's longest-running Islamic finance co-op.
              </li>
              <li>
                <strong>Hejaz Financial Services:</strong> Sharia-compliant home finance, investment products, and Islamic super partnerships.
              </li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              The ATO accepts the tax treatment of Sharia-compliant home finance products under the conventional-lending framework (Division 230 / mortgage interest deductions for investment property apply to the equivalent profit margin). No tax penalty for choosing the Sharia-compliant alternative.
            </p>
            <p className="text-xs text-slate-500 italic mt-3">
              General information only — see your accountant for personal tax treatment.
            </p>
          </section>

          {/* Self-directed ASX */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-3">Self-directed ASX — applying the screen yourself</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              For self-directed investors, applying the AAOIFI screen to ASX names is straightforward but requires re-checking each company's annual report. Roughly 30–40% of ASX 300 names typically pass a standard sector + ratio screen — heavily weighted toward miners, healthcare, and select consumer-staples. The big-four banks (CBA, WBC, NAB, ANZ) fail the sector screen; most LICs fail because their underlying portfolios mix compliant and non-compliant names.
            </p>
            <p className="text-slate-700 leading-relaxed">
              The practical workflow: shortlist by sector → check trailing-24-month average market cap → check debt-to-marketcap and interest-income ratios from the financial report → exclude any ETF or fund-of-funds whose underlying holdings haven't been screened. A managed Sharia portfolio (Hejaz, Crescent) avoids this work but charges a management fee.
            </p>
            <Link
              href="/best/share-trading"
              className="inline-block text-emerald-700 hover:text-emerald-900 font-semibold underline underline-offset-2 mt-3"
            >
              Compare brokers for ASX self-directed →
            </Link>
          </section>

          {/* Sharia-screened ETFs */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-3">Sharia-screened ETFs (international markets)</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              ASX-listed Sharia-specific ETF coverage is thin. Australian Muslim investors typically access Sharia-compliant index exposure via:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-slate-700">
              <li>
                A non-resident-friendly broker offering US/UK Sharia-screened ETFs (Wahed Invest's funds, iShares MSCI World Islamic, S&P 500 Shariah variants).
              </li>
              <li>
                A managed Sharia portfolio with an Australian Sharia supervisory board (Hejaz Equity, Crescent Wealth's growth options).
              </li>
              <li>
                Self-directed selection of compliant ASX names per the screen above.
              </li>
            </ul>
            <p className="text-xs text-slate-500 italic mt-3">
              General information only — confirm the Sharia supervisory board on each product before subscribing. Different boards apply different thresholds.
            </p>
          </section>

          {/* Find a Sharia-specialist advisor */}
          <section className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-10">
            <h2 className="text-2xl font-bold mb-3">Talk to a Sharia-finance specialist</h2>
            <p className="text-slate-700 mb-4">
              For a personal portfolio review aligned to your understanding of Sharia compliance — including super-switching, Islamic mortgage structuring, and tax-efficient halal investment vehicles — speak with a qualified Australian advisor specialising in Islamic finance.
            </p>
            <Link
              href="/find-advisor"
              className="inline-block px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg"
            >
              Find an Islamic finance advisor →
            </Link>
          </section>

          {/* Cross-border / non-resident note */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-3">Cross-border halal investing (UAE / Saudi Arabia / Malaysia)</h2>
            <p className="text-slate-700 leading-relaxed mb-3">
              For investors based in the UAE, Saudi Arabia, or Malaysia investing into Australia, country-specific tax treatment matters. Australia has no DTA with UAE or Saudi Arabia (so 30% WHT on unfranked dividends applies); Malaysia's DTA + transitional foreign-source-income exemption is in flux.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/foreign-investment/united-arab-emirates" className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2 text-sm">
                UAE investors
              </Link>
              <Link href="/foreign-investment/saudi-arabia" className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2 text-sm">
                Saudi Arabia investors
              </Link>
              <Link href="/foreign-investment/malaysia" className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2 text-sm">
                Malaysia investors
              </Link>
            </div>
          </section>

          {/* Compliance footer */}
          <footer className="text-xs text-slate-500 leading-relaxed border-t border-slate-200 pt-6">
            <p className="mb-2">
              {SITE_NAME} provides general information and comparison content only. We are not Islamic-finance scholars and do not certify Sharia compliance — refer to each provider's Sharia supervisory board for compliance attestations. Different boards apply different screening thresholds; what is permissible under one ruling may not be under another.
            </p>
            <p>
              See a qualified Islamic finance scholar / accountant / financial advisor for rulings and advice tailored to your circumstances.
            </p>
          </footer>
        </div>
      </main>
    </>
  );
}
