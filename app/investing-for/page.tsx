import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Investing by Occupation — ${CURRENT_YEAR} Guides for Every Profession | Invest.com.au`,
  description:
    "Occupation-specific investing guides for Australians — doctors, teachers, tradies, public servants, business owners, and 25+ more professions. Tax, super, and wealth strategies tailored to your career.",
  alternates: { canonical: `${SITE_URL}/investing-for` },
  openGraph: {
    title: "Investing by Occupation — Guides for Every Australian Profession",
    description:
      "Find the investing guide that matches your career. Super, tax, income protection, and wealth-building strategies for 30+ Australian occupations.",
    url: `${SITE_URL}/investing-for`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Investing for Your Profession")}&sub=${encodeURIComponent("Doctors · Teachers · Nurses · Pilots · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const OCCUPATION_GROUPS = [
  {
    heading: "Healthcare",
    occupations: [
      { slug: "doctor", label: "Doctors & Medical Practitioners", note: "Practice structure, SMSF, income protection" },
      { slug: "nurse", label: "Nurses & Midwives", note: "Salary packaging, hospital super, career breaks" },
      { slug: "dentist", label: "Dentists", note: "SMSF, practice premises, CGT concessions" },
      { slug: "pharmacist", label: "Pharmacists", note: "Pharmacy valuation, SMSF, salary sacrifice" },
      { slug: "vet", label: "Veterinarians", note: "HECS debt, income protection, practice ownership" },
    ],
  },
  {
    heading: "Professional Services",
    occupations: [
      { slug: "lawyer", label: "Lawyers & Solicitors", note: "Salary sacrifice, partnership income, SMSF" },
      { slug: "accountant", label: "Accountants & CPAs", note: "Self-managed SMSF, trust structures, wholesale access" },
      { slug: "engineer", label: "Engineers", note: "Salary sacrifice, lump-sum investing, mining bonus" },
      { slug: "architect", label: "Architects", note: "Property investing, practice structure, income protection" },
      { slug: "financial-planner", label: "Financial Planners", note: "Wholesale access, SMSF, avoiding cobbler's children" },
      { slug: "it-professional", label: "IT & Tech Professionals", note: "ESS/equity, salary sacrifice, contractor structure" },
    ],
  },
  {
    heading: "Public Sector",
    occupations: [
      { slug: "public-servant", label: "Public Servants", note: "CSS/PSS/PSSap, 15.4% employer contributions" },
      { slug: "teacher", label: "Teachers", note: "Government super schemes, salary packaging, career breaks" },
      { slug: "police-officer", label: "Police Officers", note: "Police super, shift allowances, early retirement" },
      { slug: "military", label: "ADF Members", note: "MSBS, ADF Super 16.4%, DHA, transition planning" },
    ],
  },
  {
    heading: "Business Owners",
    occupations: [
      { slug: "small-business-owner", label: "Small Business Owners", note: "Self-funded super, CGT concessions, succession" },
      { slug: "startup-founder", label: "Startup Founders", note: "ESIC, ESS equity, exit tax planning" },
      { slug: "executive", label: "Executives & Senior Leaders", note: "LTIPs, Division 293, equity diversification" },
      { slug: "real-estate-agent", label: "Real Estate Agents", note: "Commission income, property investing, super" },
      { slug: "farmer", label: "Farmers & Agricultural Workers", note: "FMDs, income averaging, succession planning" },
    ],
  },
  {
    heading: "Trades & Industries",
    occupations: [
      { slug: "tradesperson", label: "Tradies & Tradespeople", note: "ABN super, income protection, property" },
      { slug: "pilot", label: "Pilots & Aircrew", note: "Loss of licence insurance, mandatory retirement" },
      { slug: "miner", label: "Mining Workers", note: "Zone tax offset, high income salary sacrifice" },
    ],
  },
  {
    heading: "Self-Employed & Other",
    occupations: [
      { slug: "freelancer", label: "Freelancers", note: "GST, tax instalments, self-funded super" },
      { slug: "contractor", label: "Contractors", note: "PSI rules, SG entitlement, income protection" },
      { slug: "sports-professional", label: "Sports Professionals", note: "Short career window, image rights, SMSF" },
    ],
  },
];

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Investing For", url: absoluteUrl("/investing-for") },
]);

export default function InvestingForPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="container-custom py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-400 mb-6 flex gap-1">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <span>›</span>
          <span className="text-slate-600">Investing For</span>
        </nav>

        <header className="mb-10">
          <p className="text-xs uppercase tracking-wider font-extrabold text-blue-600 mb-3">
            Occupation Guides
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
            Investing Guides for Every Profession
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
            Tax, super, income protection, and wealth-building strategies tailored to your career.
            Choose your profession to see the financial considerations that apply to you.
          </p>
        </header>

        <div className="space-y-10">
          {OCCUPATION_GROUPS.map(({ heading, occupations }) => (
            <section key={heading}>
              <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                {heading}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {occupations.map(({ slug, label, note }) => (
                  <Link
                    key={slug}
                    href={`/investing-for/${slug}`}
                    className="block p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <p className="font-semibold text-slate-900 mb-1">{label}</p>
                    <p className="text-xs text-slate-500">{note}</p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 p-5 bg-blue-50 border border-blue-100 rounded-xl">
          <h2 className="text-base font-bold text-slate-900 mb-2">
            Can&apos;t find your profession?
          </h2>
          <p className="text-sm text-slate-600 mb-3">
            The core investing principles — maximise super, minimise tax, diversify assets, and
            protect your income — apply across all occupations. Use our tools and calculators to
            build a strategy.
          </p>
          <Link
            href="/calculators"
            className="inline-block text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Go to calculators →
          </Link>
        </div>
      </div>
    </>
  );
}
