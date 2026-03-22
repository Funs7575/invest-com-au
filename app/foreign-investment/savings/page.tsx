import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { BROKER_NON_RESIDENT_NOTE, FOREIGN_INVESTOR_GENERAL_DISCLAIMER, WITHHOLDING_TAX_NOTE } from "@/lib/compliance";

export const metadata: Metadata = {
  title: "Savings Accounts for Non-Residents in Australia — 2026 Guide — Invest.com.au",
  description:
    "Can non-residents open Australian savings accounts? 10% withholding tax on interest, $250k government guarantee, which banks accept non-residents, and term deposits for foreign investors. Updated March 2026.",
  openGraph: {
    title: "Australian Savings Accounts for Non-Residents — 2026",
    description:
      "10% withholding tax on interest, $250k guarantee for non-residents, and which banks actually accept foreign account holders.",
    url: `${SITE_URL}/foreign-investment/savings`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Savings Accounts for Non-Residents")}&sub=${encodeURIComponent("10% WHT on Interest · $250k Guarantee · Bank Eligibility · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/savings` },
};

export const revalidate = 86400;

const SAVINGS_SECTIONS = [
  {
    heading: "Can non-residents open Australian savings accounts?",
    body: "In principle, yes — Australian banks are not legally prohibited from opening accounts for non-residents. In practice, it is difficult. Most banks require an Australian residential address for online sign-up, and many will refuse account applications where an overseas address is provided.\n\nThe options that work:\n\n• Some banks allow in-person account opening (visiting a branch) for non-residents — Commonwealth Bank, Westpac, and ANZ have historically been more accommodating for international students and new arrivals\n• Some challenger banks (like Up or Ubank) have online flows that accept overseas applicants, but verify before applying\n• Temporary visa holders with an Australian address can generally apply online normally\n\nFor purely non-resident investors (no Australian address), the practical options are limited. Consider whether the 10% withholding tax on Australian interest makes Australian savings attractive versus savings accounts in your home country.",
  },
  {
    heading: "Withholding tax on interest — the 10% rule",
    body: "Non-residents pay 10% withholding tax on interest earned in Australian bank accounts. This is a final withholding tax — the bank deducts it automatically, and you don't need to lodge an Australian tax return for passive interest income.\n\nInterestingly, 10% can actually be less than a high-income Australian resident would pay. A resident earning $200,000 would pay 47% (including Medicare levy) on additional interest income. For non-residents, 10% is the flat rate regardless of income level.\n\nFor lower-income non-residents, however, 10% is likely more than they would pay as a resident (below the tax-free threshold, a resident pays 0%).\n\nYou must inform the bank of your non-resident status. If you don't, they may withhold at the top marginal rate (47% including Medicare levy), which you then have to reclaim.",
  },
  {
    heading: "The $250,000 government guarantee",
    body: "The Australian Government Financial Claims Scheme (FCS) guarantees deposits up to $250,000 per account holder per Authorised Deposit-taking Institution (ADI). This guarantee applies to non-residents — your deposits are protected up to $250,000 regardless of where you live.\n\nThe guarantee covers savings accounts, term deposits, transaction accounts, offset accounts, and most other deposit products held with APRA-regulated ADIs (banks, building societies, credit unions).\n\nNote: the guarantee applies per ADI, not per account. If you hold $400,000 at one bank, only $250,000 is guaranteed. Spreading deposits across multiple ADIs is how to maximise guarantee coverage.",
  },
  {
    heading: "Term deposits for non-residents",
    body: "Term deposits are generally available to non-residents where a savings account is available. The same KYC requirements apply — Australian address usually required for online applications. Term deposits for non-residents attract the same 10% withholding tax on interest.\n\nTerm deposits have fixed rates and locked-in durations (1 month to 5 years). As a non-resident investor, consider:\n\n• Exchange rate risk: AUD-denominated returns must be converted to your home currency\n• The 10% WHT is withheld from interest at payment\n• Early withdrawal from term deposits usually incurs a penalty (typically loss of partial or full interest)\n• Consider whether the AUD interest rate, net of WHT, is competitive with your home country alternatives after currency conversion",
  },
  {
    heading: "Better alternatives for non-resident savings",
    body: "For many non-resident investors, Australian savings accounts are impractical (hard to open without Australian address) or uncompetitive after withholding tax and currency conversion costs.\n\nAlternatives to consider:\n\n• International savings accounts in your home country or a major financial centre (Singapore, Hong Kong, UK, Switzerland)\n• US Treasury bills or money market funds if you have USD\n• Australian government bonds or ETFs tracking Australian fixed income — similar exposure to interest rates but more accessible via international brokers\n• Term deposits via Interactive Brokers (accessible without Australian address) may offer access to some Australian dollar-denominated fixed income instruments\n\nFor temporary visa holders in Australia: a standard high-interest savings account or term deposit in Australia is completely straightforward — apply online, no withholding tax issues (you're an Australian tax resident), and full access to the best rates.",
  },
];

const SAVINGS_FAQS = [
  {
    question: "What withholding tax do non-residents pay on Australian bank interest?",
    answer: "10% — the Resident Withholding Tax (RWT) for non-residents. This is a final tax deducted automatically by the bank. You don't need to lodge an Australian tax return for passive interest income only.",
  },
  {
    question: "Does the $250,000 government deposit guarantee apply to non-residents?",
    answer: "Yes. The Financial Claims Scheme guarantee of up to $250,000 per account holder per ADI applies to all depositors, regardless of residency status.",
  },
  {
    question: "Can I open an Australian bank account online as a non-resident?",
    answer: "It is difficult. Most online account opening flows require an Australian address. Some banks allow in-person applications from non-residents (at a branch), but even then policies vary. Temporary visa holders in Australia with an Australian address can open accounts online normally.",
  },
  {
    question: "Do I need a TFN for an Australian savings account?",
    answer: "You need a TFN OR a declaration that you are a non-resident. If you provide neither, the bank must withhold at the top marginal rate (currently 47%). Declaring your non-residency ensures the 10% rate is applied instead.",
  },
  {
    question: "Is Australian interest income taxable in my home country?",
    answer: "Possibly. Most countries tax their residents on worldwide income — including foreign interest income. Australia will not double-tax you (the 10% WHT is the final Australian tax), but you may owe tax in your home country on the gross interest. A foreign tax credit for the 10% Australian WHT may be available under a DTA.",
  },
];

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-6 md:mb-8">
      <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">{eyebrow}</p>
      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">{title}</h2>
      {sub && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{sub}</p>}
    </div>
  );
}

export default function ForeignSavingsPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    { name: "Savings Accounts" },
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: SAVINGS_FAQS.map((f) => ({
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
            <Link href="/foreign-investment" className="hover:text-slate-200">Foreign Investment</Link>
            <span>/</span>
            <span className="text-slate-300">Savings Accounts</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-300 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Non-Residents · Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight">
              <span className="text-amber-400">Savings Accounts</span>{" "}
              <br />for Non-Residents in Australia
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed">
              10% withholding tax on interest, the $250k government guarantee that applies to
              everyone, which banks accept non-residents, and why temp visa holders in Australia
              have it much easier.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key callouts ─────────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-amber-200 p-5">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-1">Interest WHT</p>
              <p className="text-xl font-black text-amber-700">10%</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Flat withholding rate on Australian bank interest for non-residents. Declare your non-residency to the bank to ensure correct rate.</p>
            </div>
            <div className="bg-white rounded-2xl border border-green-200 p-5">
              <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-1">Deposit Guarantee</p>
              <p className="text-xl font-black text-green-700">$250k</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Financial Claims Scheme guarantee applies to all depositors — including non-residents. Per person, per ADI.</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Account Access</p>
              <p className="text-xl font-black text-slate-700">Restricted</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">Most banks require Australian address. In-person branch application may be available for non-residents.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Content Sections ─────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Complete guide"
            title="Savings accounts for non-residents — full detail"
          />
          <div className="space-y-10">
            {SAVINGS_SECTIONS.map((section) => (
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

      {/* ── Resident vs Non-Resident comparison ──────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Quick comparison"
            title="Temp visa holder vs. non-resident savings"
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-600">Feature</th>
                  <th className="text-center px-5 py-3 text-xs font-bold text-green-700">Temp Visa Holder in AU</th>
                  <th className="text-center px-5 py-3 text-xs font-bold text-amber-700">Non-Resident</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Open account online", "✓ Easy (Australian address)", "✗ Usually not possible"],
                  ["Tax on interest", "Marginal rate (resident)", "10% final WHT"],
                  ["Tax-free threshold", "Yes ($18,200)", "No (taxed from $0)"],
                  ["$250k government guarantee", "✓ Yes", "✓ Yes"],
                  ["TFN required", "Yes (highly recommended)", "Non-resident declaration"],
                  ["Access to best rates", "✓ Full access", "Limited (fewer banks)"],
                  ["Term deposits available", "✓ Yes", "With limitations"],
                ].map(([feature, temp, nonRes], i) => (
                  <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                    <td className="px-5 py-3 text-xs font-medium text-slate-700">{feature}</td>
                    <td className="px-5 py-3 text-xs text-center text-green-700">{temp}</td>
                    <td className="px-5 py-3 text-xs text-center text-amber-700">{nonRes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading eyebrow="Questions" title="Frequently asked questions" />
          <div className="space-y-4">
            {SAVINGS_FAQS.map((faq) => (
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
            <h2 className="text-lg font-extrabold text-white mb-1">Compare Australian savings accounts</h2>
            <p className="text-slate-400 text-sm">See the best rates and find accounts available for your situation.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/savings" className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap">
              Compare Savings
            </Link>
            <Link href="/foreign-investment" className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap">
              ← Back to Hub
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">{FOREIGN_INVESTOR_GENERAL_DISCLAIMER} {WITHHOLDING_TAX_NOTE}</p>
        </div>
      </section>
    </div>
  );
}
