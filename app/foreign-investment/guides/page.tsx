import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: `Investing in Australia as an Expat — Complete Guide Hub (${CURRENT_YEAR})`,
  description:
    "The complete guide to investing in Australia as a foreign national or expat. Country-specific guides, FIRB, tax residency, bank accounts, and broker access for US, UK, India, NZ, and 10+ countries.",
  openGraph: {
    title: "Investing in Australia as an Expat — Complete Guide Hub",
    description:
      "Step-by-step guides for international investors buying property, shares, and other assets in Australia. Guides for 15+ countries.",
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

const COUNTRY_GUIDES = [
  { country: "United States", code: "us", flag: "\uD83C\uDDFA\uD83C\uDDF8", slug: "us" },
  { country: "United Kingdom", code: "gb", flag: "\uD83C\uDDEC\uD83C\uDDE7", slug: "uk" },
  { country: "India", code: "in", flag: "\uD83C\uDDEE\uD83C\uDDF3", slug: "india" },
  { country: "China", code: "cn", flag: "\uD83C\uDDE8\uD83C\uDDF3", slug: "china" },
  { country: "New Zealand", code: "nz", flag: "\uD83C\uDDF3\uD83C\uDDFF", slug: "nz" },
  { country: "Singapore", code: "sg", flag: "\uD83C\uDDF8\uD83C\uDDEC", slug: "singapore" },
  { country: "Hong Kong", code: "hk", flag: "\uD83C\uDDED\uD83C\uDDF0", slug: "hong-kong" },
  { country: "Japan", code: "jp", flag: "\uD83C\uDDEF\uD83C\uDDF5", slug: "japan" },
  { country: "South Korea", code: "kr", flag: "\uD83C\uDDF0\uD83C\uDDF7", slug: "south-korea" },
  { country: "UAE", code: "ae", flag: "\uD83C\uDDE6\uD83C\uDDEA", slug: "uae" },
  { country: "Malaysia", code: "my", flag: "\uD83C\uDDF2\uD83C\uDDFE", slug: "malaysia" },
  { country: "Philippines", code: "ph", flag: "\uD83C\uDDF5\uD83C\uDDED", slug: "philippines" },
  { country: "Indonesia", code: "id", flag: "\uD83C\uDDEE\uD83C\uDDE9", slug: "indonesia" },
  { country: "Vietnam", code: "vn", flag: "\uD83C\uDDFB\uD83C\uDDF3", slug: "vietnam" },
  { country: "South Africa", code: "za", flag: "\uD83C\uDDFF\uD83C\uDDE6", slug: "south-africa" },
];

const TOPIC_GUIDES = [
  {
    title: "Opening a Bank Account",
    desc: "Which banks accept non-residents, how to apply remotely, and what documents you need.",
    icon: "building",
    href: "/foreign-investment/guides/non-resident-bank-account",
  },
  {
    title: "Tax Residency Rules",
    desc: "How Australia determines your tax status, dual residency, and the 183-day test.",
    icon: "file-text",
    href: "/foreign-investment/tax",
  },
  {
    title: "FIRB Explained",
    desc: "What the Foreign Investment Review Board does, when you need approval, and how to apply.",
    icon: "shield-check",
    href: "/foreign-investment/guides/firb-application-guide",
  },
  {
    title: "Visa & Investment Requirements",
    desc: "Which visas allow investment, the Significant Investor Visa (SIV), and business visa pathways.",
    icon: "ticket",
    href: "/foreign-investment/guides/buy-property-australia-foreigner",
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
      <section className="relative bg-gradient-to-br from-amber-50 via-white to-emerald-50 border-b border-slate-100 overflow-hidden py-10 md:py-16">
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
              Updated March {CURRENT_YEAR}
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              The Complete Guide to Investing{" "}
              <span className="text-amber-500">in Australia</span>
            </h1>
            <p className="text-sm md:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Whether you&apos;re an expat, temporary resident, or investing from overseas &mdash;
              we&apos;ve built country-specific guides, topic deep-dives, and step-by-step walkthroughs
              to help you navigate Australian markets with confidence.
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

        {/* ── Country-Specific Guides ── */}
        <section className="mb-12">
          <h2 className="text-lg md:text-2xl font-extrabold text-slate-900 mb-2">
            Guides by Country
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Select your home country for a tailored guide covering broker access, tax treaties, visa considerations, and remittance options.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 md:gap-3">
            {COUNTRY_GUIDES.map((cg) => (
              <Link
                key={cg.slug}
                href={`/foreign-investment/from/${cg.slug}`}
                className="group flex items-center gap-2.5 p-3 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/30 transition-all"
              >
                <span className="text-xl shrink-0">{cg.flag}</span>
                <span className="text-sm font-semibold text-slate-700 group-hover:text-amber-700 transition-colors truncate">
                  {cg.country}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Topic Guides ── */}
        <section className="mb-12">
          <h2 className="text-lg md:text-2xl font-extrabold text-slate-900 mb-2">
            Topic Guides
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Deep-dives into the key topics every international investor in Australia needs to understand.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {TOPIC_GUIDES.map((guide) => (
              <Link
                key={guide.title}
                href={guide.href}
                className="group flex items-start gap-4 p-5 border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/20 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition-colors">
                  <Icon name={guide.icon} size={20} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-slate-900 mb-1 group-hover:text-emerald-700 transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{guide.desc}</p>
                </div>
                <svg className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Detailed Guides grid ── */}
        <section className="mb-12">
          <h2 className="text-lg md:text-2xl font-extrabold text-slate-900 mb-5">
            All Guides
          </h2>
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
                  <h3 className="font-bold text-slate-800 text-base mb-1.5 group-hover:text-amber-700 transition-colors">{guide.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{guide.desc}</p>
                </div>
                <svg className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Advisor CTA ── */}
        <section className="mb-12">
          <div className="bg-gradient-to-br from-emerald-50 to-blue-50 border border-emerald-200 rounded-xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Icon name="user-check" size={24} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-extrabold text-slate-900 text-lg mb-1">Need Help? Find an International Tax Specialist</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Australian tax law for non-residents is complex. Connect with a verified international tax advisor
                who specialises in cross-border investment, CGT, and tax treaties.
              </p>
            </div>
            <Link
              href="/advisors/international-tax-specialists"
              className="px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors shrink-0"
            >
              Find an Advisor
            </Link>
          </div>
        </section>

        {/* ── Also see ── */}
        <div>
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
