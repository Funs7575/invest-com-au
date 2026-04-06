import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER, DTA_DISCLAIMER } from "@/lib/compliance";
import { DTA_COUNTRIES, DEFAULT_WHT, type DTACountry } from "@/lib/foreign-investment-data";
import type { Broker } from "@/lib/types";
import ForeignInvestmentNav from "../../ForeignInvestmentNav";
import SectionHeading from "@/components/SectionHeading";

// ── Country lookup helpers ───────────────────────────────────────────────────

function getCountryBySlug(slug: string): DTACountry | undefined {
  return DTA_COUNTRIES.find((c) => c.countryCode.toLowerCase() === slug.toLowerCase());
}

// ── Static params ────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return DTA_COUNTRIES.map((c) => ({ country: c.countryCode.toLowerCase() }));
}

// ── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country } = await params;
  const dtaCountry = getCountryBySlug(country);
  if (!dtaCountry) return { title: "Country Not Found" };

  const title = `Investing in Australia from ${dtaCountry.country} — Tax Rates & Platforms — 2026`;
  const description = `${dtaCountry.country} investors in Australia: ${dtaCountry.hasDTA ? `DTA reduces dividend withholding to ${dtaCountry.dividendWHT}%` : "no DTA — full 30% dividend withholding applies"}. Interest WHT: ${dtaCountry.interestWHT}%. Which brokers accept ${dtaCountry.country} residents and how to invest in ASX from ${dtaCountry.country}. Updated March 2026.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/foreign-investment/from/${country}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(`Investing in Australia from ${dtaCountry.country}`)}&sub=${encodeURIComponent(`DTA Rates · Broker Eligibility · Tax Rules · 2026`)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: `${SITE_URL}/foreign-investment/from/${country}` },
  };
}

export const revalidate = 86400;

// ── Data fetching ────────────────────────────────────────────────────────────

async function getNonResidentBrokers(): Promise<Broker[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("brokers")
      .select("id, name, slug, color, logo_url, cta_text, affiliate_url, rating, accepts_non_residents, foreign_investor_notes, platform_type, regulated_by, status")
      .eq("accepts_non_residents", true)
      .eq("status", "active")
      .order("rating", { ascending: false })
      .limit(9);
    return (data ?? []) as unknown as Broker[];
  } catch {
    return [];
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CountryForeignInvestmentPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  const dtaCountry = getCountryBySlug(country);
  if (!dtaCountry) notFound();

  const brokers = await getNonResidentBrokers();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    { name: `From ${dtaCountry.country}` },
  ]);

  const dividendSaving = dtaCountry.hasDTA
    ? DEFAULT_WHT.dividendUnfranked - dtaCountry.dividendWHT
    : 0;

  const PLATFORM_TYPE_LABELS: Record<string, string> = {
    share_broker: "Share Broker",
    crypto_exchange: "Crypto Exchange",
    robo_advisor: "Robo-Advisor",
    cfd_forex: "CFD & Forex",
    savings_account: "Savings Account",
    super_fund: "Super Fund",
    research_tool: "Research",
  };

  const VERTICAL_LINKS = [
    { label: "Australian Shares", href: "/foreign-investment/shares", note: dtaCountry.hasDTA ? `${dtaCountry.dividendWHT}% WHT on unfranked dividends (DTA)` : "30% WHT on unfranked dividends (no DTA)" },
    { label: "Crypto", href: "/foreign-investment/crypto", note: "No WHT — CGT likely exempt for non-residents" },
    { label: "Savings Accounts", href: "/foreign-investment/savings", note: `${dtaCountry.interestWHT}% WHT on interest` },
    { label: "Super & DASP", href: "/foreign-investment/super", note: "35–65% DASP on departure" },
    { label: "CFD & Forex", href: "/foreign-investment/cfd", note: "Generally open — ASIC leverage limits apply" },
    { label: "Property (FIRB)", href: "/foreign-investment/property", note: "FIRB approval required — new dwellings only" },
    { label: "Tax Guide", href: "/foreign-investment/tax", note: "Non-resident tax rates & filing obligations" },
  ];

  return (
    <div className="bg-white min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <ForeignInvestmentNav current="" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span>/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">From {dtaCountry.country}</span>
          </nav>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
              {dtaCountry.country} Investors · Updated March 2026
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              Investing in Australia{" "}
              <span className="text-amber-600">from {dtaCountry.country}</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              {dtaCountry.hasDTA
                ? `Australia and ${dtaCountry.country} have a Double Tax Agreement — reducing withholding tax on dividends to ${dtaCountry.dividendWHT}% (from the standard 30%). Here's everything ${dtaCountry.country} residents need to know about investing in Australia.`
                : `${dtaCountry.country} does not have a DTA with Australia — the standard withholding rates apply (30% on unfranked dividends, 10% on interest). Here's the complete guide for ${dtaCountry.country} residents investing in Australia.`}
            </p>
          </div>
        </div>
      </section>

      {/* ── DTA Rate Cards ───────────────────────────────────────────── */}
      <section className="py-8 bg-slate-50">
        <div className="container-custom">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={`bg-white rounded-2xl border p-5 ${dtaCountry.hasDTA ? "border-green-200" : "border-amber-200"}`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${dtaCountry.hasDTA ? "text-green-800" : "text-amber-800"}`}>DTA Status</p>
              <p className={`text-xl font-black ${dtaCountry.hasDTA ? "text-green-700" : "text-amber-700"}`}>
                {dtaCountry.hasDTA ? "DTA Active" : "No DTA"}
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {dtaCountry.hasDTA
                  ? `Australia–${dtaCountry.country} DTA in force since ${dtaCountry.dtaEffectiveYear}`
                  : `Standard Australian withholding rates apply to ${dtaCountry.country} residents`}
              </p>
            </div>

            <div className={`bg-white rounded-2xl border p-5 ${dividendSaving > 0 ? "border-green-200" : "border-amber-200"}`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${dividendSaving > 0 ? "text-green-800" : "text-amber-800"}`}>Dividend WHT (Unfranked)</p>
              <p className={`text-xl font-black ${dividendSaving > 0 ? "text-green-700" : "text-amber-700"}`}>
                {dtaCountry.dividendWHT}%
              </p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {dividendSaving > 0
                  ? `Reduced from 30% by DTA — saving ${dividendSaving}pp vs non-DTA countries`
                  : "Standard rate — no DTA reduction available"}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Interest WHT</p>
              <p className="text-xl font-black text-slate-700">{dtaCountry.interestWHT}%</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Withholding tax on Australian bank interest for {dtaCountry.country} residents
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Royalties WHT</p>
              <p className="text-xl font-black text-slate-700">{dtaCountry.royaltiesWHT}%</p>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Australian royalties withholding for {dtaCountry.country} residents
              </p>
            </div>
          </div>

          {dtaCountry.notes && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold">Note:</span> {dtaCountry.notes}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Platform Recommendations ─────────────────────────────────── */}
      {brokers.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container-custom">
            <SectionHeading
              eyebrow="Platforms for non-residents"
              title={`Which Australian platforms accept ${dtaCountry.country} residents?`}
              sub="These platforms have confirmed non-resident eligibility. Verify current policy directly before applying."
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {brokers.map((b) => (
                <div key={b.id} className="bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all p-4 flex flex-col">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: b.color || "#334155" }}>
                      {b.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{b.name}</p>
                      <p className="text-[0.65rem] text-slate-400">
                        {PLATFORM_TYPE_LABELS[b.platform_type] ?? b.platform_type}
                      </p>
                    </div>
                    <span className="ml-auto text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full shrink-0">Open</span>
                  </div>
                  {b.foreign_investor_notes && (
                    <p className="text-xs text-slate-500 leading-relaxed mb-3 flex-1">{b.foreign_investor_notes}</p>
                  )}
                  <div className="mt-auto flex gap-2">
                    {b.affiliate_url && (
                      <Link href={b.affiliate_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg py-2 transition-colors">
                        Visit
                      </Link>
                    )}
                    <Link href={`/broker/${b.slug}`} className="flex-1 text-center text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg py-2 transition-colors">
                      Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/best/foreign-investors" className="text-sm font-bold text-amber-600 hover:text-amber-700">
              Full guide: best platforms for non-residents &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* ── Investment Rules by Vertical ─────────────────────────────── */}
      <section className="py-12 md:py-16 bg-slate-50">
        <div className="container-custom">
          <SectionHeading
            eyebrow="Investment rules"
            title={`What can ${dtaCountry.country} residents invest in?`}
            sub="Each asset class has different rules, tax treatment, and platform eligibility for non-residents."
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {VERTICAL_LINKS.map((v) => (
              <Link
                key={v.href}
                href={v.href}
                className="group bg-white rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all p-4"
              >
                <p className="font-bold text-sm text-slate-900 group-hover:text-amber-700 transition-colors mb-1">{v.label}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{v.note}</p>
                <p className="mt-2 text-xs font-bold text-amber-600 group-hover:text-amber-700">Full guide &rarr;</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Tax Rules for This Country ───────────────────────────── */}
      <section className="py-12 md:py-16">
        <div className="container-custom max-w-3xl">
          <SectionHeading
            eyebrow="Tax rules"
            title={`Key tax rules for ${dtaCountry.country} residents investing in Australia`}
          />
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-extrabold text-slate-900 text-sm mb-3">Withholding Tax Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Unfranked dividends</span>
                  <span className="font-bold text-slate-900">{dtaCountry.dividendWHT}% {dtaCountry.hasDTA ? "(DTA reduced)" : "(standard rate)"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Fully franked dividends</span>
                  <span className="font-bold text-green-700">0% (tax paid by company)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Interest income</span>
                  <span className="font-bold text-slate-900">{dtaCountry.interestWHT}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Royalties</span>
                  <span className="font-bold text-slate-900">{dtaCountry.royaltiesWHT}%</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-100 pt-2">
                  <span className="text-slate-600">Capital gains — listed shares</span>
                  <span className="font-bold text-green-700">Generally exempt (Section 855-10)</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Capital gains — property</span>
                  <span className="font-bold text-amber-700">Taxable (no exemption for non-residents)</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6">
              <h3 className="font-extrabold text-amber-900 text-sm mb-2">Important: Home Country Tax</h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Australian withholding tax is a final tax in Australia. However, {dtaCountry.country} will likely also tax you on Australian investment income as a {dtaCountry.country} tax resident.{" "}
                {dtaCountry.hasDTA
                  ? `The Australia–${dtaCountry.country} DTA prevents double taxation — you can generally offset Australian WHT paid against your ${dtaCountry.country} tax liability.`
                  : `Without a DTA, you may face double taxation on some income types. Consult a tax professional in ${dtaCountry.country} for advice on foreign income credits available to you.`}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 className="font-extrabold text-slate-900 text-sm mb-3">No Tax-Free Threshold</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                As a non-resident of Australia, there is no tax-free threshold on Australian income. Australian income tax applies from the first dollar at 30% (for income up to $135,000 in 2025–26), then 37% up to $190,000, then 45%. This applies to ordinary income — not to dividends and interest which are subject to withholding tax instead.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Related Country Pages ─────────────────────────────────────── */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Guides by country</p>
          <div className="flex flex-wrap gap-2">
            {DTA_COUNTRIES.filter((c) => c.countryCode !== dtaCountry.countryCode).slice(0, 12).map((c) => (
              <Link
                key={c.countryCode}
                href={`/foreign-investment/from/${c.countryCode.toLowerCase()}`}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-300 text-xs font-semibold text-slate-700 hover:text-amber-700 rounded-lg transition-colors"
              >
                {c.country}
              </Link>
            ))}
            <Link href="/foreign-investment" className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700 rounded-lg">
              All countries &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="py-10 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="container-custom flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-white mb-1">Find an advisor for {dtaCountry.country} investors</h2>
            <p className="text-slate-400 text-sm">International tax specialists who understand both Australian rules and {dtaCountry.country} obligations.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/advisors/tax-agents" className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-sm transition-colors whitespace-nowrap">
              Find Tax Advisor
            </Link>
            <Link href="/foreign-investment" className="px-5 py-3 border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold rounded-xl text-sm transition-colors whitespace-nowrap">
              ← Foreign Investment Hub
            </Link>
          </div>
        </div>
      </section>

      <section className="py-6 bg-slate-50 border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">{FOREIGN_INVESTOR_GENERAL_DISCLAIMER} {DTA_DISCLAIMER}</p>
        </div>
      </section>
    </div>
  );
}
