import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

const SIV_FAQS = [
  {
    q: "What is the Australian Significant Investor Visa (SIV)?",
    a: "The Significant Investor Visa (subclass 188C, then 888C for permanent residence) allows non-Australian citizens to live and work in Australia by investing $5 million in complying investments. The $5M must be held in a FIRB-approved mix: at least $500,000 in venture capital or private equity funds (investing in start-ups/small privates); at least $1.5M in eligible managed funds or direct investments into emerging companies listed on ASX; the remaining balance (up to $3M) in balancing investments (managed funds investing in ASX companies, or direct investments). Holders can apply for permanent residence (888C) after 4 years maintaining complying investments.",
  },
  {
    q: "Was the SIV replaced — is it still available?",
    a: "The original SIV (188C/888C) was closed to new applicants in July 2023 by the Albanese government following a review that found limited economic benefit relative to the public resources consumed. The Global Talent Independent (GTI) program still offers a pathway for high-calibre individuals. HNWI investors should now consider the Business Innovation and Investment Program (BIIP) visas (subclasses 188 and 888 streams) or the National Innovation visa (NIV) for founders/investors. Several states including Victoria and New South Wales have separate investor-focused state-nominated programs. Existing SIV holders are not affected — their conditions remain as granted.",
  },
  {
    q: "What did the SIV complying investment framework require?",
    a: "The SIV required A$5M in complying managed investments maintained for the period of the visa: (1) Venture capital/private equity tranche: minimum $500,000 in VCPE funds managed by AFSL-holders registered with Innovation Australia, investing in Australian start-ups and early-stage companies. (2) Emerging companies tranche: minimum $1.5M in eligible managed funds investing in ASX-listed companies with <$500M market cap, or direct investments in such companies. (3) Balancing investments: the remaining balance in ASIC-regulated managed funds investing in ASX companies, or direct ASX investments. Annual auditing by an approved auditor was required to confirm compliant holding.",
  },
  {
    q: "Which countries sent the most SIV applications to Australia?",
    a: "China was by far the largest source country, accounting for approximately 85% of all SIV applications from program commencement to 2023. Hong Kong, Singapore, Malaysia, and Vietnam were also notable source countries. The program was heavily skewed toward Greater China HNWI investors. UK, US, and European investors rarely used the SIV pathway due to domestic investment returns and lifestyle preferences. The geographic concentration (China dominance) was one factor cited in the Albanese government's closure decision, alongside concerns about the complying investment framework's economic multiplier effect.",
  },
];

const sivFaqLd = faqJsonLd(SIV_FAQS);
import { createClient } from "@/lib/supabase/server";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER } from "@/lib/compliance";
import ForeignInvestmentNav from "../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";
import Icon from "@/components/Icon";
import RegisterInterestForm from "@/components/funds/RegisterInterestForm";
import type { FundListing } from "@/app/invest/funds/FundsDirectoryClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Significant Investor Visa (SIV) Australia ${CURRENT_YEAR} — FIRB, Complying Funds & Country Guides`,
  description:
    "Australian SIV (subclass 188C): $5M complying investment, FIRB rules, and country-specific guidance for Singapore, Hong Kong, China and UK investors.",
  alternates: {
    canonical: `${SITE_URL}/foreign-investment/siv`,
    languages: {
      "en-AU": `${SITE_URL}/foreign-investment/siv`,
      "zh-CN": `${SITE_URL}/zh/foreign-investment/siv`,
      "ko-KR": `${SITE_URL}/ko/foreign-investment/siv`,
      "x-default": `${SITE_URL}/foreign-investment/siv`,
    },
  },
  openGraph: {
    title: `Significant Investor Visa Australia (${CURRENT_YEAR})`,
    description:
      "$5M Australian SIV pathway — complying investments, FIRB, country guides, immigration investment lawyers.",
    url: `${SITE_URL}/foreign-investment/siv`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Significant Investor Visa (SIV) Australia")}&sub=${encodeURIComponent("5M AUD · Visa 188C · Complying Investments · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

async function fetchSivFunds(): Promise<FundListing[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("fund_listings")
      .select(
        "id, title, slug, fund_type, manager_name, description, min_investment_cents, target_return_percent, fund_size_cents, open_to_retail, siv_complying, firb_relevant, featured, featured_tier, status",
      )
      .eq("siv_complying", true)
      .eq("status", "active")
      .limit(6);
    return (data as FundListing[] | null) || [];
  } catch {
    return [];
  }
}

const COMPLYING_ALLOCATIONS = [
  {
    name: "Managed funds — growth",
    share: "At least 40%",
    detail:
      "Complying funds investing in ASX listed equities, emerging companies, or other approved growth categories. Must be managed under an AFSL.",
  },
  {
    name: "Emerging companies (VC & growth PE)",
    share: "At least 10%",
    detail:
      "VC and growth PE funds registered as complying under the SIV regulations. This allocation is designed to support Australian startup capital formation.",
  },
  {
    name: "Balancing investments",
    share: "Up to 50%",
    detail:
      "Combination of complying listed assets, ASX shares, corporate bonds, or direct commercial property meeting the balancing-investment criteria.",
  },
];

const COUNTRY_GUIDES = [
  {
    name: "Singapore",
    code: "SG",
    href: "/foreign-investment/singapore",
    context:
      "Most common SIV source country by volume. Strong DTA with Australia (15% withholding on unfranked dividends, 10% on interest). Common structures: Singapore Pte Ltd holding co + family trust.",
  },
  {
    name: "Hong Kong",
    code: "HK",
    href: "/foreign-investment/hong-kong",
    context:
      "Significant SIV source. Hong Kong-Australia DTA in force. Declaring investments to HK Inland Revenue if you remain tax-resident is complex — engage both-jurisdiction tax advisers.",
  },
  {
    name: "China (PRC)",
    code: "CN",
    href: "/foreign-investment/china",
    context:
      "Faces heightened scrutiny post-2023. FIRB and national-security review apply to most sensitive-sector assets. Capital-control compliance (SAFE approval) can extend investment timelines.",
  },
  {
    name: "United Kingdom",
    code: "UK",
    href: "/foreign-investment/united-kingdom",
    context:
      "Strong DTA relationship. UK residents typically structure via a UK-resident holding entity with Australian-side managed-fund investments for efficiency.",
  },
];

export default async function SivPage() {
  const sivFunds = await fetchSivFunds();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    { name: "Significant Investor Visa" },
  ]);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {sivFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(sivFaqLd) }} />
      )}
      <ForeignInvestmentNav current="/foreign-investment/siv" />

      {/* Hero */}
      <section className="bg-slate-900 text-white py-10 md:py-14">
        <div className="container-custom">
          <nav
            className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-white">
              Home
            </Link>
            <span className="text-slate-600">/</span>
            <Link href="/foreign-investment" className="hover:text-white">
              Foreign Investment
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-white font-medium">SIV</span>
          </nav>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
            Significant Investor Visa (SIV) Australia
          </h1>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
            The Significant Investor Visa (subclass 188C) requires a $5M
            complying investment across managed funds, emerging companies,
            and balancing investments. This guide covers the complying
            allocation, FIRB interaction, country-specific context for
            Singapore, Hong Kong, China and the UK, and how to connect with
            specialist immigration investment lawyers.
          </p>
        </div>
      </section>

      {/* Compliance banner — important up-front */}
      <section className="bg-amber-50 border-b border-amber-200 py-4">
        <div className="container-custom max-w-4xl">
          <p className="text-xs text-amber-900 leading-relaxed">
            <strong>Important:</strong> Invest.com.au is not a migration agent
            and does not provide immigration advice. Only MARA-registered
            migration agents can provide personal immigration assistance in
            Australia. This page is general information only. Engage a
            MARA-registered agent and an AFSL-authorised investment adviser
            before acting.
          </p>
        </div>
      </section>

      {/* Body + sticky lead form */}
      <section className="py-10 md:py-12">
        <div className="container-custom grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* SIV Overview */}
            <article>
              <SectionHeading
                eyebrow="01 · Overview"
                title="What is the Significant Investor Visa?"
                sub="A provisional pathway to permanent residency for investors willing to place $5M into complying Australian investments."
              />
              <div className="prose prose-slate max-w-none text-sm md:text-base">
                <p>
                  The Significant Investor Visa (SIV, subclass 188C under the
                  Business Innovation and Investment stream) is an Australian
                  provisional visa requiring $5 million AUD in complying
                  investments across three prescribed categories. It is a
                  4-year provisional visa with a pathway to the subclass 888
                  permanent visa provided the investment is maintained.
                </p>
                <p>
                  The SIV was introduced to attract high-net-worth migrants
                  while directing capital into sectors the Australian
                  government considered priorities — emerging companies, VC,
                  growth PE, and managed funds. The program has been reviewed
                  periodically; the complying-investment categories and
                  threshold allocations have changed several times since
                  inception.
                </p>
              </div>
            </article>

            {/* Complying allocation */}
            <article>
              <SectionHeading
                eyebrow="02 · The $5M breakdown"
                title="Complying investment categories"
                sub="The $5M must be allocated across three defined categories. Allocations within the ranges can be flexed with advisor support."
              />
              <div className="space-y-3">
                {COMPLYING_ALLOCATIONS.map((a) => (
                  <div
                    key={a.name}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-5"
                  >
                    <div className="flex items-baseline justify-between gap-3 mb-1">
                      <h3 className="text-base font-extrabold text-slate-900">
                        {a.name}
                      </h3>
                      <span className="text-sm font-bold text-amber-600 shrink-0">
                        {a.share}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      {a.detail}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-3">
                Complying investment categories and percentages are set by
                the Department of Home Affairs and updated periodically.
                Verify current allocation rules with a MARA-registered
                migration agent or an immigration investment lawyer before
                structuring.
              </p>
            </article>

            {/* FIRB */}
            <article>
              <SectionHeading
                eyebrow="03 · FIRB interaction"
                title="How FIRB applies to SIV investments"
                sub="Foreign investment review and SIV compliance are separate frameworks — both apply in parallel."
              />
              <div className="prose prose-slate max-w-none text-sm md:text-base">
                <p>
                  SIV complying investments are typically held via managed
                  funds — investing through AFSL-licensed fund managers
                  structured to accept sophisticated-investor capital. These
                  fund-level investments usually do not trigger FIRB
                  notification for the individual investor because the holdings
                  are below the 10% substantial-interest threshold in any
                  single company.
                </p>
                <p>
                  Direct investments — particularly in real property
                  (residential, commercial, agricultural) or in &gt;10% stakes
                  in Australian companies — do trigger FIRB. If your SIV
                  strategy includes a direct property or direct private-company
                  investment, FIRB applies alongside the SIV compliance
                  regime. Your immigration investment lawyer should coordinate
                  both applications.
                </p>
              </div>
              <div className="mt-4">
                <Link
                  href="/firb-fee-estimator"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:underline"
                >
                  Estimate FIRB application fees
                  <Icon name="arrow-right" size={14} />
                </Link>
              </div>
            </article>

            {/* SIV-complying fund highlights */}
            <article>
              <SectionHeading
                eyebrow="04 · Complying funds"
                title="SIV-complying funds in our directory"
                sub="A selection from our broader fund directory flagged as potentially SIV-complying. Always confirm current eligibility with the fund manager and your lawyer."
              />
              {sivFunds.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No SIV-complying funds currently in directory — check back
                  soon, or register interest in the sidebar for a curated
                  shortlist.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sivFunds.map((f) => (
                    <Link
                      key={f.id}
                      href={`/invest/funds/${f.slug}`}
                      className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 transition-colors"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                        SIV Complying
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 leading-tight mt-1 mb-1 line-clamp-2">
                        {f.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {f.manager_name ?? "AFSL-licensed manager"}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Link
                  href="/invest/funds?siv=true"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 hover:underline"
                >
                  Browse all SIV-complying funds
                  <Icon name="arrow-right" size={14} />
                </Link>
              </div>
            </article>

            {/* Immigration investment lawyers */}
            <article>
              <SectionHeading
                eyebrow="05 · Specialist advisers"
                title="Find an immigration investment lawyer"
                sub="These lawyers combine migration-law expertise with investment-structuring experience — a narrow specialty."
              />
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                  Immigration investment lawyers coordinate the visa
                  application with the investment structuring, ensuring that
                  the $5M is deployed into compliant fund structures and that
                  the investor meets health and character requirements for
                  the provisional visa.
                </p>
                <Link
                  href="/advisors/immigration-investment-lawyers"
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg"
                >
                  Browse specialist lawyers
                  <Icon name="arrow-right" size={14} />
                </Link>
              </div>
            </article>

            {/* Country guides */}
            <article>
              <SectionHeading
                eyebrow="06 · Country guides"
                title="Country-specific context"
                sub="Local tax, currency, and structuring considerations vary meaningfully by source country."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COUNTRY_GUIDES.map((c) => (
                  <Link
                    key={c.code}
                    href={c.href}
                    className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <h3 className="text-base font-extrabold text-slate-900">
                        {c.name}
                      </h3>
                      <span className="text-[11px] font-bold text-slate-500">
                        {c.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {c.context}
                    </p>
                  </Link>
                ))}
              </div>
            </article>

            {/* Disclaimer */}
            <article className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-700 mb-2">
                Compliance disclaimer
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {FOREIGN_INVESTOR_GENERAL_DISCLAIMER}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                We are not migration agents. Immigration advice in Australia
                is a regulated activity — only MARA-registered agents and
                licensed legal practitioners can provide personal
                immigration advice. Financial product advice on complying
                investments requires an AFSL. Engage both before acting.
              </p>
            </article>
          </div>

          {/* FAQ */}
          <div className="mt-8 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            {SIV_FAQS.map((faq) => (
              <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>

          {/* Lead form */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <RegisterInterestForm
              defaultInvestorType="foreign"
              submitLabel="Get the free SIV guide"
              heading="Free SIV investment guide"
              hideAmountRange={false}
            />
            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
              Submit to receive our editorial SIV investor guide and be
              connected (with your consent) to a MARA-registered migration
              agent and an AFSL-authorised adviser.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
