import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  SITE_URL,
  CURRENT_YEAR,
} from "@/lib/seo";
import Icon from "@/components/Icon";

const log = logger("best-for-hub");

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Best Broker For Every Scenario (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Ranked broker picks for every kind of Australian investor. Day traders, long-term buy-hold, SMSF, first-time, ESG, international — compare the top match for each scenario.",
  alternates: { canonical: `${SITE_URL}/best-for` },
  openGraph: {
    title: `Best Broker For Every Scenario (${CURRENT_YEAR})`,
    description:
      "Ranked broker picks for every Australian investor profile — from day traders to SMSF long-term holders.",
    url: `${SITE_URL}/best-for`,
  },
  twitter: { card: "summary_large_image" },
};

interface ScenarioSummary {
  slug: string;
  h1: string;
  intro: string;
  target_user: string | null;
  display_order: number | null;
}

async function fetchScenarios(): Promise<ScenarioSummary[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("best_for_scenarios")
      .select("slug, h1, intro, target_user, display_order")
      .eq("status", "active")
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("slug", { ascending: true })
      .limit(100);
    if (error) {
      log.warn("best_for_scenarios fetch failed", { error: error.message });
      return [];
    }
    return (data as ScenarioSummary[] | null) ?? [];
  } catch (err) {
    log.error("best_for_scenarios fetch threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Group scenarios into rough categories using slug keywords. We don't
 * have a categories column in best_for_scenarios, so this is a shallow
 * heuristic. Scenarios that don't match any pattern land in "More".
 */
function categoriseScenarios(scenarios: ScenarioSummary[]) {
  const bySection: Record<
    string,
    { title: string; description: string; items: ScenarioSummary[] }
  > = {
    strategy: {
      title: "By Strategy",
      description: "Match your broker to how you actually invest.",
      items: [],
    },
    profile: {
      title: "By Investor Profile",
      description: "Scenarios tailored to who you are — new to investing, retired, high-net-worth.",
      items: [],
    },
    asset: {
      title: "By Asset Class",
      description: "Focused rankings for specific instruments and markets.",
      items: [],
    },
    account: {
      title: "By Account Type",
      description: "SMSF, trust, joint, minor, and expat account rankings.",
      items: [],
    },
    cost: {
      title: "By Cost & Fees",
      description: "Zero brokerage, low inactivity, cheapest portfolios.",
      items: [],
    },
    more: {
      title: "More Scenarios",
      description: "Niche picks and specialist rankings.",
      items: [],
    },
  };

  for (const s of scenarios) {
    const slug = s.slug;
    if (/day-trading|high-frequency|algo|options|cfd|forex|after-hours/.test(slug)) {
      bySection.strategy!.items.push(s);
    } else if (/first-time|under-25|senior|retiree|beginner|mobile-first|high-net-worth/.test(slug)) {
      bySection.profile!.items.push(s);
    } else if (/asx|us-shares|international|etf|penny|small-caps|ipo|fractional|crypto/.test(slug)) {
      bySection.asset!.items.push(s);
    } else if (/smsf|family|corporate|trust|joint|expat|nz-residents/.test(slug)) {
      bySection.account!.items.push(s);
    } else if (/zero-brokerage|no-inactivity|low-minimum|cheapest|term-deposit|high-interest|margin/.test(slug)) {
      bySection.cost!.items.push(s);
    } else {
      bySection.more!.items.push(s);
    }
  }

  return Object.values(bySection).filter((section) => section.items.length > 0);
}

export default async function BestForHubPage() {
  const scenarios = await fetchScenarios();
  const sections = categoriseScenarios(scenarios);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Best Broker For" },
  ]);

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Best Broker For Every Scenario",
    numberOfItems: scenarios.length,
    itemListElement: scenarios.slice(0, 100).map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.h1,
      url: absoluteUrl(`/best-for/${s.slug}`),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />

      <div className="py-8 md:py-14">
        <div className="container-custom max-w-5xl">
          <nav className="text-xs text-slate-500 mb-4 flex items-center gap-1.5 flex-wrap" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-300" aria-hidden="true" />
            <span className="text-slate-700 font-medium">Best Broker For</span>
          </nav>

          <header className="mb-8 md:mb-12">
            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
              Best Broker For Every Scenario
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-3xl">
              Pick the scenario that sounds most like you, and we&apos;ll show
              you the ranked broker matches. Each list weights the broker
              fields that matter for that scenario — low ASX fees for day
              trading, FX spreads for US shares, CHESS sponsorship for
              long-term holders — and updates automatically as broker data
              changes.{" "}
              <span className="font-semibold text-slate-900">
                {scenarios.length} scenario{scenarios.length === 1 ? "" : "s"} available.
              </span>
            </p>
          </header>

          {scenarios.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
              <Icon name="layers" size={36} className="text-slate-300 mx-auto mb-3" aria-hidden="true" />
              <h2 className="text-lg font-extrabold text-slate-900 mb-2">
                Scenarios loading soon
              </h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                We&apos;re populating the broker rankings. In the meantime,
                you can still compare brokers side-by-side on the main{" "}
                <Link href="/compare" className="text-amber-700 hover:text-amber-800 font-semibold">
                  compare page
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {sections.map((section) => (
                <section key={section.title}>
                  <div className="mb-4">
                    <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1">
                      {section.title}
                    </h2>
                    <p className="text-sm text-slate-500">{section.description}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {section.items.map((s) => (
                      <Link
                        key={s.slug}
                        href={`/best-for/${s.slug}`}
                        className="group block bg-white border border-slate-200 hover:border-amber-300 hover:shadow-sm rounded-xl p-4 transition-all"
                      >
                        <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-amber-700 mb-1 leading-snug">
                          {s.h1}
                        </h3>
                        {s.target_user && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {s.target_user}
                          </p>
                        )}
                        <span className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-amber-700 group-hover:gap-2 transition-all">
                          See rankings
                          <Icon name="arrow-right" size={12} aria-hidden="true" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <section className="mt-12 bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8">
            <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-2">
              Can&apos;t find your scenario?
            </h2>
            <p className="text-sm text-slate-600 mb-4">
              Start with the two-minute quiz — we&apos;ll ask a handful of
              questions and point you at the three brokers most likely to
              fit your situation.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/quiz"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Take the platform quiz
                <Icon name="arrow-right" size={14} aria-hidden="true" />
              </Link>
              <Link
                href="/compare"
                className="inline-flex items-center gap-2 border border-slate-300 hover:bg-white text-slate-700 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                Compare all brokers
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
