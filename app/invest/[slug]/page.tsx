import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, absoluteUrl, SITE_URL, SITE_NAME, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";

export const revalidate = 3600;

export async function generateStaticParams() {
  // Slugs that now have dedicated subdirectories are excluded from this catch-all route.
  // "buy-business", "mining", "farmland", "commercial-property", "renewable-energy", "startups"
  // all have their own app/invest/[vertical]/ directories handled by other pages.
  return [];
}

type InvestmentVertical = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  fdi_share_percent: number | null;
  sort_order: number | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  domestic: boolean | null;
  international: boolean | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  // Destructure and check error: a silent failure here degrades SEO
  // (generic "Investment Vertical" title) without any signal in logs.
  // PGRST116 ("no rows found") is distinct from a real error — fall back
  // to a stub title in that case so we don't throw from metadata.
  const { data, error } = await supabase
    .from("investment_verticals")
    .select("hero_title, description, name")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[invest/[slug]] metadata query failed", error.message);
    return { title: "Investment Vertical" };
  }

  if (!data) {
    return { title: "Investment Vertical" };
  }

  const title = data.hero_title
    ? `${data.hero_title} (${CURRENT_YEAR})`
    : `${data.name} Investment Australia (${CURRENT_YEAR})`;

  return {
    title,
    description: data.description ?? undefined,
    alternates: { canonical: `${SITE_URL}/invest/${slug}` },
    openGraph: {
      title,
      description: data.description ?? undefined,
      url: `${SITE_URL}/invest/${slug}`,
    },
  };
}

/* ─────────────────────────────────────────────
   Listings links per slug
───────────────────────────────────────────── */

const LISTINGS_LINKS: Record<string, { href: string; label: string }> = {
  "buy-business": { href: "/invest/buy-business/listings", label: "Browse Businesses for Sale" },
  mining: { href: "/invest/mining/listings", label: "Browse Mining Opportunities" },
  farmland: { href: "/invest/farmland/listings", label: "Browse Farmland Listings" },
  "commercial-property": { href: "/invest/commercial-property/listings", label: "Browse Commercial Properties" },
  franchise: { href: "/invest/franchise/listings", label: "Browse Franchise Opportunities" },
  "renewable-energy": { href: "/invest/renewable-energy/listings", label: "Browse Energy Projects" },
  startups: { href: "/invest/startups/listings", label: "Browse Startup Opportunities" },
};

/* ─────────────────────────────────────────────
   Hardcoded content components per slug
───────────────────────────────────────────── */

function MiningContent() {
  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Sector overview"
        title="Why Invest in Australian Mining?"
      />

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: "33%", label: "of FDI" },
          { value: "Top 3", label: "Iron Ore Exporter" },
          { value: "Top 5", label: "Lithium Producer" },
          { value: "$130B+", label: "AUD Annual Exports" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center"
          >
            <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
            <p className="text-xs text-slate-600 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="prose prose-slate max-w-none">
        <p>
          Australia is the world&apos;s largest exporter of iron ore and
          lithium, and a top-5 producer of gold, coal, copper, and rare earths.
          The mining sector contributes ~10% of Australian GDP and attracts AUD
          $130B+ in investment annually.
        </p>

        <h3>Types of Mining Investment</h3>
        <ol>
          <li>
            <strong>ASX-listed miners</strong> — direct equity in producers
            like BHP, Rio Tinto, Fortescue, Pilbara Minerals
          </li>
          <li>
            <strong>Exploration companies</strong> — higher risk/reward junior
            miners on ASX
          </li>
          <li>
            <strong>Mining ETFs</strong> — MNRS (VanEck), QRE (BetaShares)
          </li>
          <li>
            <strong>Direct project investment</strong> — joint ventures in
            tenements (requires FIRB for foreign investors)
          </li>
          <li>
            <strong>Royalty streams</strong>
          </li>
        </ol>

        <h3>Key Minerals</h3>
        <ul>
          <li>
            <strong>Iron ore</strong> (Pilbara, WA) — $130B exports p.a.
          </li>
          <li>
            <strong>Lithium</strong> (WA, SA) — battery metals boom
          </li>
          <li>
            <strong>Gold</strong> — top-5 global producer
          </li>
          <li>
            <strong>Rare earths</strong> (Mt Weld, Arafura)
          </li>
          <li>
            <strong>Coal</strong> (QLD, NSW) — declining but still significant
          </li>
          <li>
            <strong>LNG</strong> (Northwest Shelf, QLD)
          </li>
          <li>
            <strong>Copper</strong> (Olympic Dam, QLD)
          </li>
        </ul>

        <h3>FIRB for Mining</h3>
        <p>
          Mining is a &quot;sensitive sector&quot; — lower FIRB thresholds
          apply. Foreign acquisitions of mining tenements, exploration licences,
          or stakes in mining companies over $0 (for certain countries) or $268M
          (general) require FIRB notification. Agricultural land thresholds also
          apply when mining operations involve pastoral land.
        </p>

        <h3>Professional Team Needed</h3>
        <p>
          Mining lawyer (tenements, environmental) · Mining tax advisor
          (royalties, thin capitalisation) · Financial planner (portfolio
          allocation).
        </p>
      </div>
    </div>
  );
}

function BuyBusinessContent() {
  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Sector overview"
        title="How to Buy a Business in Australia"
      />

      {/* Visa pathways grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            name: "Subclass 188A",
            label: "Business Innovation",
            detail: "$800K business, 2-year provisional",
          },
          {
            name: "Subclass 188B",
            label: "Investor Stream",
            detail: "$2.5M investment, 4 years",
          },
          {
            name: "SIV",
            label: "Significant Investor",
            detail: "$5M in complying investments",
          },
        ].map((v) => (
          <div
            key={v.name}
            className="bg-white border border-slate-200 rounded-xl p-5"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-amber-600 mb-1">
              {v.name}
            </p>
            <p className="text-base font-bold text-slate-900">{v.label}</p>
            <p className="text-sm text-slate-500 mt-1">{v.detail}</p>
          </div>
        ))}
      </div>

      <div className="prose prose-slate max-w-none">
        <h3>Business Visa Pathways</h3>
        <ul>
          <li>
            <strong>Subclass 188A</strong> (Business Innovation) — $800K
            business, 2-year provisional
          </li>
          <li>
            <strong>Subclass 188B</strong> (Investor stream) — $2.5M
            investment, 4 years
          </li>
          <li>
            <strong>Subclass 888</strong> (Permanent) — after satisfying
            provisional requirements
          </li>
          <li>
            <strong>Significant Investor Visa</strong> — $5M in complying
            investments
          </li>
          <li>
            <strong>Global Talent Visa</strong> — for exceptional tech /
            innovation talent
          </li>
        </ul>

        <h3>FIRB Thresholds</h3>
        <ul>
          <li>
            <strong>General commercial</strong> — $268M (or higher for FTA
            partners)
          </li>
          <li>
            <strong>Agribusiness</strong> — $15M (strict screening)
          </li>
          <li>
            <strong>Sensitive sectors</strong> (media, defence,
            telecommunications, ports) — lower thresholds
          </li>
          <li>
            <strong>National security</strong> — specific notification required
          </li>
        </ul>

        <h3>Due Diligence Process</h3>
        <p>
          Financial records (3 years P&amp;L, balance sheet, BAS) · Employee
          entitlements (awards, super) · Lease review · Intellectual property ·
          Compliance history · Environmental obligations.
        </p>

        <h3>State Business Nomination</h3>
        <p>
          Each state runs its own program: NSW Business Investment Visa · VIC
          Business Migration · QLD Business and Skilled Migration · SA Business
          Migration — each with different business thresholds and requirements.
        </p>

        <h3>Professional Team</h3>
        <p>
          Business broker · Migration agent (visa pathway) · Commercial lawyer
          (purchase contract, FIRB) · Accountant (tax structure, due diligence).
        </p>
      </div>
    </div>
  );
}

function FarmlandContent() {
  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Sector overview"
        title="Investing in Australian Agricultural Land"
      />

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { value: "450M", label: "hectares agricultural land" },
          { value: "13%", label: "foreign owned" },
          { value: "$15M", label: "FIRB threshold" },
          { value: "Rising", label: "Water rights value" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center"
          >
            <p className="text-2xl font-extrabold text-amber-600">{s.value}</p>
            <p className="text-xs text-slate-600 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="prose prose-slate max-w-none">
        <p>
          Australia has 450 million hectares of agricultural land, of which
          approximately 13% is owned by foreign interests (about 57 million
          hectares). Major foreign owners include the US, UK, and Netherlands.
        </p>

        <h3>Types of Agricultural Investment</h3>
        <ul>
          <li>
            <strong>Livestock stations</strong> (cattle, sheep — NT, QLD, WA)
          </li>
          <li>
            <strong>Cropping farms</strong> (wheat, canola, grain — SA, WA,
            NSW)
          </li>
          <li>
            <strong>Horticulture</strong> (fruits, vegetables, nuts — VIC, QLD)
          </li>
          <li>
            <strong>Dairy</strong> (VIC, SA, WA, TAS)
          </li>
          <li>
            <strong>Water rights</strong> (Murray-Darling — increasingly
            valuable as a separate asset class)
          </li>
        </ul>

        <h3>FIRB Agricultural Rules</h3>
        <p>
          The $15M threshold applies to agricultural land acquisitions by
          foreign persons (regardless of nationality). The &quot;marketed
          widely&quot; requirement means the vendor must have genuinely tested
          the market with local buyers. FIRB can impose conditions: reporting
          obligations, no use of foreign labour, local management requirements.
        </p>

        <h3>Water Rights</h3>
        <p>
          Water entitlements can be purchased separately from land. Foreign
          persons need FIRB approval for water entitlement acquisitions over
          $15M. Water rights are increasingly traded as a financial asset in the
          Murray-Darling Basin.
        </p>

        <h3>Typical Returns</h3>
        <p>
          Rural property historically returns 4–8% p.a. total return (cash +
          capital appreciation). Water rights have appreciated significantly.
          Agribusiness provides inflation protection.
        </p>

        <h3>Professional Team</h3>
        <p>
          Rural property agent · Rural lawyer · Agricultural consultant ·
          Migration agent (for farmer visa subclass 191 or 187).
        </p>
      </div>
    </div>
  );
}

function CommercialPropertyContent() {
  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Sector overview"
        title="Commercial Property Investment in Australia"
      />

      {/* Asset class cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            icon: "building",
            label: "Office",
            detail:
              "Sydney CBD ~12% vacancy · Melbourne CBD ~17% · Prime yield 5.5–7%",
          },
          {
            icon: "package",
            label: "Industrial",
            detail:
              "National vacancy < 3% (record low) · E-commerce driven demand · Prime yield 4.5–5.5%",
          },
          {
            icon: "briefcase",
            label: "Hotels",
            detail:
              "Tourism recovery to 90% of 2019 levels · Hospitality and data centres growing",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Icon name={c.icon} size={18} className="text-amber-500" />
            </div>
            <p className="font-bold text-slate-900">{c.label}</p>
            <p className="text-sm text-slate-500 leading-relaxed">{c.detail}</p>
          </div>
        ))}
      </div>

      <div className="prose prose-slate max-w-none">
        <h3>Types of Commercial Property</h3>
        <ul>
          <li>
            <strong>Office</strong> (Sydney CBD, Melbourne Docklands, Brisbane,
            Perth)
          </li>
          <li>
            <strong>Retail</strong> (shopping centres, strip retail)
          </li>
          <li>
            <strong>Industrial &amp; logistics</strong> (outer suburbs,
            e-commerce driven demand)
          </li>
          <li>
            <strong>Hotels &amp; hospitality</strong> (tourism recovery)
          </li>
          <li>
            <strong>Data centres</strong> (digital economy growth — Melbourne,
            Sydney key hubs)
          </li>
        </ul>

        <h3>FIRB Thresholds for Commercial</h3>
        <ul>
          <li>
            <strong>Developed commercial land</strong> — $268M general
            threshold, $1.35B for Investment Facilitation Agreement countries
          </li>
          <li>
            <strong>Vacant commercial land</strong> — any amount requires
            approval
          </li>
          <li>
            <strong>Developed residential</strong> — new dwellings only
            (established dwelling ban 2025–2027)
          </li>
        </ul>

        <h3>A-REIT Alternative</h3>
        <p>
          Listed property trusts (Dexus, Scentre Group, Goodman Group, Charter
          Hall, GPT Group) provide diversified exposure to commercial property
          without direct ownership. Available through ASX via any broker.
        </p>

        <h3>Professional Team</h3>
        <p>
          Commercial property agent (Colliers, JLL, CBRE, Cushman &amp;
          Wakefield) · Commercial lawyer · Commercial mortgage broker.
        </p>
      </div>
    </div>
  );
}

function RenewableEnergyContent() {
  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Sector overview"
        title="Australia's Renewable Energy Investment Opportunity"
      />

      {/* 4-column grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: "zap", label: "Solar", detail: "QLD, NSW, SA, WA" },
          { icon: "trending-up", label: "Wind", detail: "SA, VIC, WA" },
          { icon: "activity", label: "Battery", detail: "SA leads BESS" },
          { icon: "flame", label: "Hydrogen", detail: "WA, QLD pilots" },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col items-center text-center gap-2"
          >
            <Icon name={c.icon} size={24} className="text-amber-500" />
            <p className="font-bold text-slate-900 text-sm">{c.label}</p>
            <p className="text-xs text-slate-500">{c.detail}</p>
          </div>
        ))}
      </div>

      <div className="prose prose-slate max-w-none">
        <p>
          Australia has one of the best solar and wind resources in the world.
          The federal government has committed to 82% renewable electricity by
          2030. Total investment required: $100B+.
        </p>

        <h3>Investment Types</h3>
        <ul>
          <li>Large-scale solar farms (Queensland, NSW, SA, WA)</li>
          <li>Wind farms (SA, VIC, WA)</li>
          <li>Battery storage (BESS — South Australia leads)</li>
          <li>Green hydrogen (Western Australia, Queensland pilot projects)</li>
          <li>Pumped hydro (Snowy 2.0, other projects)</li>
          <li>Grid transmission infrastructure</li>
        </ul>

        <h3>Government Incentives</h3>
        <ul>
          <li>
            <strong>ARENA</strong> (Australian Renewable Energy Agency) —
            grants and concessional loans for renewable projects
          </li>
          <li>
            <strong>CEFC</strong> (Clean Energy Finance Corporation) — debt
            finance for clean energy
          </li>
          <li>
            State incentives: VIC VRET, NSW Renewable Energy Zone contracts,
            QLD renewable programs
          </li>
        </ul>

        <h3>FIRB for Energy</h3>
        <p>
          Electricity and energy infrastructure is a sensitive sector. FIRB
          national interest test applies. Foreign acquisitions of electricity
          infrastructure may require FIRB notification regardless of value.
        </p>

        <h3>ASX Clean Energy Exposure</h3>
        <p>
          ETFs: ERTH (BetaShares), ETHI (BetaShares), CLNE (iShares). Direct
          ASX: Neoen, AGL, Origin Energy, Meridian Energy.
        </p>

        <h3>Critical Minerals for Energy Transition</h3>
        <p>
          Lithium (batteries) · Cobalt · Rare earths (wind turbine magnets) ·
          Nickel (EV batteries). Australia is a top global supplier of all of
          these.
        </p>
      </div>
    </div>
  );
}

function StartupsContent() {
  return (
    <div className="space-y-10">
      <SectionHeading
        eyebrow="Sector overview"
        title="Investing in Australian Startups & Technology"
      />

      {/* 3-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            icon: "percent",
            label: "ESIC Tax Incentives",
            detail:
              "20% non-refundable tax offset (up to $200K/yr) + 10-year CGT exemption on qualifying shares",
          },
          {
            icon: "calculator",
            label: "R&D Tax Offset",
            detail:
              "43.5% refundable offset (turnover < $20M) or 38.5% non-refundable for larger companies",
          },
          {
            icon: "globe",
            label: "Global Talent Visa",
            detail:
              "Subclass 858 for exceptional tech, fintech, medtech, energy talent. No sponsoring employer required.",
          },
        ].map((c) => (
          <div
            key={c.label}
            className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Icon name={c.icon} size={18} className="text-amber-500" />
            </div>
            <p className="font-bold text-slate-900">{c.label}</p>
            <p className="text-sm text-slate-500 leading-relaxed">{c.detail}</p>
          </div>
        ))}
      </div>

      <div className="prose prose-slate max-w-none">
        <p>
          Australia&apos;s tech startup ecosystem has grown dramatically —
          Sydney and Melbourne rank in the global top 20 startup ecosystems.
          Notable exits: Canva ($55B valuation), Atlassian, WiseTech Global,
          Afterpay (acquired by Block for $39B).
        </p>

        <h3>Investment Pathways</h3>
        <ul>
          <li>
            <strong>Angel investing</strong> — direct equity in early-stage
            companies
          </li>
          <li>
            <strong>VC funds</strong> — Blackbird Ventures, Square Peg Capital,
            AirTree Ventures
          </li>
          <li>
            <strong>ASX-listed tech companies</strong>
          </li>
          <li>
            <strong>Global Talent Visa</strong> (Subclass 858) for tech
            founders and investors
          </li>
        </ul>

        <h3>ESIC — Early Stage Innovation Company</h3>
        <p>
          Angel investors in qualifying ESIC companies receive a 20%
          non-refundable tax offset on investment (capped at $200K offset per
          year) and a 10-year CGT exemption on qualifying shares. ESIC status
          requires ATO determination based on R&amp;D spend, IP, and innovation
          test.
        </p>

        <h3>R&D Tax Incentive</h3>
        <p>
          Companies spending on R&amp;D receive a 43.5% refundable tax offset
          (turnover &lt; $20M) or 38.5% non-refundable offset (larger
          companies). This makes Australia competitive for deep tech R&amp;D
          investment.
        </p>

        <h3>ASX Listing Pathway</h3>
        <p>
          Australia has a liquid, well-regulated exchange for tech companies.
          The ASX has over 2,200 listed companies including significant tech
          representation. IPO pathway for growth-stage companies.
        </p>

        <h3>Global Talent Visa (858)</h3>
        <p>
          For exceptional talent in tech, fintech, medtech, energy. No
          sponsoring employer required. Points-based endorsement by peak bodies.
          Pathway to permanent residency.
        </p>
      </div>
    </div>
  );
}

function VerticalContent({ slug }: { slug: string }) {
  switch (slug) {
    case "mining":
      return <MiningContent />;
    case "buy-business":
      return <BuyBusinessContent />;
    case "farmland":
      return <FarmlandContent />;
    case "commercial-property":
      return <CommercialPropertyContent />;
    case "renewable-energy":
      return <RenewableEnergyContent />;
    case "startups":
      return <StartupsContent />;
    default:
      return null;
  }
}

/* ─────────────────────────────────────────────
   Page component
───────────────────────────────────────────── */

export default async function InvestVerticalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();
  const { data: vertical } = await supabase
    .from("investment_verticals")
    .select(
      "id, slug, name, description, icon, fdi_share_percent, sort_order, hero_title, hero_subtitle, domestic, international"
    )
    .eq("slug", slug)
    .single();

  if (!vertical) {
    notFound();
  }

  const v = vertical as InvestmentVertical;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: v.name },
  ]);

  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: v.hero_title ?? v.name,
    description: v.description ?? undefined,
    url: absoluteUrl(`/invest/${slug}`),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  const showIntlBadge = v.domestic && v.international;

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

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">
              Home
            </Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <Link href="/invest" className="hover:text-slate-900 transition-colors">
              Invest
            </Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" />
            <span className="text-slate-900 font-medium">{v.name}</span>
          </nav>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated {CURRENT_YEAR}
            </span>
            {showIntlBadge && (
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1 rounded-full flex items-center gap-1">
                <Icon name="globe" size={12} />
                Domestic + International
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl text-slate-900">
            {v.hero_title ?? v.name}
          </h1>
          {v.hero_subtitle && (
            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
              {v.hero_subtitle}
            </p>
          )}
        </div>
      </section>

      {/* Main content */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <VerticalContent slug={slug} />
        </div>
      </section>

      {/* Browse Listings CTA */}
      {LISTINGS_LINKS[slug] && (
        <section className="py-10 bg-slate-50 border-t border-slate-100">
          <div className="container-custom">
            <div className="max-w-3xl mx-auto bg-white border border-amber-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                <Icon name="trending-up" size={24} className="text-amber-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900 mb-1">
                  Ready to Browse Active Listings?
                </h2>
                <p className="text-sm text-slate-500">
                  Explore real {v.name.toLowerCase()} investment opportunities available in Australia — with enquiry details and agent contact information.
                </p>
              </div>
              <Link
                href={LISTINGS_LINKS[slug].href}
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
              >
                {LISTINGS_LINKS[slug].label}
                <Icon name="arrow-right" size={15} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* International investors callout */}
      <section className="py-10 bg-amber-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-amber-500 rounded-xl p-8 text-slate-900">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Icon name="globe" size={20} className="text-slate-900" />
              </div>
              <div>
                <h2 className="text-lg font-bold mb-2">For International Investors</h2>
                <p className="text-sm leading-relaxed mb-4">
                  Planning to invest in Australian {v.name.toLowerCase()} from
                  overseas? FIRB and ATO rules apply to foreign investors. Read
                  our complete guide for international investors.
                </p>
                <Link
                  href="/foreign-investment"
                  className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  Complete guide for international investors
                  <Icon name="arrow-right" size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Find a Specialist Advisor */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Icon name="user-check" size={24} className="text-amber-500" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Find a Specialist Adviser
              </h2>
              <p className="text-sm text-slate-500">
                Connect with a verified {v.name.toLowerCase()} specialist who
                can guide your investment strategy, structure, and compliance.
              </p>
            </div>
            <Link
              href="/find-advisor"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors shrink-0"
            >
              Find an adviser
              <Icon name="arrow-right" size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
