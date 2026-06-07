import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Wholesale & Sophisticated Investors Australia — s708 Tests, Certificate & What It Unlocks (${CURRENT_YEAR}) | invest.com.au`,
  description: `How the Australian wholesale (sophisticated) investor tests work under s708 of the Corporations Act — the $2.5M net-asset / $250k income certificate, the $500k offer test, professional-investor status — what wholesale access unlocks, and the retail protections you give up. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Wholesale & Sophisticated Investors in Australia (${CURRENT_YEAR})`,
    description:
      "The s708 sophisticated-investor tests, the accountant's certificate, what wholesale access unlocks (private credit, PE/VC, unregistered funds) — and the retail protections you trade away.",
    url: `${SITE_URL}/wholesale`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Wholesale & Sophisticated Investors")}&sub=${encodeURIComponent("s708 tests · Certificate · Trade-offs · " + CURRENT_YEAR)}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/wholesale` },
};

// ── How you qualify — the s708 Corporations Act tests (factual) ──────────────
const QUALIFY_TESTS = [
  {
    title: "Sophisticated investor — accountant's certificate",
    section: "s708(8)(c)",
    threshold: "Net assets ≥ $2.5M  OR  gross income ≥ $250k (last 2 financial years)",
    detail:
      "A qualified accountant certifies that you meet the assets or income test. The certificate is valid for 2 years and can be relied on for any wholesale offer in that window. This is the most common route for individuals.",
    badge: "Most common",
    color: "bg-amber-50 border-amber-200",
  },
  {
    title: "Large-offer test",
    section: "s708(8)(a)",
    threshold: "Invest ≥ $500,000 in a single offer",
    detail:
      "If the amount payable for the offer is at least $500,000 (counting certain associated amounts), the offer can be made without a regulated disclosure document — no accountant's certificate required for that specific offer.",
    badge: "Per-offer",
    color: "bg-blue-50 border-blue-200",
  },
  {
    title: "Professional investor",
    section: "s708(11)",
    threshold: "AFSL holder · controls ≥ $10M · listed entity · large super fund",
    detail:
      "Professional investors include AFSL holders, bodies that control gross assets of at least $10 million, listed entities and their related bodies, and certain regulated funds. A separate, higher bar than the sophisticated-investor test.",
    badge: "Institutional",
    color: "bg-violet-50 border-violet-200",
  },
  {
    title: "Experienced-investor certificate",
    section: "s708(10)",
    threshold: "Licensed adviser certifies relevant experience",
    detail:
      "Rarely used in practice: an AFSL-licensed person certifies in writing that they are satisfied, on reasonable grounds, that you have enough previous experience to assess the offer. Has strict written-acknowledgement requirements.",
    badge: "Rare",
    color: "bg-slate-50 border-slate-200",
  },
];

// ── Wholesale vs retail — what actually changes ──────────────────────────────
const COMPARISON = [
  {
    dim: "Disclosure document",
    retail: "Regulated PDS / prospectus required, with a Target Market Determination (TMD)",
    wholesale: "No regulated PDS or TMD required — you receive an information memorandum at most",
  },
  {
    dim: "Design & Distribution (DDO)",
    retail: "Issuer must design for a target market and distribute accordingly",
    wholesale: "DDO obligations generally do not apply",
  },
  {
    dim: "Typical minimums",
    retail: "From a few hundred dollars",
    wholesale: "Often $50,000 – $500,000+ per investment",
  },
  {
    dim: "Liquidity",
    retail: "Usually daily/periodic redemption on listed or registered products",
    wholesale: "Often locked up for years (private credit, PE/VC, unlisted property)",
  },
  {
    dim: "Dispute resolution",
    retail: "AFCA access + retail compensation arrangements typically apply",
    wholesale: "Reduced retail protections; AFCA access can be limited or unavailable",
  },
  {
    dim: "Product range",
    retail: "Registered managed funds, ETFs, listed shares",
    wholesale: "Adds unregistered schemes, private credit, PE/VC, wholesale property, placements",
  },
];

// ── What wholesale access unlocks — factual categories, NOT specific offers ──
const UNLOCKS = [
  { icon: "🏦", title: "Wholesale managed funds", body: "Wholesale unit classes of the same strategies, usually with materially lower management fees than the retail class." },
  { icon: "📄", title: "Unregistered schemes (MIS)", body: "Unregistered managed investment schemes that cannot be offered to retail investors without a PDS." },
  { icon: "💳", title: "Private credit", body: "Direct lending, mezzanine and asset-backed credit funds — income-focused, illiquid, and not capital-guaranteed." },
  { icon: "🚀", title: "Private equity & venture", body: "PE buyout and venture funds, plus direct/co-investment. Long lock-ups (often 7–10 years) and a wide dispersion of outcomes." },
  { icon: "🏢", title: "Wholesale property & syndicates", body: "Unlisted property trusts and development syndicates with single-asset concentration and multi-year terms." },
  { icon: "📈", title: "Placements & pre-IPO", body: "Capital raisings and pre-IPO rounds offered to wholesale investors only. Higher risk and information asymmetry." },
];

// ── What you give up — the responsible framing, shown prominently ─────────────
const GIVE_UP = [
  "Regulated disclosure — no PDS or TMD, so the burden of due diligence shifts almost entirely to you.",
  "Design & Distribution protections — issuers are not required to assess whether a product suits you.",
  "Retail dispute resolution — AFCA access and retail compensation schemes may not apply.",
  "Liquidity — wholesale assets are frequently locked up for years and hard to value or exit.",
  "Diversification — high minimums can push you into concentrated, single-manager positions.",
  "A safety net for mistakes — a wholesale certificate confirms wealth or income, not investing expertise.",
];

const FAQS = [
  {
    q: "What is a wholesale (sophisticated) investor in Australia?",
    a: "A wholesale investor is a person or entity that can be offered certain financial products without the retail disclosure regime (PDS, TMD, Design & Distribution obligations). The main pathways are in section 708 of the Corporations Act 2001: the sophisticated-investor test (a qualified accountant certifies net assets of at least $2.5 million or gross income of at least $250,000 for each of the last two financial years), the large-offer test ($500,000 or more invested in a single offer), and professional-investor status (e.g. AFSL holders or entities controlling at least $10 million). 'Wholesale' and 'sophisticated' are used loosely as synonyms, though the precise tests differ.",
  },
  {
    q: "How do I get a wholesale investor certificate?",
    a: "For the sophisticated-investor route you ask a qualified accountant (a member of a professional accounting body holding a current public practice certificate) to issue an s708(8)(c) certificate confirming you meet the net-asset or income test. The certificate is valid for two years. You then provide it to product issuers or platforms when you want to access a wholesale offer. Our free eligibility check helps you see which test you are likely to meet before you engage an accountant.",
  },
  {
    q: "What does the $2.5M / $250k test actually mean?",
    a: "You qualify under the assets test if your net assets are at least $2,500,000, or under the income test if your gross income was at least $250,000 in each of the previous two financial years. Net assets can include the family home and superannuation. Only one of the two tests needs to be met, and a qualified accountant must certify it.",
  },
  {
    q: "What protections do I give up as a wholesale investor?",
    a: "You lose the retail protection regime: no requirement for a regulated PDS or Target Market Determination, no Design & Distribution obligations on the issuer, and frequently no access to AFCA or retail compensation arrangements. Wholesale products are also typically illiquid, higher-minimum, and lower-disclosure. The certificate confirms your wealth or income — it does not make you an expert, and it does not reduce the underlying investment risk.",
  },
  {
    q: "Is being a wholesale investor better?",
    a: "It is a trade-off, not an upgrade. Wholesale access can mean lower fees on wholesale fund classes and exposure to strategies (private credit, PE/VC) not available to retail investors — but at the cost of disclosure, liquidity, and consumer protections. Whether it is appropriate depends entirely on your circumstances, time horizon, and ability to absorb losses. This is general information, not a recommendation; consider seeking advice from a licensed financial adviser.",
  },
  {
    q: "Does Invest.com.au facilitate wholesale offers?",
    a: "No. Invest.com.au is a factual information and comparison service. We do not issue, arrange, or facilitate any capital raising or wholesale offer, and we do not provide personal financial advice. We explain how the wholesale rules work and point you to the eligibility check and certification steps. Any actual offer is made by, and your money goes to, the relevant product issuer under their own documentation and licence.",
  },
];

export default function WholesalePage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Wholesale Investing" },
  ]);
  const faqLd = faqJsonLd(FAQS.map((f) => ({ q: f.q, a: f.a })));

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="border-b border-slate-100 py-8 md:py-14 bg-gradient-to-b from-slate-50 to-white">
        <div className="container-custom max-w-4xl">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Wholesale Investing</span>
          </nav>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-bold text-amber-700 mb-4">
            Wholesale &amp; Sophisticated Investors
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
            Wholesale &amp; sophisticated investors in Australia
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            How the section 708 tests work, how the accountant&apos;s certificate is issued, what
            wholesale status unlocks — and, just as important, the retail protections you trade away.
            A factual guide, not a recommendation.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <Link href="/wholesale/quiz" className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors">
              Check your eligibility — free 3-question test
            </Link>
            <Link href="/account/wholesale-cert" className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:border-slate-400 transition-colors">
              Submit a certificate
            </Link>
          </div>
          <p className="text-xs text-slate-500 mt-4">{UPDATED_LABEL} · General information only · Not financial advice</p>
        </div>
      </section>

      {/* How you qualify */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">How you qualify</h2>
          <p className="text-sm text-slate-600 mb-5 leading-relaxed">
            There are four routes under section 708 of the Corporations Act 2001. You only need to meet one.
          </p>
          <div className="space-y-3">
            {QUALIFY_TESTS.map((t) => (
              <div key={t.title} className={`rounded-xl border p-4 ${t.color}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-extrabold text-slate-900">{t.title}</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{t.threshold}</p>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{t.detail}</p>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white border border-slate-200 text-slate-600">{t.badge}</span>
                    <span className="text-[10px] font-mono text-slate-400">{t.section}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The certificate / CTA */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3">The accountant&apos;s certificate</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            For most individuals the practical route is the sophisticated-investor certificate. A qualified
            accountant — a member of a professional accounting body with a current public-practice certificate
            — confirms in writing that you meet the net-asset or income test. The certificate is valid for two
            years and can be relied on across multiple wholesale offers in that window. You provide it to the
            product issuer or platform when you want to access a wholesale-only opportunity.
          </p>
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-slate-700 flex-1">
              Not sure which test you meet? The free eligibility check walks through the s708 tests in three
              questions — no certificate or account required.
            </p>
            <Link href="/wholesale/quiz" className="shrink-0 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors text-center">
              Take the eligibility check
            </Link>
          </div>
        </div>
      </section>

      {/* Wholesale vs retail */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Wholesale vs retail — what changes</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm" aria-label="Wholesale vs retail investor — what changes under each classification">
              <thead>
                <tr className="bg-slate-900">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">What changes</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Retail investor</th>
                  <th scope="col" className="text-left px-4 py-3 text-xs font-bold text-white uppercase tracking-wide">Wholesale investor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {COMPARISON.map((row) => (
                  <tr key={row.dim} className="hover:bg-slate-50 align-top">
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.dim}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.retail}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 leading-relaxed">{row.wholesale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* What it unlocks */}
      <section className="py-10 border-b border-slate-100 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">What wholesale access unlocks</h2>
          <p className="text-sm text-slate-600 mb-5 leading-relaxed">
            The categories below become available to wholesale investors. These are factual descriptions of
            product types — not offers, recommendations, or an invitation to invest. Each carries materially
            higher risk than registered retail products.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {UNLOCKS.map((item) => (
              <div key={item.title} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-2xl mb-2">{item.icon}</div>
                <p className="text-sm font-extrabold text-slate-900 mb-1.5">{item.title}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you give up */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 md:p-6">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">What you give up — read this first</h2>
            <p className="text-sm text-slate-700 leading-relaxed mb-4">
              Wholesale status removes consumer protections that exist for a reason. Before you rely on a
              certificate, be clear about what you are trading away:
            </p>
            <ul className="space-y-2">
              {GIVE_UP.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                  <span className="shrink-0 mt-0.5 text-amber-600 font-bold">!</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
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
              { href: "/wholesale/quiz", label: "Wholesale eligibility check" },
              { href: "/account/wholesale-cert", label: "Submit a certificate" },
              { href: "/family-office", label: "Family office guide" },
              { href: "/invest/funds", label: "Managed funds (retail vs wholesale)" },
              { href: "/smsf", label: "SMSF hub" },
              { href: "/find-advisor", label: "Find a financial adviser" },
            ].map((link) => (
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
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} This page is general
            information about the wholesale / sophisticated-investor rules in section 708 of the Corporations
            Act 2001. It is not financial, tax, or legal advice, and it is not an offer or invitation to
            invest in any product. Thresholds and rules can change — confirm your status with a qualified
            accountant and seek independent advice from a licensed financial adviser before acting.
          </p>
        </div>
      </section>
    </div>
  );
}
