import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Interactive Brokers Australia Setup Guide (${CURRENT_YEAR}) — Step-by-Step`,
  description: `How to open an Interactive Brokers (IBKR) account in Australia. Account types, document requirements, funding, W-8BEN, and first trade. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `IBKR Australia Account Setup Guide (${CURRENT_YEAR})`,
    description: "Step-by-step walkthrough: open IBKR, verify identity, fund the account, and make your first trade.",
    url: `${SITE_URL}/global-investing/guides/ibkr-australia-setup`,
  },
  alternates: { canonical: `${SITE_URL}/global-investing/guides/ibkr-australia-setup` },
};

const FAQS = [
  {
    q: "How long does IBKR account approval take in Australia?",
    a: "Most Australian residents are approved within 1–3 business days if all identity documents are clean. Occasionally IBKR requests additional documentation (certified copies, proof of address) — this can extend approval to 5–7 business days. Complex structures (SMSFs, corporate accounts) take longer: 5–10 business days. You can fund the account before approval is complete; the funds clear when the account goes live.",
  },
  {
    q: "Should I open IBKR Pro or IBKR Lite in Australia?",
    a: "IBKR Lite is only available to US residents — Australians open IBKR Pro by default. IBKR Pro charges commission on trades (from US$0.0035/share, minimum US$0.35 for US stocks) but offers the lowest FX conversion spread in the market (~0.002% + US$2 per FX trade). For most Australian investors buying international shares, IBKR Pro's FX pricing advantage far outweighs the per-trade commissions.",
  },
  {
    q: "Can I use IBKR for my SMSF?",
    a: "Yes — IBKR supports SMSF accounts. You'll open an 'Entity Account' rather than an individual account. Required documents include the trust deed, trustee identification, ABN/TFN, and (for corporate trustees) ASIC certificate. The SMSF account needs a W-8BEN-E (entity form, not the individual W-8BEN) to access the 15% US dividend withholding rate.",
  },
  {
    q: "How do I convert AUD to USD inside IBKR?",
    a: "After depositing AUD, go to Portfolio → Transaction → Forex Trader (or use the FX conversion tool in the Account Management portal). Select AUD → USD and enter the amount. IBKR converts at near-mid-market rates with a very small markup. This is far cheaper than converting via a bank before depositing. The converted USD is immediately available to trade US-listed securities.",
  },
];

const STEPS = [
  {
    step: 1,
    title: "Start the application",
    detail: "Go to interactivebrokers.com.au and click 'Open Account'. Select 'Individual' (or 'Entity' for SMSF/company). You'll create a username and password before filling in your details.",
  },
  {
    step: 2,
    title: "Enter personal details",
    detail: "Legal name (must match your ID), date of birth, residential address, phone number, tax file number (TFN) or claim a TFN exemption. Australian residents are required to provide TFN or ABN.",
  },
  {
    step: 3,
    title: "Complete financial background",
    detail: "IBKR asks about investment experience, annual income range, net worth, and intended trading activity. There are no minimums — answer honestly. This information determines which product types you're permitted to access.",
  },
  {
    step: 4,
    title: "Select account features",
    detail: "Choose margin or cash account. Most Australian retail investors should choose 'Cash' — no margin borrowing, no risk of margin calls. Select the currency base (AUD is fine; IBKR can hold multiple currencies simultaneously).",
  },
  {
    step: 5,
    title: "Upload identity documents",
    detail: "Passport or driver's licence (front and back). For proof of address: utility bill, bank statement, or rates notice not older than 90 days, showing your full name and address. Upload as PDF or high-res JPEG.",
  },
  {
    step: 6,
    title: "Sign agreements",
    detail: "Electronically sign the Customer Agreement, Market Data Subscriber Agreement, and Risk Disclosures. Read the client agreement — it's binding. Note that IBKR is custodial: shares are held by IBKR LLC as custodian.",
  },
  {
    step: 7,
    title: "Await account approval",
    detail: "Most accounts are approved in 1–3 business days. You'll receive an email with your account number (usually U followed by 8 digits). Occasionally IBKR requests additional verification via live video call (a 5-minute process).",
  },
  {
    step: 8,
    title: "Submit your W-8BEN",
    detail: "Log in to Client Portal → Settings → Tax Forms → W-8BEN. Complete the form — confirm Australian tax residency, enter your TFN (optional but recommended), certify the treaty claim. This reduces US dividend withholding from 30% to 15%.",
  },
  {
    step: 9,
    title: "Fund the account via bank transfer",
    detail: "In Client Portal → Transfer & Pay → Transfer Funds, select Australian bank transfer. IBKR provides a BSB and account number. Transfer AUD from your Australian bank account. No minimum. Funds typically clear within 1–2 business days.",
  },
  {
    step: 10,
    title: "Convert AUD to USD and place your first trade",
    detail: "Use the FX conversion tool to convert AUD to USD at near-mid-market rate. Then use the TWS (Trader Workstation) desktop app or the IBKR Mobile app to search for your security by ticker and place a limit or market order.",
  },
];

export default function IbkrAustraliaSetupPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Global Investing", url: absoluteUrl("/global-investing") },
    { name: "Guides", url: absoluteUrl("/global-investing/guides") },
    { name: "IBKR Australia Setup" },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 to-blue-950 text-white py-12 md:py-16">
          <div className="container-custom max-w-4xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span>/</span>
              <Link href="/global-investing" className="hover:text-white">Global Investing</Link>
              <span>/</span>
              <span className="text-white">IBKR Australia Setup</span>
            </nav>
            <div className="inline-block bg-blue-800 text-blue-200 text-xs font-medium px-3 py-1 rounded-full mb-4">
              Setup Guide {CURRENT_YEAR}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Interactive Brokers Australia: Step-by-Step Setup Guide
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl">
              IBKR offers the lowest FX conversion rates of any broker accessible to Australians — 0.002% spread versus 0.4–0.7% at competitors. Here&apos;s how to open the account.
            </p>
          </div>
        </section>

        {/* Why IBKR */}
        <section className="py-10 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { metric: "0.002%", label: "FX spread (USD)", sub: "vs 0.40–0.70% elsewhere" },
                { metric: "90+", label: "Markets accessible", sub: "NYSE, NASDAQ, LSE, HKEX, TSE" },
                { metric: "$0", label: "Account minimum", sub: "No minimum deposit" },
                { metric: "1–3 days", label: "Typical approval", sub: "Full digital application" },
              ].map((item) => (
                <div key={item.metric} className="rounded-xl bg-white border border-amber-200 p-4">
                  <div className="text-2xl font-extrabold text-amber-900 mb-1">{item.metric}</div>
                  <div className="text-sm font-bold text-slate-800">{item.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Step-by-step */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">10-step account setup</h2>
            <div className="space-y-4">
              {STEPS.map((s) => (
                <div key={s.step} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex-shrink-0 flex items-start justify-center w-9 h-9 rounded-full bg-blue-900 text-white text-sm font-extrabold mt-0.5">
                    {s.step}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 mb-1">{s.title}</div>
                    <p className="text-sm text-slate-600 leading-relaxed">{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Account types comparison */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Which IBKR account type?</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Account type</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Who it&apos;s for</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Key docs required</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Margin available?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    { type: "Individual (Cash)", for: "Single investor, personal account", docs: "Passport/DL, proof of address, TFN", margin: "No" },
                    { type: "Individual (Margin)", for: "Experienced investors using leverage", docs: "Same as cash + income/net worth details", margin: "Yes — via portfolio margin" },
                    { type: "Joint Account", for: "Two individuals investing together", docs: "ID docs for both applicants", margin: "Optional" },
                    { type: "Entity (SMSF)", for: "Self-managed super funds", docs: "Trust deed, trustee ID, ABN/TFN, ASIC cert (corp trustee)", margin: "Generally no" },
                    { type: "Entity (Company)", for: "Companies or trusts", docs: "Certificate of incorporation, directors' ID, shareholding structure", margin: "Optional" },
                  ].map((row) => (
                    <tr key={row.type} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{row.type}</td>
                      <td className="px-4 py-3 text-slate-700">{row.for}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">{row.docs}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${row.margin === "No" || row.margin === "Generally no" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-800"}`}>
                          {row.margin}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-12 bg-white border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQS.map((faqItem) => (
                <details key={faqItem.q} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-slate-900 hover:bg-slate-50">
                    {faqItem.q}
                  </summary>
                  <div className="px-5 pb-4 text-sm text-slate-700 leading-relaxed">{faqItem.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Related */}
        <section className="py-10 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <Link href="/global-investing/shares/us" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Compare all US share brokers →
              </Link>
              <Link href="/global-investing/tax/w-8ben" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                W-8BEN guide →
              </Link>
              <Link href="/global-investing/currency/best-fx-providers" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Best FX providers →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
