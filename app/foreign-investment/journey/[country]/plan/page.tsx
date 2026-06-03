/**
 * /foreign-investment/journey/[country]/plan
 *
 * Personalized cross-border planner — turns the guided journey steps into
 * an interactive checklist with persisted progress.
 *
 * Architecture:
 *   • Server component: builds the ExpatPlan, fetches user session,
 *     renders the static shell + metadata + JSON-LD.
 *   • Client component (ExpatPlanClient): owns interactive checkbox state,
 *     localStorage persistence (anon) and DB sync (signed-in).
 *
 * Country-parameterised — same URLs as the journey:
 *   /foreign-investment/journey/united-kingdom/plan
 *   /foreign-investment/journey/united-states/plan
 *   … etc.
 *
 * All data is from COUNTRY_CONFIGS via buildExpatPlan. No new data is
 * fabricated.
 *
 * Compliance:
 *   - GENERAL_ADVICE_WARNING rendered above the fold
 *   - FOREIGN_INVESTOR_GENERAL_DISCLAIMER at the foot
 *   - No personal advice, no product rankings, no performance claims
 *   - Advisor CTAs are flat-fee referral only
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl, CURRENT_YEAR } from "@/lib/seo";
import {
  GENERAL_ADVICE_WARNING,
  FOREIGN_INVESTOR_GENERAL_DISCLAIMER,
} from "@/lib/compliance";
import {
  getCountryConfig,
  COUNTRY_CONFIGS,
} from "@/lib/foreign-investment-country-data";
import { intentCountryFromSlug } from "@/lib/intent-context";
import { buildExpatPlan } from "@/lib/expat-plan";
import ForeignInvestmentNav from "../../../ForeignInvestmentNav";
import RememberCountry from "@/components/foreign-investment/RememberCountry";
import ExpatPlanClient from "@/components/foreign-investment/ExpatPlanClient";

// ─── Static params ────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return Object.values(COUNTRY_CONFIGS)
    .filter(Boolean)
    .map((c) => ({ country: c!.slug }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country } = await params;
  const code = intentCountryFromSlug(country);
  if (!code) return { title: "Plan Not Found" };
  const config = getCountryConfig(code);
  if (!config) return { title: "Plan Not Found" };

  const title = `${config.adjective} Investor Planner: Track Your Cross-Border Investing Steps (${CURRENT_YEAR})`;
  const description = `Personalised checklist for ${config.adjective} residents investing in Australia. Track FIRB, tax, FX${config.retirementTransfer ? ", pension transfer" : ""}${config.migration ? ", migration" : ""} and specialist advisor steps. Save progress across sessions. General information only.`;

  return {
    title,
    description,
    openGraph: {
      title: `${config.adjective} Investor Planner — ${config.flag} Track Your AU Investing Journey (${CURRENT_YEAR})`,
      description: `Checklist planner: FIRB, tax, FX, and advisor steps for ${config.adjective} residents investing in Australia.`,
      url: `${SITE_URL}/foreign-investment/journey/${config.slug}/plan`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(`${config.flag} Cross-Border Investing Planner: ${config.countryShort} → Australia`)}&sub=${encodeURIComponent(`Track FIRB · Tax · FX · Advisors · ${CURRENT_YEAR}`)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
    alternates: {
      canonical: `${SITE_URL}/foreign-investment/journey/${config.slug}/plan`,
    },
  };
}

export const revalidate = 86400;

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function buildChecklistJsonLd(
  config: ReturnType<typeof getCountryConfig>,
  itemCount: number,
) {
  if (!config) return null;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${config.adjective} Investor Cross-Border Planner — ${CURRENT_YEAR}`,
    description: `A ${itemCount}-step checklist for ${config.adjective} residents investing in Australia. Covers FIRB eligibility, tax obligations, FX, and specialist advisor referral.`,
    url: absoluteUrl(`/foreign-investment/journey/${config.slug}/plan`),
    numberOfItems: itemCount,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ExpatPlanPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  const code = intentCountryFromSlug(country);
  if (!code) notFound();
  const config = getCountryConfig(code);
  if (!config) notFound();

  const plan = buildExpatPlan(config);

  // Check session for DB persistence enablement
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSignedIn = Boolean(user);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    {
      name: config.countryName,
      url: `${SITE_URL}/foreign-investment/${config.slug}`,
    },
    {
      name: "Journey",
      url: `${SITE_URL}/foreign-investment/journey/${config.slug}`,
    },
    {
      name: "Planner",
      url: `${SITE_URL}/foreign-investment/journey/${config.slug}/plan`,
    },
  ]);

  const checklistLd = buildChecklistJsonLd(config, plan.items.length);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {checklistLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(checklistLd) }}
        />
      )}

      <RememberCountry code={code} />

      <ForeignInvestmentNav current="" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span>/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">
              Foreign Investment
            </Link>
            <span>/</span>
            <Link
              href={`/foreign-investment/${config.slug}`}
              className="hover:text-slate-900"
            >
              {config.countryName}
            </Link>
            <span>/</span>
            <Link
              href={`/foreign-investment/journey/${config.slug}`}
              className="hover:text-slate-900"
            >
              Journey
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Planner</span>
          </nav>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="text-base">{config.flag}</span>
              {config.countryName} · Cross-Border Investing Planner · {CURRENT_YEAR}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              {config.adjective} investor{" "}
              <span className="text-amber-600">personalised planner</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-5">
              Tick off each step as you research and act. Your progress is saved{" "}
              {isSignedIn ? "to your account" : "in this browser"}. Use the
              guided{" "}
              <Link
                href={`/foreign-investment/journey/${config.slug}`}
                className="text-amber-700 font-semibold hover:text-amber-800 underline underline-offset-2"
              >
                Journey page
              </Link>{" "}
              for full detail on each step. General information only — not
              financial advice.
            </p>

            {/* General advice warning */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                {GENERAL_ADVICE_WARNING}
              </p>
            </div>

            {/* Signed-out DB-sync nudge */}
            {!isSignedIn && (
              <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-800 leading-relaxed flex-1">
                  <strong>Save across devices:</strong> sign in to sync your
                  progress to your account.
                </p>
                <Link
                  href="/auth/login"
                  className="text-xs font-bold text-amber-800 hover:text-amber-900 shrink-0 underline"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Planner ────────────────────────────────────────────────────── */}
      <div className="container-custom py-10 md:py-14">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Sticky sidebar (desktop) */}
          <aside className="hidden lg:block sticky top-24 w-52 shrink-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 mb-3">
              Planner steps
            </p>
            <nav className="space-y-1">
              {plan.items.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-amber-700 transition-colors group"
                >
                  <span className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-amber-100 text-slate-500 group-hover:text-amber-700 text-[0.6rem] font-extrabold flex items-center justify-center shrink-0 transition-colors">
                    {item.stepNumber}
                  </span>
                  {item.railLabel}
                </a>
              ))}
            </nav>

            {/* Back to journey */}
            <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-amber-700 mb-1">
                Step-by-step guide
              </p>
              <Link
                href={`/foreign-investment/journey/${config.slug}`}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                {config.flag} Journey page →
              </Link>
            </div>

            {/* Country hub */}
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-500 mb-1">
                Full country guide
              </p>
              <Link
                href={`/foreign-investment/${config.slug}`}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                {config.flag} {config.countryName} investing hub →
              </Link>
            </div>
          </aside>

          {/* Interactive planner */}
          <div className="flex-1 min-w-0">
            <ExpatPlanClient plan={plan} isSignedIn={isSignedIn} />
          </div>
        </div>
      </div>

      {/* ── Other country planners ────────────────────────────────────── */}
      <section className="py-10 bg-slate-50 border-t border-slate-100">
        <div className="container-custom">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Other country planners
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.values(COUNTRY_CONFIGS)
              .filter((c) => c && c.code !== config.code)
              .map((c) => (
                <Link
                  key={c!.slug}
                  href={`/foreign-investment/journey/${c!.slug}/plan`}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-300 text-xs font-semibold text-slate-700 hover:text-amber-700 rounded-lg transition-colors"
                >
                  {c!.flag} {c!.countryShort}
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* ── Compliance footer ─────────────────────────────────────────── */}
      <section className="py-6 bg-white border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-400 leading-relaxed">
            {FOREIGN_INVESTOR_GENERAL_DISCLAIMER}
          </p>
        </div>
      </section>
    </div>
  );
}
