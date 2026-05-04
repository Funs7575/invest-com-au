import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import HubLeadForm from "@/components/leads/HubLeadForm";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import { createClient } from "@/lib/supabase/server";
import { getAffiliateLink, AFFILIATE_REL, renderStars } from "@/lib/tracking";
import type { Broker } from "@/lib/types";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `SMSF Investment Strategy ${CURRENT_YEAR}: What You Must Document | Invest.com.au`,
  description:
    "The ATO requires every SMSF to have a documented investment strategy covering 5 mandatory elements. Model portfolios for conservative, balanced and growth.",
  alternates: { canonical: `${SITE_URL}/smsf/investment-strategy` },
  openGraph: {
    title: `SMSF Investment Strategy ${CURRENT_YEAR}`,
    description: "The 5 mandatory elements, three model portfolios, and Division 296 considerations.",
    url: `${SITE_URL}/smsf/investment-strategy`,
    type: "website",
  },
};

export default async function SmsfInvestmentStrategyPage() {
  const supabase = await createClient();
  const { data: smsfBrokers } = await supabase
    .from("brokers")
    .select("id, name, slug, color, affiliate_url, rating, tagline, cta_text, benefit_cta")
    .eq("smsf_support", true)
    .eq("status", "active")
    .order("rating", { ascending: false })
    .limit(3);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF", url: absoluteUrl("/smsf") },
    { name: "Investment Strategy", url: absoluteUrl("/smsf/investment-strategy") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/smsf" className="hover:text-white">SMSF</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Investment Strategy</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              SMSF Investment Strategy: What You Must Document in {CURRENT_YEAR}
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              An SMSF without a current, written investment strategy is non-compliant. Generic templates increasingly fail audit review. Here&rsquo;s what holds up.
            </p>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">The 5 mandatory elements</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "Risk and return — explicit reasoning for the chosen risk profile",
                "Diversification — across asset classes, sectors, individual holdings",
                "Liquidity — ability to meet pension payments and member exits",
                "Ability to discharge liabilities — investments that fund obligations as they fall due",
                "Member insurance — life, TPD and income-protection coverage decisions documented",
              ].map((e, i) => (
                <div key={e} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-extrabold mb-3">{i + 1}</div>
                  <p className="text-sm font-bold text-slate-900 leading-snug">{e}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-amber-50 border-y border-amber-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-xl md:text-2xl font-extrabold text-amber-900 mb-3">Division 296 — what changes from July 2026</h2>
            <p className="text-sm text-amber-900 leading-relaxed">
              From 1 July 2026, the new Division 296 framework applies an additional 30% tax rate on earnings attributable to the portion of a member&rsquo;s total super balance over $3 million. SMSFs with concentrated property or single-asset exposure are most affected because notional gains are included in the calculation. Trustees with balances approaching the threshold should model the impact and consider re-weighting before the transition.
            </p>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">ETF model portfolios — three risk profiles</h2>
            <p className="text-sm text-slate-600 mb-6">Starting points only. Your actual allocation must reflect member age, time horizon and the documented investment strategy.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: "Conservative", who: "Member close to or in pension phase", alloc: "30% ASX broad / 20% global / 5% emerging / 35% AU bonds / 10% cash" },
                { name: "Balanced", who: "Mid-career accumulation", alloc: "40% ASX broad / 30% global / 5% emerging / 15% bonds / 10% alternatives" },
                { name: "Growth", who: "Long horizon, high risk tolerance", alloc: "35% ASX broad / 40% global / 10% emerging / 5% small caps / 10% alts/thematic" },
              ].map((p) => (
                <div key={p.name} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-extrabold text-slate-900 mb-1">{p.name}</h3>
                  <p className="text-xs text-slate-500 mb-3">{p.who}</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{p.alloc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SMSF broker mini-strip ── */}
        {smsfBrokers && smsfBrokers.length > 0 && (
          <section className="py-12 bg-white border-t border-slate-200">
            <div className="container-custom max-w-5xl">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Share Brokers</p>
                  <h2 className="text-lg font-bold text-slate-900">Platforms that support SMSF investment strategies</h2>
                  <p className="text-sm text-slate-500 mt-1">Your SMSF needs a broker that issues HINs to the fund — not to individual members.</p>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {smsfBrokers.map((b) => (
                    <div key={b.slug} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{b.name}</p>
                        <p className="text-xs text-amber-500">{renderStars(Number(b.rating ?? 0))}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{b.tagline}</p>
                      </div>
                      <div className="mt-auto">
                        <a
                          href={getAffiliateLink(b as Broker)}
                          rel={AFFILIATE_REL}
                          target="_blank"
                          className="block text-center w-full px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg transition-colors"
                        >
                          {b.cta_text ?? "Learn More →"}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-2xl space-y-6">
            <AdvisorPrompt
              type="smsf_accountant"
              heading="Get your SMSF investment strategy reviewed"
            />
            <HubLeadForm
              heading="Get a financial planner to review your SMSF strategy"
              subheading="A formal review against ATO guidance plus a Division 296 stress-test for high-balance members."
              intent={{ need: "planning", context: ["retirement"] }}
              source="smsf_strategy"
              ctaLabel="Find a financial planner"
            />
          </div>
        </section>

        <section className="py-10 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <Link href="/etfs" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">ETF Hub →</Link>
              <Link href="/invest/dividend-investing" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Dividend investing →</Link>
              <Link href="/invest/gold" className="rounded-lg border border-slate-200 bg-white p-4 hover:bg-slate-50 font-bold text-slate-900">Gold &amp; precious metals →</Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
