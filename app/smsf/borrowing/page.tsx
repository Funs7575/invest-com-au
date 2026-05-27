import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

const FAQS = [
  {
    q: "What is a Limited Recourse Borrowing Arrangement (LRBA) in an SMSF?",
    a: "An LRBA allows an SMSF to borrow money to purchase a single acquirable asset (or a collection of identical assets) held in a separate bare trust. The key feature is 'limited recourse': if the SMSF defaults, the lender's recourse is limited to the asset being purchased — they cannot access the SMSF's other assets. The asset is held by the bare trustee (a separate bare trust) on behalf of the SMSF until the loan is fully repaid, at which point the asset transfers to the SMSF directly.",
  },
  {
    q: "What assets can an SMSF borrow to buy under an LRBA?",
    a: "An SMSF LRBA can be used to purchase: (1) Real property (residential or commercial) — the most common use. (2) Listed shares or listed managed investment scheme interests, provided they are a single class and purchased as a single acquirable asset. An SMSF cannot borrow to buy collectibles, art, or precious metals. The asset must be a 'single acquirable asset' — you can't use one LRBA to buy a portfolio of different shares. Most SMSFs use LRBAs for commercial property (less restriction than residential) or residential property.",
  },
  {
    q: "Can a related party lend money to an SMSF for an LRBA?",
    a: "Yes, related party loans (from the fund members or associated entities) are permitted but must meet ATO safe harbour conditions to avoid the non-arm's length income (NALI) rules. For residential property LRBAs, the safe harbour requires: interest rate of at least the Reserve Bank's Indicator Lending Rate for Housing Loans (currently 7.74% p.a. in 2025-26 for residential); maximum LVR of 70% of market value; interest-only repayments acceptable. For commercial property, the safe harbour interest rate is at least the RBA's Indicator Lending Rate for Small Business (currently 8.85% p.a. in 2025-26). Non-complying related party loans trigger NALI — all fund income can be taxed at 45%.",
  },
  {
    q: "What is the Non-Arm's Length Income (NALI) risk in SMSF LRBAs?",
    a: "NALI rules mean that if an SMSF enters into a scheme where income is higher than arm's length expectations — or costs (including interest on an LRBA) are lower than arm's length — the resulting fund income is taxed at 45% rather than the standard 15% (or 0% in pension phase). A related party LRBA at below-market interest rates is the most common NALI trigger. The ATO expanded NALI guidance in TD 2024/4 (effective from 2023-24 onwards) to cover general expenses too. Always benchmark related party loan terms against ATO safe harbours.",
  },
  {
    q: "What LVR and rates can I expect for a bank SMSF loan?",
    a: "Commercial SMSF loan terms (2025-26): residential property — maximum 70-80% LVR, interest rates typically 6.5%-8.5% p.a. (interest only); commercial property — maximum 70% LVR, interest rates typically 6.5%-8.5% p.a. These rates are materially higher than standard residential mortgages because SMSF loans are a niche specialty product with limited lender competition. Key lenders include Macquarie Bank, La Trobe Financial, Thinktank, Pepper Money (commercial), and some credit unions. CommBank exited SMSF lending in 2018; ANZ and NAB do not offer SMSF loans.",
  },
  {
    q: "What is the minimum SMSF balance needed before borrowing?",
    a: "There is no legal minimum balance, but financial advisers and lenders commonly recommend $200,000-$500,000 in the fund before undertaking an LRBA. The reasoning: (1) SMSF running costs ($3,000-$5,000 p.a.) are a higher percentage of a small balance. (2) Property concentrates risk — a $600,000 property in a $300,000 fund means 200% exposure in one asset, grossly violating diversification. (3) Lenders require sufficient liquidity after settlement to service the loan and maintain SMSF obligations. Most SMSF specialists will not facilitate an LRBA for funds under $250,000.",
  },
];

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `SMSF Borrowing (LRBA) Guide Australia (${CURRENT_YEAR}) — Rules, Rates & Risks`,
  description:
    "Complete guide to SMSF Limited Recourse Borrowing Arrangements (LRBAs). What an SMSF can borrow to buy, related party loan safe harbour rates, NALI risk, lender comparison, and minimum balance requirements.",
  alternates: { canonical: `${SITE_URL}/smsf/borrowing` },
  openGraph: {
    title: `SMSF Borrowing (LRBA) Guide Australia (${CURRENT_YEAR})`,
    description: "SMSF LRBA rules, related party loan safe harbour rates, NALI risk, and lender options.",
    url: `${SITE_URL}/smsf/borrowing`,
  },
};

export default function SmsfBorrowingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "Borrowing (LRBA)", url: absoluteUrl("/smsf/borrowing") },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />}
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/smsf" className="hover:text-white">SMSF</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Borrowing (LRBA)</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">Updated {CURRENT_YEAR}</span>
              <span className="text-xs font-semibold bg-purple-600 text-white px-3 py-1 rounded-full">NALI Rules Apply</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              SMSF Borrowing: Limited Recourse Borrowing Arrangements
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              An SMSF can borrow to buy property or shares through a Limited Recourse Borrowing Arrangement (LRBA). The rules are tight — ATO safe harbour rates, bare trust requirements, and NALI risks — but it is one of the most powerful SMSF strategies for experienced trustees.
            </p>
          </div>
        </section>

        {/* Key Stats */}
        <section className="bg-white py-8 border-b border-slate-100">
          <div className="container-custom">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { v: "70%", l: "Maximum LVR (most lenders)", sub: "Residential & commercial" },
                { v: "7.74%", l: "Related-party safe harbour", sub: "Residential, 2025-26" },
                { v: "$250k+", l: "Minimum fund size", sub: "Practical minimum before LRBA" },
                { v: "45%", l: "NALI tax rate", sub: "If non-arm's length terms used" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-2xl font-extrabold text-slate-900">{s.v}</div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">{s.l}</div>
                  <div className="text-xs text-slate-500">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How LRBAs work */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">How an SMSF LRBA works</h2>
            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: "Set up a bare trust",
                  body: "The asset cannot be held directly by the SMSF during the loan period. A separate 'bare trust' (also called a holding trust or custodian arrangement) must be established with a bare trustee (often a shelf company). The bare trustee holds legal title to the asset on behalf of the SMSF, which holds beneficial ownership. The bare trust deed must be in place before the SMSF contracts to purchase the asset.",
                },
                {
                  step: "2",
                  title: "Borrow from a lender or related party",
                  body: "The SMSF (not the bare trust) borrows the funds. The loan can come from: (1) a commercial lender specialising in SMSF loans (Macquarie, La Trobe, Thinktank, Pepper), or (2) a related party (a member, their employer, or a related trust/company), provided the loan terms meet ATO safe harbour conditions to avoid NALI. The lender takes security over the asset held in the bare trust.",
                },
                {
                  step: "3",
                  title: "Make repayments from the SMSF",
                  body: "Loan repayments (both principal and interest) must be made from the SMSF's own funds — contributions, investment income, and other SMSF cash. Members cannot make payments directly to the bare trust or lender. The SMSF must have sufficient liquidity to service the loan without requiring member contributions specifically for repayment.",
                },
                {
                  step: "4",
                  title: "Transfer asset to SMSF on loan repayment",
                  body: "Once the LRBA loan is fully repaid, the asset is transferred from the bare trust directly into the SMSF's name. This transfer is exempt from stamp duty in most states (NSW, VIC, QLD, SA, WA have specific SMSF LRBA transfer exemptions). The SMSF then holds the property or shares directly as a normal SMSF asset.",
                },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white font-extrabold text-sm flex items-center justify-center">{s.step}</div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 mb-1">{s.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Related party safe harbour rates */}
        <section className="py-10 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Related party loan safe harbour rates (2025–26)</h2>
            <p className="text-sm text-slate-600 mb-5">To avoid NALI, related party LRBAs must charge at least the following benchmark rates (ATO PCG 2016/5, updated annually). Using rates below these benchmarks exposes the fund to NALI, where all taxable income can be taxed at 45%.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 font-bold text-slate-700">Asset type</th>
                    <th className="text-right p-4 font-bold text-slate-700">Minimum interest rate (2025-26)</th>
                    <th className="text-right p-4 font-bold text-slate-700">Maximum LVR</th>
                    <th className="text-left p-4 font-bold text-slate-700">Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { type: "Residential property", rate: "7.74% p.a.", lvr: "70%", basis: "RBA Indicator Lending Rate — Housing" },
                    { type: "Commercial property", rate: "8.85% p.a.", lvr: "70%", basis: "RBA Indicator Lending Rate — Small Business" },
                    { type: "Listed shares", rate: "7.74% p.a.", lvr: "50%", basis: "RBA Indicator Lending Rate — Housing" },
                  ].map((row) => (
                    <tr key={row.type} className="hover:bg-slate-50">
                      <td className="p-4 font-medium text-slate-700">{row.type}</td>
                      <td className="p-4 text-right font-bold text-red-700">{row.rate}</td>
                      <td className="p-4 text-right text-slate-600">{row.lvr}</td>
                      <td className="p-4 text-xs text-slate-500">{row.basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">Rates as at 2025-26. The ATO updates safe harbour benchmarks annually via PCG 2016/5. Always check the current ATO guidance before setting related party loan terms.</p>
          </div>
        </section>

        {/* Key rules */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">Key LRBA rules and common mistakes</h2>
            <div className="space-y-4">
              {[
                {
                  title: "Single acquirable asset rule",
                  badge: "SIS Act s67A",
                  body: "Each LRBA must finance the acquisition of a 'single acquirable asset'. A property on a single title is a single acquirable asset. You cannot bundle multiple different properties or mixed-class assets under one LRBA. For listed securities, a class of identical securities (e.g., 1,000 CBA shares at the same price on the same day) counts as a single acquirable asset.",
                  risk: false,
                },
                {
                  title: "Replacement assets are not permitted",
                  badge: "No renovation",
                  body: "You cannot improve an LRBA asset to the point that it becomes a fundamentally different asset. Ordinary repairs and maintenance are fine. Major capital improvements (adding a new structure, changing the character of the property) must wait until the LRBA is repaid and the asset is transferred to the SMSF directly. This is the most commonly breached LRBA rule.",
                  risk: true,
                },
                {
                  title: "In-house asset rules",
                  badge: "5% limit",
                  body: "In-house assets (investments in, loans to, or use of fund assets by related parties) cannot exceed 5% of total fund assets. LRBA assets held in a bare trust are generally NOT in-house assets — the bare trust arrangement is specifically excluded. However, if you accidentally breach the bare trust requirements, the LRBA asset can become an in-house asset, triggering an immediate compliance breach.",
                  risk: true,
                },
                {
                  title: "Stamp duty on bare trust to SMSF transfer",
                  badge: "State-by-state",
                  body: "When the LRBA is repaid and the property transfers from the bare trust to the SMSF, most states exempt this transfer from stamp duty (NSW, VIC, QLD, SA, WA all have SMSF-specific LRBA exemptions with conditions). Ensure the exemption applies before settlement — incorrect structuring can result in stamp duty on the transfer of a high-value property. Get specific state-based advice.",
                  risk: false,
                },
                {
                  title: "NALI: non-arm's length income",
                  badge: "45% tax risk",
                  body: "If a related party LRBA uses below-market interest rates, the ATO can classify all fund income (not just property income) as non-arm's length income, taxed at 45%. TD 2024/4 extended NALI treatment to all fund income where a non-arm's length expense has been incurred. A single year of below-benchmark rates on a related party LRBA can trigger NALI classification for the whole fund. This is the most financially catastrophic LRBA error.",
                  risk: true,
                },
              ].map((item) => (
                <div key={item.title} className={`rounded-xl border p-5 ${item.risk ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className={`font-extrabold ${item.risk ? "text-red-900" : "text-slate-900"}`}>{item.title}</h3>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${item.risk ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"}`}>{item.badge}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${item.risk ? "text-red-800" : "text-slate-600"}`}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((item) => (
                <details key={item.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {item.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Compliance + nav */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/smsf" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">SMSF hub →</Link>
              <Link href="/smsf/property" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">SMSF property guide →</Link>
              <Link href="/advisors/smsf-accountants" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Find an SMSF specialist →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
