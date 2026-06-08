import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Australians Buying Property Overseas (${CURRENT_YEAR}) — US, Bali, UK, NZ, Portugal | invest.com.au`,
  description: `What Australian residents need to know before buying foreign property — financing, foreign buyer rules, FIRB overlap, CGT, foreign rental income, and the key risks by country. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `Australians Buying Property Overseas (${CURRENT_YEAR})`,
    description: "Buying in the US, Bali, UK, NZ, or Portugal as an Australian resident — financing, tax, legal, and foreign-buyer restrictions explained.",
    url: `${SITE_URL}/global-investing/property`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Buying Property Overseas from Australia")}&sub=${encodeURIComponent("US · Bali · UK · NZ · Portugal · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/global-investing/property` },
};

const COUNTRIES = [
  {
    country: "United States (Florida, Texas)",
    buyerRestrictions: "None — foreigners can purchase freehold property",
    financing: "US mortgage possible but requires ITIN, US credit history. Many AU investors pay cash or use IBKR margin/portfolio loans",
    taxKey: "FIRPTA: 15% withheld on sale proceeds (reclaimed via US tax return). Rental income: US 1040-NR lodgement required. AU CGT on AUD gain at sale",
    popular: "Miami (FL), Austin (TX), Orlando (FL) — strong rental yield and no state income tax",
  },
  {
    country: "Indonesia (Bali)",
    buyerRestrictions: "Foreigners CANNOT own freehold (Hak Milik). Common structure: 25-year leasehold (Hak Sewa) or nominee arrangement — nominee arrangements carry legal risk",
    financing: "Indonesian bank finance not available to foreigners. Must use cash or AU equity release",
    taxKey: "Indonesian income tax on rental (20% final withholding for non-residents). AU CGT on AUD gain at disposal",
    popular: "Seminyak, Canggu, Ubud — villa yields 8–15% short-term rental but structure risk is significant",
  },
  {
    country: "New Zealand",
    buyerRestrictions: "Overseas Investment Act 2018: most NZ residential land requires OIO consent (Overseas Investment Office). Australians/Singaporeans get reciprocal treatment but still need consent for most purchases",
    financing: "NZ bank finance available (ANZ NZ, ASB, BNZ). AU income serviceability rules apply",
    taxKey: "NZ CGT does not apply on investment property held 10+ years (Bright-line test: 10 yr for most). AU: worldwide CGT still applies to AU residents — NZ DTA provides relief",
    popular: "Queenstown, Auckland — strong AUD/NZD parity; ski season short-term rental",
  },
  {
    country: "United Kingdom",
    buyerRestrictions: "No restrictions on foreign ownership of UK property",
    financing: "UK buy-to-let mortgages available but require UK credit history. Specialist expat brokers exist",
    taxKey: "UK Stamp Duty Land Tax (SDLT): 2% additional surcharge for non-UK residents. UK CGT: 18–24% on residential gains. Rental income: UK non-resident landlord scheme. AU DTA: no double taxation on same gain",
    popular: "Manchester, Birmingham — better yields than London; student property popular for AU investors",
  },
  {
    country: "Portugal (NHR expired 2024, Golden Visa reform)",
    buyerRestrictions: "EU freedom of movement; no buyer restrictions. NHR (Non-Habitual Resident) tax regime replaced by IFICI from Jan 2024 — reduced tax rates for qualifying professionals",
    financing: "Portuguese bank finance available at 60–70% LTV. EU interest rates typically below AU",
    taxKey: "Portuguese CGT: 28% flat rate for non-residents. Rental income: 25% rate. AU CGT also applies at disposal (DTA credit available). Golden Visa: residential property no longer eligible post-Oct 2023 reform",
    popular: "Lisbon, Porto, Algarve — lifestyle play; strong short-term rental demand",
  },
];

const FAQS = [
  {
    q: "Does FIRB apply to Australians buying property overseas?",
    a: "No. FIRB (Foreign Investment Review Board) is an Australian government body that screens foreign purchases of Australian assets. It does not have jurisdiction over Australian residents buying property in other countries. What applies is the foreign country's own foreign buyer rules (e.g. Indonesia's Overseas Investment Act, New Zealand's OIO consent requirements). Some countries require approval; most don't restrict foreign freehold ownership.",
  },
  {
    q: "Do I have to declare foreign property to the ATO?",
    a: "Yes. Australian tax residents must declare worldwide income, including foreign rental income. Foreign property held with cost base above A$50,000 must also be disclosed on Schedule 1 of the tax return (Section B: Foreign assets and source of income). If you receive foreign rental income, you must also lodge in the country where the property is located (as a non-resident). The ATO has increased offshore data-matching and information exchange since 2023.",
  },
  {
    q: "How is foreign rental income taxed in Australia?",
    a: "Foreign rental income is assessable in Australia at your marginal rate. Allowable deductions include interest on any loan used to fund the purchase, rates, management fees, depreciation, and repairs — assessed under Australian tax rules. If foreign tax has been withheld on the rental income (e.g. 20% Indonesian withholding), you can claim a FITO (Foreign Income Tax Offset) against your Australian tax liability, capped at the Australian tax payable on that income.",
  },
  {
    q: "What are the main risks unique to overseas property investment?",
    a: "Key risks: (1) Currency risk: a rental yield of 8% in IDR (Indonesian rupiah) may be negative in AUD terms after currency depreciation — IDR/AUD has historically been volatile. (2) Legal structure risk: nominee arrangements in Indonesia and other countries carry legal uncertainty. (3) Financing risk: overseas mortgages are harder to obtain and service-ability rules differ. (4) Tenancy law risk: foreign landlord laws may not match AU protections. (5) Tax compliance cost: filing in multiple jurisdictions (AU + local) adds accountant costs of $2k–$5k p.a. (6) Liquidity: selling overseas property can take 6–18 months.",
  },
];

export default function GlobalPropertyPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Global Investing", url: `${SITE_URL}/global-investing` },
    { name: "Foreign Property" },
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
            <span className="text-slate-900 font-medium">Foreign Property</span>
          </nav>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Australians buying property overseas
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed mb-3">
            US, Bali, New Zealand, UK, Portugal — key considerations for Australian residents
            buying property offshore. Foreign buyer restrictions, financing, tax treatment in
            both countries, and the risks that catch first-time overseas buyers.
          </p>
          <p className="text-xs text-slate-400">{UPDATED_LABEL} · General information only · Not legal or tax advice</p>
        </div>
      </section>

      {/* Country cards */}
      <section className="py-10 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-5">Key considerations by country</h2>
          <div className="space-y-4">
            {COUNTRIES.map((c, i) => (
              <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-900 px-5 py-3">
                  <p className="text-sm font-bold text-white">{c.country}</p>
                </div>
                <div className="p-5 grid sm:grid-cols-2 gap-4 bg-white">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Foreign buyer rules</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{c.buyerRestrictions}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Financing</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{c.financing}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tax headline</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{c.taxKey}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-1">Popular areas</p>
                    <p className="text-xs text-amber-800 leading-relaxed">{c.popular}</p>
                  </div>
                </div>
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

      <HubAdvisorCTA
        heading="Get specialist advice on international property investment"
        subheading="Buying property abroad involves FIRB approvals, dual taxation treaties, foreign mortgage structuring, and capital gains on disposal. A specialist adviser experienced with cross-border investment can map the full tax and legal picture."
        intent={{ need: "planning", context: ["international_property", "foreign_investment", "international_tax"] }}
        source="global_investing_property"
        ctaLabel="Find an international investment adviser"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      {/* Related */}
      <section className="py-8 border-b border-slate-100">
        <div className="container-custom max-w-4xl">
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">Related guides</h2>
          <div className="flex flex-wrap gap-3">
            {[
              { href: "/global-investing/tax/cgt-on-foreign-shares", label: "CGT on foreign assets" },
              { href: "/global-investing/currency", label: "FX & currency accounts" },
              { href: "/global-investing/tax/fito", label: "FITO (foreign tax credit)" },
              { href: "/property/foreign-investment", label: "Foreigners buying AU property (FIRB)" },
              { href: "/global-investing", label: "Global investing hub" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm font-semibold text-slate-700 hover:border-amber-300 hover:text-amber-700 transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 bg-slate-50">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong> {GENERAL_ADVICE_WARNING} Foreign property laws, tax rules, and financing options change frequently. This page is general information only — not legal, tax, or investment advice. Consult a registered tax agent (TPB), a local property lawyer in the target country, and a licensed financial adviser before proceeding.
          </p>
        </div>
      </section>
    </div>
  );
}
