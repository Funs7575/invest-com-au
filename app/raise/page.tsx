import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { PATHWAYS, PATHWAY_IDS } from "@/lib/raise/pathways";
import { CAPITAL_RAISING_NOTE, GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "How to Raise Capital for a Business in Australia: Every Pathway Compared | Invest.com.au",
  description:
    "The seven ways Australian businesses raise capital — grants, debt, equity crowdfunding, angels, VC, bootstrapping and sale — compared on eligibility, cost, speed and dilution.",
  alternates: { canonical: `${SITE_URL}/raise` },
  openGraph: {
    title: "How to Raise Capital for a Business in Australia: Every Pathway Compared",
    description:
      "Grants, debt, equity crowdfunding, angels, VC, bootstrapping and sale — eligibility, cost, speed and dilution, compared honestly.",
    url: `${SITE_URL}/raise`,
    type: "website",
    images: [
      {
        url: `/api/og?title=${encodeURIComponent("Raise Capital in Australia")}&sub=${encodeURIComponent("7 funding pathways compared — eligibility, cost, speed, dilution")}`,
        width: 1200,
        height: 630,
      },
    ],
  },
};

const HUB_FAQS = [
  {
    q: "What's the cheapest way for an Australian business to raise capital?",
    a:
      "Government grants and incentives — they're non-dilutive and repayment-free. The R&D Tax Incentive alone refunds 43.5% of eligible R&D spend for companies under $20M turnover. After grants: customer revenue (bootstrapping), then debt, then equity — equity is the most expensive capital because you sell a share of every future dollar.",
  },
  {
    q: "How much can a company raise through equity crowdfunding in Australia?",
    a:
      "Up to $5M in any 12-month period, from the public, in exchange for fully paid ordinary shares — but only via an ASIC-licensed CSF intermediary platform, and only for eligible companies under $25M in both gross assets and annual revenue.",
  },
  {
    q: "Can I advertise my capital raise publicly?",
    a:
      "Only through the regulated channels. CSF offers are publicised via the licensed platform hosting them, under strict advertising rules. Private (non-CSF) offers rely on exemptions that prohibit public advertising — they spread through genuine networks, wholesale investors and licensed intermediaries.",
  },
  {
    q: "Do I need to give up equity to fund my business?",
    a:
      "No. Grants, debt finance and revenue-funded growth all raise capital with zero dilution. Equity pathways (crowdfunding, angels, VC) trade ownership for capital plus backers — the right answer depends on your growth rate, risk and goals.",
  },
];

export default function RaiseHubPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Raise", url: absoluteUrl("/raise") },
  ]);
  const faqSchema = faqJsonLd(HUB_FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-12 md:py-16">
          <div className="container-custom max-w-4xl">
            <p className="text-xs uppercase tracking-wider font-extrabold text-amber-400 mb-2">
              Business funding hub
            </p>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
              How to raise capital for a business in Australia
            </h1>
            {/* Answer-first intro (GEO) */}
            <p className="text-slate-200 leading-relaxed max-w-3xl border-l-4 border-amber-400 pl-4 mb-6">
              Australian businesses raise capital through seven pathways: government grants
              (non-dilutive), business debt, equity crowdfunding (up to $5M/yr via licensed
              platforms), angel investors, venture capital, revenue-funded bootstrapping — or by
              selling some or all of the business. The right one depends on your structure,
              stage, revenue, timeline and how you feel about selling equity.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/raise/pathway-finder"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-extrabold px-5 py-3"
              >
                Find your funding pathway <Icon name="arrow-right" size={16} aria-hidden />
              </Link>
              <Link
                href="/grants/eligibility-quiz"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 hover:border-amber-400 text-white font-bold px-5 py-3"
              >
                Check grant eligibility
              </Link>
            </div>
          </div>
        </section>

        <section className="py-12 bg-slate-50">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1">The seven pathways</h2>
            <p className="text-sm text-slate-600 mb-6">
              Every option, honestly — including the trade-offs.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PATHWAY_IDS.map((id) => {
                const p = PATHWAYS[id];
                return (
                  <Link
                    key={id}
                    href={`/raise/${p.guideSlug}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-amber-300 hover:shadow transition-all flex flex-col"
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <Icon name={p.icon} size={17} aria-hidden />
                      </span>
                      <h3 className="font-extrabold text-slate-900 group-hover:text-amber-700">
                        {p.label}
                      </h3>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed mb-3 flex-1">{p.definition}</p>
                    <p className="text-xs text-slate-600 mb-3">
                      <span className="font-extrabold">Typical:</span> {p.typicalAmounts}
                    </p>
                    <span className="text-sm font-bold text-amber-600 inline-flex items-center gap-1">
                      Read the guide <Icon name="arrow-right" size={13} aria-hidden />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container-custom max-w-3xl">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-4">
              Common questions about raising capital
            </h2>
            <div className="space-y-4 mb-8">
              {HUB_FAQS.map((f) => (
                <div key={f.q} className="rounded-xl border border-slate-200 p-4">
                  <h3 className="font-extrabold text-slate-900 text-sm mb-1">{f.q}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-slate-900 text-white p-6 mb-8">
              <h2 className="text-lg font-extrabold mb-1">Get raise-ready with a specialist</h2>
              <p className="text-sm text-slate-300 mb-4">
                Accountants and advisers experienced in business funding can pressure-test your
                pathway, clean up structure and financials, and sequence the next 90 days.
              </p>
              <Link
                href="/find-advisor?specialty=Tax"
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-extrabold px-4 py-2.5"
              >
                Find a specialist <Icon name="arrow-right" size={14} aria-hidden />
              </Link>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-600 leading-relaxed">{CAPITAL_RAISING_NOTE}</p>
              <p className="text-xs text-slate-600 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
