import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";

export const metadata: Metadata = {
  title: `Digital Infrastructure Investment in Australia (${CURRENT_YEAR})`,
  description:
    "Invest in Australian data centres, fibre, subsea cables and AI compute. Compare ASX-listed pure-plays (NEXTDC, Macquarie Technology) with institutional placements (AirTrunk, Equinix) — yields, structures, FIRB and how to invest.",
  alternates: { canonical: `${SITE_URL}/invest/digital-infrastructure` },
  openGraph: {
    title: `Digital Infrastructure Investment in Australia (${CURRENT_YEAR})`,
    description:
      "Data centres, fibre, subsea cables, AI compute, towers. ASX-listed and institutional opportunities for Australian investors.",
    url: `${SITE_URL}/invest/digital-infrastructure`,
    images: [
      {
        url: "/api/og?title=Digital+Infrastructure&subtitle=Data+Centres,+Fibre+%26+AI+Compute&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export const revalidate = 3600;

export default async function DigitalInfrastructurePage() {
  const supabase = await createClient();

  const { data: listings } = await supabase
    .from("investment_listings")
    .select("slug, title, description, location_state, price_display, sub_category, listing_type, key_metrics")
    .eq("vertical", "digital-infrastructure")
    .eq("status", "active")
    .order("listing_type", { ascending: false })
    .limit(12);

  const { data: advisors } = await supabase
    .from("professionals")
    .select("slug, name, firm_name, type, location_display, rating, review_count, photo_url, verified")
    .eq("status", "active")
    .in("type", ["financial_planner", "wealth_manager", "foreign_investment_lawyer"])
    .order("verified", { ascending: false })
    .order("rating", { ascending: false })
    .limit(4);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "Digital Infrastructure" },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Digital Infrastructure Investment in Australia (${CURRENT_YEAR})`,
    url: `${SITE_URL}/invest/digital-infrastructure`,
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What counts as digital infrastructure?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Digital infrastructure covers the physical assets that move and process data: data centres (hyperscale, retail colocation, edge), fibre and metro networks, subsea cables, mobile and 5G/6G tower portfolios, and AI-compute clusters (GPU facilities). It is distinct from public/civil infrastructure (toll roads, airports, utilities) which sits under our separate Infrastructure vertical.",
        },
      },
      {
        "@type": "Question",
        name: "How can I invest in Australian data centres?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Three main pathways. (1) ASX-listed pure-plays — NEXTDC (NXT) is the largest, Macquarie Technology Group (MAQ) the next-largest. (2) ASX-listed indirect — Goodman Group (GMG) is repositioning industrial sites into a ~5GW data-centre development pipeline; Telstra (TLS) holds a 51% stake in InfraCo Towers. (3) Institutional / wholesale — AirTrunk (Blackstone-owned post-2024), Equinix Capital, NEXTDC capacity placements. Wholesale typically requires a sophisticated-investor certificate (s708) and AUD$500k+ minimum.",
        },
      },
      {
        "@type": "Question",
        name: "Why is digital infrastructure growing so fast in Australia?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Three converging demand drivers. (a) Hyperscaler buildout — AWS, Azure, Google and Oracle are all expanding AU regions, anchored on long-term leases. (b) AI training and inference compute — H100/H200 GPU clusters need scaled power, cooling and bandwidth not available in legacy facilities. (c) Sovereign-cloud and data-residency requirements — federal and state governments are mandating onshore processing for sensitive workloads. The AirTrunk sale to Blackstone for AUD$24B in 2024 is the marquee transaction; secondary sales continue at compressed cap rates.",
        },
      },
      {
        "@type": "Question",
        name: "What returns should I expect from digital infrastructure investments?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Returns vary widely by structure. ASX-listed pure-plays trade on EV/EBITDA growth (NEXTDC has historically returned ~15-25% p.a. in growth phases, with no dividend — capex absorbs cash). Institutional hyperscale operating assets target 8-12% IRR on long hold. Wholesale co-investment in new builds targets 12-18% IRR with construction/lease-up risk. Private-credit financing of fibre rollouts targets 7-9% yield with quarterly distributions. AI-compute Series B/C rounds are venture-shaped — high variance, 3-10x return distribution.",
        },
      },
      {
        "@type": "Question",
        name: "Can a SMSF invest in digital infrastructure?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, via several routes. ASX-listed exposures (NXT, MAQ, GMG, TLS) are SMSF-eligible with no wholesale gating. Listed Real-Estate Investment Trusts and infrastructure ETFs holding data-centre assets are SMSF-eligible. Wholesale placements (AirTrunk co-invest, fibre private credit) require the SMSF to qualify as a wholesale client — typically by holding net assets ≥AUD$2.5M or earning ≥AUD$250k for two consecutive years. The SMSF's investment strategy must explicitly include the asset class, and the trustee must document that the investment satisfies the sole-purpose test.",
        },
      },
      {
        "@type": "Question",
        name: "Is digital infrastructure subject to FIRB?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes — particularly for foreign investors. Data centres, fibre and tower assets are designated sensitive infrastructure under the Foreign Investment Review Board's national security framework. Any acquisition by a foreign government investor (FGI) requires FIRB approval regardless of value. Acquisitions by foreign private investors of significant interests in critical infrastructure (broadly: data centres handling government workloads, telco fibre/tower assets, subsea cables) trigger lower FIRB monetary thresholds. The Critical Infrastructure Risk Management Programme (CIRMP) under the SOCI Act also imposes ongoing security-of-critical-infrastructure obligations on operators.",
        },
      },
      {
        "@type": "Question",
        name: "What are the main risks?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Power and grid risk — large new builds require multi-year grid connection studies and may face curtailment in constrained network segments (Sydney North-Shore, Melbourne West). Customer concentration — hyperscaler anchor leases are long but renegotiation risk is real if a customer pulls capacity. Technology obsolescence — GPU cluster economics turn on the silicon roadmap (H100 vs H200 vs B100); facilities designed for one generation may not fit the next. Capital-intensity — rolling capex eats cash flow during growth, so listed pure-plays often run on debt and equity-issuance cycles. Regulatory — SOCI Act compliance and data-residency rules add operational overhead.",
        },
      },
      {
        "@type": "Question",
        name: "Who are the main Australian players?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Operating data centres: NEXTDC, Macquarie Technology Group, AirTrunk, Equinix Australia, Global Switch, DCI Data Centres, Canberra Data Centres, Vault. Fibre: Telstra, Vocus, Optus, Aussie Broadband, Superloop, TPG. Towers: Telstra InfraCo Towers, Optus Tower, ATC Towers Australia (American Tower). AI compute: smaller operators emerging — pure-play sovereign AI cluster operators are mostly venture-stage. Infrastructure investors active in the space: Macquarie Asset Management, IFM Investors, Future Fund, GIC, Blackstone (post-AirTrunk), Brookfield, KKR.",
        },
      },
    ],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/invest" className="hover:text-slate-900 transition-colors">Invest</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Digital Infrastructure</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
              Highest-Growth Infrastructure Sub-Sector
            </span>
          </div>

          <h1 className="text-slate-900 text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Digital Infrastructure Investment in Australia
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
            Data centres, fibre and subsea cables, AI-compute facilities and tower portfolios. AU is one of the fastest-growing data-centre markets globally — anchored by hyperscaler buildout, AI-training demand, and sovereign-cloud requirements.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/invest/digital-infrastructure/listings"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Browse {listings?.length ?? 10}+ Live Opportunities &rarr;
            </Link>
            <Link
              href="/invest/list"
              className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              List Your Project
            </Link>
          </div>
        </div>
      </section>

      {/* Key stats */}
      <section className="bg-slate-50 border-b border-slate-100 py-6 md:py-8">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div>
              <div className="text-2xl md:text-3xl font-bold text-slate-900">$24B</div>
              <div className="text-xs text-slate-500 mt-1">AirTrunk sale to Blackstone (2024)</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-slate-900">~5GW</div>
              <div className="text-xs text-slate-500 mt-1">Goodman Group data-centre pipeline</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-slate-900">300MW+</div>
              <div className="text-xs text-slate-500 mt-1">NEXTDC operating capacity</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl font-bold text-slate-900">8–18%</div>
              <div className="text-xs text-slate-500 mt-1">Target IRR range (build-and-hold)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Sub-categories */}
      <section className="py-10 md:py-14">
        <div className="container-custom">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Sub-categories</h2>
          <p className="text-sm md:text-base text-slate-600 mb-6 max-w-2xl">
            Digital infrastructure spans seven distinct asset classes — each with different unit economics, regulatory frame, and buyer profile.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Hyperscale data centres", desc: "Purpose-built for cloud and AI training (>50MW). Anchor leases to AWS/Azure/Google/Meta. Long lease, low cap rate." },
              { name: "Retail colocation", desc: "Multi-tenant facilities serving enterprise and government. Higher margin per kW, more diverse customer mix." },
              { name: "Edge data centres", desc: "Sub-5MW micro-facilities serving low-latency workloads — autonomous vehicles, IoT, regional content delivery." },
              { name: "Fibre / metro networks", desc: "Intercity backbones, metro rings, dark-fibre leases. Private-credit and direct equity available." },
              { name: "Subsea cables", desc: "Capacity tranches (IRUs) and equity stakes in cables like Indigo, Australia-Singapore Cable, Hawaiki." },
              { name: "Mobile / 5G towers", desc: "Tower portfolios as separate-listed REITs or InfraCo structures. Long ground leases, recurring revenue." },
              { name: "AI compute clusters", desc: "GPU farms (H100/H200) for sovereign-AI workloads. Venture-shaped returns, fast obsolescence." },
              { name: "Cloud regions / sovereign", desc: "Government-grade processing infrastructure. CIRMP-regulated, security-cleared operators." },
              { name: "Cooling / power infrastructure", desc: "Specialist sub-tenant assets — district cooling, behind-the-meter generation, battery support." },
            ].map((c) => (
              <div key={c.name} className="border border-slate-200 rounded-xl bg-white p-5 hover:shadow-md transition-shadow">
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{c.name}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live listings */}
      {listings && listings.length > 0 && (
        <section className="bg-slate-50 border-y border-slate-100 py-10 md:py-14">
          <div className="container-custom">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">Live opportunities</h2>
                <p className="text-sm text-slate-600">
                  {listings.length} active listings — ASX-listed, institutional, and wholesale-only co-investment.
                </p>
              </div>
              <Link
                href="/invest/digital-infrastructure/listings"
                className="hidden md:inline-flex text-sm font-semibold text-amber-700 hover:text-amber-800"
              >
                See all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.slice(0, 6).map((l) => (
                <Link
                  key={l.slug}
                  href={`/invest/digital-infrastructure/listings/${l.slug}`}
                  className="block border border-slate-200 rounded-xl bg-white p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {l.listing_type === "premium" && (
                      <span className="text-[0.6rem] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Featured</span>
                    )}
                    <span className="text-[0.6rem] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {l.sub_category ?? "Digital Infrastructure"}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mb-1 line-clamp-2">{l.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{l.description}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-700">{l.price_display ?? "Enquire"}</span>
                    {l.location_state && (
                      <span className="text-[0.6rem] text-slate-400">{l.location_state}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How to invest */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">How to invest</h2>
          <div className="space-y-6">
            <div className="border-l-4 border-amber-400 pl-4">
              <h3 className="text-base font-bold text-slate-900 mb-1">Retail / SMSF — ASX-listed</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Buy NEXTDC (NXT), Macquarie Technology (MAQ), Goodman Group (GMG) or Telstra (TLS) through any AU broker. Compare brokerage on our <Link href="/best/share-trading" className="text-amber-700 font-semibold hover:underline">share-trading comparison</Link>. SMSF-eligible. No wholesale gating. Best for diversified, liquid exposure.
              </p>
            </div>
            <div className="border-l-4 border-emerald-400 pl-4">
              <h3 className="text-base font-bold text-slate-900 mb-1">Retail — sector ETFs &amp; REITs</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Listed property trusts and infrastructure ETFs with data-centre weightings provide diversified exposure. Goodman Group dominates several real-estate indices. Tower assets sit inside listed infrastructure funds (e.g. Magellan Infrastructure Fund).
              </p>
            </div>
            <div className="border-l-4 border-violet-400 pl-4">
              <h3 className="text-base font-bold text-slate-900 mb-1">Wholesale (s708) — direct project equity</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sophisticated-investor co-investment alongside operators (AirTrunk, Equinix Capital, NEXTDC capacity placements) and infrastructure funds (Macquarie Asset Management, IFM, Brookfield). Minimum tickets typically AUD$500k–$5M. Requires <Link href="/find-advisor?specialty=wholesale_investor_certification" className="text-violet-700 font-semibold hover:underline">a sophisticated-investor certificate</Link>. Higher returns, longer hold, illiquid.
              </p>
            </div>
            <div className="border-l-4 border-sky-400 pl-4">
              <h3 className="text-base font-bold text-slate-900 mb-1">Wholesale — private credit</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Senior secured debt for fibre rollouts, data-centre construction, and tower deals. Target yields 7–9% p.a. with quarterly distributions. Minimum AUD$250k. SMSF-eligible if the SMSF qualifies as wholesale.
              </p>
            </div>
            <div className="border-l-4 border-rose-400 pl-4">
              <h3 className="text-base font-bold text-slate-900 mb-1">Foreign investors — FIRB pathway</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Digital infrastructure is sensitive-sector under FIRB. Foreign government investors require approval at zero threshold. Allied-nation private investors face lower thresholds for &ldquo;critical infrastructure&rdquo; assets. Speak to a <Link href="/find-advisor?specialty=foreign_investment_lawyer" className="text-rose-700 font-semibold hover:underline">FIRB-experienced lawyer</Link> before signing any LOI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lead magnet */}
      <ContextualLeadMagnet segment="digital-infrastructure-briefing" />

      {/* Advisors */}
      {advisors && advisors.length > 0 && (
        <section className="bg-slate-50 border-t border-slate-100 py-10 md:py-14">
          <div className="container-custom">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Specialist advisors</h2>
            <p className="text-sm md:text-base text-slate-600 mb-6 max-w-2xl">
              Verified Australian financial planners and lawyers experienced with digital-infrastructure investing, wholesale-investor certification, and FIRB pathways.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {advisors.map((a) => (
                <Link
                  key={a.slug}
                  href={`/advisor/${a.slug}`}
                  className="block border border-slate-200 rounded-xl bg-white p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="text-sm font-bold text-slate-900 mb-0.5">{a.name}</div>
                  {a.firm_name && <div className="text-xs text-slate-500">{a.firm_name}</div>}
                  {a.location_display && <div className="text-[0.6rem] text-slate-400 mt-2">{a.location_display}</div>}
                  {a.verified && (
                    <span className="inline-block mt-2 text-[0.6rem] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Verified</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">FAQ</h2>
          <div className="space-y-4">
            {faqSchema.mainEntity.map((q, i) => (
              <details key={i} className="border border-slate-200 rounded-xl bg-white p-5 group">
                <summary className="text-sm md:text-base font-semibold text-slate-900 cursor-pointer list-none flex items-center justify-between">
                  <span>{q.name}</span>
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="text-sm text-slate-600 leading-relaxed mt-3">{q.acceptedAnswer.text}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
