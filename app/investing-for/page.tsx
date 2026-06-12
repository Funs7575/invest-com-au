import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Investing by Occupation — ${CURRENT_YEAR} Guides for Every Profession | Invest.com.au`,
  description:
    "Investing guides by occupation — doctors, teachers, tradies, public servants, business owners and more. Tax, super and wealth strategies for your career.",
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

const INVESTING_FOR_FAQS = [
  {
    q: "Why does investing strategy vary by occupation?",
    a: "Income certainty, superannuation structures, tax treatment, and career-specific risks all differ significantly between occupations. A public servant accruing defined benefits in the PSS super scheme has very different priorities from a contractor who must self-fund superannuation and lacks SG entitlements. A mining worker earning $180,000 faces Division 293 tax and benefits heavily from salary sacrifice, while a new graduate nurse with HECS debt should prioritise voluntary super contributions to reduce assessable income. Each guide on this hub addresses the financial strategies that matter most for that career path.",
  },
  {
    q: "What do the occupation-specific investing guides cover?",
    a: "Each guide covers the key financial considerations for that profession: (1) Superannuation — which fund and account type is available, whether employer contributions exceed the SG minimum, and whether an SMSF makes sense; (2) Tax strategies — salary sacrifice, income-averaging rules, small business CGT concessions, Division 293 threshold planning; (3) Income protection — whether profession-specific risks (loss of licence for pilots, inability to work in your specialisation for surgeons) require specialist insurance; (4) Wealth-building priorities — property vs shares vs super, structured based on income certainty and career timeline; and (5) Common financial planning mistakes specific to that profession.",
  },
  {
    q: "Are the occupation guides personal financial advice?",
    a: "No. All content on Invest.com.au, including the occupation-specific guides, is general financial information only. It does not take into account your individual objectives, financial situation, or needs. Before acting on any information, you should consider whether it is appropriate for your circumstances and consult a licensed financial adviser (who holds an Australian Financial Services Licence). Invest.com.au does not provide personal financial advice under our AFSL.",
  },
  {
    q: "How often are the occupation guides updated?",
    a: "Occupation guides are reviewed at least annually and updated immediately when there is a material change — such as an ATO ruling, superannuation guarantee rate increase, HECS repayment threshold adjustment, or changes to profession-specific tax concessions (e.g., the small business CGT concessions or income averaging rules). The publication date on each guide shows when it was last substantively reviewed.",
  },
];

const investingForFaqLd = faqJsonLd(INVESTING_FOR_FAQS);

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
      {investingForFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(investingForFaqLd) }}
        />
      )}

      <div className="container-custom py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6 flex gap-1">
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

      <HubAdvisorCTA
        heading="Get advice tailored to your occupation and tax situation"
        subheading="Occupation-specific tax strategies, super co-contribution rules, and income protection options vary significantly. A financial adviser who understands your profession can build a plan that matches your career stage and salary structure."
        intent={{ need: "planning", context: ["occupation_investing", "tax_strategy"] }}
        source="investing_for"
        ctaLabel="Find a financial adviser"
        className="py-12 bg-amber-50 border-t border-amber-200"
      />

      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {INVESTING_FOR_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
