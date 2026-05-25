import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, absoluteUrl, CURRENT_YEAR, UPDATED_LABEL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import { faqJsonLd } from "@/lib/schema-markup";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";
import FamilyOfficeDiagnostic from "./_components/FamilyOfficeDiagnostic";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Family Office Services in Australia (${CURRENT_YEAR}) — Hub & Specialist Directory`,
  description:
    "Factual guide to family offices in Australia: what they are, when they make sense, how MFOs differ from SFOs, and how to find a verified family-office specialist. Includes a free 3-question diagnostic.",
  openGraph: {
    title: `Family Office Services in Australia (${CURRENT_YEAR})`,
    description:
      "What is a family office, when do you need one, and how do you find the right structure? Factual hub with specialist referral.",
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Family Office Services")}&subtitle=${encodeURIComponent("Hub · Diagnostic · Specialist Referral · Australia")}&type=default`,
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: absoluteUrl("/family-office") },
};

/* ─── Static FAQ data ─────────────────────────────────────── */

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "What is a family office?",
    a: "A family office is a private wealth management structure that coordinates investment management, tax planning, estate planning, philanthropy, and family governance for a single family (single-family office, SFO) or a group of families (multi-family office, MFO). They are distinct from licensed financial advisers in that they handle the full breadth of a family's financial affairs rather than providing advice on individual products.",
  },
  {
    q: "What is the difference between a single-family office and a multi-family office?",
    a: "A single-family office (SFO) is established exclusively to manage one family's wealth and typically requires $20 million or more in investable assets to justify the operating cost (commonly $1–3 million per year). A multi-family office (MFO) shares infrastructure across multiple client families, giving each family access to institutional-grade investment management and advisory services at a fraction of the cost. MFOs in Australia generally require a minimum of $3–10 million in investable assets.",
  },
  {
    q: "How much does a family office cost in Australia?",
    a: "A single-family office typically costs between $1 million and $3 million per year to operate, covering a dedicated CIO, legal counsel, accountants, and governance staff. Multi-family offices charge on a fee basis — either a percentage of assets under management (commonly 0.5–1.0% per year) or a fixed retainer. At the $5–20 million wealth band, an MFO typically represents better value than establishing an SFO.",
  },
  {
    q: "Do I need a family office or a financial planner?",
    a: "If your investable assets are under $3–5 million and your financial situation is moderate in complexity, a licensed financial planner paired with a tax accountant is typically the most cost-effective approach. Family offices become cost-effective when the scope of coordination — cross-entity structures, trust and estate planning, philanthropy, succession, and institutional investment access — exceeds what a planner can efficiently manage. The 3-question diagnostic on this page gives a general indication based on your wealth band and complexity.",
  },
  {
    q: "Are family offices regulated in Australia?",
    a: "Family offices are not a licensed category under the Corporations Act 2001. Individual services provided by the family office — financial product advice, trustee services, tax advice — may require an AFS licence, registration with ASIC, or registration with the Tax Practitioners Board, depending on the activities. If a family-office firm provides financial product advice to clients, they must hold or operate under an AFSL.",
  },
  {
    q: "What is the minimum wealth for a family office in Australia?",
    a: "There is no legal minimum. In practice, the economics of a single-family office make sense at roughly $20 million or more in investable assets. Multi-family offices typically set minimums between $3 million and $10 million. Below those thresholds, the cost of administration exceeds the benefit for most families.",
  },
  {
    q: "What services does a family office provide?",
    a: "A full-service family office can cover: investment management and portfolio construction, consolidated reporting across entities, tax structuring and compliance (including international tax), estate planning and wills, trust and trustee services, philanthropy and charitable giving administration, family governance and succession planning, insurance review, private equity and alternative asset access, and family education and next-generation programmes.",
  },
];

/* ─── Provider directory data ─────────────────────────────── */

interface FoProvider {
  name: string;
  type: "MFO" | "SFO advisory" | "Specialist";
  minimumAssets: string;
  description: string;
  services: string[];
}

const FO_PROVIDERS: FoProvider[] = [
  {
    name: "Multi-Family Office (MFO)",
    type: "MFO",
    minimumAssets: "$3M–$10M+",
    description:
      "Shared-infrastructure family offices serving multiple wealthy families. You get institutional investment access, consolidated reporting, and holistic advice at a fraction of SFO cost.",
    services: ["Portfolio management", "Tax structuring", "Estate planning", "Consolidated reporting", "Philanthropy admin"],
  },
  {
    name: "Single-Family Office (SFO)",
    type: "SFO advisory",
    minimumAssets: "$20M+",
    description:
      "A dedicated structure established exclusively for one family. Fully bespoke — your own CIO, legal counsel, accountants, and governance staff operating under one roof.",
    services: ["Dedicated CIO", "Bespoke governance", "Succession planning", "Next-generation education", "Private market access"],
  },
  {
    name: "Family-Office Advisory Firm",
    type: "Specialist",
    minimumAssets: "Varies",
    description:
      "Boutique advisory firms that help families design, establish, and govern family-office structures. Often used during a transition from a traditional adviser relationship or following a liquidity event.",
    services: ["SFO/MFO set-up", "Governance design", "Trustee selection", "Investment policy", "Adviser coordination"],
  },
];

/* ─── Page ────────────────────────────────────────────────── */

export default function FamilyOfficeHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Family Office" },
  ]);

  const faqLd = faqJsonLd(FAQS);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <div className="bg-white min-h-screen">
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="border-b border-slate-100 py-8 md:py-14">
          <div className="container-custom max-w-5xl">
            {/* Breadcrumb */}
            <nav
              className="text-xs text-slate-500 mb-5 flex items-center gap-1.5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <span className="text-slate-300" aria-hidden="true">/</span>
              <span className="text-slate-900 font-medium">Family Office</span>
            </nav>

            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" aria-hidden="true" />
                  {UPDATED_LABEL}
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
                  Family Office Services{" "}
                  <span className="text-amber-500">in Australia</span>
                </h1>

                <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-5">
                  A factual overview of family offices, multi-family offices, and how to
                  find the right structure for your wealth — including a free 3-question
                  diagnostic.
                </p>

                <div className="flex flex-wrap gap-2">
                  <a
                    href="#diagnostic"
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm rounded-lg transition-colors"
                  >
                    Take the diagnostic
                  </a>
                  <a
                    href="#providers"
                    className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors"
                  >
                    Browse specialist types
                  </a>
                </div>
              </div>

              {/* At-a-glance summary card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  At a glance
                </p>
                <dl className="space-y-3">
                  {[
                    { dt: "Single-family office (SFO)", dd: "$20M+ in investable assets" },
                    { dt: "Multi-family office (MFO)", dd: "$3M–$10M+ minimum" },
                    { dt: "Annual SFO operating cost", dd: "$1M–$3M per year (typical)" },
                    { dt: "MFO fee range", dd: "0.5–1.0% AUM or fixed retainer" },
                    { dt: "Regulation", dd: "No licensed category; product advice requires AFSL" },
                  ].map(({ dt, dd }) => (
                    <div key={dt} className="flex justify-between items-start gap-2">
                      <dt className="text-xs text-slate-600 leading-relaxed max-w-[55%]">{dt}</dt>
                      <dd className="text-xs font-semibold text-slate-900 text-right">{dd}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                  {GENERAL_ADVICE_WARNING}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── What is a family office ─────────────────────────────── */}
        <section className="py-10 md:py-14 border-b border-slate-100">
          <div className="container-custom max-w-5xl">
            <div className="grid md:grid-cols-3 gap-10">
              <div className="md:col-span-2">
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">
                  What is a family office?
                </h2>
                <div className="prose prose-sm prose-slate max-w-none space-y-4 text-sm text-slate-600 leading-relaxed">
                  <p>
                    A family office is a private structure that manages the full breadth
                    of a wealthy family&rsquo;s financial affairs — investment management,
                    tax, estate planning, philanthropy, governance, and succession — under
                    one coordinated team. Unlike a financial adviser who focuses on
                    licensed product advice, a family office operates more like a
                    private CFO for the family.
                  </p>
                  <p>
                    Family offices are broadly divided into two categories: the{" "}
                    <strong>single-family office (SFO)</strong>, which serves one family
                    exclusively and is typically cost-effective only above $20 million in
                    investable assets, and the{" "}
                    <strong>multi-family office (MFO)</strong>, which pools operating
                    infrastructure across several client families and typically accepts
                    clients from $3–10 million upwards.
                  </p>
                  <p>
                    In Australia, family offices are not a regulated licence category
                    under the Corporations Act 2001. Where a family-office team provides
                    financial product advice to clients, they must hold or operate under
                    an Australian Financial Services Licence (AFSL). Tax and accounting
                    services require registration with the Tax Practitioners Board.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-base font-extrabold text-slate-900">
                  Key services provided
                </h3>
                <ul className="space-y-2">
                  {[
                    "Portfolio construction & management",
                    "Consolidated cross-entity reporting",
                    "Tax structuring & compliance",
                    "Trust & estate planning",
                    "Succession & governance",
                    "Philanthropy administration",
                    "Private equity & alternatives access",
                    "Insurance review",
                    "Next-generation education",
                    "Family charter & dispute resolution",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <span
                        className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0 mt-[0.45em]"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ── SFO vs MFO comparison ──────────────────────────────── */}
        <section className="py-10 md:py-14 bg-slate-50 border-b border-slate-100">
          <div className="container-custom max-w-5xl">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">
              Single-family office vs multi-family office
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden shadow-sm">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide w-[30%]">
                      Factor
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                      Single-Family Office (SFO)
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                      Multi-Family Office (MFO)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      factor: "Typical minimum assets",
                      sfo: "$20 million+",
                      mfo: "$3–10 million",
                    },
                    {
                      factor: "Typical annual cost",
                      sfo: "$1M–$3M per year (operating)",
                      mfo: "0.5–1.0% AUM or fixed retainer",
                    },
                    {
                      factor: "Customisation",
                      sfo: "Fully bespoke to family needs",
                      mfo: "High, with some shared infrastructure",
                    },
                    {
                      factor: "Privacy",
                      sfo: "Maximum — all staff work for one family",
                      mfo: "Strong, but staff serve multiple families",
                    },
                    {
                      factor: "Investment access",
                      sfo: "Institutional-tier direct mandates",
                      mfo: "Institutional-tier via pooled vehicles",
                    },
                    {
                      factor: "Governance",
                      sfo: "Fully family-defined",
                      mfo: "Family-defined within MFO framework",
                    },
                    {
                      factor: "Best suited for",
                      sfo: "$20M+ with complex multi-gen needs",
                      mfo: "$3–20M seeking professional coordination",
                    },
                  ].map((row, i) => (
                    <tr
                      key={row.factor}
                      className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                    >
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700 align-top">
                        {row.factor}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 align-top">
                        {row.sfo}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 align-top">
                        {row.mfo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-[11px] text-slate-500 leading-relaxed max-w-2xl">
              All figures are indicative and based on general market information as of{" "}
              {UPDATED_LABEL.toLowerCase()}. Actual fees and minimums vary by provider.{" "}
              {GENERAL_ADVICE_WARNING}
            </p>
          </div>
        </section>

        {/* ── Diagnostic ─────────────────────────────────────────── */}
        <section id="diagnostic" className="py-10 md:py-14 border-b border-slate-100">
          <div className="container-custom max-w-5xl">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div>
                <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
                  Do you need a family office?
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Answer 3 quick questions about your wealth level, complexity, and primary
                  goal. We&rsquo;ll give you a general indication of whether a family office
                  is likely to be relevant for your situation — and connect you with a
                  specialist if you want to explore further.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <p className="text-xs text-amber-800 leading-relaxed">
                    <strong>General information only.</strong> {GENERAL_ADVICE_WARNING}
                  </p>
                </div>
              </div>

              <div>
                <FamilyOfficeDiagnostic />
              </div>
            </div>
          </div>
        </section>

        {/* ── Provider / specialist types directory ──────────────── */}
        <section id="providers" className="py-10 md:py-14 bg-slate-50 border-b border-slate-100">
          <div className="container-custom max-w-5xl">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2">
              Types of family-office specialists
            </h2>
            <p className="text-sm text-slate-600 mb-8 max-w-2xl leading-relaxed">
              Family-office services are delivered through different structures. Understanding
              which type fits your situation is the first step.
            </p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FO_PROVIDERS.map((provider) => (
                <article
                  key={provider.name}
                  className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wide rounded-full">
                      {provider.type}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      min. {provider.minimumAssets}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900 mb-2">
                    {provider.name}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4 flex-1">
                    {provider.description}
                  </p>

                  <ul className="space-y-1.5">
                    {provider.services.map((s) => (
                      <li key={s} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                        <span
                          className="w-1 h-1 bg-amber-400 rounded-full shrink-0"
                          aria-hidden="true"
                        />
                        {s}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <p className="mt-6 text-[11px] text-slate-500">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>
        </section>

        {/* ── When a family office makes sense ───────────────────── */}
        <section className="py-10 md:py-14 border-b border-slate-100">
          <div className="container-custom max-w-5xl">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-6">
              When does a family office make sense?
            </h2>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Significant wealth threshold",
                  body: "The economics generally work above $5M for an MFO and $20M+ for an SFO. Below those bands, a financial planner and accountant typically deliver better value.",
                },
                {
                  title: "Multi-entity complexity",
                  body: "Multiple trusts, SMSFs, holding companies, or offshore structures create coordination overhead that exceeds what a standalone financial planner can manage.",
                },
                {
                  title: "Liquidity event",
                  body: "After a business sale, inheritance, or large windfall, a family office provides the coordinated planning needed to deploy capital thoughtfully across structures.",
                },
                {
                  title: "Intergenerational wealth",
                  body: "Succession planning, family governance, trustee oversight, and next-generation financial education are core capabilities that a family office can deliver holistically.",
                },
                {
                  title: "Philanthropy",
                  body: "Families with structured giving programmes — private ancillary funds, charitable trusts, or foundation governance — benefit from dedicated administration and reporting.",
                },
                {
                  title: "Institutional investment access",
                  body: "Allocations to private equity, infrastructure, private credit, or direct property mandates are more accessible and better-governed inside an MFO or SFO structure.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="border border-slate-200 rounded-xl p-4 bg-white"
                >
                  <h3 className="text-sm font-extrabold text-slate-900 mb-1.5">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────────────────── */}
        <section className="py-10 md:py-14 border-b border-slate-100">
          <div className="container-custom max-w-3xl">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-8">
              Frequently asked questions
            </h2>

            <dl className="divide-y divide-slate-100">
              {FAQS.map((faq) => (
                <div key={faq.q} className="py-5">
                  <dt className="text-sm font-extrabold text-slate-900 mb-2">
                    {faq.q}
                  </dt>
                  <dd className="text-sm text-slate-600 leading-relaxed">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Specialist lead-capture CTA ────────────────────────── */}
        <HubAdvisorCTA
          heading="Find a family-office specialist"
          subheading="Tell us a little about your situation and we'll connect you with a verified specialist — no obligation, no cost."
          intent={{ need: "family-office-specialist", context: ["family office", "wealth management", "MFO", "SFO"] }}
          source="/family-office"
          ctaLabel="Get matched with a specialist"
          extraFields={[
            {
              name: "wealth_note",
              label: "Brief description of your situation (optional)",
              type: "text",
            },
          ]}
        />

        {/* ── Compliance footer ──────────────────────────────────── */}
        <section className="py-8 border-t border-slate-100 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {GENERAL_ADVICE_WARNING}
            </p>
            <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
