import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";
import { PRIMARY_CTA_TEXT, PRIMARY_CTA_HREF } from "@/lib/compliance-config";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Invest in Australia — Every Opportunity in One Place (2026)",
  description:
    "From mining and property to startups and farmland. Explore all the ways to invest in Australia — for local and international investors.",
  alternates: { canonical: `${SITE_URL}/invest` },
  openGraph: {
    title: "Invest in Australia — Every Opportunity in One Place (2026)",
    description:
      "From mining and property to startups and farmland. Explore all the ways to invest in Australia — for local and international investors.",
    url: `${SITE_URL}/invest`,
  },
};

/** Verticals that already have dedicated pages outside /invest/[slug] */
const HREF_OVERRIDES: Record<string, string> = {
  "residential-property": "/property",
  shares: "/compare",
  savings: "/savings",
  "buy-business": "/invest/buy-business",
  mining: "/invest/mining",
  farmland: "/invest/farmland",
  "commercial-property": "/invest/commercial-property",
  franchise: "/invest/franchise",
  "renewable-energy": "/invest/renewable-energy",
  startups: "/invest/startups",
  "private-equity": "/invest/private-equity",
  bonds: "/invest/bonds",
  gold: "/invest/gold",
  ipos: "/invest/ipos",
  funds: "/invest/funds",
  "private-credit": "/invest/private-credit",
  reits: "/invest/reits",
  "managed-funds": "/invest/managed-funds",
  "dividend-investing": "/invest/dividend-investing",
  "options-trading": "/invest/options-trading",
  forex: "/invest/forex",
  commodities: "/invest/commodities",
  alternatives: "/invest/alternatives",
  infrastructure: "/invest/infrastructure",
  "hybrid-securities": "/invest/hybrid-securities",
  "crypto-staking": "/invest/crypto-staking",
  smsf: "/invest/smsf",
};

type InvestmentVertical = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  hero_image: string | null;
  fdi_share_percent: number | null;
  sort_order: number | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  domestic: boolean | null;
  international: boolean | null;
};

export default async function InvestHubPage() {
  const supabase = await createClient();

  const { data: verticals } = await supabase
    .from("investment_verticals")
    .select(
      "id, slug, name, description, icon, hero_image, fdi_share_percent, sort_order, hero_title, hero_subtitle, domestic, international"
    )
    .order("sort_order", { ascending: true });

  const items: InvestmentVertical[] = verticals ?? [];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest" },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Hero */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden">
        <div className="container-custom py-6 md:py-10 lg:py-12">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-4" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">Invest</span>
          </nav>
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">

            {/* Left: text */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-semibold text-white mb-4">
                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                27 verticals · Marketplace · Advisors
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 leading-[1.1] mb-3 tracking-tight">
                Australia&apos;s #1{" "}
                <span className="text-amber-500">investment</span>{" "}
                guide.
              </h1>
              <p className="text-sm md:text-base text-slate-600 mb-5 leading-relaxed">
                From mining and property to startups, private credit, and alternatives. Every investment opportunity — for local and international investors.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-2.5 mb-5">
                <Link href={PRIMARY_CTA_HREF} className="w-full sm:w-auto px-6 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-md hover:shadow-lg transition-all text-sm text-center">
                  {PRIMARY_CTA_TEXT} &rarr;
                </Link>
                <Link href="/compare" className="w-full sm:w-auto px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm text-center">
                  Compare Platforms
                </Link>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Icon name="shield-check" size={12} className="text-emerald-500" />
                  100% independent — no commissions
                </span>
                <span className="hidden sm:block text-slate-300">·</span>
                <span className="flex items-center gap-1.5">
                  <Icon name="check-circle" size={12} className="text-emerald-500" />
                  Licensed professionals directory
                </span>
              </div>
            </div>

            {/* Right: category cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "layers", label: "Marketplace", sub: "Browse businesses, mining, farmland & more for sale", href: "/invest/listings", iconBg: "bg-amber-500", border: "hover:border-amber-200 hover:bg-amber-50/60" },
                { icon: "bar-chart-2", label: "Compare Platforms", sub: "73+ platforms compared by fees, features & ratings", href: "/compare", iconBg: "bg-slate-800", border: "hover:border-slate-300 hover:bg-slate-50" },
                { icon: "user-check", label: "Browse Advisors", sub: "Licensed financial planners, SMSF accountants & more", href: "/advisors", iconBg: "bg-emerald-600", border: "hover:border-emerald-200 hover:bg-emerald-50/60" },
                { icon: "globe", label: "Foreign Investors", sub: "FIRB rules, visa pathways & 12 country guides", href: "/foreign-investment", iconBg: "bg-violet-600", border: "hover:border-violet-200 hover:bg-violet-50/60" },
              ].map((card) => (
                <Link key={card.href} href={card.href} className={`bg-white border border-slate-200 rounded-2xl p-4 md:p-5 transition-all group ${card.border}`}>
                  <div className={`w-9 h-9 ${card.iconBg} rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
                    <Icon name={card.icon} size={18} className="text-white" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 group-hover:text-slate-700 leading-snug mb-1">{card.label}</p>
                  <p className="text-xs text-slate-500 leading-snug">{card.sub}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              { value: "27", label: "Investment Verticals" },
              { value: "73+", label: "Platforms Compared" },
              { value: "100+", label: "Active Listings" },
              { value: "Free", label: "No Hidden Fees" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-xl md:text-2xl font-extrabold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verticals Grid */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="All verticals"
            title="Choose Your Investment Sector"
            sub="Explore every major asset class available to investors in Australia."
          />

          {items.length === 0 ? (
            <p className="text-slate-500 text-sm">No investment verticals found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((v) => {
                const href =
                  HREF_OVERRIDES[v.slug] ?? `/invest/${v.slug}`;
                const hasFdi =
                  v.fdi_share_percent !== null && v.fdi_share_percent > 0;

                return (
                  <Link
                    key={v.id}
                    href={href}
                    className="group bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:shadow-lg transition-shadow duration-200"
                  >
                    {/* Hero image */}
                    <div className="relative aspect-[16/9] bg-slate-100">
                      {v.hero_image ? (
                        <Image
                          src={v.hero_image}
                          alt={v.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                          <Icon name={v.icon ?? "trending-up"} size={40} className="text-white/30" />
                        </div>
                      )}
                      {hasFdi && (
                        <span className="absolute top-3 right-3 text-xs font-semibold bg-amber-500 text-slate-900 px-2.5 py-1 rounded-full shadow-sm">
                          {v.fdi_share_percent}% FDI
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col gap-3 flex-1">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                          <Icon
                            name={v.icon ?? "trending-up"}
                            size={18}
                            className="text-amber-500"
                          />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                            {v.name}
                          </h3>
                          {v.description && (
                            <p className="text-sm text-slate-500 mt-1 leading-relaxed line-clamp-2">
                              {v.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-auto flex items-center text-amber-600 text-sm font-semibold gap-1">
                        Explore
                        <Icon name="arrow-right" size={15} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Advisor Match CTA */}
      <section className="py-10 bg-amber-50 border-y border-amber-100">
        <div className="container-custom">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Need help?</h2>
              <p className="text-sm text-slate-600 mt-1">Browse our directories and comparison tools to find what suits your situation.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href={PRIMARY_CTA_HREF} className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors">
                {PRIMARY_CTA_TEXT} →
              </Link>
              <Link href="/advisors" className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-lg border border-slate-200 transition-colors">
                Browse Directories
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Investment Marketplace */}
      <section className="py-14 bg-white border-t border-slate-100">
        <div className="container-custom">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Investment Marketplace</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Browse Active Investment Listings
            </h2>
            <p className="text-slate-500 leading-relaxed max-w-2xl">
              Actual opportunities you can enquire about and invest in — businesses, farms, commercial properties, mining projects, and more.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: "Businesses for Sale", desc: "Browse businesses across Australia — hospitality, retail, professional services, and more.", href: "/invest/buy-business/listings", icon: "briefcase" },
              { title: "Mining Opportunities", desc: "ASX miners, exploration tenements, joint ventures, and mining ETFs.", href: "/invest/mining/opportunities", icon: "layers" },
              { title: "Farmland & Agriculture", desc: "Grazing stations, cropping farms, horticulture, and water rights across Australia.", href: "/invest/farmland/listings", icon: "leaf" },
              { title: "Commercial Property", desc: "Office, retail, industrial, hotel, and data centre assets.", href: "/invest/commercial-property/listings", icon: "building" },
              { title: "Franchise Opportunities", desc: "Proven business models for sale — food, retail, services, and franchise resales.", href: "/invest/franchise/listings", icon: "star" },
              { title: "Renewable Energy", desc: "Solar farms, wind projects, battery storage, and green infrastructure.", href: "/invest/renewable-energy/projects", icon: "zap" },
              { title: "Investment Funds", desc: "PE, hedge funds, SIV-complying funds, and managed investment schemes.", href: "/invest/funds", icon: "trending-up" },
              { title: "Startups & Crowdfunding", desc: "Equity crowdfunding, angel deals, and early-stage investment opportunities.", href: "/invest/startups/opportunities", icon: "rocket" },
              { title: "Alternative Investments", desc: "Fine wine, art, classic cars, luxury watches, and collectibles.", href: "/invest/alternatives/listings", icon: "gem" },
              { title: "Private Credit & P2P", desc: "Private debt funds and peer-to-peer lending — yields above term deposits.", href: "/invest/private-credit/listings", icon: "credit-card" },
              { title: "Infrastructure", desc: "Toll roads, airports, utilities, ports, and social infrastructure.", href: "/invest/infrastructure/listings", icon: "git-branch" },
            ].map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-3 hover:shadow-lg hover:border-amber-200 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Icon name={card.icon} size={20} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1 leading-relaxed">{card.desc}</p>
                </div>
                <div className="mt-auto">
                  <span className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-xs px-3 py-1.5 rounded-lg transition-colors">
                    Browse →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/invest/listings"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors"
            >
              View All Investment Listings &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Callout cards */}
      <section className="py-14 bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* International callout */}
            <div className="bg-slate-900 rounded-xl p-8 text-white flex flex-col gap-4">
              <div className="w-11 h-11 rounded-lg bg-slate-700 flex items-center justify-center">
                <Icon name="globe" size={22} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold mb-2">Investing from overseas?</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  FIRB rules, withholding tax, visa considerations, and sector-specific restrictions for non-resident and foreign investors.
                </p>
              </div>
              <Link
                href="/foreign-investment"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors w-fit"
              >
                Read the complete guide
                <Icon name="arrow-right" size={15} />
              </Link>
            </div>

            {/* Advisor callout */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 flex flex-col gap-4">
              <div className="w-11 h-11 rounded-lg bg-amber-100 flex items-center justify-center">
                <Icon name="user-check" size={22} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Need professional guidance?</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Browse our directory of licensed Australian financial advisers across investment sectors — from mining and property to tax structuring.
                </p>
              </div>
              <Link
                href="/advisors"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors w-fit"
              >
                Browse advisers
                <Icon name="arrow-right" size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
