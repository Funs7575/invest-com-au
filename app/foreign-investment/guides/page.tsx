import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Foreign Investment Guides — How to Invest in Australia from Overseas (2026)",
  description:
    "Complete guides for foreign investors in Australia. How to buy property, FIRB applications, stamp duty surcharges, bank accounts, broker access, and the 2025–2027 established dwelling ban.",
  openGraph: {
    title: "Foreign Investment Guides",
    description:
      "Step-by-step guides for international investors buying property, shares, and other assets in Australia.",
    url: `${SITE_URL}/foreign-investment/guides`,
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: `${SITE_URL}/foreign-investment/guides` },
};

export const revalidate = 86400;

const GUIDES = [
  {
    title: "How to Buy Property in Australia as a Foreigner (2026 Guide)",
    href: "/foreign-investment/guides/buy-property-australia-foreigner",
    desc: "Complete step-by-step process from FIRB approval to settlement. Eligible property types, costs, and professionals you need to engage.",
    tag: "Property",
    tagColor: "bg-emerald-100 text-emerald-700",
    isNew: false,
  },
  {
    title: "Australia's Foreign Buyer Property Ban 2025–2027: What You Can (and Can't) Buy",
    href: "/foreign-investment/guides/property-ban-2025",
    desc: "The established dwelling ban is in effect. Who is affected, what you can still buy, penalties for breaching it, and when it ends.",
    tag: "Property",
    tagColor: "bg-emerald-100 text-emerald-700",
    isNew: true,
  },
  {
    title: "FIRB Application: Complete Step-by-Step Guide (2026)",
    href: "/foreign-investment/guides/firb-application-guide",
    desc: "Documents required, application fees, processing times, approval conditions, and what happens if your application is rejected.",
    tag: "Property",
    tagColor: "bg-emerald-100 text-emerald-700",
    isNew: false,
  },
  {
    title: "Foreign Buyer Stamp Duty by State (2026)",
    href: "/foreign-investment/guides/stamp-duty-foreign-buyers",
    desc: "Every state's foreign buyer surcharge (7–8%), land tax surcharges, and real cost examples at $500K, $1M, and $2M.",
    tag: "Property",
    tagColor: "bg-emerald-100 text-emerald-700",
    isNew: false,
  },
  {
    title: "Can Non-Residents Open an Australian Bank Account?",
    href: "/foreign-investment/guides/non-resident-bank-account",
    desc: "Yes — here's how. Which banks accept non-residents, remote opening process, documents needed, and how withholding tax on interest works.",
    tag: "Banking",
    tagColor: "bg-blue-100 text-blue-700",
    isNew: false,
  },
];

export default function ForeignInvestmentGuidesPage() {
  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
              { name: "Guides" },
            ])
          ),
        }}
      />

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Guides</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              How to Invest in Australia{" "}
              <span className="text-amber-500">from Overseas</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-600">Complete Guide Library</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Whether you&apos;re buying property, investing in ASX shares, opening a bank account, or navigating
              Australian tax — these guides cover every step for international investors in 2026.
            </p>
          </div>
        </div>
      </section>

      <div className="container-custom py-8 md:py-12">

        {/* ── Property ban alert ── */}
        <div className="mb-8 bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <p className="font-bold text-red-800 text-sm">Foreign Buyer Property Ban: Active until 31 March 2027</p>
            <p className="text-sm text-red-700 mt-0.5">
              Foreign persons cannot currently purchase established (existing) dwellings. New developments and off-the-plan properties are still available.{" "}
              <Link href="/foreign-investment/guides/property-ban-2025" className="underline font-semibold">Read the full guide &rarr;</Link>
            </p>
          </div>
        </div>

        {/* ── Guides grid ── */}
        <div className="space-y-4">
          {GUIDES.map((guide) => (
            <Link key={guide.href} href={guide.href} className="group flex items-start gap-5 p-5 border border-slate-200 rounded-2xl hover:border-amber-300 hover:bg-amber-50/20 transition-all">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${guide.tagColor}`}>{guide.tag}</span>
                  {guide.isNew && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">New</span>
                  )}
                </div>
                <h2 className="font-bold text-slate-800 text-base mb-1.5 group-hover:text-amber-700 transition-colors">{guide.title}</h2>
                <p className="text-sm text-slate-500 leading-relaxed">{guide.desc}</p>
              </div>
              <svg className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        {/* ── Also see ── */}
        <div className="mt-12">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Also in the Foreign Investment section</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Foreign Investment Hub", href: "/foreign-investment" },
              { label: "Shares for Non-Residents", href: "/foreign-investment/shares" },
              { label: "DASP / Super Guide", href: "/foreign-investment/super" },
              { label: "Tax Guide for Non-Residents", href: "/foreign-investment/tax" },
              { label: "Send Money to Australia", href: "/foreign-investment/send-money-australia" },
              { label: "Brokers for Non-Residents", href: "/compare/non-residents" },
              { label: "FIRB Property Guide", href: "/property/foreign-investment" },
              { label: "By Country", href: "/foreign-investment/from/us" },
              { label: "FIRB-Eligible Listings", href: "/property/listings?firb=true" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/20 text-sm font-semibold text-slate-700 hover:text-amber-700 transition-all">
                <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
