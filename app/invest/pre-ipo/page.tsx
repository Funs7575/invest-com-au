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
  title: `Pre-IPO Investing in Australia (${CURRENT_YEAR}) — Wholesale-Only Late-Stage Private Deals`,
  description:
    "Independent guide to pre-IPO investing in Australia. Wholesale-only — sophisticated investor (s708) requirements, common deal structures, Australian platforms (PrimaryMarkets, OnMarket Pre-IPO) and risks.",
  alternates: { canonical: `${SITE_URL}/invest/pre-ipo` },
  openGraph: {
    title: `Pre-IPO Investing in Australia (${CURRENT_YEAR})`,
    description:
      "Late-stage private placements before IPO — sophisticated and wholesale investor only. Requirements, structures, platforms and risks.",
    url: `${SITE_URL}/invest/pre-ipo`,
  },
};

const SECTIONS = [
  {
    id: "what-it-means",
    label: "What pre-IPO investing means in Australia",
    body:
      "Pre-IPO investing is the purchase of equity in a private company at a late stage of growth, usually 12–36 months before an anticipated initial public offering. In the Australian market, deals reach pre-IPO investors through three primary channels: late-stage private placements led by the company's corporate advisor, secondary share buys from existing shareholders (employees, early VCs, founders) on platforms like PrimaryMarkets, and broker-syndicated pre-IPO rounds run by Macquarie, UBS, Morgans and other syndicate desks. The thesis is the IPO discount — pre-IPO shares typically clear 15%–30% below the eventual IPO offer price, plus pre-IPO upside from operational growth and pre-listing valuation expansion.",
  },
  {
    id: "wholesale-requirements",
    label: "Wholesale / sophisticated investor requirements",
    body:
      "Pre-IPO deals are structured as private placements relying on the section 708 disclosure exemptions in the Corporations Act 2001 (Cth). The two relevant exemptions: section 708(8) — sophisticated investor — requires either gross income of $250,000+ in each of the previous two financial years, or net assets of $2.5M (subject to the Reg 6D.2.03 calculation, which excludes the family home). Section 708(11) — wholesale investor — typically requires an accountant's certificate confirming net assets of $2.5M or gross income of $250,000+ for each of the last two years. Professional investor status (s708(11)(c)) covers AFSL holders, APRA-regulated entities and corporates with more than $10M of assets. ASIC has signalled the dollar thresholds may be reviewed in coming years, but for now they are unchanged since 2002.",
  },
  {
    id: "deal-structures",
    label: "Common pre-IPO deal structures",
    body:
      "Convertible notes are the most common pre-IPO structure in Australia — the note converts to equity at the IPO at a discount (typically 15%–25%) to the offer price, with a valuation cap protecting against an unexpectedly large up-round. Preference shares (with liquidation preference, anti-dilution and conversion to ordinary at IPO) are common in larger pre-IPO rounds and follow Silicon Valley conventions adapted to Australian Corporations Act drafting. SAFEs (Simple Agreement for Future Equity) are less common in Australia than the US — they exist but most Australian corporate counsel prefers convertible notes for ASIC compliance certainty. Secondary share buys from existing shareholders are growing — these transfer ordinary shares at a negotiated valuation, with the seller bearing the existing share class economics.",
  },
  {
    id: "risks",
    label: "Risks unique to pre-IPO",
    body:
      "Illiquidity is the dominant risk — pre-IPO shares cannot be sold until the IPO completes, and IPO timing slips. Companies that signal an 18-month IPO window often miss it, sometimes by years. Marquee Australian pre-IPOs that delayed beyond original timing include Canva, Airwallex, SafetyCulture and others. IPO pricing risk — the IPO can clear below the pre-IPO valuation if market conditions shift. Valuation marks vs realised value — convertible note 409A and last-round-mark valuations are not market-tested until exit; markdowns at IPO are common. Lockup risk post-IPO — pre-IPO investors are routinely subject to 6–12 month lockup post-listing, exposing them to share-price decline during escrow. Operational risk — the company can fail or pivot before IPO; pre-IPO equity can be wiped out in distress.",
  },
  {
    id: "platforms",
    label: "Australian platforms & channels",
    body:
      "PrimaryMarkets — the dominant Australian secondary marketplace for late-stage private company shares; trades shares in unlisted companies between accredited investors. OnMarket Pre-IPO — primary issuance platform; companies use OnMarket to run pre-IPO rounds open to wholesale investors. Birchal — equity crowdfunding under CSF rules (different regime — section 738 not 708); some pre-IPO rounds are accessible to retail through CSF up to $10K per investor. Sophisticated Investor Network (SIN) — invitation-only deal flow for sophisticated investors. Broker syndicate desks at Macquarie Capital, UBS Australia, Morgans, Bell Potter and Canaccord Genuity manage pre-IPO rounds for their wholesale and HNW clients alongside subsequent IPO mandates. Family offices and accountancy networks (BDO, Pitcher Partners, Findex) also intermediate pre-IPO deal flow for HNW clients with accountant's certificates in place.",
  },
];

const FAQS = [
  {
    question: "Can a retail investor in Australia invest in pre-IPO?",
    answer:
      "Generally no — direct pre-IPO investments are wholesale-only under the section 708 disclosure exemptions. The two exceptions are: equity crowdfunding under the CSF regime (section 738) which allows retail investment up to $10,000 per company per year through licensed CSF intermediaries like Birchal and Equitise — companies under $25M assets and revenue can raise up to $5M per year via CSF; and ASX-listed pre-IPO funds (e.g. some structured offerings on the LIC market) which give indirect listed exposure to a basket of pre-IPO investments.",
  },
  {
    question: "How does the accountant's certificate work?",
    answer:
      "An accountant's certificate (Form 708-11) is signed by a qualified accountant — registered tax agent, CA, CPA or IPA — confirming the investor has net assets of at least $2.5M or gross income of at least $250,000 for each of the last two years. The certificate is valid for two years and is provided to the issuer along with the application. The accountant should hold a current Public Practice Certificate. Misrepresentation on a 708-11 certificate exposes both the investor and accountant to penalties — Corporations Act breach plus professional disciplinary action against the accountant.",
  },
  {
    question: "How are pre-IPO gains taxed in Australia?",
    answer:
      "Capital gains on pre-IPO shares held for more than 12 months by individuals or trusts qualify for the 50% CGT discount. Discount is not available for companies. Convertible notes have specific tax treatment under TOFA (Taxation of Financial Arrangements) — the conversion event triggers a CGT event G3 at the conversion price, with the cost base of the resulting shares becoming the conversion price plus accrued interest. Employee Share Schemes for pre-IPO shares have specific concessional rules under Division 83A — startup ESS concessions are particularly favourable for genuine startups with revenue below $50M. Always engage a tax adviser before signing a pre-IPO subscription.",
  },
  {
    question: "What lockups apply post-IPO to pre-IPO shares?",
    answer:
      "Discretionary escrow imposed by the lead corporate advisor typically requires pre-IPO investors to hold for 6–12 months post-listing, with staggered release (e.g. 50% at 6 months, 50% at 12 months). For mining and biotech IPOs, ASX mandatory escrow rules under Listing Rule Chapter 9 may impose 12–24 months on vendor and pre-IPO holders. Escrow terms are disclosed in the prospectus — read the escrow section before subscribing pre-IPO. Escrow expiry is typically a meaningful share-price event.",
  },
  {
    question: "Can foreign wholesale investors access Australian pre-IPO?",
    answer:
      "Yes — non-resident wholesale investors can subscribe to Australian pre-IPO offerings, but should consider FIRB notification requirements (private acquisitions of 20%+ of an Australian business above the relevant threshold trigger notification regardless of public listing status) and DTA-relief for Australian withholding tax on subsequent dividends. Foreign investment lawyers experienced with FIRB and ASIC pre-IPO compliance are essential — most wholesale offers include a foreign-investor questionnaire.",
  },
  {
    question: "What's a typical pre-IPO ticket size?",
    answer:
      "Pre-IPO ticket sizes vary by deal. Smaller pre-IPO rounds run by OnMarket and smaller corporate advisors accept $25,000–$100,000 minimums. Mid-sized rounds (most ASX-bound mid-caps) typically clear at $100,000–$500,000 minimums. Large pre-IPOs (Canva, Airwallex-style rounds) typically have $1M+ minimums and are limited to family offices, super funds, institutional VCs and the largest HNW clients of broker syndicate desks. Ticket size doesn't determine return outcome — discipline on entry valuation matters more than allocation size.",
  },
  {
    question: "How do I evaluate pre-IPO valuation honestly?",
    answer:
      "Compare the pre-IPO offer price to the company's recent funding rounds (Series B, C, D), to listed-comp trading multiples (revenue multiple, EBITDA multiple where applicable), and to the projected IPO offer range from the corporate advisor. Discount the projected IPO range by 30%–40% to account for IPO-window risk and pricing variance. Check the cap table — pre-IPO investors are typically junior to multiple preferred share classes; in distress, ordinary share cost basis may not be recovered. Material adverse change clauses, anti-dilution provisions and ratchet rights all materially affect the economic outcome and are disclosed in the subscription agreement.",
  },
];

export default function PreIpoPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Pre-IPO" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Pre-IPO Investing in Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/pre-ipo`,
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
            <span className="text-slate-900 font-medium">Pre-IPO</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-red-100 text-red-800">
              Wholesale only
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              High risk
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Independent research
            </span>
            <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Updated {CURRENT_YEAR}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            Pre-IPO Investing in Australia
          </h1>
          <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mb-6">
            Late-stage private company investments before initial public
            offering — accessible only to sophisticated and wholesale investors
            under the Corporations Act section 708 exemptions. Material risks,
            illiquidity and IPO timing variance.
          </p>

          <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
            {[
              { label: "Typical ticket size", value: "$50K–$1M" },
              { label: "Discount-to-IPO heuristic", value: "15–30%" },
              { label: "Holding period", value: "1–3 years" },
              { label: "Sophisticated threshold", value: "$2.5M / $250K" },
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

      {/* Wholesale-only declaration banner */}
      <section className="py-8 md:py-10 bg-red-50 border-y-2 border-red-200">
        <div className="container-custom">
          <div className="flex items-start gap-4 max-w-4xl">
            <div className="w-12 h-12 rounded-lg bg-red-200 flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="shield" size={24} className="text-red-800" />
            </div>
            <div>
              <h2 className="text-base font-extrabold uppercase tracking-wide text-red-800 mb-2">
                Wholesale &amp; Sophisticated Investors Only
              </h2>
              <p className="text-sm md:text-base text-red-900 leading-relaxed mb-3">
                Pre-IPO investments described on this page are available
                exclusively to investors meeting the wholesale or sophisticated
                investor tests under sections 708(8), 708(10) and 708(11) of
                the Corporations Act 2001 (Cth). Retail investors cannot access
                these deals directly. The information on this page is general
                information only — not financial advice, not a recommendation,
                and not an offer to subscribe for shares or any financial
                product. Pre-IPO investments are illiquid, high-risk, and may
                result in total loss of capital.
              </p>
              <p className="text-sm md:text-base text-red-900 leading-relaxed mb-3">
                <strong>Sophisticated investor (s708(8)) tests:</strong> gross
                income of A$250,000+ for each of the last two financial years,
                <em>or</em> net assets of A$2.5M (subject to Reg 6D.2.03
                calculation excluding the family home).
              </p>
              <p className="text-sm md:text-base text-red-900 leading-relaxed">
                <strong>Wholesale investor (s708(11)) tests:</strong>{" "}
                accountant&apos;s certificate confirming net assets of A$2.5M+ or
                gross income of A$250,000+ for each of the last two years;
                <em> or</em> professional investor status (AFSL holder,
                APRA-regulated entity, body corporate with more than A$10M of
                assets).
              </p>
              <p className="text-xs text-red-700 mt-3">
                Sources: Corporations Act 2001 (Cth) ss708(8)–(11);
                Corporations Regulations 2001 reg 6D.2.03.{" "}
                <span className="italic">
                  Always obtain independent legal, tax and financial advice
                  before subscribing to any pre-IPO offer.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="py-10 md:py-12 bg-white" id="sections">
        <div className="container-custom">
          <div className="mb-6 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1">
              Section 1 &middot; Five things to understand
            </p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Pre-IPO investing in Australia
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              The mechanics, the gating, the structures, the risks and the
              platforms — read all five before considering a pre-IPO
              subscription.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6" role="tablist">
            {SECTIONS.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  i === 0
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-white text-slate-700 border-slate-200 hover:border-red-400 hover:text-red-700"
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-white/20 text-[11px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                {s.label}
              </a>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SECTIONS.map((s, i) => (
              <div
                key={s.id}
                id={s.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-5 scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-8 h-8 rounded-full bg-red-600 text-white font-extrabold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{s.label}</h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Honest risk block */}
      <section className="py-10 md:py-12 bg-amber-50 border-y border-amber-200">
        <div className="container-custom max-w-4xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center shrink-0 mt-0.5">
              <Icon name="info" size={20} className="text-amber-800" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-amber-800 mb-2">
                Honest disclosure on pre-IPO returns
              </h2>
              <p className="text-sm md:text-base text-amber-900 leading-relaxed mb-3">
                Pre-IPO is glamorised in financial media because winners are
                public — Canva, Atlassian (already listed), SafetyCulture,
                Airwallex. Losers and broken IPO timing slips are not
                publicised at the same volume. The realistic distribution of
                pre-IPO returns for individual deals is wide:
              </p>
              <ul className="text-sm text-amber-900 leading-relaxed space-y-1.5 mb-3">
                <li>
                  <strong>~20–30%</strong> of pre-IPO investments deliver the
                  intended IPO timing and meaningful uplift
                </li>
                <li>
                  <strong>~30–40%</strong> deliver flat or modestly positive
                  returns after IPO with delays vs original timeline
                </li>
                <li>
                  <strong>~20–30%</strong> stall — IPO does not happen in the
                  expected window and capital remains locked up
                </li>
                <li>
                  <strong>~10–20%</strong> result in material capital impairment
                  or total loss
                </li>
              </ul>
              <p className="text-sm md:text-base text-amber-900 leading-relaxed">
                Diversification across 8–15 pre-IPO investments rather than
                concentrating in one or two is the typical pattern for
                experienced wholesale investors. Pre-IPO should be sized as a
                single-digit-percent allocation of total investable assets,
                not a core holding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-12 bg-white" id="faqs">
        <div className="container-custom max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-wider text-red-600 mb-1">
            Section 2 &middot; FAQs
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
            Pre-IPO investing — frequently asked
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
          <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2">
            Section 3 &middot; Get specialist help
          </p>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Speak with a wholesale investment specialist
          </h2>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6 max-w-2xl">
            Pre-IPO requires a wholesale-investor declaration, careful
            valuation analysis and tax structuring. A private wealth manager
            with active pre-IPO deal flow plus a foreign-investment lawyer (for
            cross-border subscribers) is the standard setup before signing a
            subscription agreement.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Link
              href="/advisors/private-wealth-managers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="briefcase" size={20} className="text-red-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-red-300">
                  Private wealth managers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Macquarie, UBS, Morgan Stanley, JBWere and boutique wealth
                managers with consistent pre-IPO deal flow and wholesale-client
                allocation.
              </p>
            </Link>

            <Link
              href="/advisors/foreign-investment-lawyers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="globe" size={20} className="text-red-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-red-300">
                  Foreign investment lawyers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                FIRB notification, ASIC pre-IPO compliance and DTA-relief
                structuring for non-resident wholesale investors entering
                Australian pre-IPO deals.
              </p>
            </Link>

            <Link
              href="/advisors/tax-agents"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="calculator" size={20} className="text-red-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-red-300">
                  Tax agents
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Section 708-11 accountant&apos;s certificate, Division 83A ESS
                interaction, TOFA convertible-note treatment and CGT discount
                eligibility on pre-IPO holdings.
              </p>
            </Link>

            <Link
              href="/advisors/wealth-managers"
              className="group bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icon name="trophy" size={20} className="text-red-400" />
                <h3 className="text-base font-extrabold text-white group-hover:text-red-300">
                  Wealth managers
                </h3>
              </div>
              <p className="text-xs md:text-sm text-slate-300">
                Independent wealth managers with off-market pre-IPO and
                secondary-market access through PrimaryMarkets, OnMarket and
                broker syndicate desks.
              </p>
            </Link>
          </div>

          <Link
            href="/find-advisor?focus=pre-ipo"
            className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-400 text-white font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
          >
            Match me with a wholesale specialist
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
