import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Professional } from "@/lib/types";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  SITE_URL,
} from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

const FULL_SERVICE_FAQS = [
  {
    q: "What is the difference between a full-service and discount stockbroker?",
    a: "A full-service stockbroker provides personalised investment advice — including 'should I buy this?' recommendations — under their AFSL. Discount (online) brokers execute trades but cannot provide personal advice. Full-service brokers also typically offer portfolio management, research reports, IPO allocations, and access to bonds/fixed income not available on retail platforms. The cost reflects this: full-service brokerage is typically 0.5–1% per trade (minimum $100–$200), versus $0–$30 for discount platforms. The right choice depends on whether you need advice.",
  },
  {
    q: "Are Australian stockbrokers regulated?",
    a: "Yes. All Australian stockbrokers must hold an Australian Financial Services Licence (AFSL) from ASIC, be a market participant of the ASX or Chi-X (licensed by ASIC), and comply with ASX operating rules. Advisers within broking firms must also be authorised representatives and hold RG 146 qualifications. Client money must be held in trust accounts separate from the firm's own funds. You can verify a broker's AFSL status on the ASIC MoneySmart AFSL register or our AFSL lookup tool.",
  },
  {
    q: "How do full-service brokers charge?",
    a: "Full-service brokers typically charge: (1) Transaction brokerage — 0.5–1% of trade value per buy/sell, minimum $100–$250. (2) Ongoing management fees — 0.5–1.5% p.a. of portfolio value for discretionary management. (3) Research subscription — some charge separately for research access. (4) Custody/administration fees — 0.1–0.3% p.a. for CHESS holding and statement services. (5) IPO/capital raising fees — sometimes charged for managed float participation. Most provide fee transparency via a Financial Services Guide (FSG) which they are required by law to give you before providing services.",
  },
  {
    q: "Can a full-service broker manage my portfolio for me?",
    a: "Yes. Many full-service brokers offer discretionary portfolio management — they buy and sell on your behalf without needing approval for each trade, within agreed mandates. This is subject to a formal agreement setting out the investment mandate, risk profile, and fee structure. You remain the beneficial owner and CHESS-holder of your shares. Alternatively, non-discretionary (advisory) management means the broker makes recommendations but you authorise each trade. Discretionary management suits investors who want professional management but retain ownership — unlike managed funds where you surrender individual share ownership.",
  },
];

const fullServiceFaqLd = faqJsonLd(FULL_SERVICE_FAQS);
import FullServiceBrokerCard from "@/components/full-service-brokers/FullServiceBrokerCard";
import ComplianceFooter from "@/components/ComplianceFooter";
import Icon from "@/components/Icon";
import { logger } from "@/lib/logger";

const log = logger("brokers:full-service");

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Full-Service Stockbrokers Australia (${CURRENT_YEAR}) — Compare Morgans, Ord Minnett, Shaw & More`,
  description:
    "Compare Australian full-service stockbrokers and private wealth firms: minimum portfolio, fees, specialties, and research offerings.",
  alternates: { canonical: "/brokers/full-service" },
  openGraph: {
    title: "Full-Service Stockbrokers Australia",
    description:
      "Compare full-service stockbrokers and private wealth firms by minimum portfolio, fee model and specialties.",
    url: `${SITE_URL}/brokers/full-service`,
    images: [
      {
        url: "/api/og?title=Full-Service+Stockbrokers&subtitle=Compare+Morgans%2C+Ord+Minnett%2C+Shaw+%26+more&type=advisor",
        width: 1200,
        height: 630,
        alt: "Full-Service Stockbrokers",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default async function FullServiceBrokersPage() {
  const supabase = await createClient();

  // Fetch firm-typed professionals. The same `professionals` table powers
  // /advisors/, just filtered to the firm types this surface owns.
  const { data, error } = await supabase
    .from("professionals")
    .select(
      "id, slug, name, firm_name, type, firm_type, specialties, location_state, office_states, afsl_number, bio, photo_url, fee_structure, fee_description, fee_model, minimum_investment_cents, year_founded, aum_aud_billions, status, verified, rating",
    )
    .in("type", ["stockbroker_firm", "private_wealth_manager"])
    .eq("status", "active")
    .order("verified", { ascending: false })
    .order("rating", { ascending: false })
    .limit(100);

  if (error) {
    log.error("Failed to load full-service brokers", { error: error.message });
  }

  const firms = (data as Professional[]) || [];

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Brokers", url: absoluteUrl("/brokers/full-service") },
    { name: "Full-Service Stockbrokers" },
  ]);

  // ItemList schema for SEO — each firm becomes an ordered list entry
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Full-Service Stockbrokers Australia",
    numberOfItems: firms.length,
    itemListElement: firms.slice(0, 20).map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: f.name,
      url: absoluteUrl(`/brokers/full-service/${f.slug}`),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />
      {fullServiceFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(fullServiceFaqLd) }} />
      )}

      <div className="py-6 md:py-12">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Full-Service Stockbrokers</span>
          </nav>

          {/* Hero */}
          <div className="mb-6 md:mb-10">
            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-3 tracking-tight">
              Full-Service Stockbrokers in Australia
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-3xl leading-relaxed">
              Compare Australia&apos;s full-service stockbroking firms and
              private wealth managers. Unlike DIY platforms, full-service
              firms provide research, advice and trade execution under
              one roof — typically suited to investors with $100k+ portfolios
              who want help, not just a cheap trade.
            </p>
          </div>

          {/* Bridge content: who is this for */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 md:p-5 mb-6 md:mb-8">
            <div className="flex items-start gap-3">
              <Icon name="info" size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 leading-relaxed">
                <strong className="font-bold">Not sure if a full-service broker is right for you?</strong>{" "}
                If you&apos;re investing under $50k or want to manage your
                own portfolio, a discount platform is almost certainly
                better value.{" "}
                <Link href="/compare" className="font-bold underline hover:text-amber-700">
                  Compare DIY platforms instead
                </Link>
                .
              </div>
            </div>
          </div>

          {/* Listing count */}
          <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4">
            {firms.length} {firms.length === 1 ? "Firm" : "Firms"} Available
          </h2>

          {/* Grid */}
          {firms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-8">
              {firms.map((firm) => (
                <FullServiceBrokerCard key={firm.id} firm={firm} />
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center mb-8">
              <Icon name="briefcase" size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600 mb-3">
                Our full-service stockbroker directory is being built. Check back soon, or browse our DIY platform comparison in the meantime.
              </p>
              <Link
                href="/compare"
                className="inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Compare DIY Platforms
              </Link>
            </div>
          )}

          {/* Bridge content footer: when does a full-service broker make sense */}
          <div className="border-t border-slate-100 pt-6 md:pt-8 mt-6 md:mt-10 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">
              When does a full-service stockbroker make sense?
            </h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-700 leading-relaxed">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 mb-1.5">You have $100k+</h3>
                <p>
                  Full-service fees only work out economically once you have
                  enough capital that the percentage cost is dwarfed by the
                  value of advice and access (research, IPOs, bonds).
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 mb-1.5">You want research</h3>
                <p>
                  In-house equity research, sector reports and access to
                  capital raisings (IPOs, placements) is what you&apos;re paying
                  for. Discount platforms don&apos;t provide this.
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <h3 className="font-bold text-slate-900 mb-1.5">You want advice</h3>
                <p>
                  Full-service brokers can provide personal advice under their
                  AFSL — discount platforms cannot. If you want
                  &quot;should I buy this&quot; conversations, this is the route.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ */}
          <div className="mb-6 space-y-3">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            {FULL_SERVICE_FAQS.map((faq) => (
              <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>

          {/* Cross-link to advisor vertical */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 md:p-6 mb-6">
            <h3 className="text-base md:text-lg font-bold mb-1">
              Looking for broader financial advice?
            </h3>
            <p className="text-sm text-slate-300 mb-3 leading-relaxed">
              Full-service brokers focus on equities and capital markets.
              For tax, estate, super and holistic planning, browse our
              financial advisor directory instead.
            </p>
            <Link
              href="/advisors"
              className="inline-block px-4 py-2 bg-white text-slate-900 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors"
            >
              Browse Financial Advisors →
            </Link>
          </div>

          <ComplianceFooter />
        </div>
      </div>
    </>
  );
}
