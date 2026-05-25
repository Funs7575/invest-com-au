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
import FullServiceBrokerCard from "@/components/full-service-brokers/FullServiceBrokerCard";
import ComplianceFooter from "@/components/ComplianceFooter";
import Icon from "@/components/Icon";
import { logger } from "@/lib/logger";

const log = logger("brokers:full-service");

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Full-Service Stockbrokers Australia (${CURRENT_YEAR}) — Compare Morgans, Ord Minnett, Shaw & More`,
  description:
    "Compare Australia's full-service stockbrokers and private wealth firms by minimum portfolio, fee model, specialties and research offering. The other side of the DIY platform comparison — for investors who want help.",
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

  const faqLd = faqJsonLd([
    {
      q: "What is a full-service stockbroker in Australia?",
      a: "A full-service stockbroker provides managed account services, licensed personal advice and trade execution under one roof. Unlike discount platforms, full-service firms assign you a dedicated broker who gives buy/sell recommendations, provides in-house equity research and can access IPOs and capital raisings on your behalf — all under an Australian Financial Services Licence (AFSL).",
    },
    {
      q: "How much does a full-service stockbroker cost compared to a discount broker?",
      a: "Full-service brokers in Australia typically charge 0.5%–1.5% of portfolio value per year (or per-trade commissions of 0.5%–1.1% with a minimum of $50–$200). Discount online brokers charge flat fees of $0–$30 per trade with no ongoing advice fee. The full-service premium is justified when the value of advice, research and IPO access exceeds the cost difference — generally at $250k+ portfolios.",
    },
    {
      q: "When does a full-service stockbroker make sense for an Australian investor?",
      a: "A full-service broker makes financial sense for investors with complex portfolios of $250k or more, those managing SMSFs who want equity advice integrated with their fund strategy, estate planning situations involving large share parcels, or investors who want access to pre-IPO placements and equity capital raisings not available on retail platforms.",
    },
    {
      q: "How do I check a full-service broker is properly licensed in Australia?",
      a: "All legitimate full-service stockbrokers must hold an Australian Financial Services Licence (AFSL) issued by ASIC. You can verify any firm's AFSL number on ASIC's Financial Advisers Register at moneysmart.gov.au. Every firm listed on this page displays its AFSL number — cross-check it on the register before engaging.",
    },
    {
      q: "What minimum portfolio size do full-service brokers in Australia require?",
      a: "Most full-service stockbrokers and private wealth managers in Australia require a minimum portfolio of $250,000–$500,000 to open an account. Some boutique full-service firms accept clients from $100,000 upwards, while the larger private banking divisions (e.g. JBWere, Morgan Stanley Private Wealth) typically require $1 million or more.",
    },
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
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <div className="py-6 md:py-12">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
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
