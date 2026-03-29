import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER } from "@/lib/compliance";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Can Non-Residents Open an Australian Bank Account? (2026 Guide) — Invest.com.au",
  description:
    "Yes — non-residents can open Australian bank accounts remotely. Which major banks accept non-residents, what documents you need, how to open online without visiting Australia, and alternatives like Wise and OFX.",
  openGraph: {
    title: "Can Non-Residents Open an Australian Bank Account? (2026)",
    description:
      "Which banks accept non-residents, how to open remotely, required documents, and best alternatives for international investors.",
    url: `${SITE_URL}/foreign-investment/guides/non-resident-bank-account`,
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Non-Resident Australian Bank Account")}&sub=${encodeURIComponent("Open Online · Which Banks · Documents Needed · 2026")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/guides/non-resident-bank-account` },
};

export const revalidate = 86400;

const BANKS = [
  {
    bank: "ANZ",
    acceptsNonResident: true,
    remoteOpen: true,
    notes: "ANZ's 'smart choice' account is available to non-residents. Can apply from overseas with certified passport and proof of address. BSB and account number issued before arrival.",
    accountType: "Transaction + Savings",
    url: "https://www.anz.com.au",
  },
  {
    bank: "Westpac",
    acceptsNonResident: true,
    remoteOpen: true,
    notes: "Offers remote opening for migrants and non-residents. Good online platform. Generally accepts applications up to 3 months before arriving in Australia.",
    accountType: "Transaction + Savings",
    url: "https://www.westpac.com.au",
  },
  {
    bank: "NAB",
    acceptsNonResident: true,
    remoteOpen: true,
    notes: "Non-resident accounts available. International Student Accounts and standard accounts can be opened remotely. More flexible on ID documentation than some competitors.",
    accountType: "Transaction + Savings",
    url: "https://www.nab.com.au",
  },
  {
    bank: "Commonwealth Bank (CBA)",
    acceptsNonResident: true,
    remoteOpen: true,
    notes: "CBA is generally the most flexible of the Big Four for non-residents. Can open a Smart Access account before arriving in Australia with digital ID verification.",
    accountType: "Transaction + Savings",
    url: "https://www.commbank.com.au",
  },
  {
    bank: "Macquarie Bank",
    acceptsNonResident: false,
    remoteOpen: false,
    notes: "Macquarie Savings Account requires Australian residency. Not suitable for true non-residents.",
    accountType: "Savings only",
    url: "https://www.macquarie.com.au",
  },
  {
    bank: "HSBC Australia",
    acceptsNonResident: true,
    remoteOpen: true,
    notes: "HSBC's global network is ideal for non-residents. Particularly useful if you already bank with HSBC in your home country — can link accounts internationally.",
    accountType: "Transaction + Savings",
    url: "https://www.hsbc.com.au",
  },
  {
    bank: "Citibank Australia",
    acceptsNonResident: true,
    remoteOpen: true,
    notes: "Citibank's international presence makes non-resident accounts straightforward. Existing Citi customers from other countries can leverage their existing relationship.",
    accountType: "Transaction + Savings",
    url: "https://www.citibank.com.au",
  },
];

const DOCUMENTS = [
  { doc: "Valid passport", notes: "Primary ID. Must be current. Some banks accept a certified copy scanned online." },
  { doc: "Proof of overseas address", notes: "Utility bill, bank statement, or official government letter dated within 3 months." },
  { doc: "Tax Identification Number (TIN) from your country", notes: "Required under CRS (Common Reporting Standard) for tax reporting to your home country." },
  { doc: "Visa documentation (if applicable)", notes: "Grant notice or visa label in passport. Required if you have an Australian visa." },
  { doc: "Purpose of account", notes: "Some banks ask for the reason — property investment, share trading, receiving rental income, etc." },
  { doc: "Source of funds (large deposits)", notes: "For accounts expected to handle large transactions, evidence of income source is often required." },
];

const FAQS = [
  {
    question: "Can I open an Australian bank account without visiting Australia?",
    answer: "Yes. All four major banks (ANZ, Westpac, NAB, CBA) allow non-residents to open accounts remotely. The process typically involves submitting certified copies of your passport and proof of address online or via post. You receive your account details before you arrive, which is useful for property settlement and investment transfers.",
  },
  {
    question: "Do I need a Tax File Number (TFN) to open a bank account?",
    answer: "No — a TFN is not required to open a bank account. However, if you don't provide a TFN, the bank must withhold tax at the highest marginal rate on your interest income. As a non-resident, you should instead declare your non-resident status (this reduces withholding on interest to 10% under Australian law, or lower under a DTA).",
  },
  {
    question: "How long does it take to open an Australian bank account as a non-resident?",
    answer: "Remote applications typically take 3–10 business days once all documents are submitted. Major banks like CBA and ANZ have streamlined online processes. Once approved, you receive your BSB and account number and can begin receiving transfers immediately. Physical debit cards may take an additional 1–2 weeks to arrive internationally.",
  },
  {
    question: "What is the 10% withholding tax on Australian bank interest?",
    answer: "If you declare non-resident status to your bank, the bank withholds 10% of interest earned and remits it to the ATO on your behalf. This is a final withholding tax — you don't need to lodge an Australian tax return for this income. If your country has a DTA with Australia, the rate may be reduced further (check the DTA table).",
  },
  {
    question: "Can I receive rental income into an Australian bank account as a non-resident?",
    answer: "Yes. You can receive rental income into an Australian bank account. The income is subject to Australian tax at non-resident rates (30% from the first dollar, no tax-free threshold). You are required to lodge an Australian tax return annually to report the rental income and claim deductions for expenses like interest, depreciation, and property management fees.",
  },
  {
    question: "Should I use a regular bank or Wise/OFX for international transfers?",
    answer: "For property settlement, you must use an Australian bank account — Wise and OFX are not accepted for property transactions. For day-to-day transfers into your investment account, Wise and OFX offer significantly better exchange rates and lower fees than the major banks' international transfer products. Use both: an Australian bank account for holding funds and settling transactions, and Wise/OFX to move money from your home country at better rates.",
  },
];

export default function NonResidentBankAccountPage() {
  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
              { name: "Guides", url: `${SITE_URL}/foreign-investment/guides` },
              { name: "Non-Resident Bank Account" },
            ])
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }),
        }}
      />

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav className="text-xs text-slate-400 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-200">Home</Link>
            <span>/</span>
            <Link href="/foreign-investment" className="hover:text-slate-200">Foreign Investment</Link>
            <span>/</span>
            <Link href="/foreign-investment/guides" className="hover:text-slate-200">Guides</Link>
            <span>/</span>
            <span className="text-slate-300">Non-Resident Bank Account</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-300 mb-4">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Yes — it&apos;s possible
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight">
              Can Non-Residents Open an{" "}
              <span className="text-amber-400">Australian Bank Account?</span>
            </h1>
            <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-6">
              Yes — all four major Australian banks accept non-residents, and most can open accounts remotely
              without visiting Australia. This guide covers which banks to use, what documents you need,
              the withholding tax implications, and better alternatives for international transfers.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/foreign-investment/send-money-australia" className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors">
                Compare FX Transfer Rates &rarr;
              </Link>
              <Link href="/foreign-investment/tax" className="px-5 py-2.5 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl text-sm transition-colors">
                Tax Guide for Non-Residents
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 md:py-12 space-y-12 md:space-y-16">

        {/* ── Key facts ── */}
        <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-800 mb-4">The short answer: Yes, and here&apos;s how</h2>
          <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-700">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>All Big Four banks (ANZ, Westpac, NAB, CBA) accept non-residents</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Accounts can be opened remotely — no need to visit Australia</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Process takes 3–10 business days for approval</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Interest on deposits is withheld at 10% for non-residents</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Required for property settlement — Wise/OFX not accepted at settlement</span>
            </div>
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Use Wise or OFX for the international transfer, then bank for settlement</span>
            </div>
          </div>
        </section>

        {/* ── Banks that accept non-residents ── */}
        <section>
          <SectionHeading
            eyebrow="Bank Comparison"
            title="Which Australian banks accept non-residents?"
            sub="Most major banks do, but with varying requirements. We've summarised the key options."
          />
          <div className="space-y-3">
            {BANKS.map((bank) => (
              <div key={bank.bank} className={`border rounded-xl p-5 ${bank.acceptsNonResident ? "border-slate-200 hover:border-amber-200" : "border-slate-100 bg-slate-50/50 opacity-70"} transition-colors`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-slate-800">{bank.bank}</h3>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bank.acceptsNonResident ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {bank.acceptsNonResident ? "Accepts non-residents" : "Does not accept non-residents"}
                      </span>
                      {bank.remoteOpen && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          Remote open
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{bank.notes}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-400">{bank.accountType}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Documents ── */}
        <section>
          <SectionHeading
            eyebrow="Required Documents"
            title="What documents do you need?"
            sub="Gather these before applying. Incomplete applications cause delays."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Document</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DOCUMENTS.map((d) => (
                  <tr key={d.doc} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{d.doc}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">{d.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Wise/OFX alternatives ── */}
        <section className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h2 className="font-bold text-blue-800 mb-3 text-lg">International money transfer: use Wise or OFX instead</h2>
          <p className="text-sm text-blue-700 leading-relaxed mb-4">
            For moving money <em>into</em> Australia from overseas, specialist FX providers like Wise and OFX charge
            significantly lower fees and offer better exchange rates than the Big Four banks&apos; international transfer
            products. Savings of 1–3% on large transfers can amount to thousands of dollars.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            {[
              { provider: "Wise", advantage: "Mid-market exchange rate + small fixed fee. Excellent for transfers under $50K.", rate: "~0.3–1.5% fee" },
              { provider: "OFX", advantage: "No transfer fees over $10K, competitive rates for larger amounts. Good for property-related transfers.", rate: "~0.5–1% margin" },
              { provider: "WorldFirst", advantage: "Good for business and high-value transfers. Dedicated account managers for large amounts.", rate: "Competitive" },
            ].map((p) => (
              <div key={p.provider} className="bg-white rounded-xl border border-blue-200 p-4">
                <h3 className="font-bold text-slate-800 mb-1">{p.provider}</h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-1">{p.advantage}</p>
                <span className="text-xs font-semibold text-blue-700">{p.rate}</span>
              </div>
            ))}
          </div>
          <Link href="/foreign-investment/send-money-australia" className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:text-blue-800">
            Compare FX transfer providers in detail &rarr;
          </Link>
        </section>

        {/* ── Step-by-step how to open ── */}
        <section>
          <SectionHeading
            eyebrow="How To Open"
            title="How to open an Australian bank account as a non-resident"
            sub="Follow these steps to open your account before you need it."
          />
          <div className="space-y-4">
            {[
              { step: 1, title: "Choose your bank", desc: "For most non-residents, CBA or ANZ are the most accessible. HSBC is a good choice if you already bank with them internationally." },
              { step: 2, title: "Gather your documents", desc: "Collect your passport, proof of overseas address (utility bill or bank statement), and TIN from your home country." },
              { step: 3, title: "Apply online", desc: "Visit the bank's website and select the non-resident or 'moving to Australia' application path. Most have an online form that takes 15–30 minutes." },
              { step: 4, title: "Complete identity verification", desc: "Upload certified copies of your documents or complete a video ID verification. Some banks use third-party services like Equifax or illion for this." },
              { step: 5, title: "Receive your account details", desc: "Within 3–10 business days, you'll receive your BSB, account number, and login credentials. You can begin receiving transfers immediately." },
              { step: 6, title: "Declare your non-resident status", desc: "Ensure you've declared yourself as a non-resident for tax purposes. This ensures the bank withholds 10% (not 47%) on any interest earned." },
              { step: 7, title: "Transfer funds via Wise/OFX", desc: "Use a specialist FX provider to transfer funds from your home bank to your new Australian account. Then use your Australian account for all local transactions." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 p-4 border border-slate-200 rounded-xl hover:border-amber-200 transition-colors">
                <div className="shrink-0 w-8 h-8 bg-amber-500 text-slate-900 rounded-full flex items-center justify-center font-extrabold text-sm">{s.step}</div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-1">{s.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQs ── */}
        <section>
          <SectionHeading eyebrow="FAQs" title="Common questions about non-resident bank accounts" />
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.question} className="border border-slate-200 rounded-xl p-5">
                <h3 className="font-bold text-slate-800 text-sm mb-2">{faq.question}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related Guides" title="More resources for foreign investors" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Send Money to Australia — FX Comparison", href: "/foreign-investment/send-money-australia" },
              { title: "Withholding Tax on Australian Dividends", href: "/foreign-investment/tax" },
              { title: "ASX Brokers That Accept Non-Residents", href: "/compare/non-residents" },
              { title: "How to Buy Property as a Foreigner", href: "/foreign-investment/guides/buy-property-australia-foreigner" },
              { title: "Foreign Investment Hub", href: "/foreign-investment" },
              { title: "Find a Tax Agent", href: "/advisors/tax-agents" },
            ].map((guide) => (
              <Link key={guide.href} href={guide.href} className="group block p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/30 transition-all">
                <span className="font-semibold text-sm text-slate-800 group-hover:text-amber-700">{guide.title} &rarr;</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 leading-relaxed">{FOREIGN_INVESTOR_GENERAL_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
