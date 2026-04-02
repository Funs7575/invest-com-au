import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import Icon from "@/components/Icon";
import SectionHeading from "@/components/SectionHeading";

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
  savings: "/compare?category=savings",
};

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

export default async function InvestHubPage() {
  const supabase = await createClient();

  const { data: verticals } = await supabase
    .from("investment_verticals")
    .select(
      "id, slug, name, description, icon, fdi_share_percent, sort_order, hero_title, hero_subtitle, domestic, international"
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
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-16 md:py-24">
        <div className="container-custom">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
              Investment Hub
            </p>
            <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
              Invest in Australia
            </h1>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed">
              From mining and property to startups and farmland. Every
              investment opportunity — for local and international investors.
            </p>
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
                    className="group bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-4 hover:shadow-lg transition-shadow duration-200"
                  >
                    {/* Icon + FDI badge row */}
                    <div className="flex items-start justify-between">
                      <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                        <Icon
                          name={v.icon ?? "trending-up"}
                          size={22}
                          className="text-amber-500"
                        />
                      </div>
                      {hasFdi && (
                        <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                          {v.fdi_share_percent}% FDI
                        </span>
                      )}
                    </div>

                    {/* Name */}
                    <div>
                      <h2 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                        {v.name}
                      </h2>
                      {v.description && (
                        <p className="text-sm text-slate-500 mt-1 leading-relaxed line-clamp-3">
                          {v.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-auto flex items-center text-amber-600 text-sm font-semibold gap-1">
                      Explore
                      <Icon name="arrow-right" size={15} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
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
                  Connect with a verified Australian financial adviser who specialises in your investment sector — from mining and property to tax structuring.
                </p>
              </div>
              <Link
                href="/find-advisor"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors w-fit"
              >
                Find an adviser
                <Icon name="arrow-right" size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
