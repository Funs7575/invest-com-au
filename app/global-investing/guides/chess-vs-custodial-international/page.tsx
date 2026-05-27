import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, UPDATED_LABEL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `CHESS vs Custodial: International Share Ownership Explained (${CURRENT_YEAR})`,
  description: `When you buy international shares, you use a custodial model — not CHESS. What this means for your rights, broker risk, and how DRS (Direct Registration) works. ${UPDATED_LABEL}.`,
  openGraph: {
    title: `CHESS vs Custodial for International Shares (${CURRENT_YEAR})`,
    description: "Custodial vs CHESS ownership models explained. What happens if your international broker fails, and how DRS protects you.",
    url: `${SITE_URL}/global-investing/guides/chess-vs-custodial-international`,
  },
  alternates: { canonical: `${SITE_URL}/global-investing/guides/chess-vs-custodial-international` },
};

const FAQS = [
  {
    q: "Is my money safe if an international broker goes bust?",
    a: "For US-registered brokers (IBKR, Stake via DriveWealth, Tiger/moomoo via custodians), customer securities are protected by SIPC (Securities Investor Protection Corporation) up to US$500,000 per account (US$250,000 cash). IBKR supplements this with Lloyd's of London excess insurance. Client assets are legally required to be held separately from the broker's proprietary assets — so even in insolvency, they should be transferred to another broker rather than forming part of the estate. The risk is operational, not insolvency-driven: in a disorderly collapse there can be delays accessing your account.",
  },
  {
    q: "Can I transfer my international shares to another broker?",
    a: "Yes. ACAT (Automated Customer Account Transfer) is the US system for transferring securities between brokers without selling. You initiate the transfer at the receiving broker; the process takes 5–7 business days. Most major US brokers accept ACAT transfers. Stake, Tiger, and moomoo all support outgoing ACATS, though this can take longer than transfers between large US brokers. There is no ATO event (no CGT trigger) from an ACAT transfer — you retain your original cost base.",
  },
  {
    q: "What is DRS and should I use it for international shares?",
    a: "DRS (Direct Registration System) registers shares directly with a company's transfer agent (Computershare, Equiniti, etc.) in your own name — no broker in between. CommSec International is the main AU broker offering DRS for US shares. DRS eliminates custodial intermediary risk but has real costs: you can't sell instantly (must initiate a DRS delivery back to a broker first), fees apply per transfer, and DRS accounts don't participate in stock lending or fractional shares. For most retail investors, the added operational friction outweighs the marginal risk reduction.",
  },
  {
    q: "Does the custodial model affect how I pay tax on dividends?",
    a: "No — the tax treatment of US dividends (15% withholding under the Australia-US DTA, claimable as FITO) is the same whether you hold shares under a custodial model or DRS. For ASX-listed shares under CHESS, there are no withholding tax complications since dividends from Australian companies are paid directly to you in AUD. The ownership model doesn't change your tax obligations, only the party in the legal chain between you and the issuer.",
  },
];

const BROKERS_TABLE = [
  { broker: "Interactive Brokers (IBKR)", model: "Custodial (street name)", protections: "SIPC up to US$500K + Lloyd's excess", drs: "Available (surcharge)", notes: "Highest institutional-grade protections available in AU market" },
  { broker: "Stake", model: "Custodial via DriveWealth (US)", protections: "SIPC via DriveWealth; AFCA (AU) for AU shares", drs: "Not available", notes: "US shares held in DriveWealth custodian; AU shares via Stake's own CHESS structure" },
  { broker: "Tiger Brokers (AU)", model: "Custodial via US clearing", protections: "SIPC via custodian; AFCA (AU)", drs: "Not available", notes: "US equities in custodial model through US partner broker" },
  { broker: "moomoo AU", model: "Custodial via Futu Clearing", protections: "SIPC + excess; AFCA (AU)", drs: "Not available", notes: "US equities in custodian; AU shares via Futu AU's CHESS HIN" },
  { broker: "CommSec International", model: "Custodial or DRS", protections: "CBA group balance sheet backing; SIPC", drs: "Available — default option", notes: "DRS is the primary model — shares registered in your name directly" },
  { broker: "eToro", model: "Custodial (street name)", protections: "ICF (Cyprus, up to €20,000) + SIPC for US", drs: "Not available", notes: "eToro is Cyprus-registered; different regulatory protections from AU/US brokers" },
];

export default function ChessVsCustodialInternationalPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Global Investing", url: absoluteUrl("/global-investing") },
    { name: "Guides", url: absoluteUrl("/global-investing/guides") },
    { name: "CHESS vs Custodial (International)" },
  ]);
  const faq = faqJsonLd(FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      <div className="bg-white min-h-screen">

        {/* Hero */}
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-12 md:py-16">
          <div className="container-custom max-w-4xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span>/</span>
              <Link href="/global-investing" className="hover:text-white">Global Investing</Link>
              <span>/</span>
              <span className="text-white">CHESS vs Custodial (International)</span>
            </nav>
            <div className="inline-block bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1 rounded-full mb-4">
              Explainer {CURRENT_YEAR}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              CHESS vs Custodial: How International Share Ownership Works
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl">
              Australian shares use CHESS — a system where you hold a unique HIN and are the direct legal owner. International shares don&apos;t. Here&apos;s what the custodial model means for you.
            </p>
          </div>
        </section>

        {/* Core explainer */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
                <h2 className="text-xl font-extrabold text-emerald-900 mb-3">CHESS (Australian Shares)</h2>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>✅ You hold a unique Holder Identification Number (HIN)</li>
                  <li>✅ You are the legal owner of record on the issuer&apos;s register</li>
                  <li>✅ Can transfer shares between any CHESS-participant broker (AOFEX)</li>
                  <li>✅ Shares survive broker insolvency — you can move them to another HIN</li>
                  <li>✅ Dividends and corporate actions go directly to you</li>
                </ul>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
                <h2 className="text-xl font-extrabold text-blue-900 mb-3">Custodial (International Shares)</h2>
                <ul className="space-y-2 text-sm text-slate-800">
                  <li>🔵 Shares held in &quot;street name&quot; by broker or clearing partner</li>
                  <li>🔵 You are the beneficial owner, not the legal holder of record</li>
                  <li>🔵 Transfer possible (ACAT in US) but takes 5–7 business days</li>
                  <li>🔵 SIPC protection (US-registered brokers) up to US$500,000</li>
                  <li>🔵 Broker administers dividends and corporate actions on your behalf</li>
                </ul>
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="font-extrabold text-amber-900 mb-2">What &ldquo;street name&rdquo; means in practice</h3>
              <p className="text-sm text-amber-900 leading-relaxed">
                When you buy Apple shares through Stake, you don&apos;t appear on Apple&apos;s shareholder register. Stake&apos;s US custodian (DriveWealth) is the registered holder — you hold a &quot;beneficial interest&quot; in those shares through Stake. Your rights as a shareholder (price appreciation, dividends, voting) are fully intact, but the legal ownership sits one or more layers above you. This is normal globally — most retail investors worldwide hold shares in street name.
              </p>
            </div>
          </div>
        </section>

        {/* Broker comparison */}
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Ownership model by broker</h2>
            <p className="text-sm text-slate-500 mb-6">For international (US) shares. Australian shares on each broker use CHESS where available.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Broker</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Model</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">Protections</th>
                    <th className="px-4 py-3 text-left font-extrabold text-slate-700">DRS available?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {BROKERS_TABLE.map((row) => (
                    <tr key={row.broker} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-bold text-slate-900">{row.broker}</td>
                      <td className="px-4 py-3 text-slate-700 text-xs">{row.model}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs hidden md:table-cell">{row.protections}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${row.drs.startsWith("Available") ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                          {row.drs}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Risk assessment */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-4xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">Should you worry about custodial risk?</h2>
            <div className="space-y-4">
              {[
                {
                  risk: "Broker insolvency",
                  level: "Low",
                  levelColor: "emerald",
                  detail: "For US-registered custodians, customer securities are segregated from proprietary assets by law. SIPC covers up to US$500K. IBKR has Lloyd's excess coverage. The realistic scenario isn't loss of assets but a 3–6 week delay while an administrator transfers accounts.",
                },
                {
                  risk: "Broker operational failure",
                  level: "Very low",
                  levelColor: "emerald",
                  detail: "Trading downtime ≠ asset loss. If Stake has a system outage, your shares still exist at the custodian. You can't trade during an outage but you don't lose value.",
                },
                {
                  risk: "Custodian fraud",
                  level: "Rare",
                  levelColor: "amber",
                  detail: "Historically rare for large regulated US custodians (DriveWealth, Pershing, Interactive Brokers LLC). Smaller or offshore custodians carry more risk — eToro's Cypriot registration comes with weaker protections (ICF capped at €20K) than US/AU-regulated brokers.",
                },
                {
                  risk: "Counterparty chain complexity",
                  level: "Medium",
                  levelColor: "amber",
                  detail: "Some AU brokers use a chain: AU broker → US introducing broker → US clearing custodian. More intermediaries = more complexity in a wind-down. IBKR is a direct US clearing firm — fewer intermediaries. This is one reason sophisticated investors prefer IBKR.",
                },
              ].map((item) => (
                <div key={item.risk} className="rounded-xl border border-slate-200 bg-white p-5 flex gap-4">
                  <div className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-extrabold self-start mt-0.5 bg-${item.levelColor}-100 text-${item.levelColor}-800`}>
                    {item.level}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 mb-1">{item.risk}</div>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                  </div>
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
        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <Link href="/global-investing/shares/us" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Compare US share brokers →
              </Link>
              <Link href="/global-investing/guides/ibkr-australia-setup" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                IBKR setup guide →
              </Link>
              <Link href="/global-investing" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">
                Global investing hub →
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
