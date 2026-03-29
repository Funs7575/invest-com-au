import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { SUPER_WARNING_SHORT, GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "SMSF Australia: Complete Guide to Self-Managed Super Funds (2026) — Invest.com.au",
  description:
    "Everything you need to know about SMSFs: setup costs, investment options, compliance, property in super, and whether an SMSF is right for you. Updated 2026.",
  openGraph: {
    title: "SMSF Australia: Complete Guide to Self-Managed Super Funds (2026)",
    description:
      "Everything you need to know about SMSFs: setup costs, investment options, compliance, property in super, and whether an SMSF is right for you. Updated 2026.",
    url: `${SITE_URL}/super/smsf`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("SMSF Australia: Complete Guide")}&sub=${encodeURIComponent("Setup Costs · Investment Options · Compliance · Property in Super")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/super/smsf` },
};

const SMSF_SECTIONS = [
  {
    heading: "What is an SMSF?",
    body: "A Self-Managed Super Fund (SMSF) is a private superannuation trust that you control as both the trustee and the member. Unlike retail or industry funds managed by APRA-regulated institutions, an SMSF places investment decisions — and compliance obligations — directly in the hands of its members.\n\nTrustee structure: An SMSF can have individual trustees or a corporate trustee. With individual trustees, each member must be a trustee of the fund. With a corporate trustee (a company set up specifically to act as trustee), each member is a director of that company. A corporate trustee is generally recommended — it simplifies asset ownership, makes it easier to add or remove members, and provides cleaner separation between personal and super assets for estate planning.\n\nMembership: Since July 2021, an SMSF can have up to 6 members. All members must be trustees (or directors of the corporate trustee), and no member can be an employee of another member unless they are related. Having multiple members — for example, a couple or a family group — allows you to pool balances, which improves cost efficiency because SMSF running costs are largely fixed rather than percentage-based.\n\nThe ATO regulates SMSFs (unlike APRA-regulated funds) and is the primary regulator for compliance, tax obligations, and trustee conduct.",
  },
  {
    heading: "SMSF Setup Costs and Annual Running Costs",
    body: "Understanding the full cost structure of an SMSF is essential before deciding whether to establish one.\n\nSetup costs (one-off): Establishing an SMSF typically costs $2,000–$5,000. This includes preparation of the trust deed by a solicitor or specialist provider ($500–$1,500), incorporation of a corporate trustee company if required ($500–$1,000), ATO registration for an ABN and TFN (free), opening a dedicated fund bank account, and initial software or administration setup.\n\nAnnual running costs: Once operational, the mandatory ongoing costs are:\n\n• Administration and accounting: $1,500–$5,000 per year, depending on fund complexity, number of assets, and whether you use a specialist SMSF administrator or a general accountant\n• Mandatory annual audit: $500–$1,500 per year. Every SMSF must be audited annually by an ASIC-registered SMSF auditor. This is non-negotiable — a trustee cannot conduct the audit themselves\n• ATO supervisory levy: $259 per year\n• Investment-related costs: brokerage, property management fees, and valuation costs vary widely\n\nTotal estimated annual cost: $3,000–$8,000 for a straightforward SMSF. Complex funds (with property, LRBAs, or pension/accumulation accounts requiring actuarial certificates) cost more.\n\nThe implication for minimum balance: ASIC and the ATO have both cited $200,000 as a threshold below which fixed SMSF costs typically exceed the management expense ratios of well-run industry funds. At $500,000+, the economics become much more compelling.",
  },
  {
    heading: "SMSF Investment Options",
    body: "One of the primary reasons people establish an SMSF is access to investment options not available in standard retail or industry super funds.\n\nASX-listed shares: Direct ownership of individual ASX-listed companies, ETFs, LICs, and infrastructure trusts. Your SMSF holds shares directly in its own name, giving you full control over timing, selection, and tax-loss harvesting.\n\nProperty (residential and commercial): An SMSF can hold both residential and commercial investment property. Commercial property (including industrial and retail) is eligible for purchase from related parties under the Business Real Property rules — a significant advantage for small business owners. Residential property cannot be lived in or used by fund members or related parties.\n\nETFs: Exchange-traded funds are one of the most popular SMSF assets. You can build a low-cost diversified portfolio using broad-market ETFs across Australian, US, international, and sector-specific indices.\n\nTerm deposits: Interest-bearing term deposits with banks and credit unions are a simple, low-risk asset class within an SMSF. Useful for funds approaching pension phase or seeking liquidity.\n\nCryptocurrency (limited): SMSFs can hold cryptocurrency, but with significant constraints. All crypto must be valued in Australian dollars at 30 June each year. Custody must be completely separate from the trustee's personal cryptocurrency holdings — never mix SMSF and personal crypto wallets. The investment strategy must document the rationale for including crypto. Most SMSF specialists recommend keeping crypto below 5–10% of total fund assets given valuation volatility and ATO scrutiny.\n\nCollectibles (artwork, wine, coins, stamps): SMSFs can hold collectibles under strict rules — they cannot be stored in the home or workplace of a trustee, cannot be used by trustees or related parties, must be insured in the fund's name, and must be valued independently. The compliance burden is high and most administrators discourage it unless there is a clear strategic reason.",
  },
  {
    heading: "Property in SMSF",
    body: "Property investment through an SMSF is one of the most powerful — and most misunderstood — strategies available to Australian investors.\n\nBusiness Real Property (BRP): Your SMSF can purchase the commercial premises where your business operates. This is a specific exception to the 'related party acquisition' prohibition. The business must pay rent to the SMSF at market (arm's length) rates. The rent income is taxed at 15% during accumulation phase, or 0% if the fund is in full pension phase. For small business owners, this creates a compelling structure: instead of paying commercial rent to a third-party landlord, you pay rent to your own super fund — building wealth in a tax-advantaged environment.\n\nResidential property: An SMSF can buy residential property as a pure investment. However, the sole purpose test strictly prohibits fund members, their relatives, or related parties from living in or using that property. If you, your spouse, your children, or your parents rent an SMSF-owned residential property — even at market rates — it is a compliance breach.\n\nLimited Recourse Borrowing Arrangements (LRBAs): SMSFs can borrow to buy a single acquirable asset (commonly a property) through an LRBA. The structure involves a separate bare trust (or holding trust) that holds the property during the loan period. The lender has recourse only to the specific asset — not the fund's other assets — if the fund defaults. Once the loan is fully repaid, legal title transfers to the SMSF from the bare trust. LRBA interest rates are typically higher than standard investment property rates, and the rules are complex. Specialist advice is strongly recommended before establishing an LRBA.\n\nBare trust structure: When an SMSF uses an LRBA to borrow for property, a bare trust is established to hold the property as custodian until the loan is paid off. The SMSF is the beneficial owner during the loan period. All income from the property flows to the SMSF. The bare trust has no purpose other than holding the asset during the loan period.",
  },
  {
    heading: "SMSF Compliance Requirements",
    body: "Running an SMSF means accepting personal responsibility for meeting significant annual compliance obligations.\n\nAnnual audit by ASIC-registered auditor: Every SMSF must be audited annually by an approved SMSF auditor registered with ASIC. The audit covers both financial compliance and SIS Act compliance. Trustees cannot audit their own fund. The auditor must report contraventions to the ATO via an auditor contravention report (ACR). The audit must be completed before the fund's annual return is lodged.\n\nAnnual return to the ATO: The SMSF Annual Return (SAR) is both a tax return and a regulatory report, due by 31 October for self-prepared funds. It covers income, contributions, rollovers, benefit payments, and member balances. The fund pays 15% tax on taxable contributions and investment income during accumulation phase (0% in pension phase).\n\nInvestment strategy documented and reviewed: The fund must have a documented investment strategy that considers risk, return, liquidity, diversification, and the ability to pay benefits when due. The strategy must reflect the members' circumstances and be reviewed at least annually.\n\nSole purpose test: The fund must be maintained solely for the purpose of providing retirement benefits (or death benefits to dependants). Any use of SMSF assets for personal benefit — storing collectibles at home, allowing members to use SMSF property — breaches this test.\n\nArm's length rule: All transactions between the SMSF and related parties must be conducted on commercial terms — the same price and conditions that would apply in a genuine arm's length transaction. Leasing a commercial property to your business at below-market rent is a breach. Acquiring assets from related parties at above-market prices is also a breach.",
  },
  {
    heading: "When Does an SMSF Make Sense?",
    body: "An SMSF is a legitimate and powerful structure — but only in the right circumstances. It is not suitable for everyone.\n\nAn SMSF generally makes sense when:\n\n• You have a balance of $200,000 or more. Below this threshold, the fixed annual costs of an SMSF (audit, accounting, levy, administration) typically represent a higher percentage of your super than the fees you would pay in a quality industry fund. The economic argument strengthens considerably at $300,000–$500,000+.\n\n• You want investment control and access to specific assets. SMSF members who want to hold a direct share portfolio, specific ETFs, direct property, or asset classes not available in APRA-regulated funds benefit from the SMSF structure.\n\n• You own a business and want to purchase your business premises. Buying commercial property and leasing it to your own business through an SMSF is one of the strongest structural applications of self-managed super. Business owners who successfully implement this strategy benefit from tax-advantaged rental income and the ability to own the business premises in a structure that ultimately funds their retirement.\n\n• You want to consolidate family super. A family SMSF with 4–6 members can pool balances to reach cost-efficient scale, particularly useful when members are close to retirement.\n\n• You want specific investment options not available in APRA funds — such as direct property strategies, LRBAs, or unlisted investments.\n\nAn SMSF is generally NOT suitable when:\n• Your combined super balance is under $100,000\n• You don't have time to manage annual compliance obligations\n• You want professional management and the regulatory protections of an APRA-regulated fund\n• You are not prepared to accept personal trustee liability",
  },
  {
    heading: "Risks and Responsibilities",
    body: "The most important thing to understand before establishing an SMSF: you are personally responsible for compliance. There is no APRA oversight, no external trustee, and no guarantee fund. If you get it wrong, the consequences fall on you.\n\nTrustee personal liability: As trustee, you are personally liable for compliance breaches — even unintentional ones. The fact that you relied on bad advice from an accountant or administrator does not necessarily protect you from ATO penalties. Trustees have a duty to understand the rules.\n\nPenalties: The ATO can impose administrative penalties of up to $11,000 per trustee for each compliance breach. Common breaches include: failing to maintain a current investment strategy, mixing personal and fund finances, exceeding in-house asset limits, and non-arm's length transactions.\n\nNon-complying fund status: The most severe penalty the ATO can impose is making a fund 'non-complying.' A non-complying fund loses its tax concessions entirely. Instead of paying 15% tax on contributions and earnings, the fund is taxed at the highest marginal rate (47%) on its entire asset base — not just new contributions. For a fund in pension phase paying 0% tax, this would be catastrophic. Non-complying status is reserved for the most serious breaches.\n\nDisqualification: Trustees who breach their obligations can be disqualified from acting as an SMSF trustee. A disqualified person cannot be a trustee of any superannuation fund.\n\nThe key risks to manage: loans to members or related parties (strictly prohibited), in-house asset thresholds (maximum 5% of fund in related-party investments), sole purpose test breaches, and non-arm's length transactions. An annual audit catches most issues — but some breaches cannot be unwound after the fact.",
  },
];

const SMSF_FAQS = [
  {
    question: "How much does it cost to run an SMSF?",
    answer:
      "Typically $3,000–$8,000 per year, including administration, accounting, the mandatory annual audit, and the ATO supervisory levy ($259/year). Additional investment-related costs apply depending on your assets — brokerage for share trades, property management fees if you hold property, and valuation costs. Funds with more complex structures (LRBAs, pension and accumulation accounts, multiple investment classes) cost more. Below $200,000 in total assets, these fixed costs typically represent a higher percentage than you would pay in fees at a quality industry fund.",
  },
  {
    question: "Can I manage my own SMSF without an accountant?",
    answer:
      "You are legally responsible as trustee for running the fund — there is no requirement to use an accountant. However, most people use specialist SMSF accountants because the compliance obligations are significant and errors can be costly. You can administer records yourself, but the annual audit by an ASIC-registered auditor is mandatory and cannot be performed by a trustee or anyone associated with the trustee. The ATO's free SMSF Trustee Education resources at ato.gov.au/smsf provide guidance for new trustees.",
  },
  {
    question: "What is the minimum balance for an SMSF?",
    answer:
      "ASIC and APRA recommend at least $200,000 as a starting balance. Below this, fixed SMSF costs as a percentage of your balance typically exceed those of a well-run industry or retail super fund. Some specialists argue $300,000–$500,000 is a more realistic minimum for the complexity to be worthwhile. The right answer depends on your goals — if you need an SMSF specifically to purchase business real property, the strategic value can justify the cost at a lower starting balance.",
  },
  {
    question: "Can I put my house in my SMSF?",
    answer:
      "No. The sole purpose test prohibits SMSFs from purchasing residential property that you, your family members, or related parties live in or use. Business real property is different — you can purchase business premises that your own business uses through an SMSF, making this a legitimate and popular strategy for small business owners. The key distinction is between residential property (where you live) and business real property (where you work or operate a business).",
  },
  {
    question: "Can I invest in crypto through my SMSF?",
    answer:
      "Yes, with significant constraints. Crypto must be valued in Australian dollars at reporting dates (30 June each year). Custody must be completely separate from the trustee's personal cryptocurrency holdings — you must never mix SMSF crypto and personal crypto wallets. The trustee must document the investment strategy rationale for holding crypto. Because crypto is highly volatile and attracts ATO scrutiny, most SMSF accountants advise keeping crypto below 5–10% of total fund assets. Any crypto held by the SMSF must not be accessible to or used by trustees personally.",
  },
];

export default function SMSFPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Super", url: `${SITE_URL}/super` },
    { name: "SMSF" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SMSF_FAQS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/super" className="hover:text-slate-200">Super</Link>
            <span>/</span>
            <span className="text-slate-300">SMSF</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Self-Managed Super · Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              Self-Managed Super Fund (SMSF):{" "}
              <span className="text-amber-400">The Complete Australian Guide</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              Everything you need to know about SMSFs in Australia — setup costs, investment options, property
              rules, compliance obligations, and how to decide whether an SMSF is right for you.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Total SMSF Assets</p>
              <p className="text-xl font-black text-amber-700">$1.4 trillion</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">SMSFs are the largest segment of Australia&apos;s superannuation system by assets — more than any single APRA-regulated fund.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">SMSFs in Australia</p>
              <p className="text-xl font-black text-slate-700">600,000+</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Over 600,000 active SMSFs across Australia, with approximately 1.1 million Australians acting as SMSF trustees.</p>
            </div>
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Recommended Minimum</p>
              <p className="text-xl font-black text-green-700">$200,000</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">ASIC and APRA guidance on the minimum balance at which SMSF fixed costs become proportionate to what you&apos;d pay in a top industry fund.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content Sections ─────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Complete guide" title="Self-Managed Super Funds: everything you need to know" />
          <div className="space-y-10">
            {SMSF_SECTIONS.map((section) => (
              <div key={section.heading}>
                <h3 className="text-base font-extrabold text-slate-900 mb-3">{section.heading}</h3>
                <div className="text-sm text-slate-600 leading-relaxed space-y-3">
                  {section.body.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQs ─────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
          <div className="space-y-4">
            {SMSF_FAQS.map((faq) => (
              <details key={faq.question} className="group bg-white rounded-xl border border-slate-200">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer list-none flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                  {faq.question}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform text-base ml-3">⌄</span>
                </summary>
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-1">Ready to explore your SMSF options?</h2>
            <p className="text-slate-400 text-sm">Compare SMSF platforms or find a specialist SMSF accountant to guide you through setup and compliance.</p>
          </div>
          <div className="flex gap-3 shrink-0 flex-wrap">
            <Link
              href="/compare?filter=smsf"
              className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Compare SMSF Platforms
            </Link>
            <Link
              href="/advisors/smsf-accountants"
              className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Find an SMSF Accountant
            </Link>
          </div>
        </div>
      </section>

      {/* ── Compliance footer ────────────────────────────────────────── */}
      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">{SUPER_WARNING_SHORT} {GENERAL_ADVICE_WARNING}</p>
        </div>
      </section>
    </div>
  );
}
