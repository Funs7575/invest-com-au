import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { TIER_PRICING } from "@/lib/sponsorship";

export const revalidate = 86400;

export const metadata = {
  title: `Ranking Methodology — How We Rate & Sort Platforms | ${SITE_NAME}`,
  description:
    "Full transparency on how Invest.com.au rates and ranks Australian investing platforms — scoring weights, sponsorship relationships, affiliate fees, and our editorial change log.",
  openGraph: {
    title: "Ranking Methodology — How We Rate & Sort Platforms",
    description:
      "Full transparency on how Invest.com.au rates and ranks Australian investing platforms — scoring weights, sponsorship relationships, affiliate fees, and our editorial change log.",
    images: [
      {
        url: "/api/og?title=Ranking+Methodology&subtitle=How+We+Rate+and+Sort+Platforms&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  alternates: { canonical: "/methodology" },
  twitter: { card: "summary_large_image" as const },
};

const SCORING_WEIGHTS = [
  {
    factor: "Editorial Rating",
    weight: "Primary sort key",
    description:
      "A 0–5 star score assigned by our editorial team based on fees, platform quality, asset coverage, safety, and user experience. Updated when material changes occur (fee changes, regulatory actions, platform upgrades). This is the dominant factor — brokers with higher ratings rank above lower-rated brokers at the same sponsorship tier.",
  },
  {
    factor: "Sponsorship Tier",
    weight: "Placement override",
    description:
      "Paid sponsors are sorted above non-sponsors and, within each tier, sorted by editorial rating. Tier order: Featured Partner (1st priority), Editor's Pick (2nd), Deal of the Month (3rd). Non-sponsors follow in pure rating order. See the Sponsorship section below for exact commercial terms.",
  },
  {
    factor: "Goal Relevance Filter",
    weight: "Eligibility gate",
    description:
      "When you answer the quiz, we gate sponsorship boosts by goal relevance — a sponsored share broker cannot be boosted above a super fund when your stated goal is 'super'. Goal mapping: crypto → crypto exchanges only; super → super funds + SMSF-capable; property → property platforms; trade → share brokers + CFD/forex; automate → robo-advisors.",
  },
  {
    factor: "Country Eligibility",
    weight: "Exclusion filter",
    description:
      "Brokers that explicitly block or do not support your detected country are hidden. Detection uses your browser's accept-language header and a first-party country cookie (iv_intent_country). This is a hard exclusion, not a ranking penalty.",
  },
];

const EDITORIAL_LOG = [
  {
    date: "2026-05-11",
    change: "Added ?raw=1 URL parameter to all /best/* comparison pages",
    reason:
      "Transparency. Lets users view pure editorial-rating order without any sponsorship placement. Accessible via the 'Show unsponsored order' link in the disclosure block on every comparison page.",
  },
  {
    date: "2026-05-11",
    change: "Added goal-relevance gate to quiz sponsor boost",
    reason:
      "Relevance. Previously a sponsored share broker could be boosted above a super fund even when the user's quiz goal was 'super'. The gate restricts boosts to vertically-applicable sponsors only.",
  },
  {
    date: "2026-04-26",
    change: "Introduced sponsored_boosting feature flag with 30 s TTL kill switch",
    reason:
      "Operational safety. Allows the editorial team to disable all sponsorship placement influence within 30 seconds (flag checked async, cached 30 s) without taking comparison pages offline — used in compliance incidents or RLS audit events.",
  },
  {
    date: "2026-04-24",
    change: "Formalised three-tier sponsorship structure (featured_partner, editors_pick, deal_of_month)",
    reason:
      "Commercial structure. Replaced ad-hoc placement with a documented tiered model with published monthly pricing and explicit audit-logged policy documents.",
  },
];

const DATA_FIELDS = [
  {
    name: "Fees & Costs",
    description:
      "ASX brokerage, US brokerage, FX markup, inactivity fees, account fees, and any other disclosed charges.",
    details: [
      { label: "Low", range: "$0–$5 per trade" },
      { label: "Medium", range: "$5–$15 per trade" },
      { label: "High", range: "$15+ per trade" },
    ],
  },
  {
    name: "Platform & Features",
    description:
      "Available order types, charting tools, mobile app availability, research tools, and educational resources.",
    details: null,
  },
  {
    name: "Safety & Regulation",
    description:
      "CHESS sponsorship (shares held in your name on ASX subregister vs custodial model), ASIC regulation status, client fund segregation.",
    details: null,
  },
  {
    name: "Product Range",
    description:
      "ASX shares, US/international shares, ETFs, options, crypto, managed funds, and SMSF support availability.",
    details: null,
  },
  {
    name: "Account Details",
    description:
      "Minimum deposit requirements, account opening process, supported funding methods, and customer support channels.",
    details: null,
  },
  {
    name: "Additional Features",
    description:
      "Fractional shares, dividend reinvestment plans (DRP), auto-invest options, and current sign-up offers.",
    details: null,
  },
];

export default function MethodologyPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Methodology" },
  ]);

  const featuredPartnerPrice = TIER_PRICING["featured_partner"]?.monthly ?? 1500;
  const editorPickPrice = TIER_PRICING["editors_pick"]?.monthly ?? 800;
  const dealPrice = TIER_PRICING["deal_of_month"]?.monthly ?? 2000;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="py-5 md:py-12">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            {/* Breadcrumb */}
            <nav className="text-sm text-slate-500 mb-6">
              <Link href="/" className="hover:text-brand">Home</Link>
              <span className="mx-2">/</span>
              <span className="text-brand">Methodology</span>
            </nav>

            {/* Hero */}
            <section className="mb-10">
              <h1 className="text-2xl md:text-4xl font-extrabold mb-4">
                Ranking Methodology
              </h1>
              <p className="text-lg text-slate-600 leading-relaxed mb-3">
                {SITE_NAME} rates and ranks Australian investing platforms using a
                transparent, documented formula. This page publishes every factor,
                every commercial relationship, and every change to our editorial
                policy — so you can weigh our rankings against your own judgment.
              </p>
              <p className="text-sm text-slate-500 leading-relaxed">
                These rankings are general comparison information only and do not
                constitute personal financial advice. See our{" "}
                <Link href="/how-we-verify" className="text-brand underline">
                  verification process
                </Link>{" "}
                and{" "}
                <Link href="/how-we-earn" className="text-brand underline">
                  how we earn
                </Link>{" "}
                for related disclosures.
              </p>
            </section>

            {/* Ranking algorithm */}
            <section className="mb-10">
              <h2 className="text-xl md:text-2xl font-extrabold text-brand mb-4">
                How Rankings Work
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Rankings are computed in two stages: (1) an editorial rating assigns a
                quality score to each broker; (2) a placement layer allows paid sponsors
                to appear before non-sponsors within the same quality band. You can
                bypass stage 2 at any time using the{" "}
                <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">?raw=1</span>{" "}
                parameter (see the &ldquo;Show unsponsored order&rdquo; link on any comparison page).
              </p>
              <div className="space-y-3">
                {SCORING_WEIGHTS.map((w) => (
                  <div
                    key={w.factor}
                    className="border border-slate-200 rounded-xl p-5 bg-white"
                  >
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="font-bold text-slate-900">{w.factor}</h3>
                      <span className="shrink-0 text-xs bg-brand/10 text-brand font-semibold px-2 py-0.5 rounded-full">
                        {w.weight}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{w.description}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Sponsorship and commercial relationships */}
            <section className="mb-10">
              <h2 className="text-xl md:text-2xl font-extrabold text-brand mb-4">
                Sponsorship &amp; Commercial Relationships
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Brokers can pay for guaranteed placement positions. Sponsored positions
                are always clearly labelled with a badge. Here are the published monthly
                rates:
              </p>
              <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Tier</th>
                      <th className="text-left px-4 py-3 font-semibold">Placement effect</th>
                      <th className="text-right px-4 py-3 font-semibold">Monthly (AUD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3 font-medium">Featured Partner</td>
                      <td className="px-4 py-3 text-slate-600">Top position sitewide — all comparison pages, quiz results, category listings</td>
                      <td className="px-4 py-3 text-right font-semibold">${featuredPartnerPrice.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">Editor&apos;s Pick</td>
                      <td className="px-4 py-3 text-slate-600">Second-tier placement — above non-sponsors, below Featured Partner</td>
                      <td className="px-4 py-3 text-right font-semibold">${editorPickPrice.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">Deal of the Month</td>
                      <td className="px-4 py-3 text-slate-600">Third-tier placement — highlighted current offer, above non-sponsors</td>
                      <td className="px-4 py-3 text-right font-semibold">${dealPrice.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-500">No sponsorship</td>
                      <td className="px-4 py-3 text-slate-600">Pure editorial rating order</td>
                      <td className="px-4 py-3 text-right text-slate-500">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500">
                Sponsored placement is a paid commercial arrangement and does not
                indicate editorial endorsement. Our editors assign ratings
                independently of sponsorship status. A sponsored broker with a low
                editorial rating will still rank below a non-sponsored broker with a
                high editorial rating within the same comparison page.
              </p>
            </section>

            {/* Affiliate / referral fees */}
            <section className="mb-10">
              <h2 className="text-xl md:text-2xl font-extrabold text-brand mb-4">
                Referral &amp; Affiliate Fees
              </h2>
              <p className="text-sm text-slate-600 mb-3">
                When you click a &ldquo;Visit site&rdquo; or &ldquo;Open account&rdquo; button and
                subsequently open an account, we may receive a referral fee from the
                provider. Key facts:
              </p>
              <ul className="space-y-2 text-sm text-slate-600 mb-3">
                <li className="flex items-start gap-2">
                  <span className="text-brand font-bold shrink-0">•</span>
                  Referral fees do <strong>not</strong> affect editorial ratings — the rating is
                  assigned before any commercial relationship is established.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand font-bold shrink-0">•</span>
                  Brokers without a referral agreement appear with an informational
                  CTA (&ldquo;Learn more&rdquo;) rather than an action CTA (&ldquo;Open account&rdquo;).
                  This is visible in the UI and documented in our source code.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand font-bold shrink-0">•</span>
                  All outbound referral links carry{" "}
                  <span className="font-mono text-xs bg-slate-100 px-1 rounded">rel=&quot;nofollow sponsored&quot;</span>{" "}
                  per Google&apos;s link attribute guidelines.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-brand font-bold shrink-0">•</span>
                  The presence or absence of an affiliate agreement does not alter which
                  brokers are listed — we list all ASIC-regulated brokers we are aware
                  of, regardless of commercial relationship.
                </li>
              </ul>
              <p className="text-xs text-slate-500">
                Specific referral rates are commercially confidential. Revenue
                composition by partner (in buckets, not exact figures) will be
                published on the{" "}
                <Link href="/methodology#independence" className="underline">
                  independence dashboard
                </Link>{" "}
                when it launches (CMP-TR-04 — planned Q3 2026).
              </p>
            </section>

            {/* Editorial change log */}
            <section className="mb-10" id="changelog">
              <h2 className="text-xl md:text-2xl font-extrabold text-brand mb-2">
                Editorial Policy Changelog
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                Every change to our ranking algorithm or editorial policy is logged
                here. Older entries are in our{" "}
                <Link href="https://github.com/funs7575/invest-com-au" className="underline" target="_blank" rel="noopener noreferrer">
                  public git history
                </Link>
                .
              </p>
              <div className="space-y-3">
                {EDITORIAL_LOG.map((entry) => (
                  <div
                    key={entry.date + entry.change}
                    className="border border-slate-200 rounded-xl p-4 bg-white"
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-xs text-slate-400 shrink-0">
                        {entry.date}
                      </span>
                      <h3 className="font-semibold text-slate-900 text-sm">
                        {entry.change}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 pl-[5.5rem]">
                      <strong>Reason:</strong> {entry.reason}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Data fields collected */}
            <section className="mb-10">
              <h2 className="text-xl md:text-2xl font-extrabold text-brand mb-4">
                Data We Collect
              </h2>
              <div className="space-y-3">
                {DATA_FIELDS.map((cat) => (
                  <div
                    key={cat.name}
                    className="border border-slate-200 rounded-xl p-5 bg-white"
                  >
                    <h3 className="font-bold text-slate-900 mb-1">{cat.name}</h3>
                    <p className="text-sm text-slate-600">{cat.description}</p>
                    {cat.details && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {cat.details.map((d) => (
                          <span
                            key={d.label}
                            className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 rounded-full px-3 py-1"
                          >
                            <span className="font-semibold">{d.label}:</span>
                            {d.range}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Data verification */}
            <section className="mb-10">
              <h2 className="text-xl md:text-2xl font-extrabold text-brand mb-3">
                Data Verification
              </h2>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-sm text-slate-700 space-y-3">
                <p>We collect factual data from:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Provider websites and published pricing pages</li>
                  <li>Product Disclosure Statements (PDS) and Target Market Determinations (TMD)</li>
                  <li>ASIC Professional Registers and AFSL registers</li>
                  <li>ASX public data (including CHESS participant lists)</li>
                  <li>ATO and AUSTRAC public registers where relevant</li>
                </ul>
                <p>
                  Fee data is manually verified on a <strong>monthly basis</strong> against
                  each broker&apos;s published pricing page and PDS. When a provider notifies
                  us of a fee change, we update within 5 business days.
                </p>
              </div>
            </section>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Link
                href="/how-we-verify"
                className="inline-block px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors text-sm"
              >
                How we verify fee data &rarr;
              </Link>
              <Link
                href="/how-we-earn"
                className="inline-block px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                How we earn revenue &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
